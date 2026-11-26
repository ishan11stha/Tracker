import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Flag,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react-native';
import { useVaultStore } from '../store/useVaultStore';
import { getThemeColors } from '../theme/colors';
import { LAYOUT } from '../theme/layout';
import { formatCurrency } from '../utils/currency';
import { formatDisplayDate } from '../utils/nepaliDate';
import { useCurrentNPT } from '../hooks/useCurrentNPT';
import { sanitizeDecimalInput } from '../utils/numberInput';
import { SavingsGoal } from '../types';
import {
  SavingsGoalFormModal,
  renderGoalIcon,
} from '../components/SavingsGoalFormModal';

function getOverdueLabel(targetDateISO: string, todayISO: string): string | null {
  if (!targetDateISO || targetDateISO >= todayISO) return null;
  const [ty, tm, td] = todayISO.split('-').map(Number);
  const [gy, gm, gd] = targetDateISO.split('-').map(Number);
  const diffDays = Math.floor(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(gy, gm - 1, gd)) / 86400000
  );
  if (diffDays <= 0) return null;
  if (diffDays >= 60) {
    const months = Math.floor(diffDays / 30);
    return `${months} months overdue`;
  }
  if (diffDays >= 30) {
    return '1 month overdue';
  }
  return diffDays === 1 ? '1 day overdue' : `${diffDays} days overdue`;
}

