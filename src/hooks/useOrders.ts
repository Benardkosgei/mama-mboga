import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';
import type { Order } from '@/types';

export function useOrders() {
  const queryClient = useQueryClient();
  // Keep a stable ref so the effect closure never captures a stale queryClient
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    // Subscribe once per mount — the channel name is unique so Supabase won't
    // create duplicate subscriptions even if the hook is used in multiple places.
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          queryClientRef.current.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // empty — subscribe once, clean up on unmount

  return useInfiniteQuery({
    queryKey: ['orders'],
    queryFn: async ({ pageParam = 0 }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          address:addresses(*),
          items:order_items(
            *,
            product:products(id, name, images:product_images(*))
          ),
          delivery_assignment:delivery_assignments(
            *,
            rider:profiles!rider_id(id, full_name, phone)
          )
        `
        )
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 19);

      if (error) throw error;
      return data as Order[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          customer:profiles!customer_id(id, full_name, phone),
          address:addresses(*),
          items:order_items(
            *,
            product:products(id, name, images:product_images(*)),
            seller:profiles!seller_id(id, full_name)
          ),
          delivery_assignment:delivery_assignments(
            *,
            rider:profiles!rider_id(id, full_name, phone)
          )
        `
        )
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Order;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderData: {
      addressId: string;
      subtotal: number;
      deliveryFee: number;
      total: number;
      notes?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get cart items
      const { data: cartData } = await supabase
        .from('carts')
        .select('items:cart_items(*, product:products(*))')
        .eq('customer_id', user.id)
        .maybeSingle();

      if (!cartData?.items?.length) {
        throw new Error('Cart is empty');
      }

      // Generate order number
      const orderNumber = `#${Date.now().toString(36).toUpperCase()}${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          address_id: orderData.addressId,
          subtotal: orderData.subtotal,
          delivery_fee: orderData.deliveryFee,
          total: orderData.total,
          notes: orderData.notes,
          status: 'pending_payment',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartData.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        seller_id: item.product.seller_id,
        quantity: item.quantity,
        price: item.product.discount_price || item.product.price,
        total: (item.product.discount_price || item.product.price) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Decrement stock for each product
      for (const item of cartData.items) {
        await supabase.rpc('decrement_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }

      // Clear cart — collect all unique cart_ids to handle edge cases
      const cartIds = [...new Set(cartData.items.map((i: any) => i.cart_id))];
      for (const cartId of cartIds) {
        await supabase.from('cart_items').delete().eq('cart_id', cartId);
      }

      // Notify customer that order was placed
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Order Placed',
        body: `Your order ${order.order_number} has been placed successfully.`,
        data: { orderId: order.id, type: 'order_placed' },
      });

      return order;
    },
    onSuccess: () => {
      // Invalidate cart so UI clears immediately, and orders list for history
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
