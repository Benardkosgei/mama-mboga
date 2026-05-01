export type UserRole = 'admin' | 'seller' | 'customer' | 'rider';

export interface Profile {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_approved?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  discount_price?: number;
  unit_type: string;
  stock_quantity: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  seller?: Profile;
  category?: Category;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface Cart {
  id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Address {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  street_address: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  address_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_status: PaymentStatus;
  payment_reference?: string;
  mpesa_receipt?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  address?: Address;
  items?: OrderItem[];
  delivery_assignment?: DeliveryAssignment;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  seller_id: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
  product?: Product;
  seller?: Profile;
}

export interface Payment {
  id: string;
  order_id: string;
  checkout_request_id: string;
  merchant_request_id?: string;
  phone: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  mpesa_receipt?: string;
  callback_received_at?: string;
  created_at: string;
}

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  rider_id: string;
  status: DeliveryStatus;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  rider?: Profile;
}

export type DeliveryStatus = 'assigned' | 'accepted' | 'rejected' | 'picked_up' | 'on_the_way' | 'delivered';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}
