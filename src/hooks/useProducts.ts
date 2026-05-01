import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

export function useProducts(categoryId?: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['products', categoryId, search],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:profiles!seller_id(id, full_name),
          category:categories(id, name),
          images:product_images(*)
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 19);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles!seller_id(id, full_name, phone),
          category:categories(id, name),
          images:product_images(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles!seller_id(id, full_name),
          images:product_images(*)
        `)
        .eq('is_available', true)
        .not('discount_price', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Product[];
    },
  });
}
