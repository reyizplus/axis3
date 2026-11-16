import { describe, it, expect } from 'vitest';
import { render } from '@react-email/components';
import OrderConfirmation from '@/emails/order-confirmation';
import OrderStatusUpdate from '@/emails/order-status-update';
import EmailVerification from '@/emails/email-verification';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';
import ContactNotification from '@/emails/contact-notification';
import { formatAddress, formatDate, prepareOrderEmailData, prepareOrderStatusEmailData } from '@/lib/email/templates';

const dbOrder = {
  id: '11111111-2222-4333-8444-555555555555',
  order_number: 'AX3-2026-0001',
  status: 'preparing',
  total_amount: '1250.00',
  discount_amount: '50.00',
  coupon_code: 'HOSGELDIN',
  created_at: '2026-11-01T09:30:00.000Z',
  estimated_delivery: '2026-11-08',
  shipping_address: {
    fullName: 'Ayşe Yılmaz',
    phone: '+90 555 111 22 33',
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Caferağa',
    street: 'Moda Caddesi',
    buildingNo: '12',
    apartmentNo: '3',
    zipCode: '34710',
    notes: 'Kapıcıya bırakılabilir',
  },
  user: { email: 'ayse@example.com', full_name: 'Ayşe Yılmaz' },
  items: [
    { filename: 'bracket_v3.stl', material_name: 'PLA', quantity: 2, unit_price: '600.00', subtotal: '1200.00' },
    { filename: 'gear.stl', material_name: 'PETG', quantity: 1, unit_price: '50.00', subtotal: '50.00' },
  ],
};

describe('email template helpers', () => {
  it('formats DATE values without shifting the day', () => {
    expect(formatDate('2026-11-08')).toContain('8 Kasım 2026');
  });

  it('formats the new structured shipping address', () => {
    const text = formatAddress(dbOrder.shipping_address);
    expect(text).toContain('Ayşe Yılmaz');
    expect(text).toContain('Moda Caddesi No: 12 Daire: 3');
    expect(text).toContain('Caferağa, Kadıköy, İstanbul 34710');
  });

  it('supports legacy single-line and text addresses', () => {
    expect(formatAddress({ address: 'Eski adres', notes: 'Zili çalma' })).toBe('Eski adres\nNot: Zili çalma');
    expect(formatAddress('Düz metin adres')).toBe('Düz metin adres');
    expect(formatAddress(null)).toBe('Belirtilmedi');
  });
});

describe('order-confirmation template', () => {
  it('renders real order data', async () => {
    const html = await render(OrderConfirmation({ order: prepareOrderEmailData(dbOrder) }));

    expect(html).toContain('1 Kasım 2026');
    expect(html).toContain('8 Kasım 2026');
    expect(html).toContain('bracket_v3.stl');
    expect(html).toContain('gear.stl');
    expect(html).not.toContain('>Model<');
    expect(html).toContain('Moda Caddesi');
    expect(html).toContain('Kadıköy');
    expect(html).toContain('Kapıcıya bırakılabilir');
    expect(html).toContain('http://localhost:3000/dashboard/orders');
    expect(html).not.toContain('axis3.com.tr/dashboard');
  });
});

describe('order-status-update template', () => {
  it('translates the status and dims only future steps', async () => {
    const html = await render(
      OrderStatusUpdate({ order: prepareOrderStatusEmailData(dbOrder, 'payment_received') })
    );

    expect(html).toContain('Hazırlanıyor');
    expect(html).not.toContain('>preparing<');

    const dimmed = (html.match(/opacity:0\.3/g) ?? []).length;
    expect(dimmed).toBe(4);

    expect(html).toContain('/dashboard/orders/11111111-2222-4333-8444-555555555555');
    expect(html).not.toContain('axis3.com.tr/dashboard');
  });

  it('does not dim anything once delivered', async () => {
    const html = await render(
      OrderStatusUpdate({
        order: prepareOrderStatusEmailData({ ...dbOrder, status: 'delivered' }, 'shipped'),
      })
    );

    expect(html).toContain('Teslim Edildi');
    expect((html.match(/opacity:0\.3/g) ?? []).length).toBe(0);
  });

  it('keeps items so the product list is not empty', async () => {
    const data = prepareOrderStatusEmailData(dbOrder, 'preparing');
    expect(data.items.map((i) => i.fileName)).toEqual(['bracket_v3.stl', 'gear.stl']);
  });
});

describe('verification code template', () => {
  it('renders a registration code with the configured lifetime', async () => {
    const node = EmailVerification({
      code: '424242',
      userName: 'Ayşe',
      purpose: 'registration',
      expiresInMinutes: 15,
    });

    const [html, text] = await Promise.all([render(node), render(node, { plainText: true })]);

    expect(html).toContain('424242');
    expect(html).toContain('E-posta Doğrulama');
    expect(text).toContain('15 dakika süreyle geçerlidir');
    expect(text).toContain('Kayıt sayfasındaki doğrulama alanına gidin');
    expect(html).toContain('AXIS3 doğrulama kodunuz: 424242');
  });

  it('uses login wording for a 2FA code and never claims 10 minutes', async () => {
    const node = EmailVerification({
      code: '999999',
      userName: 'Ayşe',
      purpose: '2fa',
      expiresInMinutes: 5,
    });

    const [html, text] = await Promise.all([render(node), render(node, { plainText: true })]);

    expect(html).toContain('Giriş Doğrulama');
    expect(text).toContain('5 dakika süreyle geçerlidir');
    expect(text).toContain('Giriş doğrulama ekranındaki alana gidin');
    expect(text).not.toContain('10 dakika');
    expect(text).not.toContain('kaydınızı tamamlamak');
  });
});

describe('welcome template', () => {
  it('links to the configured app URL instead of a hardcoded domain', async () => {
    const html = await render(WelcomeEmail({ userName: 'Ayşe', dashboardUrl: 'https://staging.example.com/dashboard' }));

    expect(html).toContain('https://staging.example.com/dashboard');
    expect(html).not.toContain('https://axis3.com.tr/dashboard');
  });
});

describe('password-reset template', () => {
  it('renders the reset URL from the caller', async () => {
    const html = await render(
      PasswordResetEmail({ resetUrl: 'https://example.com/reset?token=abc', userEmail: 'ayse@example.com' })
    );

    expect(html).toContain('https://example.com/reset?token=abc');
    expect(html).toContain('AXIS3 şifre sıfırlama bağlantınız');
  });
});

describe('contact-notification template', () => {
  it('renders the submission and admin links on the configured domain', async () => {
    const html = await render(
      ContactNotification({
        name: 'Ayşe Yılmaz',
        email: 'ayse@example.com',
        phone: '+90 555 111 22 33',
        subject: 'Numune talebi',
        message: 'PLA numunesi istiyorum.',
        submittedAt: '16.11.2026 10:00',
        pageUrl: 'https://example.com/iletisim',
        appUrl: 'https://example.com',
      })
    );

    expect(html).toContain('Ayşe Yılmaz');
    expect(html).toContain('Numune talebi');
    expect(html).toContain('PLA numunesi istiyorum.');
    expect(html).toContain('https://example.com/iletisim');
    expect(html).toContain('https://example.com/dashboard/admin/contacts');
    expect(html).toContain('Yeni iletişim mesajı: Ayşe Yılmaz');
    expect(html).not.toContain('https://axis3.com.tr/dashboard');
  });
});
