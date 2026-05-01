import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Image,
  Alert, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { Text, Button, Chip, ActivityIndicator, Surface, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, ShoppingCart } from 'lucide-react-native';
import { useProduct, useAddToCart } from '@/hooks';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, getImageUrl } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';

const FOOTER_HEIGHT = 72; // fixed footer content height

export default function ProductDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const addToCartMutation = useAddToCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isWishlisted } = useWishlistStore();

  const { data: product, isLoading, error } = useProduct(params.id);
  const wishlisted = product ? isWishlisted(product.id) : false;

  // Reset quantity and active image when product changes
  useEffect(() => {
    setQuantity(1);
    setActiveImage(0);
  }, [params.id]);

  const handleToggleWishlist = () => {
    if (!product) return;
    wishlisted ? removeFromWishlist(product.id) : addToWishlist(product);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCartMutation.mutate(
      { productId: product.id, quantity },
      {
        onSuccess: () => {
          Alert.alert('Added to Cart', `${product.name} added to your cart`, [
            { text: 'Continue Shopping', style: 'cancel' },
            { text: 'View Cart', onPress: () => router.push('/(customer)/cart') },
          ]);
        },
        onError: (e: any) => Alert.alert('Error', e.message),
      }
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Product not found</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  const hasDiscount = !!product.discount_price && product.discount_price < product.price;
  const discountPercentage = hasDiscount
    ? Math.round((1 - product.discount_price! / product.price) * 100)
    : 0;
  const displayPrice = hasDiscount ? product.discount_price! : product.price;

  // Sort images by sort_order before rendering
  const images = product.images?.length
    ? [...product.images].sort((a, b) => a.sort_order - b.sort_order)
    : null;

  const imageHeight = Math.round(width * 0.75);
  const galleryHeight = imageHeight + insets.top;
  const footerTotalHeight = FOOTER_HEIGHT + insets.bottom + spacing.md;

  return (
    <View style={styles.container}>
      {/* Floating back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + spacing.sm }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ArrowLeft size={20} color={colors.text.primary} />
      </TouchableOpacity>

      {/* Floating wishlist button */}
      <TouchableOpacity
        style={[styles.wishlistBtn, { top: insets.top + spacing.sm }]}
        onPress={handleToggleWishlist}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Heart
          size={20}
          color={wishlisted ? colors.error : colors.text.primary}
          fill={wishlisted ? colors.error : 'transparent'}
        />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: footerTotalHeight + spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery — horizontal paging ScrollView avoids FlatList-in-ScrollView nesting */}
        <View style={[styles.imageGallery, { height: galleryHeight }]}>
          {images ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
                scrollEventThrottle={16}
              >
                {images.map((item) => (
                  <Image
                    key={item.id}
                    source={{ uri: getImageUrl(item.image_url) }}
                    style={{ width, height: galleryHeight }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.imageDots}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>🥬</Text>
            </View>
          )}

          {hasDiscount && (
            <View style={[styles.discountBadge, { top: insets.top + spacing.md }]}>
              <Text style={styles.discountText}>-{discountPercentage}%</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          {product.category && (
            <Chip style={styles.categoryChip} textStyle={styles.categoryChipText}>
              {product.category.name}
            </Chip>
          )}

          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, hasDiscount && styles.discountedPrice]}>
              {formatPrice(displayPrice)}
            </Text>
            <Text style={styles.unit}>/ {product.unit_type}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>
            )}
          </View>

          {/* Stock */}
          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: product.is_available ? colors.success : colors.error }]} />
            <Text style={[styles.stockText, { color: product.is_available ? colors.success : colors.error }]}>
              {product.is_available ? `${product.stock_quantity} in stock` : 'Out of stock'}
            </Text>
          </View>

          {/* Description */}
          {!!product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Seller */}
          <Surface style={styles.sellerCard} elevation={1}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>
                {product.seller?.full_name?.charAt(0).toUpperCase() || 'S'}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerLabel}>Sold by</Text>
              <Text style={styles.sellerName} numberOfLines={1}>
                {product.seller?.full_name || 'Local Seller'}
              </Text>
            </View>
          </Surface>
        </View>
      </ScrollView>

      {/* Footer — Add to Cart or Out of Stock */}
      <Surface
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
        elevation={8}
      >
        {product.is_available ? (
          <View style={styles.footerInner}>
            <View style={styles.quantityRow}>
              <IconButton
                icon="minus"
                mode="contained-tonal"
                size={18}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              />
              <Text style={styles.quantity}>{quantity}</Text>
              <IconButton
                icon="plus"
                mode="contained-tonal"
                size={18}
                onPress={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                disabled={quantity >= product.stock_quantity}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleAddToCart}
              loading={addToCartMutation.isPending}
              disabled={addToCartMutation.isPending}
              icon={() => <ShoppingCart size={16} color={colors.white} />}
              style={styles.addButton}
              contentStyle={styles.addButtonContent}
            >
              Add to Cart · {formatPrice(displayPrice * quantity)}
            </Button>
          </View>
        ) : (
          <View style={styles.outOfStockFooter}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
            <Text style={styles.outOfStockSub}>This item is currently unavailable</Text>
          </View>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    // Ensure we cover the full screen including status bar area
    // so no underlying navigator content bleeds through
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // Floating buttons
  backBtn: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  wishlistBtn: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Image gallery
  imageGallery: {
    backgroundColor: colors.primary[50],
    position: 'relative',
    // No top gap — image starts at absolute top of screen
    marginTop: 0,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 80,
    opacity: 0.35,
  },
  imageDots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white + '80',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 16,
  },
  discountBadge: {
    position: 'absolute',
    left: spacing.md,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Info section
  infoContainer: {
    padding: spacing.lg,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    backgroundColor: colors.primary[50],
  },
  categoryChipText: {
    color: colors.primary[600],
    fontSize: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    lineHeight: 30,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  price: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  discountedPrice: {
    color: colors.error,
  },
  unit: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.text.disabled,
    textDecorationLine: 'line-through',
    marginLeft: spacing.xs,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // Seller card
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  sellerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  sellerInfo: { flex: 1 },
  sellerLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: FOOTER_HEIGHT,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'center',
    color: colors.text.primary,
  },
  addButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  addButtonContent: {
    paddingVertical: spacing.sm,
  },

  // Out of stock footer
  outOfStockFooter: {
    height: FOOTER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  outOfStockSub: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
