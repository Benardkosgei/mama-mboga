/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(admin)` | `/(admin)/categories` | `/(admin)/dashboard` | `/(admin)/orders` | `/(admin)/payments` | `/(admin)/products` | `/(admin)/riders` | `/(admin)/users` | `/(auth)` | `/(auth)/login` | `/(auth)/otp` | `/(auth)/register` | `/(customer)` | `/(customer)/account-management` | `/(customer)/addresses` | `/(customer)/cart` | `/(customer)/categories` | `/(customer)/checkout` | `/(customer)/home` | `/(customer)/notification-preferences` | `/(customer)/notifications` | `/(customer)/orders` | `/(customer)/payment` | `/(customer)/payment-settings` | `/(customer)/profile` | `/(customer)/search` | `/(customer)/wishlist` | `/(rider)` | `/(rider)/dashboard` | `/(rider)/deliveries` | `/(rider)/earnings` | `/(rider)/profile` | `/(seller)` | `/(seller)/add-product` | `/(seller)/dashboard` | `/(seller)/orders` | `/(seller)/products` | `/(seller)/profile` | `/_sitemap` | `/account-management` | `/add-product` | `/addresses` | `/cart` | `/categories` | `/checkout` | `/dashboard` | `/deliveries` | `/earnings` | `/home` | `/login` | `/notification-preferences` | `/notifications` | `/orders` | `/otp` | `/payment` | `/payment-settings` | `/payments` | `/products` | `/profile` | `/register` | `/riders` | `/search` | `/users` | `/wishlist`;
      DynamicRoutes: `/(admin)/order/${Router.SingleRoutePart<T>}` | `/(customer)/order/${Router.SingleRoutePart<T>}` | `/(customer)/product/${Router.SingleRoutePart<T>}` | `/(rider)/delivery/${Router.SingleRoutePart<T>}` | `/delivery/${Router.SingleRoutePart<T>}` | `/order/${Router.SingleRoutePart<T>}` | `/product/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/(admin)/order/[id]` | `/(customer)/order/[id]` | `/(customer)/product/[id]` | `/(rider)/delivery/[id]` | `/delivery/[id]` | `/order/[id]` | `/product/[id]`;
    }
  }
}