export default function SavingsGoalsScreen() {
  const router = useRouter();
  const {
    settings,
    savingsGoals,
    contributeToSavingsGoal,
    removeSavingsGoal,
  } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const privateMode = Boolean(settings.privateMode);
  const theme = getThemeColors(isDark);
  const nptToday = useCurrentNPT();

  const [activeTab, setActiveTab] = useState<'active' | 'achieved'>('active');
  const [formVisible, setFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Quick deposit modal state
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositInput, setDepositInput] = useState('');
  const [depositValue, setDepositValue] = useState(0);

  const { activeGoals, achievedGoals, totalSaved, totalTarget } =
    useMemo(() => {
      const active: SavingsGoal[] = [];
      const achieved: SavingsGoal[] = [];
      let savedSum = 0;
      let targetSum = 0;

      for (const g of savingsGoals) {
        savedSum += g.savedAmount;
        targetSum += g.targetAmount;
        if (g.savedAmount >= g.targetAmount) {
          achieved.push(g);
        } else {
          active.push(g);
        }
      }
      return {
        activeGoals: active,
        achievedGoals: achieved,
        totalSaved: savedSum,
        totalTarget: targetSum,
      };
    }, [savingsGoals]);

  const displayedGoals = activeTab === 'active' ? activeGoals : achievedGoals;

  const handleConfirmDeposit = async () => {
    if (!depositGoal || depositValue <= 0) return;
    await contributeToSavingsGoal(depositGoal.id, depositValue);
    setDepositGoal(null);
    setDepositInput('');
    setDepositValue(0);
  };

  const handleDelete = (goal: SavingsGoal) => {
    Alert.alert('Delete Goal', `Remove "${goal.title}" from Savings Goals?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeSavingsGoal(goal.id),
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' },
      ]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Navigation Row */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setEditingGoal(null);
              setFormVisible(true);
            }}
            style={[
              styles.addGoalPill,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.addGoalCircle}>
              <Plus size={14} color="#FFFFFF" strokeWidth={2.8} />
            </View>
            <Text
              style={[
                styles.addGoalText,
                { color: isDark ? '#34D399' : '#065F46' },
              ]}
            >
              Add Goal
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
          Savings Goals
        </Text>

        {/* Side-by-Side Saved & Target Summary Cards */}
        <View style={styles.summaryPairRow}>
          <View
            style={[
              styles.summaryBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
              Saved
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: isDark ? '#34D399' : '#10B981' },
              ]}
              numberOfLines={1}
            >
              {formatCurrency(totalSaved, settings.currency, true, privateMode)}
            </Text>
          </View>

          <View
            style={[
              styles.summaryBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
              Target
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: isDark ? '#60A5FA' : '#2563EB' },
              ]}
              numberOfLines={1}
            >
              {formatCurrency(totalTarget, settings.currency, true, privateMode)}
            </Text>
          </View>
        </View>

        {/* Active / Achieved Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('active')}
            style={[
              styles.tabPill,
              {
                backgroundColor:
                  activeTab === 'active'
                    ? theme.card
                    : isDark
                      ? '#131A29'
                      : '#EEF2F6',
                borderColor:
                  activeTab === 'active' ? theme.border : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.tabPillText,
                {
                  color:
                    activeTab === 'active'
                      ? theme.textPrimary
                      : theme.textMuted,
                },
              ]}
            >
              Active{' '}
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>
                {activeGoals.length}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('achieved')}
            style={[
              styles.tabPill,
              {
                backgroundColor:
                  activeTab === 'achieved'
                    ? theme.card
                    : isDark
                      ? '#131A29'
                      : '#EEF2F6',
                borderColor:
                  activeTab === 'achieved' ? theme.border : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.tabPillText,
                {
                  color:
                    activeTab === 'achieved'
                      ? theme.textPrimary
                      : theme.textMuted,
                },
              ]}
            >
              Achieved{' '}
              <Text style={{ color: '#10B981', fontWeight: '800' }}>
                {achievedGoals.length}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Goals List */}
        {displayedGoals.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Target size={26} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {activeTab === 'active'
                ? 'No active savings goals'
                : 'No achieved goals yet'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              {activeTab === 'active'
                ? 'Tap "+ Add Goal" above to start saving for a trip, emergency fund, or new device.'
                : 'Keep adding savings to your active goals to celebrate them here.'}
            </Text>
          </View>
        ) : (
          displayedGoals.map((goal) => {
            const pct = Math.min(
              100,
              Math.round((goal.savedAmount / Math.max(1, goal.targetAmount)) * 100)
            );
            const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
            const isAchieved = remaining === 0;
            const overdueLabel =
              !isAchieved && goal.targetDateISO
                ? getOverdueLabel(goal.targetDateISO, nptToday.isoDate)
                : null;

            return (
              <View
                key={goal.id}
                style={[
                  styles.goalCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                {/* Top Row: Icon + Title + Saved / Target */}
                <View style={styles.goalTopRow}>
                  <View
                    style={[
                      styles.goalIconCircle,
                      { backgroundColor: `${goal.color}1C` },
                    ]}
                  >
                    {renderGoalIcon(goal.icon, goal.color, 21)}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.goalTitle, { color: theme.textPrimary }]}
                      numberOfLines={1}
                    >
                      {goal.title}
                    </Text>
                    <Text
                      style={[styles.goalPctSub, { color: theme.textMuted }]}
                    >
                      {pct}% Saved
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.goalSavedAmt, { color: goal.color }]}>
                      {formatCurrency(
                        goal.savedAmount,
                        settings.currency,
                        false,
                        privateMode
                      )}
                    </Text>
                    <Text
                      style={[styles.goalTargetSub, { color: theme.textMuted }]}
                    >
                      /{' '}
                      {formatCurrency(
                        goal.targetAmount,
                        settings.currency,
                        false,
                        privateMode
                      )}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: theme.surfaceContainerHigh },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: goal.color, width: `${pct}%` },
                    ]}
                  />
                </View>

                {/* Bottom Row: Remaining + Target Date / Overdue Pill */}
                <View style={styles.goalFooterRow}>
                  <View style={styles.remainingWrap}>
                    {isAchieved ? (
                      <>
                        <CheckCircle2 size={14} color="#10B981" />
                        <Text
                          style={[
                            styles.remainingText,
                            { color: '#10B981', fontWeight: '700' },
                          ]}
                        >
                          Goal Achieved!
                        </Text>
                      </>
                    ) : (
                      <>
                        <Flag size={13} color={theme.textMuted} />
                        <Text
                          style={[
                            styles.remainingText,
                            { color: theme.textMuted },
                          ]}
                        >
                          {formatCurrency(
                            remaining,
                            settings.currency,
                            false,
                            privateMode
                          )}{' '}
                          Remaining
                        </Text>
                      </>
                    )}
                  </View>

                  {overdueLabel ? (
                    <View style={styles.overdueBadge}>
                      <AlertCircle size={12} color="#DC2626" />
                      <Text style={styles.overdueText}>{overdueLabel}</Text>
                    </View>
                  ) : goal.targetDateISO ? (
                    <Text
                      style={[styles.targetDateText, { color: theme.textMuted }]}
                    >
                      {formatDisplayDate(
                        goal.targetDateISO,
                        settings.preferredCalendar,
                        settings.language
                      )}
                    </Text>
                  ) : null}
                </View>

                {/* Action Strip: + Add Savings, Edit, Delete */}
                <View
                  style={[
                    styles.goalActionsRow,
                    { borderTopColor: theme.divider },
                  ]}
                >
                  {!isAchieved ? (
                    <TouchableOpacity
                      onPress={() => {
                        setDepositGoal(goal);
                        setDepositInput('');
                        setDepositValue(0);
                      }}
                      style={[
                        styles.depositBtn,
                        { backgroundColor: `${goal.color}1A` },
                      ]}
                    >
                      <Plus size={14} color={goal.color} strokeWidth={2.6} />
                      <Text
                        style={[styles.depositBtnText, { color: goal.color }]}
                      >
                        Add Savings
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}

                  <View style={styles.editDeleteGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingGoal(goal);
                        setFormVisible(true);
                      }}
                      style={styles.iconBtn}
                      hitSlop={8}
                    >
                      <Edit3 size={15} color={theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(goal)}
                      style={styles.iconBtn}
                      hitSlop={8}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Goal Modal */}
      <SavingsGoalFormModal
        visible={formVisible}
        editingGoal={editingGoal}
        onClose={() => {
          setFormVisible(false);
          setEditingGoal(null);
        }}
      />

      {/* Quick Deposit Modal */}
      <Modal
        visible={Boolean(depositGoal)}
        transparent
        animationType="fade"
        onRequestClose={() => setDepositGoal(null)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}
          onPress={() => setDepositGoal(null)}
        >
          <Pressable
            style={[
              styles.depositCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.depositHeader}>
              <Text style={[styles.depositTitle, { color: theme.textPrimary }]}>
                Add Savings
              </Text>
              <TouchableOpacity onPress={() => setDepositGoal(null)}>
                <X size={19} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.depositSub, { color: theme.textMuted }]}>
              Contribute toward "{depositGoal?.title}"
            </Text>

            <TextInput
              value={depositInput}
              onChangeText={(txt) => {
                const { text, value } = sanitizeDecimalInput(txt);
                setDepositInput(text);
                setDepositValue(value);
              }}
              keyboardType="numeric"
              placeholder={`Amount (${settings.currency})`}
              placeholderTextColor={theme.textMuted}
              autoFocus
              style={[
                styles.depositInput,
                {
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
            />

            <TouchableOpacity
              disabled={depositValue <= 0}
              onPress={handleConfirmDeposit}
              style={[
                styles.depositConfirmBtn,
                {
                  backgroundColor: depositGoal?.color || '#10B981',
                  opacity: depositValue > 0 ? 1 : 0.5,
                },
              ]}
            >
              <Text style={styles.depositConfirmText}>Save Contribution</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  addGoalCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalText: {
    fontSize: 13,
    fontWeight: '800',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 14,
  },
  summaryPairRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  goalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  goalPctSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  goalSavedAmt: {
    fontSize: 15.5,
    fontWeight: '900',
  },
  goalTargetSub: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  goalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  remainingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  overdueText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  goalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 10,
  },
  depositBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editDeleteGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  depositCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  depositHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  depositTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  depositSub: {
    fontSize: 12.5,
    marginBottom: 14,
  },
  depositInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  depositConfirmBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  depositConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
