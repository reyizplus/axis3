import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiKey = process.env.IYZICO_API_KEY;
    const secretKey = process.env.IYZICO_SECRET_KEY;
    const baseUrl = process.env.IYZICO_BASE_URL;

    if (!apiKey || !secretKey) {
      return NextResponse.json({
        valid: false,
        message: 'iyzico API anahtarları tanımlanmamış. Lütfen .env dosyasını kontrol edin.',
      });
    }

    if (!baseUrl) {
      return NextResponse.json({
        valid: false,
        message: 'iyzico API URL\'si tanımlanmamış.',
      });
    }

    return NextResponse.json({
      valid: true,
      message: 'iyzico yapılandırması geçerli',
      config: {
        hasApiKey: !!apiKey,
        hasSecretKey: !!secretKey,
        baseUrl,
      },
    });
  } catch (error) {
    console.error('Error validating iyzico:', error);
    return NextResponse.json({
      valid: false,
      message: 'Doğrulama sırasında bir hata oluştu',
    });
  }
}
