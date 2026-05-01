import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { formatPrice, getImageUrl } from '@/utils';
import { colors, borderRadius, spacing } from '@/constants/theme';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    unit_type: string;
    images?: { image_url: string }[];
    seller?: { full_name: string };
  };
  onPress: () => void;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, compact = false }) => {
  const { width } = useWindowDimensions();
  const imageUrl = product.images?.[0]?.image_url
    ? getImageUrl(product.images[0].image_url)
    : null;
  const hasDiscount = !!product.discount_price && product.discount_price < product.price;
  const discountPercentage = hasDiscount
    ? Math.round((1 - product.discount_price! / product.price) * 100)
    : 0;

  if (compact) {
    // Fluid: fills whatever container it's placed in
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.compactWrapper}>
        <Surface style={styles.compactCard} elevation={1}>
          <View style={styles.compactImageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.compactImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            )}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discountPercentage}%</Text>
              </View>
            )}
          </View>
          <View style={styles.compactContent}>
            <Text style={styles.compactName} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.priceRow}>
              <Text style={hasDiscount ? styles.discountedPrice : styles.price} numberOfLines={1}>
                {formatPrice(hasDiscount ? product.discount_price! : product.price)}
              </Text>
              <Text style={styles.unit}> / {product.unit_type}</Text>
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  }

  // Horizontal list card — fixed width
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📷</Text>
            </View>
          )}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPercentage}%</Text>
            </View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.seller} numberOfLines={1}>
            {product.seller?.full_name || 'Local Seller'}
          </Text>
          <View style={styles.priceRow}>
            <Text style={hasDiscount ? styles.discountedPrice : styles.price}>
              {formatPrice(hasDiscount ? product.discount_price! : product.price)}
            </Text>
            <Text style={styles.unit}> / {product.unit_type}</Text>
          </View>
          {hasDiscount && (
            <Text style={styles.originalPrice}>
              {formatPrice(product.price)}
            </Text>
          )}
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Horizontal list card — fixed width
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    width: 180,
    marginRight: spacing.md,
  },
  // Compact: wrapper fills the grid cell, card fills the wrapper
  compactWrapper: {
    flex: 1,
  },
  compactCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 140,
    backgroundColor: colors.border,
    position: 'relative',
  },
  compactImageContainer: {
    height: 110,
    backgroundColor: colors.border,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  compactImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  placeholderText: {
    fontSize: 32,
    opacity: 0.5,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    padding: spacing.sm,
  },
  compactContent: {
    padding: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  seller: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  discountedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.error,
  },
  unit: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.text.disabled,
    textDecorationLine: 'line-through',
  },
});
