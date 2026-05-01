export const UNIT_TYPES = [
  { label: 'Kilogram', value: 'kg' },
  { label: 'Gram', value: 'g' },
  { label: 'Piece', value: 'piece' },
  { label: 'Bunch', value: 'bunch' },
  { label: 'Tray', value: 'tray' },
  { label: 'Crate', value: 'crate' },
  { label: 'Bag', value: 'bag' },
  { label: 'Bundle', value: 'bundle' },
  { label: 'Dozen', value: 'dozen' },
  { label: 'Peck', value: 'peck' },
  { label: 'Gourd', value: 'gourd' },
  { label: 'Tin', value: 'tin' },
] as const;

export const ORDER_STATUSES = {
  pending_payment: { label: 'Pending Payment', color: '#FFA726' },
  paid: { label: 'Paid', color: '#42A5F5' },
  processing: { label: 'Processing', color: '#7E57C2' },
  dispatched: { label: 'Dispatched', color: '#26A69A' },
  out_for_delivery: { label: 'Out for Delivery', color: '#66BB6A' },
  delivered: { label: 'Delivered', color: '#2E7D32' },
  cancelled: { label: 'Cancelled', color: '#EF5350' },
} as const;

export const DELIVERY_STATUSES = {
  assigned: { label: 'Assigned', color: '#FFA726' },
  accepted: { label: 'Accepted', color: '#42A5F5' },
  rejected: { label: 'Rejected', color: '#EF5350' },
  picked_up: { label: 'Picked Up', color: '#7E57C2' },
  on_the_way: { label: 'On The Way', color: '#66BB6A' },
  delivered: { label: 'Delivered', color: '#2E7D32' },
} as const;

export const DELIVERY_FEE = 50; // KES

export const CURRENCY = 'KES';

export const MAX_PRODUCT_IMAGES = 5;

export const ITEMS_PER_PAGE = 20;

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
