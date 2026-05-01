import axios from 'axios';

interface MpesaTokenResponse {
  access_token: string;
  expires_in: number;
}

interface MpesaStkPushRequest {
  phone: string;
  amount: number;
  orderId: string;
  callbackUrl?: string;
}

interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

class MpesaService {
  private consumerKey: string;
  private consumerSecret: string;
  private shortcode: string;
  private passkey: string;
  private callbackUrl: string;
  private environment: 'sandbox' | 'production';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.shortcode = process.env.MPESA_SHORTCODE || '';
    this.passkey = process.env.MPESA_PASSKEY || '';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || '';
    this.environment = (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
  }

  private getBaseUrl(): string {
    return this.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
  }

  private getAuthUrl(): string {
    return this.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?request_by=1'
      : 'https://api.safaricom.co.ke/oauth/v1/generate?request_by=1';
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    const response = await axios.get<MpesaTokenResponse>(this.getAuthUrl(), {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      params: {
        grant_type: 'client_credentials',
      },
    });

    this.accessToken = response.data.access_token;
    // Token usually expires in 3600 seconds, set expiry to 50 minutes
    this.tokenExpiry = Date.now() + (response.data.expires_in - 600) * 1000;

    return this.accessToken;
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private generatePassword(): string {
    const timestamp = this.generateTimestamp();
    const data = `${this.shortcode}${this.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  async stkPush(request: MpesaStkPushRequest): Promise<MpesaStkPushResponse> {
    const accessToken = await this.getAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword();

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.round(request.amount),
      PartyA: request.phone,
      PartyB: this.shortcode,
      PhoneNumber: request.phone,
      CallBackURL: request.callbackUrl || this.callbackUrl,
      AccountReference: request.orderId,
      TransactionDesc: `Payment for order ${request.orderId}`,
    };

    const response = await axios.post<MpesaStkPushResponse>(
      `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async queryStatus(checkoutRequestId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword();

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await axios.post(
      `${this.getBaseUrl()}/mpesa/stkpush/v1/query`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  parseCallback(data: MpesaCallback): {
    success: boolean;
    merchantRequestId: string;
    checkoutRequestId: string;
    resultCode: number;
    resultDesc: string;
    amount?: number;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    phone?: string;
  } {
    const { stkCallback } = data.Body;
    const resultCode = stkCallback.ResultCode;

    const baseInfo = {
      success: resultCode === 0,
      merchantRequestId: stkCallback.MerchantRequestID,
      checkoutRequestId: stkCallback.CheckoutRequestID,
      resultCode,
      resultDesc: stkCallback.ResultDesc,
    };

    if (resultCode === 0 && stkCallback.CallbackMetadata) {
      const metadata: Record<string, string | number> = {};
      stkCallback.CallbackMetadata.Item.forEach((item) => {
        metadata[item.Name] = item.Value;
      });

      return {
        ...baseInfo,
        amount: metadata.Amount as number,
        mpesaReceiptNumber: metadata.MpesaReceiptNumber as string,
        transactionDate: metadata.TransactionDate as string,
        phone: metadata.PhoneNumber as string,
      };
    }

    return baseInfo;
  }
}

export const mpesaService = new MpesaService();
