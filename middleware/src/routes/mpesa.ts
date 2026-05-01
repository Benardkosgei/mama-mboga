import { Router, Request, Response, NextFunction } from 'express';
import { mpesaService } from '../services/mpesa.js';
import { createError } from '../middleware/error.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { z } from 'zod';

export const mpesaRouter = Router();

// Safaricom production IP ranges for callback validation
const SAFARICOM_IPS = new Set([
  '196.201.214.200', '196.201.214.206', '196.201.213.114',
  '196.201.214.207', '196.201.214.208', '196.201.213.44',
  '196.201.212.127', '196.201.212.138', '196.201.212.129',
  '196.201.212.136', '196.201.212.74',  '196.201.212.69',
]);

function isSafaricomIp(req: Request): boolean {
  // In sandbox mode, skip IP check
  if (process.env.MPESA_ENVIRONMENT !== 'production') return true;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || '';
  return SAFARICOM_IPS.has(ip.trim());
}

const stkPushSchema = z.object({
  phone: z.string().min(10).max(15),
  amount: z.number().positive().max(150000),
  orderId: z.string().uuid(),
});

// POST /api/mpesa/stkpush
mpesaRouter.post('/stkpush', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = stkPushSchema.parse(req.body);

    let phone = validatedData.phone.replace(/\s/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (!phone.startsWith('+')) phone = '+' + phone;

    const result = await mpesaService.stkPush({
      phone,
      amount: validatedData.amount,
      orderId: validatedData.orderId,
    });

    await supabaseAdmin.from('payments').insert({
      order_id: validatedData.orderId,
      checkout_request_id: result.CheckoutRequestID,
      merchant_request_id: result.MerchantRequestID,
      phone,
      amount: validatedData.amount,
      status: 'pending',
    });

    res.status(200).json({
      success: true,
      data: {
        checkoutRequestId: result.CheckoutRequestID,
        merchantRequestId: result.MerchantRequestID,
        responseCode: result.ResponseCode,
        responseDescription: result.ResponseDescription,
        customerMessage: result.CustomerMessage,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(createError('Invalid request data', 400, 'VALIDATION_ERROR'));
    } else {
      next(error);
    }
  }
});

// POST /api/mpesa/callback
mpesaRouter.post('/callback', async (req: Request, res: Response): Promise<void> => {
  // Validate the request originates from Safaricom
  if (!isSafaricomIp(req)) {
    console.warn('Callback rejected: unauthorized IP', req.socket.remoteAddress);
    res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
    return;
  }

  // Basic structural validation — reject obviously malformed payloads
  if (!req.body?.Body?.stkCallback?.CheckoutRequestID) {
    console.warn('Callback rejected: malformed payload');
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    return;
  }

  try {
    const parsed = mpesaService.parseCallback(req.body);

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, order:orders(*)')
      .eq('checkout_request_id', parsed.checkoutRequestId)
      .single();

    if (!payment) {
      console.error('Payment not found for:', parsed.checkoutRequestId);
      res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
      return;
    }

    await supabaseAdmin
      .from('payments')
      .update({
        status: parsed.success ? 'completed' : 'failed',
        mpesa_receipt: parsed.mpesaReceiptNumber,
        callback_received_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', parsed.checkoutRequestId);

    if (parsed.success) {
      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'completed',
          payment_reference: parsed.mpesaReceiptNumber,
          mpesa_receipt: parsed.mpesaReceiptNumber,
          status: 'paid',
        })
        .eq('id', payment.order_id);

      const order = payment.order as any;
      if (order?.customer_id) {
        await supabaseAdmin.from('notifications').insert({
          user_id: order.customer_id,
          title: 'Payment Successful',
          body: `Your payment of KES ${parsed.amount} has been received. Your order is being processed.`,
          data: { orderId: payment.order_id, type: 'payment_success' },
        });
      }
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }
});

// GET /api/mpesa/status/:checkoutId
mpesaRouter.get('/status/:checkoutId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await mpesaService.queryStatus(req.params.checkoutId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
