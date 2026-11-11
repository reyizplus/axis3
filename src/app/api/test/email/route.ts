/**
 * Email Test API Endpoint
 * Test email notifications manually
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mailService } from '@/lib/services/mail-service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const { type, email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email adresi gerekli' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'welcome':
        result = await mailService.sendWelcomeEmail(email, 'Test User');
        break;

      case 'order-confirmation':
        // Mock order data
        const mockOrder = {
          id: 'test-order-123',
          order_number: 'ORD-TEST-001',
          user_id: 'test-user',
          user_email: email,
          user_name: 'Test User',
          total_price: 150.00,
          status: 'pending_payment',
          payment_method: 'eft_havale',
          estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          items: [
            {
              id: 'item-1',
              file_name: 'test-model.stl',
              material_name: 'PLA',
              color: 'Beyaz',
              quality_name: 'Standart',
              quantity: 2,
              unit_price: 75.00,
              subtotal: 150.00,
              dimensions: { x: 10, y: 10, z: 5 }
            }
          ]
        };
        result = await mailService.sendOrderConfirmation(mockOrder);
        break;

      case 'order-status':
        // Mock order data for status update
        const mockStatusOrder = {
          id: 'test-order-456',
          order_number: 'ORD-TEST-002',
          user_email: email,
          user_name: 'Test User',
          status: 'in_production',
          items: [
            {
              file_name: 'test-model.stl',
              material_name: 'PLA',
              quantity: 1
            }
          ]
        };
        result = await mailService.sendOrderStatusUpdate(mockStatusOrder, 'pending_payment');
        break;

      case 'password-reset':
        const resetUrl = `http://localhost:3000/reset-password?token=test-token-123`;
        result = await mailService.sendPasswordResetEmail(email, resetUrl);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Geçersiz email tipi. Kullanılabilir: welcome, order-confirmation, order-status, password-reset' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${type} email başarıyla gönderildi`,
        messageId: result.messageId
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { success: false, error: 'Email gönderilirken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Test API',
    usage: 'POST /api/test/email',
    body: {
      type: 'welcome | order-confirmation | order-status | password-reset',
      email: 'test@example.com'
    },
    examples: [
      {
        type: 'welcome',
        email: 'user@example.com'
      },
      {
        type: 'order-confirmation',
        email: 'user@example.com'
      },
      {
        type: 'order-status',
        email: 'user@example.com'
      },
      {
        type: 'password-reset',
        email: 'user@example.com'
      }
    ]
  });
}
