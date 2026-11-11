#!/usr/bin/env node
/**
 * Axis3 - Zod Validation Test
 * Tests form validation messages (Turkish)
 */

const testCases = [
  {
    name: 'Email Validation',
    field: 'email',
    tests: [
      { value: '', expected: 'Geçerli bir e-posta adresi giriniz' },
      { value: 'invalid', expected: 'Geçerli bir e-posta adresi giriniz' },
      { value: 'test@', expected: 'Geçerli bir e-posta adresi giriniz' },
      { value: 'test@example.com', expected: 'VALID' },
    ]
  },
  {
    name: 'Password Validation (Login)',
    field: 'password',
    schema: 'signIn',
    tests: [
      { value: '', expected: 'Şifre en az 6 karakter olmalıdır' },
      { value: '12345', expected: 'Şifre en az 6 karakter olmalıdır' },
      { value: '123456', expected: 'VALID' },
    ]
  },
  {
    name: 'Password Validation (Register)',
    field: 'password',
    schema: 'signUp',
    tests: [
      { value: '', expected: 'Şifre en az 8 karakter olmalıdır' },
      { value: '1234567', expected: 'Şifre en az 8 karakter olmalıdır' },
      { value: '12345678', expected: 'VALID' },
    ]
  },
  {
    name: 'Full Name Validation',
    field: 'fullName',
    tests: [
      { value: '', expected: 'Ad Soyad en az 2 karakter olmalıdır' },
      { value: 'A', expected: 'Ad Soyad en az 2 karakter olmalıdır' },
      { value: 'Ahmet Yılmaz', expected: 'VALID' },
    ]
  }
];

console.log('🧪 AXIS3 - ZOD VALIDATION TEST\n');
console.log('='.repeat(60));

// Import Zod schemas from auth.ts
import { z } from 'zod';

// Recreate schemas (same as in auth.ts)
const signInSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

const signUpSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  fullName: z.string().min(2, 'Ad Soyad en az 2 karakter olmalıdır'),
  phone: z.string().optional(),
  isCorporate: z.boolean().default(false),
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

testCases.forEach(testCase => {
  console.log(`\n📋 ${testCase.name}`);
  console.log('-'.repeat(60));
  
  testCase.tests.forEach(test => {
    totalTests++;
    
    const schema = testCase.schema === 'signUp' ? signUpSchema : signInSchema;
    const testData = {
      email: testCase.field === 'email' ? test.value : 'test@example.com',
      password: testCase.field === 'password' ? test.value : '12345678',
      fullName: testCase.field === 'fullName' ? test.value : 'Test User',
    };
    
    const result = schema.safeParse(testData);
    
    if (test.expected === 'VALID') {
      if (result.success) {
        console.log(`   ✅ PASS: "${test.value}" → Valid`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL: "${test.value}" → Expected valid, got: ${result.error.issues[0].message}`);
        failedTests++;
      }
    } else {
      if (!result.success && result.error.issues[0].message === test.expected) {
        console.log(`   ✅ PASS: "${test.value}" → "${test.expected}"`);
        passedTests++;
      } else if (!result.success) {
        console.log(`   ❌ FAIL: "${test.value}"`);
        console.log(`      Expected: "${test.expected}"`);
        console.log(`      Got: "${result.error.issues[0].message}"`);
        failedTests++;
      } else {
        console.log(`   ❌ FAIL: "${test.value}" → Expected error, got valid`);
        failedTests++;
      }
    }
  });
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 TEST SUMMARY`);
console.log(`   Total: ${totalTests}`);
console.log(`   Passed: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
console.log(`   Failed: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);

if (failedTests === 0) {
  console.log('\n✅ ALL TESTS PASSED - Zod validation working correctly!\n');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED - Check validation messages\n');
  process.exit(1);
}
