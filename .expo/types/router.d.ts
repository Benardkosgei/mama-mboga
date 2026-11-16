/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(admin)` | `/(admin)/account` | `/(admin)/categories` | `/(admin)/dashboard` | `/(admin)/orders` | `/(admin)/payments` | `/(admin)/products` | `/(admin)/riders` | `/(admin)/users` | `/(auth)` | `/(auth)/forgot-password` | `/(auth)/login` | `/(auth)/register` | `/(auth)/reset-password` | `/(customer)` | `/(customer)/account-management` | `/(customer)/addresses` | `/(customer)/cart` | `/(customer)/categories` | `/(customer)/checkout` | `/(customer)/home` | `/(customer)/legal` | `/(customer)/notification-preferences` | `/(customer)/notifications` | `/(customer)/orders` | `/(customer)/payment` | `/(customer)/payment-settings` | `/(customer)/profile` | `/(customer)/search` | `/(customer)/wishlist` | `/(rider)` | `/(rider)/dashboard` | `/(rider)/deliveries` | `/(rider)/earnings` | `/(rider)/profile` | `/(seller)` | `/(seller)/add-product` | `/(seller)/dashboard` | `/(seller)/orders` | `/(seller)/products` | `/(seller)/profile` | `/_sitemap` | `/account` | `/account-management` | `/add-product` | `/addresses` | `/cart` | `/categories` | `/checkout` | `/dashboard` | `/deliveries` | `/earnings` | `/forgot-password` | `/home` | `/legal` | `/login` | `/notification-preferences` | `/notifications` | `/orders` | `/payment` | `/payment-settings` | `/payments` | `/products` | `/profile` | `/register` | `/reset-password` | `/riders` | `/search` | `/users` | `/wishlist`;
      DynamicRoutes: `/(admin)/order/${Router.SingleRoutePart<T>}` | `/(customer)/order/${Router.SingleRoutePart<T>}` | `/(customer)/product/${Router.SingleRoutePart<T>}` | `/(rider)/delivery/${Router.SingleRoutePart<T>}` | `/(seller)/order/${Router.SingleRoutePart<T>}` | `/delivery/${Router.SingleRoutePart<T>}` | `/order/${Router.SingleRoutePart<T>}` | `/product/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/(admin)/order/[id]` | `/(customer)/order/[id]` | `/(customer)/product/[id]` | `/(rider)/delivery/[id]` | `/(seller)/order/[id]` | `/delivery/[id]` | `/order/[id]` | `/product/[id]`;
    }
  }
}
