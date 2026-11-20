import React, { useEffect, useState } from 'react';
import {
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import {
  Calendar,
  Camera,
  Check,
  Image as ImageIcon,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  ItemStatus,
  PersonalItem,
  itemSchema,
} from '../types';
import { useVaultStore } from '../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../theme/colors';
import {
  adToBs,
  formatADDateFull,
  formatBSDateNepali,
  getNowInNPT,
} from '../utils/nepaliDate';
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '../utils/numberInput';
import { NepaliCalendarModal } from './NepaliCalendarModal';

interface ItemFormModalProps {
  visible: boolean;
  editingItem?: PersonalItem | null;
  onClose: () => void;
}

interface ItemFormValues {
  name: string;
  description: string;
  category: string;
  purchasePrice: number;
  purchaseDateISO: string;
  quantity: number;
  imageUri: string;
  location: string;
  status: ItemStatus;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  visible,
  editingItem = null,
  onClose,
}) => {
  const { settings, addItem, editItem, isSubmitting } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('items', isDark);

  const [showCalendar, setShowCalendar] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [historyNote, setHistoryNote] = useState('');

  const todayISO = getNowInNPT().isoDate;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      description: '',
      category: ITEM_CATEGORIES[0],
      purchasePrice: 0,
      purchaseDateISO: todayISO,
      quantity: 1,
      imageUri: '',
      location: '',
      status: 'Owned',
    },
  });

  const currentDateISO = watch('purchaseDateISO');
  const currentCategory = watch('category');
  const currentStatus = watch('status');
  const currentImageUri = watch('imageUri');

  useEffect(() => {
    if (visible) {
      if (editingItem) {
        reset({
          name: editingItem.name,
          description: editingItem.description || '',
          category: editingItem.category,
          purchasePrice: editingItem.purchasePrice,
          purchaseDateISO: editingItem.purchaseDateISO,
          quantity: editingItem.quantity,
          imageUri: editingItem.imageUri || '',
          location: editingItem.location,
          status: editingItem.status,
        });
        setPriceInput(String(editingItem.purchasePrice));
        setQtyInput(String(editingItem.quantity));
        setHistoryNote('');
      } else {
        reset({
          name: '',
          description: '',
          category: ITEM_CATEGORIES[0],
          purchasePrice: 0,
          purchaseDateISO: getNowInNPT().isoDate,
          quantity: 1,
          imageUri: '',
          location: '',
          status: 'Owned',
        });
        setPriceInput('');
        setQtyInput('1');
        setHistoryNote('');
      }
    }
  }, [visible, editingItem, reset]);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          setValue('imageUri', res.assets[0].uri);
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          setValue('imageUri', res.assets[0].uri);
        }
      }
    } catch {
      // ignore if cancelled
    }
  };

  const onSubmit = async (values: ItemFormValues) => {
    try {
      if (editingItem) {
        await editItem(editingItem.id, values, historyNote || undefined);
      } else {
        await addItem(values, historyNote || undefined);
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
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {editingItem ? 'Edit Personal Item' : 'Add Personal Item'}
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
            {/* Status Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Item Status *
              </Text>
              <View style={styles.chipsWrap}>
                {ITEM_STATUSES.map((st) => {
                  const selected = currentStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      onPress={() =>
                        setValue('status', st, { shouldValidate: true })
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
                          { color: selected ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Item Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Item Name *
              </Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder='e.g., MacBook Pro 14", Passport, DSLR Lens'
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary,
                        borderColor: errors.name ? '#DC2626' : theme.border,
                      },
                    ]}
                  />
                )}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name.message}</Text>
              )}
            </View>

            {/* Location & Quantity Row */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Location / Holder *
                </Text>
                <Controller
                  control={control}
                  name="location"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="e.g., Study Desk, Lent to Suman"
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.inputBg,
                          color: theme.textPrimary,
                          borderColor: errors.location
                            ? '#DC2626'
                            : theme.border,
                        },
                      ]}
                    />
                  )}
                />
                {errors.location && (
                  <Text style={styles.errorText}>{errors.location.message}</Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Quantity *
                </Text>
                <TextInput
                  value={qtyInput}
                  onChangeText={(txt) => {
                    const { text, value } = sanitizeIntegerInput(txt, 1);
                    setQtyInput(text);
                    setValue('quantity', value, {
                      shouldValidate: true,
                    });
                  }}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.inputBg,
                      color: theme.textPrimary,
                      borderColor: errors.quantity ? '#DC2626' : theme.border,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Purchase Price */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Purchase Price / Value ({settings.currency})
              </Text>
              <TextInput
                value={priceInput}
                onChangeText={(txt) => {
                  const { text, value } = sanitizeDecimalInput(txt);
                  setPriceInput(text);
                  setValue('purchasePrice', value, {
                    shouldValidate: true,
                  });
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>

            {/* Purchase Date (BS / AD) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Purchase / Record Date (BS / AD)
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

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Category *
              </Text>
              <View style={styles.chipsWrap}>
                {ITEM_CATEGORIES.map((cat) => {
                  const selected = currentCategory === cat;
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
                            ? palette.accent
                            : theme.inputBg,
                          borderColor: selected ? palette.accent : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Item Photo / Image */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Item Photo (Optional)
              </Text>
              {currentImageUri ? (
                <View style={styles.imagePreviewRow}>
                  <Image
                    source={{ uri: currentImageUri }}
                    style={styles.previewImg}
                  />
                  <TouchableOpacity
                    onPress={() => setValue('imageUri', '')}
                    style={[
                      styles.removeImgBtn,
                      { backgroundColor: theme.expenseBg },
                    ]}
                  >
                    <Trash2 size={16} color="#DC2626" />
                    <Text style={styles.removeImgText}>Remove Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoBtnsRow}>
                  <TouchableOpacity
                    onPress={() => handlePickImage(false)}
                    style={[
                      styles.photoActionBtn,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ImageIcon size={16} color={palette.accent} />
                    <Text
                      style={[
                        styles.photoActionText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Choose Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePickImage(true)}
                    style={[
                      styles.photoActionBtn,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Camera size={16} color={palette.accent} />
                    <Text
                      style={[
                        styles.photoActionText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Description & Serial Info
              </Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Serial number, warranty info, condition..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                    numberOfLines={2}
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

            {/* History Log Note */}
            {editingItem && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  History Log Note (for status/location change)
                </Text>
                <TextInput
                  value={historyNote}
                  onChangeText={setHistoryNote}
                  placeholder="e.g., Returned by Suman in good condition"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.inputBg,
                      color: theme.textPrimary,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>
            )}

            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => {
                handleSubmit(onSubmit)();
              }}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: palette.accent,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {editingItem ? 'Update Item' : 'Save Item'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <NepaliCalendarModal
          visible={showCalendar}
          selectedDateISO={currentDateISO || todayISO}
          onSelectDate={(iso) =>
            setValue('purchaseDateISO', iso, { shouldValidate: true })
          }
          onClose={() => setShowCalendar(false)}
          accentColor={palette.accent}
          title="Select Purchase Date"
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
  fieldGroup: {
    marginBottom: 14,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
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
    minHeight: 68,
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
  photoBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewImg: {
    width: 68,
    height: 68,
    borderRadius: 14,
  },
  removeImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  removeImgText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
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
