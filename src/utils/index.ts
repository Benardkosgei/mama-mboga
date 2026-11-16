import { CURRENCY, DELIVERY_FEE } from '@/constants';

export const formatPrice = (price: number): string => {
  return `${CURRENCY} ${price.toLocaleString('en-KE')}`;
};

export const formatPhoneNumber = (phone: string): string => {
  // Convert 07XX format to +2547XX
  let formatted = phone.replace(/\s/g, '');
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  }
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  return formatted;
};

export const formatDeliveryPhone = (phone: string): string => {
  // Convert to 07XX format
  let formatted = phone.replace(/\s/g, '');
  if (formatted.startsWith('254')) {
    formatted = '0' + formatted.substring(3);
  }
  return formatted;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+?254|0)?[17]\d{8}$/.test(cleaned);
};

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `#${timestamp}${random}`.substring(0, 10);
};

export const calculateDeliveryFee = (
  distance: number,
  baseFee: number = DELIVERY_FEE
): number => {
  if (distance <= 5) return baseFee;
  return baseFee + Math.ceil((distance - 5) * 20);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const getImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${url}`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

export const formatWhatsAppMessage = (order: any): string => {
  const items = order.items
    ?.map(
      (item: any) =>
        `• ${item.product?.name} (${item.quantity}) - ${formatPrice(item.total)}`
    )
    .join('\n');

  return `ORDER ID: ${order.id.substring(0, 8).toUpperCase()}
CUSTOMER: ${order.customer?.full_name || 'N/A'}
PHONE: ${formatDeliveryPhone(order.customer?.phone || '')}
LOCATION: ${order.address?.street_address || 'N/A'}
TOTAL: ${formatPrice(order.total)}

ITEMS:
${items}

PAYMENT: ${order.payment_status.toUpperCase()} ${
    order.mpesa_receipt ? `(MPESA CODE: ${order.mpesa_receipt})` : ''
  }

${order.items?.[0]?.seller ? `SELLER: ${order.items[0].seller.full_name}` : ''}

Please assign a rider.`;
};
