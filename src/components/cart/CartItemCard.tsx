import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import { formatPrice, getImageUrl } from '@/utils';
import { colors, borderRadius, spacing } from '@/constants/theme';

interface CartItemCardProps {
  item: {
    id: string;
    quantity: number;
    product?: {
      id: string;
      name: string;
      price: number;
      discount_price?: number;
      unit_type: string;
      images?: { image_url: string }[];
      stock_quantity: number;
    };
  };
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  const product = item.product;
  if (!product) return null;

  const imageUrl = product.images?.[0]?.image_url
    ? getImageUrl(product.images[0].image_url)
    : null;
  const hasDiscount = !!product.discount_price && product.discount_price < product.price;
  const itemPrice = hasDiscount ? product.discount_price! : product.price;
  const itemTotal = itemPrice * item.quantity;
  const isOutOfStock = product.stock_quantity < 1;

  return (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📷</Text>
            </View>
          )}
        </View>
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.price}>
            {formatPrice(itemPrice)} / {product.unit_type}
          </Text>
          <Text style={styles.total}>
            Total: {formatPrice(itemTotal)}
          </Text>
          {isOutOfStock && (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          )}
        </View>
        <IconButton
          icon="trash-can-outline"
          iconColor={colors.error}
          size={20}
          onPress={onRemove}
          style={styles.deleteButton}
        />
      </View>
      <View style={styles.quantityRow}>
        <IconButton
          icon="minus"
          mode="contained"
          size={16}
          onPress={() => onUpdateQuantity(item.quantity - 1)}
          disabled={item.quantity <= 1 || isOutOfStock}
        />
        <Text style={styles.quantity}>{item.quantity}</Text>
        <IconButton
          icon="plus"
          mode="contained"
          size={16}
          onPress={() => onUpdateQuantity(item.quantity + 1)}
          disabled={item.quantity >= product.stock_quantity || isOutOfStock}
        />
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    opacity: 0.5,
  },
  details: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  total: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  outOfStock: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
    marginTop: 4,
  },
  deleteButton: {
    margin: 0,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: spacing.lg,
    minWidth: 30,
    textAlign: 'center',
  },
});
