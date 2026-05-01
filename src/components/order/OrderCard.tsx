import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { formatPrice } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, borderRadius, spacing } from '@/constants/theme';
import type { Order } from '@/types';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  showActions?: boolean;
  onUpdateStatus?: (status: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  showActions = false,
  onUpdateStatus,
}) => {
  const statusInfo = ORDER_STATUSES[order.status] || { label: order.status, color: colors.text.secondary };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.header}>
          <View>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <Text style={styles.date}>
              {new Date(order.created_at).toLocaleDateString('en-KE', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          <Chip
            style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}
            textStyle={[styles.statusText, { color: statusInfo.color }]}
          >
            {statusInfo.label}
          </Chip>
        </View>

        <View style={styles.items}>
          <Text style={styles.itemsLabel}>
            {order.items?.length || 0} item(s)
          </Text>
          <Text style={styles.itemsPreview}>
            {order.items?.slice(0, 2).map((item) => item.product?.name).join(', ')}
            {order.items?.length > 2 && ` +${order.items.length - 2} more`}
          </Text>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatPrice(order.total)}</Text>
          </View>
          {order.payment_status === 'completed' && (
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>PAID</Text>
              {order.mpesa_receipt && (
                <Text style={styles.receiptText}>{order.mpesa_receipt}</Text>
              )}
            </View>
          )}
        </View>

        {showActions && onUpdateStatus && (
          <View style={styles.actions}>
            {order.status === 'paid' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onUpdateStatus('processing')}
              >
                <Text style={styles.actionText}>Start Processing</Text>
              </TouchableOpacity>
            )}
            {order.status === 'processing' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onUpdateStatus('dispatched')}
              >
                <Text style={styles.actionText}>Mark Dispatched</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  date: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  items: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  itemsLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  itemsPreview: {
    fontSize: 14,
    color: colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  paidBadge: {
    alignItems: 'flex-end',
  },
  paidText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.success,
  },
  receiptText: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  actions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionText: {
    color: colors.white,
    fontWeight: '600',
  },
});
