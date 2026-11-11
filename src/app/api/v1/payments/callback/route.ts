/**
 * Payment Callback API Endpoint
 * POST /api/v1/payments/callback
 * 
 * Handles payment callback from iyzico after 3D Secure
 * 
 * Security Features:
 * - Token validation via iyzico API
 * - Request origin validation
 * - Idempotency check (prevent duplicate processing)
 * - Rate limiting via IP check
 */

import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment/payment-service';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';

// iyzico callback IPs (for production, add actual iyzico IPs)
// https://docs.iyzico.com/rest-api/ip-addresses
const IYZICO_IPS = [
  '127.0.0.1', // localhost for development
  '::1', // localhost IPv6
  // iyzico known IPs
  '159.253.141.150',
  '159.253.141.151',
  '159.253.141.152',
  '159.253.141.153',
  '159.253.141.154',
  '176.53.148.106',
  '176.53.148.107',
  '176.53.148.108',
  '176.53.148.109',
  '176.53.148.110',
];

/**
 * Validate request origin
 */
function validateRequestOrigin(request: NextRequest): boolean {
  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check if request comes from iyzico
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // In production, validate IP
  if (process.env.NODE_ENV === 'production') {
    if (!IYZICO_IPS.includes(ip)) {
      console.error('[Payment Callback] SECURITY: Invalid IP origin:', ip);
      return false;
    }
  }

  return true;
}

/**
 * Check if payment has already been processed (idempotency)
 */
async function checkIdempotency(token: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    // Check if this token has been processed before
    const { data, error } = await supabase
      .from('orders')
      .select('id, payment_status')
      .eq('payment_token', token)
      .maybeSingle();

    if (error) {
      console.error('[Payment Callback] Idempotency check query error:', error);
      return false;
    }

    // If payment is already completed or failed, it's a duplicate
    if (data && ((data as any).payment_status === 'completed' || (data as any).payment_status === 'failed')) {
            return true;
    }

    return false;
  } catch (error) {
    console.error('[Payment Callback] Idempotency check error:', error);
    // On error, allow processing (fail open for availability)
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
        // Security Check 1: Validate request origin
    if (!validateRequestOrigin(request)) {
      console.error('[Payment Callback] SECURITY: Invalid request origin');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Get token from either form data (iyzico direct) or JSON body (our callback page)
    let token: string | null = null;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Request from our callback page
      const body = await request.json();
      token = body.token;
      console.log('[Payment Callback] JSON request from callback page');
    } else {
      // Direct form POST from iyzico (legacy support)
      const formData = await request.formData();
      token = formData.get('token') as string;
      console.log('[Payment Callback] Form data from iyzico');
      if (process.env.NODE_ENV === 'development') {
        console.log('[Payment Callback] Form data keys:', Array.from(formData.keys()));
      }
    }
    
        if (!token) {
      console.error('[Payment Callback] ERROR: No token provided');
      
      // Return JSON for API calls, redirect for browser requests
      if (contentType.includes('application/json')) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 400 }
        );
      }
      return redirect('/checkout/failed?error=invalid_token');
    }
    
    // Security Check 2: Idempotency - prevent duplicate processing
    const isDuplicate = await checkIdempotency(token);
    if (isDuplicate) {
      // Return JSON for API calls, redirect for browser requests
      if (contentType.includes('application/json')) {
        return NextResponse.json({
          success: true,
          message: 'Payment already processed'
        });
      }
      return redirect('/checkout/success');
    }
    
        // Handle payment callback
    // Note: iyzico's checkoutForm.retrieve API validates the token signature internally
    const result = await paymentService.handleCallback(token);
    
        if (result.success && result.orderId) {
      // Payment successful
      console.log('[Payment Callback] Payment successful for order:', result.orderId);
      
      // Return JSON for API calls, redirect for browser requests
      if (contentType.includes('application/json')) {
        return NextResponse.json({
          success: true,
          orderId: result.orderId,
          paymentId: result.paymentId
        });
      }
      return redirect(`/checkout/success?orderId=${result.orderId}`);
    } else {
      // Payment failed
      console.error('[Payment Callback] Payment failed:', result.error);
      
      // Return JSON for API calls, redirect for browser requests
      if (contentType.includes('application/json')) {
        return NextResponse.json({
          success: false,
          orderId: result.orderId,
          error: result.error || 'Payment failed'
        }, { status: 400 });
      }
      
      const errorParam = result.error ? `&error=${encodeURIComponent(result.error)}` : '';
      const orderParam = result.orderId ? `orderId=${result.orderId}` : '';
      return redirect(`/checkout/failed?${orderParam}${errorParam}`);
    }
  } catch (error) {
    // Next.js redirect() throws NEXT_REDIRECT - this is expected behavior
    // We need to re-throw it so Next.js can handle the redirect
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    
    console.error('[Payment Callback] EXCEPTION:', error);
    return redirect('/checkout/failed?error=callback_failed');
  }
}
