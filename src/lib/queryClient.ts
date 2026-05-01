import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000,   // 30 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const CACHE_KEYS = {
  categories: ['categories'],
  products: ['products'],
  product: (id: string) => ['product', id],
  cart: ['cart'],
  orders: ['orders'],
  order: (id: string) => ['order', id],
  profile: ['profile'],
  addresses: ['addresses'],
  notifications: ['notifications'],
} as const;
