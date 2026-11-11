/**
 * Contact Form API Endpoint
 * Axis3 - Route: /api/v1/contact
 *
 * Public endpoint for contact form submissions
 * Integrates with feedback system for unified message management
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { createContactRateLimiter } from '@/lib/utils/rate-limit-configs';

// =====================================================
// VALIDATION SCHEMA
// =====================================================

const contactSchema = z.object({
  name: z.string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(100, 'Ad en fazla 100 karakter olabilir'),
  email: z.string()
    .email('Geçerli bir email adresi giriniz')
    .max(255, 'Email en fazla 255 karakter olabilir'),
  phone: z.string()
    .regex(/^[0-9\s\+\-\(\)]+$/, 'Geçerli bir telefon numarası giriniz')
    .min(10, 'Telefon numarası en az 10 karakter olmalıdır')
    .max(50, 'Telefon numarası en fazla 50 karakter olabilir'),
  message: z.string()
    .min(20, 'Mesaj en az 20 karakter olmalıdır')
    .max(2000, 'Mesaj en fazla 2000 karakter olabilir'),
});

// =====================================================
// POST HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per 10 minutes per IP (spam protection)
    const rateLimiter = createContactRateLimiter();
    if (rateLimiter) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                 request.headers.get('x-real-ip') ||
                 'unknown';
      const { success, limit, remaining, reset } = await rateLimiter.limit(ip);
      
      if (!success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
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

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = contactSchema.safeParse(body);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { 
          success: false, 
          error: firstError?.message || 'Geçersiz form verisi' 
        },
        { status: 400 }
      );
    }

    const { name, email, phone, message } = validationResult.data;

    // Create Supabase service client (bypasses RLS for anonymous contact form)
    // Service role key allows insert without authentication
    const supabase = createServiceClient();

    // Get user agent for debugging
    const userAgent = request.headers.get('user-agent') || '';
    const pageUrl = request.headers.get('referer') || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://axis3.com.tr'}/iletisim`;

    // Insert contact message into feedback table
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: null, // Anonymous submission
        category: 'support',
        title: `İletişim Formu: ${name}`,
        description: message,
        contact_name: name,
        contact_email: email,
        contact_phone: phone,
        status: 'new',
        priority: 'medium',
        user_agent: userAgent,
        page_url: pageUrl,
        metadata: {
          source: 'contact_form',
          submitted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) {
      console.error('[ContactAPI] Database error:', error);
      console.error('[ContactAPI] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Mesajınız gönderilemedi. Lütfen tekrar deneyiniz.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

        // TODO: Send admin notification email
    // This will be handled by feedback-service after implementation

    return NextResponse.json({
      success: true,
      message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
    });

  } catch (error) {
    console.error('[ContactAPI] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// =====================================================
// OPTIONS HANDLER (CORS)
// =====================================================

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Allow': 'POST, OPTIONS',
      },
    }
  );
}
