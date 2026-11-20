import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  X,
} from 'lucide-react-native';
import {
  AccountScope,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
  TransactionType,
  transactionSchema,
} from '../types';
import { useVaultStore } from '../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../theme/colors';
import {
  adToBs,
  formatADDateFull,
  formatBSDateNepali,
  getNowInNPT,
} from '../utils/nepaliDate';
import { sanitizeDecimalInput } from '../utils/numberInput';
import { NepaliCalendarModal } from './NepaliCalendarModal';

interface TransactionFormModalProps {
  visible: boolean;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  onClose: () => void;
}

interface TransactionFormValues {
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  dateISO: string;
  paymentMethod: PaymentMethod;
  accountScope?: AccountScope;
  description: string;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  visible,
  initialType = 'expense',
  editingTransaction = null,
  onClose,
}) => {
  const { settings, addTransaction, editTransaction, isSubmitting } =
    useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('money', isDark);

  const [showCalendar, setShowCalendar] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const todayISO = getNowInNPT().isoDate;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initialType,
      title: '',
      amount: 0,
      category:
        initialType === 'income'
          ? INCOME_CATEGORIES[0]
          : EXPENSE_CATEGORIES[0],
      dateISO: todayISO,
      paymentMethod: 'Cash',
      accountScope: 'Personal',
      description: '',
    },
  });

  const currentType = watch('type');
  const currentDateISO = watch('dateISO');
  const currentCategory = watch('category');
  const currentPayment = watch('paymentMethod');
  const currentScope = watch('accountScope') || 'Personal';

  useEffect(() => {
    if (visible) {
      if (editingTransaction) {
        reset({
          type: editingTransaction.type,
          title: editingTransaction.title,
          amount: editingTransaction.amount,
          category: editingTransaction.category,
          dateISO: editingTransaction.dateISO,
          paymentMethod: editingTransaction.paymentMethod,
          accountScope: editingTransaction.accountScope || 'Personal',
          description: editingTransaction.description || '',
        });
        setAmountInput(String(editingTransaction.amount));
      } else {
        const defaultCat =
          initialType === 'income'
            ? INCOME_CATEGORIES[0]
            : EXPENSE_CATEGORIES[0];
        reset({
          type: initialType,
          title: '',
          amount: 0,
          category: defaultCat,
          dateISO: getNowInNPT().isoDate,
          paymentMethod: 'Cash',
          accountScope: 'Personal',
          description: '',
        });
        setAmountInput('');
      }
    }
  }, [visible, editingTransaction, initialType, reset]);

  const categories =
    currentType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeSwitch = (nextType: TransactionType) => {
    setValue('type', nextType);
    const list = nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!list.includes(currentCategory)) {
      setValue('category', list[0]);
    }
  };

  const onSubmit = async (values: TransactionFormValues) => {
    try {
      if (editingTransaction) {
        await editTransaction(editingTransaction.id, values);
      } else {
        await addTransaction(values);
      }
      onClose();
    } catch {
      // handled in store
    }
  };

  const bsDate = adToBs(currentDateISO || todayISO);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {editingTransaction
                ? 'Edit Transaction'
                : currentType === 'income'
                ? 'Add Income (आम्दानी)'
                : 'Add Expense (खर्च)'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Income / Expense Switcher */}
            <View
              style={[
                styles.typeToggleRow,
                { backgroundColor: theme.inputBg, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  currentType === 'income' && {
                    backgroundColor: '#16A34A',
                  },
                ]}
                onPress={() => handleTypeSwitch('income')}
              >
                <ArrowDownLeft
                  size={16}
                  color={currentType === 'income' ? '#FFFFFF' : '#16A34A'}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    {
                      color:
                        currentType === 'income'
                          ? '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Income (आम्दानी)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  currentType === 'expense' && {
                    backgroundColor: '#DC2626',
                  },
                ]}
                onPress={() => handleTypeSwitch('expense')}
              >
                <ArrowUpRight
                  size={16}
                  color={currentType === 'expense' ? '#FFFFFF' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    {
                      color:
                        currentType === 'expense'
                          ? '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Expense (खर्च)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Amount ({settings.currency}) *
              </Text>
              <View
                style={[
                  styles.amountInputWrap,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: errors.amount ? '#DC2626' : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyPrefix,
                    {
                      color:
                        currentType === 'income' ? '#16A34A' : '#DC2626',
                    },
                  ]}
                >
                  {settings.currency}
                </Text>
                <TextInput
                  value={amountInput}
                  onChangeText={(txt) => {
                    const { text, value } = sanitizeDecimalInput(txt);
                    setAmountInput(text);
                    setValue('amount', value, {
                      shouldValidate: true,
                    });
                  }}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  style={[styles.amountInput, { color: theme.textPrimary }]}
                />
              </View>
              {errors.amount && (
                <Text style={styles.errorText}>{errors.amount.message}</Text>
              )}
            </View>

            {/* Title Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Transaction Title *
              </Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={
                      currentType === 'income'
                        ? 'e.g., Monthly Salary, Consulting Fee'
                        : 'e.g., Bhatbhateni Groceries, WorldLink Fiber'
                    }
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary,
                        borderColor: errors.title ? '#DC2626' : theme.border,
                      },
                    ]}
                  />
                )}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title.message}</Text>
              )}
            </View>

            {/* Nepali BS / AD Date Picker Trigger */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Transaction Date (BS / AD) *
              </Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={[
                  styles.dateSelectorBtn,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Calendar size={18} color={palette.accent} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.dateMainText, { color: theme.textPrimary }]}
                  >
                    {formatBSDateNepali(bsDate, true)}
                  </Text>
                  <Text
                    style={[styles.dateSubText, { color: theme.textSecondary }]}
                  >
                    {formatADDateFull(currentDateISO || todayISO)}
                  </Text>
                </View>
                <Text style={[styles.changeLink, { color: palette.accent }]}>
                  Change
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category Chips */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Category *
              </Text>
              <View style={styles.chipsWrap}>
                {categories.map((cat) => {
                  const selected = currentCategory === cat;
                  const activeColor =
                    currentType === 'income' ? '#16A34A' : '#DC2626';
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() =>
                        setValue('category', cat, { shouldValidate: true })
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? activeColor
                            : theme.inputBg,
                          borderColor: selected ? activeColor : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected ? '#FFFFFF' : theme.textPrimary,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Wallet / Ownership Scope */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Wallet / Ownership Scope *
              </Text>
              <View style={styles.chipsWrap}>
                {(['Personal', 'Family'] as const).map((sc) => {
                  const selected = currentScope === sc;
                  const activeCol = sc === 'Personal' ? '#2563EB' : '#7C3AED';
                  return (
                    <TouchableOpacity
                      key={sc}
                      onPress={() =>
                        setValue('accountScope', sc, { shouldValidate: true })
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? activeCol
                            : theme.inputBg,
                          borderColor: selected ? activeCol : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected ? '#FFFFFF' : theme.textPrimary,
                          },
                        ]}
                      >
                        {sc === 'Personal' ? 'Personal (Own)' : 'Family'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Payment Method Chips */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Payment Method *
              </Text>
              <View style={styles.chipsWrap}>
                {PAYMENT_METHODS.map((pm) => {
                  const selected = currentPayment === pm;
                  return (
                    <TouchableOpacity
                      key={pm}
                      onPress={() =>
                        setValue('paymentMethod', pm, { shouldValidate: true })
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? palette.accent
                            : theme.inputBg,
                          borderColor: selected ? palette.accent : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected ? '#FFFFFF' : theme.textPrimary,
                          },
                        ]}
                      >
                        {pm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes / Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Description & Notes (Optional)
              </Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Add additional details, invoice number, or remarks..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                )}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => {
                handleSubmit(onSubmit)();
              }}
              style={[
                styles.submitBtn,
                {
                  backgroundColor:
                    currentType === 'income' ? '#16A34A' : '#DC2626',
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {editingTransaction
                  ? 'Update Transaction'
                  : currentType === 'income'
                  ? 'Save Income'
                  : 'Save Expense'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <NepaliCalendarModal
          visible={showCalendar}
          selectedDateISO={currentDateISO || todayISO}
          onSelectDate={(iso) =>
            setValue('dateISO', iso, { shouldValidate: true })
          }
          onClose={() => setShowCalendar(false)}
          accentColor={currentType === 'income' ? '#16A34A' : '#DC2626'}
          title="Select Transaction Date"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '92%',
    borderTopWidth: 1,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  typeToggleRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 74,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  dateMainText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  changeLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
