import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, SegmentedButtons, Surface } from 'react-native-paper';
import { colors, spacing, borderRadius } from '@/constants/theme';

const TERMS = `Last updated: January 2025

1. ACCEPTANCE OF TERMS
By downloading or using Mama Mboga, you agree to these Terms of Service. If you do not agree, do not use the app.

2. DESCRIPTION OF SERVICE
Mama Mboga is a marketplace connecting customers with local produce sellers in Kenya. We facilitate transactions but are not a party to the sale between buyers and sellers.

3. USER ACCOUNTS
You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. Notify us immediately of any unauthorized access.

4. SELLER OBLIGATIONS
Sellers must list only products they own and can legally sell. Product descriptions and images must be accurate. Sellers are responsible for fulfilling orders they accept.

5. PAYMENTS
Payments are processed via M-Pesa (Safaricom). By initiating a payment, you authorize the charge to your M-Pesa account. Refunds for cancelled orders are processed within 3–5 business days.

6. DELIVERY
Delivery fees are charged per order. Delivery times are estimates and may vary. Mama Mboga is not liable for delays caused by third parties.

7. PROHIBITED CONDUCT
You may not use the platform to sell counterfeit, illegal, or harmful products. Harassment of other users, sellers, or riders is prohibited. Fraudulent transactions will result in account termination.

8. LIMITATION OF LIABILITY
Mama Mboga is not liable for indirect, incidental, or consequential damages arising from use of the platform. Our total liability shall not exceed the amount paid for the specific transaction in dispute.

9. CHANGES TO TERMS
We may update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.

10. CONTACT
For questions about these terms, contact us at support@mamamboga.co.ke`;

const PRIVACY = `Last updated: January 2025

1. INFORMATION WE COLLECT
- Account information: name, phone number, email address
- Location data: delivery addresses you provide
- Transaction data: orders, payments, delivery history
- Device data: push notification tokens, device type

2. HOW WE USE YOUR INFORMATION
- To process and fulfill your orders
- To send order status notifications
- To improve our services
- To prevent fraud and ensure platform security

3. SHARING YOUR INFORMATION
We share your information with:
- Sellers: to fulfill your orders (name, delivery address, phone)
- Riders: to complete deliveries (name, delivery address, phone)
- Safaricom: to process M-Pesa payments (phone number, amount)

We do not sell your personal data to third parties.

4. DATA RETENTION
We retain your account data for as long as your account is active. Order history is retained for 7 years for legal and tax compliance. You may request deletion of your account at any time.

5. SECURITY
We use industry-standard encryption to protect your data. Sensitive credentials are stored using device-level secure storage (Expo SecureStore). We cannot guarantee absolute security of data transmitted over the internet.

6. YOUR RIGHTS
You have the right to:
- Access the personal data we hold about you
- Correct inaccurate data
- Request deletion of your account and data
- Opt out of promotional notifications

7. COOKIES & ANALYTICS
The app does not use browser cookies. We may collect anonymized usage analytics to improve the service.

8. CHILDREN'S PRIVACY
Mama Mboga is not intended for users under 18 years of age. We do not knowingly collect data from minors.

9. CHANGES TO THIS POLICY
We may update this policy periodically. We will notify you of significant changes via the app.

10. CONTACT
For privacy concerns, contact: privacy@mamamboga.co.ke`;

export default function LegalScreen() {
  const [tab, setTab] = useState('terms');

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'terms', label: 'Terms of Service' },
          { value: 'privacy', label: 'Privacy Policy' },
        ]}
        style={styles.tabs}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.body}>{tab === 'terms' ? TERMS : PRIVACY}</Text>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { margin: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  body: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
