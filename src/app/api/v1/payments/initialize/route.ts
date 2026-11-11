/**
 * Payment Initialize API Endpoint
 * POST /api/v1/payments/initialize
 *
 * Initializes payment with iyzico and returns payment page URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment/payment-service';
import { createClient } from '@/lib/supabase/server';
import { createPaymentRateLimiter } from '@/lib/utils/rate-limit-configs';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user first
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is admin (admins skip rate limiting)
    let isAdmin = false;
    if (user) {
      try {
        const { data: adminCheck } = await supabase.rpc('is_admin');
        isAdmin = !!adminCheck;
      } catch {}
    }

    // Rate limiting: 3 requests per 10 seconds per IP (fraud protection) - skip for admins
    if (!isAdmin) {
      const rateLimiter = createPaymentRateLimiter();
      if (rateLimiter) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
        const { success, limit, remaining, reset } = await rateLimiter.limit(ip);
        
        if (!success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Çok fazla ödeme denemesi. Lütfen daha sonra tekrar deneyin.',
              retryAfter: Math.ceil((reset - Date.now()) / 1000)
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
                'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
              }
            }
          );
        }
      }
    }
    
    if (!user) {
            return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
        // Parse request body
    const body = await request.json();
    const { orderId } = body;
    
        if (!orderId) {
            return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Verify order belongs to user
        const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .single();
    
        if (!order) {
            return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    if ((order as any).user_id !== user.id) {
            return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Check if order is already paid
        if ((order as any).status !== 'pending') {
            return NextResponse.json(
        { success: false, error: 'Order is not in pending status' },
        { status: 400 }
      );
    }
    
    // Initialize payment
        const result = await paymentService.initializePayment(orderId);
    
        if (result.success) {
            return NextResponse.json({
        success: true,
        paymentPageUrl: result.paymentPageUrl,
        token: result.token
      });
    } else {
            return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    
    // Check if error is due to missing environment variables
    const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed';
    
    if (errorMessage.includes('IYZICO_API_KEY') ||
        errorMessage.includes('IYZICO_SECRET_KEY') ||
        errorMessage.includes('IYZICO_BASE_URL')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ödeme sistemi yapılandırması eksik. Lütfen sistem yöneticisi ile iletişime geçin.'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Ödeme başlatılamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
