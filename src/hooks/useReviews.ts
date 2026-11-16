import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ProductReview } from '@/types';

/** Fetch all reviews for a product, newest first. */
export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, customer:profiles!customer_id(id, full_name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductReview[];
    },
    enabled: !!productId,
  });
}

/** Fetch the average rating and count for a product. */
export function useProductRating(productId: string) {
  return useQuery({
    queryKey: ['product-rating', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_rating_summary')
        .select('avg_rating, review_count')
        .eq('product_id', productId)
        .maybeSingle();
      if (error) return { avg_rating: 0, review_count: 0 };
      return data ?? { avg_rating: 0, review_count: 0 };
    },
    enabled: !!productId,
  });
}

/** Check whether the current user has already reviewed a product. */
export function useMyReview(productId: string) {
  return useQuery({
    queryKey: ['my-review', productId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('customer_id', user.id)
        .maybeSingle();
      return data as ProductReview | null;
    },
    enabled: !!productId,
  });
}

/** Submit or update a review. One review per customer per product. */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      rating,
      comment,
    }: {
      productId: string;
      rating: number;
      comment?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('product_reviews')
        .upsert(
          {
            product_id: productId,
            customer_id: user.id,
            rating,
            comment: comment?.trim() || null,
          },
          // Unique constraint is now (product_id, customer_id)
          { onConflict: 'product_id,customer_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rating', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['my-review', variables.productId] });
    },
  });
}
