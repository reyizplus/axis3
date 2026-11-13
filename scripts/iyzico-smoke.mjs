#!/usr/bin/env node
/**
 * iyzico sandbox smoke test
 * ------------------------------------------------------------------
 * Verifies the payment integration against the real iyzico sandbox using
 * the keys in `.env.local`. It does NOT charge a card: it only checks that
 * the credentials/signature are accepted and that the checkout form request
 * the app builds is valid.
 *
 * Run:
 *   npm run test:iyzico
 * (which expands to `node --env-file=.env.local scripts/iyzico-smoke.mjs`)
 *
 * Exit code 0 = credentials accepted and checkout form created.
 * Exit code 1 = configuration or iyzico error (the message says which).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Iyzipay = require('iyzipay');

const PLACEHOLDER_PATTERN = /placeholder|your[_-]?key|change[_-]?me|xxx+/i;

function readConfig() {
  return {
    apiKey: (process.env.IYZICO_API_KEY || '').trim(),
    secretKey: (process.env.IYZICO_SECRET_KEY || '').trim(),
    uri: (process.env.IYZICO_BASE_URL || '').trim(),
    appUrl: (process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').trim(),
  };
}

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 10) return '***';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function call(instance, methodName, payload) {
  return new Promise((resolve, reject) => {
    instance[methodName](payload, (err, result) => {
      if (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      resolve(result);
    });
  });
}

function describe(result) {
  return {
    status: result?.status,
    errorCode: result?.errorCode,
    errorMessage: result?.errorMessage,
    conversationId: result?.conversationId,
  };
}

async function main() {
  const config = readConfig();

  console.log('\niyzico sandbox smoke test');
  console.log('─'.repeat(52));
  console.log(`API key    : ${mask(config.apiKey)}`);
  console.log(`Secret     : ${mask(config.secretKey)}`);
  console.log(`Base URL   : ${config.uri || '(missing)'}`);
  console.log(`Callback   : ${config.appUrl}/api/v1/payments/callback`);
  console.log('─'.repeat(52));

  const problems = [];
  if (!config.apiKey) problems.push('IYZICO_API_KEY tanımlı değil');
  if (!config.secretKey) problems.push('IYZICO_SECRET_KEY tanımlı değil');
  if (!config.uri) problems.push('IYZICO_BASE_URL tanımlı değil');
  if (PLACEHOLDER_PATTERN.test(config.apiKey)) problems.push('IYZICO_API_KEY placeholder görünüyor');
  if (PLACEHOLDER_PATTERN.test(config.secretKey)) problems.push('IYZICO_SECRET_KEY placeholder görünüyor');
  if (!/^https:\/\//.test(config.uri)) problems.push('IYZICO_BASE_URL https olmalı');

  if (problems.length) {
    fail(`Yapılandırma hatası:\n  - ${problems.join('\n  - ')}`);
  }

  const client = new Iyzipay({
    apiKey: config.apiKey,
    secretKey: config.secretKey,
    uri: config.uri,
  });

  // ---------------------------------------------------------------
  // 1. Credentials + signature
  // ---------------------------------------------------------------
  process.stdout.write('1/2  Kimlik doğrulama (apiTest.retrieve) … ');
  let authResult;
  try {
    authResult = await call(client.apiTest, 'retrieve', { locale: Iyzipay.LOCALE.TR });
  } catch (err) {
    fail(`iyzico'ya ulaşılamadı: ${err.message}`);
  }

  if (authResult?.status !== 'success') {
    const info = describe(authResult);
    fail(
      `Anahtarlar reddedildi (status=${info.status}, code=${info.errorCode}, message=${info.errorMessage}). ` +
        'Sandbox anahtarlarını ve IYZICO_BASE_URL değerini kontrol edin.'
    );
  }
  console.log('OK');

  // ---------------------------------------------------------------
  // 2. Checkout form request (no card is charged)
  // ---------------------------------------------------------------
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const conversationId = `smoke-${now.getTime()}`;
  const price = '10.00';

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId,
    price,
    paidPrice: price,
    currency: Iyzipay.CURRENCY.TRY,
    basketId: conversationId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: `${config.appUrl}/api/v1/payments/callback`,
    enabledInstallments: [1, 2, 3, 6, 9, 12],
    buyer: {
      id: 'SMOKE-BUYER',
      name: 'Smoke',
      surname: 'Test',
      gsmNumber: '+905555555555',
      email: 'smoke@axis3.com.tr',
      identityNumber: '11111111111',
      lastLoginDate: stamp,
      registrationDate: stamp,
      registrationAddress: 'Test Mahallesi Test Sokak No:1',
      ip: '85.34.78.112',
      city: 'Istanbul',
      country: 'Turkey',
      zipCode: '34000',
    },
    shippingAddress: {
      contactName: 'Smoke Test',
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Test Mahallesi Test Sokak No:1',
      zipCode: '34000',
    },
    billingAddress: {
      contactName: 'Smoke Test',
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Test Mahallesi Test Sokak No:1',
      zipCode: '34000',
    },
    basketItems: [
      {
        id: 'SMOKE-ITEM',
        name: 'Smoke Test Urunu',
        category1: '3D Baski',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price,
      },
    ],
  };

  process.stdout.write('2/2  Checkout form oluşturma … ');
  let initResult;
  try {
    initResult = await call(client.checkoutFormInitialize, 'create', request);
  } catch (err) {
    fail(`Checkout form isteği gönderilemedi: ${err.message}`);
  }

  if (initResult?.status !== 'success') {
    const info = describe(initResult);
    fail(
      `Checkout form reddedildi (status=${info.status}, code=${info.errorCode}, ` +
        `message=${info.errorMessage}). İstek alanlarını (adres, alıcı, sepet) kontrol edin.`
    );
  }

  console.log('OK');
  console.log('─'.repeat(52));
  console.log(`token          : ${mask(initResult.token)}`);
  console.log(`paymentPageUrl : ${initResult.paymentPageUrl ? 'döndü' : '(boş)'}`);
  console.log('\n✔ iyzico sandbox anahtarları geçerli ve checkout form oluşturuldu.');
  console.log('  Not: Bu test kart çekmez; ödeme akışı tarayıcıdaki 3D Secure adımında tamamlanır.\n');
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
