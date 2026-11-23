import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowUp,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useVaultStore } from '../store/useVaultStore';
import { getThemeColors } from '../theme/colors';

interface QuickActionMessageBoxProps {
  isDark?: boolean;
}

const EXAMPLE_PROMPTS = [
  'get by mom 200, add to bank',
  'drank coffee 150 cash',
  'bought notebook, 5000',
  '5km run 30 mins',
  'remind me tomorrow 5pm to pay wifi',
];

export function QuickActionMessageBox({
  isDark = false,
}: QuickActionMessageBoxProps) {
  const { processQuickCommand } = useVaultStore();
  const theme = getThemeColors(isDark);

  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    undo?: () => Promise<void>;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Feedback / Confirmation Banner with Undo */}
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
                  {
                    backgroundColor: isDark ? '#047857' : '#D1FAE5',
                  },
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

      {/* Main Input Row */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <View
          style={[
            styles.sparkleBadge,
            {
              backgroundColor: isDark
                ? 'rgba(99, 102, 241, 0.2)'
                : 'rgba(79, 70, 229, 0.1)',
            },
          ]}
        >
          <Sparkles size={15} color={isDark ? '#818CF8' : '#4F46E5'} />
        </View>

        <TextInput
          style={[styles.textInput, { color: theme.textPrimary }]}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder="Quick log: 'coffee 150 cash' or '5km run'..."
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Quick add command"
          returnKeyType="send"
          onSubmitEditing={() => handleSubmit()}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isProcessing}
        />

        {inputVal.length > 0 && (
          <TouchableOpacity
            onPress={() => setInputVal('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 4 }}
          >
            <X size={15} color={theme.textMuted} />
          </TouchableOpacity>
        )}

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
                  ? '#4F46E5'
                  : isDark
                    ? '#334155'
                    : '#CBD5E1',
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ArrowUp size={15} color="#FFFFFF" strokeWidth={2.8} />
          )}
        </TouchableOpacity>
      </View>

      {/* Clean Single-Line Prompt Suggestions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {EXAMPLE_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            activeOpacity={0.75}
            onPress={() => setInputVal(prompt)}
            style={[
              styles.chipPill,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isDark ? '#CBD5E1' : '#475569' },
              ]}
            >
              {prompt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
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
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  chipPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
