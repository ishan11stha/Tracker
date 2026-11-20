import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  Clock,
  Download,
  EyeOff,
  FileSpreadsheet,
  Globe,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  User,
  Wallet,
} from 'lucide-react-native';
import { useVaultStore } from '../store/useVaultStore';
import { getThemeColors } from '../theme/colors';
import {
  exportVaultBackupJSON,
  exportVaultDataToCSV,
  parseAndValidateBackupJSON,
} from '../utils/exportBackup';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    updateSettings,
    getFullBackupPayload,
    restoreFromBackup,
    resetAllData,
    transactions,
    items,
    activities,
    reminders,
  } = useVaultStore();

  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  const [nameInput, setNameInput] = useState(settings.userName);
  const [titleInput, setTitleInput] = useState(settings.userTitle);
  const [profileSaved, setProfileSaved] = useState(false);

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) return;
    await updateSettings({
      userName: nameInput.trim(),
      userTitle: titleInput.trim() || 'Kathmandu, Nepal',
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleExportCSV = async () => {
    try {
      const payload = getFullBackupPayload();
      const uri = await exportVaultDataToCSV(payload);
      Alert.alert(
        'CSV Export Complete',
        `Your VAULT records have been exported to:\n${uri}`
      );
    } catch (err) {
      Alert.alert(
        'Export Failed',
        err instanceof Error ? err.message : 'Unable to export CSV'
      );
    }
  };

  const handleBackupJSON = async () => {
    try {
      const payload = getFullBackupPayload();
      const uri = await exportVaultBackupJSON(payload);
      Alert.alert(
        'Backup Created',
        `Full SQLite JSON backup saved:\n${uri}`
      );
    } catch (err) {
      Alert.alert(
        'Backup Failed',
        err instanceof Error ? err.message : 'Unable to export backup'
      );
    }
  };

  const handleRestoreJSON = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;

      const pickedFile = new File(res.assets[0].uri);
      const content = await pickedFile.text();
      const validatedPayload = parseAndValidateBackupJSON(content);

      Alert.alert(
        'Restore VAULT Backup?',
        `This will restore ${validatedPayload.transactions.length} transactions, ${
          validatedPayload.items.length
        } items, ${validatedPayload.activities.length} activities, and ${
          validatedPayload.reminders.length
        } reminders.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Now',
            style: 'default',
            onPress: async () => {
              await restoreFromBackup(validatedPayload);
              setNameInput(validatedPayload.settings.userName);
              setTitleInput(validatedPayload.settings.userTitle);
              Alert.alert('Restore Complete', 'All records restored to SQLite.');
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        'Restore Error',
        err instanceof Error ? err.message : 'Could not read backup file'
      );
    }
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset All Sections & Start Fresh?',
      'This will remove all transactions, inventory items, habit tracker logs, and reminders, and reset all 4 wallets (Personal Bank, Personal Cash, Family Bank, Family Cash) to 0.00 so you can start completely fresh with your own details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllData();
              Alert.alert(
                'Fresh Start Ready',
                'All sections have been reset. You are ready to enter your own personal details!'
              );
            } catch (err) {
              Alert.alert('Error', 'Failed to reset data');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? '#0F172A' : '#F5F6F8' },
      ]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Bar */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <ArrowLeft size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
              Settings & Data Control
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textSecondary }]}
            >
              सेटिङ्स, भाषा, पात्रो र डाटा ब्याकअप
            </Text>
          </View>
        </View>

        {/* 1. Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <User size={18} color={theme.textPrimary} />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Personal Profile
            </Text>
          </View>

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Full Name
          </Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Your Name"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Location / Subtitle
          </Text>
          <TextInput
            value={titleInput}
            onChangeText={setTitleInput}
            placeholder="Kathmandu, Nepal"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
          />

          <TouchableOpacity
            onPress={handleSaveProfile}
            style={[
              styles.saveProfileBtn,
              {
                backgroundColor: profileSaved ? '#16A34A' : '#0F172A',
              },
            ]}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.saveProfileBtnText}>
              {profileSaved ? 'Profile Saved!' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Nepali Calendar, Time & Language Preferences */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <Calendar size={18} color="#DC2626" />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Nepali Date, Time & Language
            </Text>
          </View>

          {/* Primary Calendar Display: BS / AD */}
          <View style={styles.settingBlock}>
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
              Preferred Date System (पात्रो प्रणाली)
            </Text>
            <View style={styles.SegmentRow}>
              <TouchableOpacity
                onPress={() => updateSettings({ preferredCalendar: 'BS' })}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      settings.preferredCalendar === 'BS'
                        ? '#0F172A'
                        : theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color:
                        settings.preferredCalendar === 'BS'
                          ? '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  बिक्रम सम्बत् (BS)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => updateSettings({ preferredCalendar: 'AD' })}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      settings.preferredCalendar === 'AD'
                        ? '#0F172A'
                        : theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color:
                        settings.preferredCalendar === 'AD'
                          ? '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  Gregorian (AD)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Language Preference: Nepali / English */}
          <View style={styles.settingBlock}>
            <View style={styles.inlineIconLabel}>
              <Globe size={15} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Language Preference (भाषा)
              </Text>
            </View>
            <View style={styles.SegmentRow}>
              <TouchableOpacity
                onPress={() => updateSettings({ language: 'ne' })}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      settings.language === 'ne' ? '#0F172A' : theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color:
                        settings.language === 'ne'
                          ? '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  नेपाली (Nepali)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => updateSettings({ language: 'en' })}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      settings.language === 'en' ? '#0F172A' : theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color:
                        settings.language === 'en'
                          ? '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Format: 12-hour / 24-hour NPT */}
          <View style={styles.settingBlock}>
            <View style={styles.inlineIconLabel}>
              <Clock size={15} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Nepal Standard Time Format (Asia/Kathmandu)
              </Text>
            </View>
            <View style={styles.SegmentRow}>
              <TouchableOpacity
                onPress={() => updateSettings({ timeFormat: '12h' })}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      settings.timeFormat === '12h' ? '#0F172A' : theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color:
                        settings.timeFormat === '12h'
                          ? '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  12-Hour (11:06 AM NPT)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => updateSettings({ timeFormat: '24h' })}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor:
                      settings.timeFormat === '24h' ? '#0F172A' : theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color:
                        settings.timeFormat === '24h'
                          ? '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  24-Hour (23:06 NPT)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Currency, Notifications & Theme */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <Wallet size={18} color="#16A34A" />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Currency & Appearance
            </Text>
          </View>

          <View style={styles.settingBlock}>
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
              Default Currency
            </Text>
            <View style={styles.SegmentRow}>
              {(['NPR', 'INR', 'USD'] as const).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  onPress={() => updateSettings({ currency: curr })}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor:
                        settings.currency === curr ? '#16A34A' : theme.inputBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      {
                        color:
                          settings.currency === curr
                            ? '#FFFFFF'
                            : theme.textPrimary,
                      },
                    ]}
                  >
                    {curr === 'NPR' ? 'NPR (रू)' : curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Theme Switcher */}
          <View
            style={[
              styles.switchRow,
              { borderTopColor: theme.divider },
            ]}
          >
            <View style={styles.inlineIconLabel}>
              {isDark ? (
                <Moon size={18} color="#A78BFA" />
              ) : (
                <Sun size={18} color="#D97706" />
              )}
              <View>
                <Text
                  style={[styles.settingLabel, { color: theme.textPrimary }]}
                >
                  Dark Mode Theme
                </Text>
                <Text
                  style={[styles.settingHint, { color: theme.textSecondary }]}
                >
                  Light theme is default for VAULT
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) =>
                updateSettings({ theme: val ? 'dark' : 'light' })
              }
              trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
            />
          </View>

          {/* Private Mode Toggle (Monekin PrivateModeService) */}
          <View
            style={[
              styles.switchRow,
              { borderTopColor: theme.divider },
            ]}
          >
            <View style={styles.inlineIconLabel}>
              <EyeOff size={18} color="#0F3375" />
              <View>
                <Text
                  style={[styles.settingLabel, { color: theme.textPrimary }]}
                >
                  Private Mode (Hide Balances)
                </Text>
                <Text
                  style={[styles.settingHint, { color: theme.textSecondary }]}
                >
                  Mask currency amounts as •••••• across all screens
                </Text>
              </View>
            </View>
            <Switch
              value={Boolean(settings.privateMode)}
              onValueChange={(val) =>
                updateSettings({ privateMode: val })
              }
              trackColor={{ false: '#CBD5E1', true: '#0F3375' }}
            />
          </View>

          {/* Notifications Toggle */}
          <View
            style={[
              styles.switchRow,
              { borderTopColor: theme.divider },
            ]}
          >
            <View style={styles.inlineIconLabel}>
              <Bell size={18} color="#EA580C" />
              <View>
                <Text
                  style={[styles.settingLabel, { color: theme.textPrimary }]}
                >
                  Android Local Notifications
                </Text>
                <Text
                  style={[styles.settingHint, { color: theme.textSecondary }]}
                >
                  Trigger reminders according to Nepal Time (NPT)
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(val) =>
                updateSettings({ notificationsEnabled: val })
              }
              trackColor={{ false: '#CBD5E1', true: '#EA580C' }}
            />
          </View>
        </View>

        {/* 4. Data Export (CSV) & SQLite Backup / Restore */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <ShieldCheck size={18} color="#2563EB" />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              SQLite Database, CSV Export & Backup
            </Text>
          </View>

          <Text style={[styles.dbStatsText, { color: theme.textSecondary }]}>
            Stored locally in SQLite: {transactions.length} transactions •{' '}
            {items.length} items • {activities.length} activities •{' '}
            {reminders.length} reminders
          </Text>

          <TouchableOpacity
            onPress={handleExportCSV}
            style={[
              styles.dataActionBtn,
              { backgroundColor: '#E8F5E9', borderColor: '#BBF7D0' },
            ]}
          >
            <FileSpreadsheet size={18} color="#16A34A" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: '#14532D' }]}>
                Export All Records to CSV
              </Text>
              <Text style={[styles.dataActionSub, { color: '#166534' }]}>
                Includes both Bikram Sambat (BS) and Gregorian (AD) dates
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBackupJSON}
            style={[
              styles.dataActionBtn,
              { backgroundColor: '#E8F1FC', borderColor: '#BFDBFE' },
            ]}
          >
            <Download size={18} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: '#1E3A8A' }]}>
                Create Full Database Backup (JSON)
              </Text>
              <Text style={[styles.dataActionSub, { color: '#1D4ED8' }]}>
                Save or share your complete offline VAULT snapshot
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestoreJSON}
            style={[
              styles.dataActionBtn,
              { backgroundColor: '#FFF0E6', borderColor: '#FED7AA' },
            ]}
          >
            <Upload size={18} color="#EA580C" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: '#7C2D12' }]}>
                Restore from Backup File
              </Text>
              <Text style={[styles.dataActionSub, { color: '#9A3412' }]}>
                Import a previously exported VAULT JSON backup
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. Danger Zone: Reset All Sections & Start Fresh */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#261214' : '#FEF2F2',
              borderColor: isDark ? '#7F1D1D' : '#FECACA',
            },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <RotateCcw size={18} color="#DC2626" />
            <Text style={[styles.cardTitle, { color: '#DC2626' }]}>
              Fresh Start & Reset All Sections
            </Text>
          </View>

          <Text
            style={[
              styles.dbStatsText,
              { color: isDark ? '#FCA5A5' : '#991B1B', marginBottom: 14 },
            ]}
          >
            Clear all dummy or old items, transactions, habits, and tasks across
            all sections to begin completely fresh with your own details.
          </Text>

          <TouchableOpacity
            onPress={handleResetAllData}
            style={[
              styles.dataActionBtn,
              { backgroundColor: '#DC2626', borderColor: '#B91C1C' },
            ]}
          >
            <Trash2 size={18} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: '#FFFFFF' }]}>
                Reset All Sections & Start Fresh
              </Text>
              <Text style={[styles.dataActionSub, { color: '#FEE2E2' }]}>
                Wipes all sections; resets Personal & Family wallets to fresh start
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    marginBottom: 12,
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  settingBlock: {
    marginBottom: 14,
  },
  inlineIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  settingHint: {
    fontSize: 11,
  },
  SegmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  dbStatsText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  dataActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  dataActionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  dataActionSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
