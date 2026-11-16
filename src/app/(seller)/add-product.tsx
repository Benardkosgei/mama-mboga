import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Text, Button, Surface, TextInput, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useCategories } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { getImageUrl } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { UNIT_TYPES, MAX_PRODUCT_IMAGES } from '@/constants';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

function SelectField({
  label, value, placeholder, options, onSelect, required,
}: {
  label: string; value: string; placeholder: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <TouchableOpacity
        style={styles.selectField}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectContent}>
          <Text style={styles.selectLabel}>{label}{required ? ' *' : ''}</Text>
          <Text style={[styles.selectValue, !selected && styles.selectPlaceholder]}>
            {selected ? selected.label : placeholder}
          </Text>
        </View>
        <Text style={styles.selectArrow}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, item.value === value && styles.modalOptionSelected]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalOptionText, item.value === value && styles.modalOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// Images can be existing (from DB, have a url) or new (picked locally, have a uri)
type ExistingImage = { type: 'existing'; id: string; url: string; sort_order: number };
type NewImage = { type: 'new'; uri: string };
type ProductImage = ExistingImage | NewImage;

export default function AddProduct() {
  const router = useRouter();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!editId;

  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unitType, setUnitType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  const categoryOptions = (categories || []).map((c) => ({ label: c.name, value: c.id }));
  const unitOptions = UNIT_TYPES.map((u) => ({ label: u.label, value: u.value }));

  // Load existing product when editing
  const { data: existingProduct, isLoading: loadingProduct } = useQuery({
    queryKey: ['product-edit', editId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, images:product_images(*)')
        .eq('id', editId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
    staleTime: 0,
  });

  // Populate form once data is loaded — useEffect avoids setState-in-render infinite loop
  useEffect(() => {
    if (!existingProduct) return;
    setName(existingProduct.name || '');
    setDescription(existingProduct.description || '');
    setPrice(String(existingProduct.price || ''));
    setDiscountPrice(existingProduct.discount_price ? String(existingProduct.discount_price) : '');
    setStockQuantity(String(existingProduct.stock_quantity || ''));
    setUnitType(existingProduct.unit_type || '');
    setSelectedCategory(existingProduct.category_id || '');
    setIsAvailable(existingProduct.is_available ?? true);
    setImages(
      (existingProduct.images || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((img: any): ExistingImage => ({ type: 'existing', id: img.id, url: img.image_url, sort_order: img.sort_order }))
    );
  }, [existingProduct]);

  const uploadImage = async (uri: string, productId: string, index: number) => {
    // Compress and resize before upload — keeps uploads fast and storage lean
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // max 800px wide, height auto-scales
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );

    const fileName = `${productId}/${Date.now()}_${index}.jpg`;
    const response = await fetch(compressed.uri);
    const arrayBuffer = await response.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated');

      const payload = {
        category_id: selectedCategory,
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        discount_price: discountPrice ? parseFloat(discountPrice) : null,
        unit_type: unitType,
        stock_quantity: parseInt(stockQuantity, 10),
        is_available: isAvailable,
      };

      let productId = editId!;

      if (isEditing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editId);
        if (error) throw error;

        // Delete removed images
        if (deletedImageIds.length > 0) {
          await supabase.from('product_images').delete().in('id', deletedImageIds);
        }
      } else {
        const { data: product, error } = await supabase
          .from('products')
          .insert({ ...payload, seller_id: profile.id })
          .select()
          .single();
        if (error) throw error;
        productId = product.id;
      }

      // Upload new images
      const newImages = images.filter((img): img is NewImage => img.type === 'new');
      const existingCount = images.filter((img) => img.type === 'existing').length;

      for (let i = 0; i < newImages.length; i++) {
        try {
          const publicUrl = await uploadImage(newImages[i].uri, productId, existingCount + i);
          await supabase.from('product_images').insert({
            product_id: productId,
            image_url: publicUrl,
            sort_order: existingCount + i,
          });
        } catch (imgErr: any) {
          console.warn('Image upload error:', imgErr.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', editId] });
      Alert.alert('Success', isEditing ? 'Product updated!' : 'Product added!', [
        { text: 'OK', onPress: () => router.replace('/(seller)/products') },
      ]);
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Failed to save product'),
  });

  const pickImage = async () => {
    if (images.length >= MAX_PRODUCT_IMAGES) {
      Alert.alert('Limit reached', `Max ${MAX_PRODUCT_IMAGES} images`);
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose a source',
      [
        {
          text: '📷 Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please allow camera access to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1,
            });
            if (!result.canceled) {
              setImages([...images, { type: 'new', uri: result.assets[0].uri }]);
            }
          },
        },
        {
          text: '🖼️ Choose from Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please allow access to your photo library.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1,
            });
            if (!result.canceled) {
              setImages([...images, { type: 'new', uri: result.assets[0].uri }]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const removeImage = (index: number) => {
    const img = images[index];
    if (img.type === 'existing') {
      setDeletedImageIds([...deletedImageIds, img.id]);
    }
    setImages(images.filter((_, i) => i !== index));
  };

  const isValid = name.trim() && price && selectedCategory && stockQuantity && unitType;

  if (isEditing && loadingProduct) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Images */}
      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Product Images</Text>
        <View style={styles.imagesGrid}>
          {images.map((img, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image
                source={{ uri: img.type === 'existing' ? getImageUrl(img.url) : img.uri }}
                style={styles.imageThumb}
              />
              <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(index)}>
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {images.length < MAX_PRODUCT_IMAGES && (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Text style={styles.addImageIcon}>📷</Text>
              <Text style={styles.addImageText}>Camera / Library</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.imageHint}>{images.length}/{MAX_PRODUCT_IMAGES} images</Text>
      </Surface>

      {/* Basic Info */}
      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <TextInput mode="outlined" label="Product Name *" value={name} onChangeText={setName} style={styles.input} />
        <TextInput mode="outlined" label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={styles.input} />
        <SelectField
          label="Category"
          value={selectedCategory}
          placeholder="Select a category"
          options={categoryOptions}
          onSelect={setSelectedCategory}
          required
        />
      </Surface>

      {/* Pricing */}
      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Pricing & Unit</Text>
        <View style={styles.row}>
          <TextInput mode="outlined" label="Price (KES) *" value={price} onChangeText={setPrice} keyboardType="numeric" style={[styles.input, styles.halfInput]} />
          <TextInput mode="outlined" label="Sale Price" value={discountPrice} onChangeText={setDiscountPrice} keyboardType="numeric" style={[styles.input, styles.halfInput]} />
        </View>
        <SelectField
          label="Unit Type"
          value={unitType}
          placeholder="Select unit (kg, piece, bunch…)"
          options={unitOptions}
          onSelect={setUnitType}
          required
        />
      </Surface>

      {/* Stock */}
      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Stock</Text>
        <TextInput mode="outlined" label="Stock Quantity *" value={stockQuantity} onChangeText={setStockQuantity} keyboardType="numeric" style={styles.input} />
        <View style={styles.availabilityRow}>
          <Text style={styles.label}>Available for sale</Text>
          <Chip
            selected={isAvailable}
            onPress={() => setIsAvailable(!isAvailable)}
            style={{ backgroundColor: isAvailable ? colors.success + '20' : colors.error + '20' }}
          >
            {isAvailable ? '✓ In Stock' : '✗ Unavailable'}
          </Chip>
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
        disabled={!isValid || saveMutation.isPending}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Product'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { margin: spacing.md, marginBottom: 0, padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  imageWrapper: { position: 'relative' },
  imageThumb: { width: 80, height: 80, borderRadius: borderRadius.md },
  removeImage: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },
  addImageButton: { width: 80, height: 80, borderRadius: borderRadius.md, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary[300] },
  addImageIcon: { fontSize: 24 },
  addImageText: { fontSize: 10, color: colors.primary[500], marginTop: 2 },
  imageHint: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.sm },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  row: { flexDirection: 'row', gap: spacing.md },
  halfInput: { flex: 1 },
  availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  submitButton: { margin: spacing.md, marginTop: spacing.lg, borderRadius: borderRadius.md },
  submitButtonContent: { paddingVertical: spacing.sm },
  selectField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.surface, marginBottom: spacing.md },
  selectContent: { flex: 1 },
  selectLabel: { fontSize: 11, color: colors.text.secondary, marginBottom: 2 },
  selectValue: { fontSize: 15, color: colors.text.primary, fontWeight: '500' },
  selectPlaceholder: { color: colors.text.disabled, fontWeight: 'normal' },
  selectArrow: { fontSize: 14, color: colors.text.secondary, marginLeft: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '70%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  modalOptionSelected: { backgroundColor: colors.primary[50] },
  modalOptionText: { flex: 1, fontSize: 15, color: colors.text.primary },
  modalOptionTextSelected: { color: colors.primary[600], fontWeight: '600' },
  checkmark: { fontSize: 16, color: colors.primary[500] },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
});
