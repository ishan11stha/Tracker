import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowUp,
  CheckCircle2,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from 'lucide-react-native';
import { requireOptionalNativeModule } from 'expo';
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { useVaultStore } from '../store/useVaultStore';
import { getThemeColors } from '../theme/colors';

type SpeechRecognitionNativeModule = {
  addListener?: (
    eventName: string,
    listener: (event: any) => void
  ) => { remove: () => void };
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: {
    lang?: string;
    interimResults?: boolean;
    maxAlternatives?: number;
    continuous?: boolean;
  }) => void;
  stop: () => void;
  abort: () => void;
};

/**
 * Safely resolves the native ExpoSpeechRecognition module only when it is
 * compiled into the current Android binary (returns null in Expo Go without crashing).
 */
function getSpeechModule(): SpeechRecognitionNativeModule | null {
  try {
    return requireOptionalNativeModule<SpeechRecognitionNativeModule>(
      'ExpoSpeechRecognition'
    );
  } catch {
    return null;
  }
}

interface QuickActionMessageBoxProps {
  isDark?: boolean;
}

export function QuickActionMessageBox({
  isDark = false,
}: QuickActionMessageBoxProps) {
  const { processQuickCommand } = useVaultStore();
  const theme = getThemeColors(isDark);

  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    undo?: () => Promise<void>;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscriptRef = useRef('');

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      try {
        getSpeechModule()?.abort();
      } catch {
        // Ignore if speech module is not active
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (textToProcess?: string) => {
      const query = (textToProcess ?? inputVal).trim();
      if (!query || isProcessing) return;

      setIsProcessing(true);
      Keyboard.dismiss();

      try {
        const result = await processQuickCommand(query);
        setInputVal('');

        if (result.success) {
          setFeedback({
            message: result.message,
            undo: result.undoAction,
          });

          if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
          feedbackTimer.current = setTimeout(() => {
            setFeedback((current) =>
              current?.message === result.message ? null : current
            );
          }, 6000);
        } else {
          Alert.alert('Quick Input Note', result.message);
        }
      } catch (err) {
        Alert.alert(
          'Processing Error',
          err instanceof Error ? err.message : 'Failed to process command'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [inputVal, isProcessing, processQuickCommand]
  );

  useEffect(() => {
    const mod = getSpeechModule();
    if (!mod || typeof mod.addListener !== 'function') return;

    const startSub = mod.addListener('start', () => {
      latestTranscriptRef.current = '';
      setIsListening(true);
    });

    const endSub = mod.addListener('end', () => {
      setIsListening(false);
    });

    const resultSub = mod.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        const transcript = event.results?.[0]?.transcript?.trim() || '';
        if (!transcript) return;
        latestTranscriptRef.current = transcript;
        setInputVal(transcript);

        if (event.isFinal) {
          setIsListening(false);
          void handleSubmit(transcript);
        }
      }
    );

    const errorSub = mod.addListener(
      'error',
      (event: ExpoSpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        Alert.alert(
          'Voice Input Unavailable',
          event.message || 'Could not recognize speech. Please try again.'
        );
      }
    );

    return () => {
      startSub?.remove?.();
      endSub?.remove?.();
      resultSub?.remove?.();
      errorSub?.remove?.();
    };
  }, [handleSubmit]);

  const handleToggleMic = useCallback(async () => {
    if (isProcessing) return;

    const mod = getSpeechModule();
    if (!mod) {
      Alert.alert(
        'Voice Input Requires Android APK',
        'Voice recognition uses Android native speech services, which are included in your built Android APK (not Expo Go).'
      );
      return;
    }

    if (isListening) {
      try {
        mod.stop();
      } catch {
        setIsListening(false);
      }
      return;
    }

    Keyboard.dismiss();

    try {
      const perm = await mod.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Microphone Permission Needed',
          'Allow microphone access in Android Settings to use voice quick input.'
        );
        return;
      }

      mod.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch {
      setIsListening(false);
      Alert.alert(
        'Voice Input Unavailable',
        'Could not start Android speech recognition on this device.'
      );
    }
  }, [isListening, isProcessing]);

  const handleUndo = useCallback(async () => {
    if (!feedback?.undo) return;
    try {
      await feedback.undo();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      setFeedback(null);
      Alert.alert('Reverted', 'Action has been undone.');
    } catch {
      Alert.alert('Undo Failed', 'Could not undo this action.');
    }
  }, [feedback]);

  return (
    <View style={styles.wrap}>
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            {
              backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
              borderColor: isDark ? '#059669' : '#A7F3D0',
            },
          ]}
        >
          <View style={styles.feedbackLeft}>
            <CheckCircle2
              size={15}
              color={isDark ? '#34D399' : '#059669'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.feedbackText,
                { color: isDark ? '#ECFDF5' : '#065F46' },
              ]}
              numberOfLines={2}
            >
              {feedback.message}
            </Text>
          </View>

          <View style={styles.feedbackActions}>
            {feedback.undo && (
              <TouchableOpacity
                onPress={handleUndo}
                style={[
                  styles.undoBtn,
                  { backgroundColor: isDark ? '#047857' : '#D1FAE5' },
                ]}
              >
                <RotateCcw
                  size={11}
                  color={isDark ? '#FFFFFF' : '#047857'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.undoBtnText,
                    { color: isDark ? '#FFFFFF' : '#047857' },
                  ]}
                >
                  Undo
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setFeedback(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.card,
            borderColor: isListening ? '#EF4444' : theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.sparkleBadge,
            {
              backgroundColor: isListening
                ? 'rgba(239, 68, 68, 0.14)'
                : isDark
                  ? 'rgba(56, 189, 248, 0.16)'
                  : '#F1F5F9',
            },
          ]}
        >
          <Sparkles
            size={15}
            color={isListening ? '#EF4444' : isDark ? '#38BDF8' : '#0F172A'}
          />
        </View>

        <TextInput
          style={[styles.textInput, { color: theme.textPrimary }]}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder={
            isListening
              ? 'Listening... say "coffee 150" or "remind 6pm"'
              : 'Type or speak: coffee 150, 5km run, remind 6pm...'
          }
          placeholderTextColor={isListening ? '#EF4444' : theme.textMuted}
          accessibilityLabel="Quick add command"
          returnKeyType="send"
          onSubmitEditing={() => handleSubmit()}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isProcessing}
        />

        {inputVal.length > 0 && !isListening && (
          <TouchableOpacity
            onPress={() => setInputVal('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 2 }}
          >
            <X size={15} color={theme.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleMic}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityLabel={
            isListening ? 'Stop voice input' : 'Start voice input'
          }
          style={[
            styles.micButton,
            {
              backgroundColor: isListening
                ? '#EF4444'
                : isDark
                  ? 'rgba(56, 189, 248, 0.14)'
                  : '#F1F5F9',
            },
          ]}
        >
          {isListening ? (
            <Square size={12} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Mic size={15} color={isDark ? '#38BDF8' : '#0F172A'} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSubmit()}
          disabled={!inputVal.trim() || isProcessing}
          accessibilityRole="button"
          accessibilityLabel="Process quick add command"
          accessibilityState={{ disabled: !inputVal.trim() || isProcessing }}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputVal.trim().length > 0
                  ? isDark
                    ? '#38BDF8'
                    : '#0F172A'
                  : isDark
                    ? '#1E293B'
                    : '#CBD5E1',
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ArrowUp
              size={15}
              color={
                inputVal.trim().length > 0 && isDark ? '#0B0F19' : '#FFFFFF'
              }
              strokeWidth={2.8}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  feedbackLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  feedbackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  undoBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  sparkleBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 7 : 5,
  },
  micButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
