/**
 * Axis3 - Environment Variables Validation
 * 
 * Validates required environment variables at build time using Zod.
 * Ensures type-safe access to environment variables throughout the application.
 */

import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Application URL
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Site URLs (SEO critical)
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://axis3.com.tr'),
  NEXT_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  
  // Database (Local PostgreSQL for development)
  DATABASE_URL: z.string().url().optional(),
  
  // Redis (Local cache for development)
  REDIS_URL: z.string().url().optional(),
  
  // Supabase (Cloud - REQUIRED for all environments)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  
  // Supabase Service Role (Required for server-side admin operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // iyzico Payment Gateway (Optional - will be required in production)
  IYZICO_API_KEY: z.string().optional(),
  IYZICO_SECRET_KEY: z.string().optional(),
  IYZICO_BASE_URL: z.string().url().default('https://sandbox-api.iyzipay.com'),
  
  // Email Service (Optional - will be required in production)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().default('noreply@axis3.com.tr'),
  RESEND_FROM_NAME: z.string().default('AXIS3'),
  // Replies go to a monitored mailbox; never to the no-reply sender.
  RESEND_REPLY_TO: z.string().email().default('destek@axis3.com.tr'),
  // Contact-form and admin alerts.
  ADMIN_NOTIFICATION_EMAIL: z.string().email().default('destek@axis3.com.tr'),
  
  // Analytics (Optional)
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),

  // Site Verification (Optional)
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_YANDEX_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_BING_VERIFICATION: z.string().optional(),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => `  - ${err.path.join('.')}: ${err.message}`);
      
      console.error('❌ Invalid environment variables:');
      console.error(missingVars.join('\n'));
      console.error('\n💡 Please check your .env.local file');
      
      // In development, show helpful message
      if (process.env.NODE_ENV === 'development') {
        console.error('\n📝 Copy .env.example to .env.local and fill in the values');
      }
      
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

// Validate environment variables
// NOTE: This runs at import time, so keep it lightweight
function getEnv(): z.infer<typeof envSchema> {
  // In test environment, return mock values
  if (process.env.NODE_ENV === 'test') {
    return {
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SITE_URL: 'https://axis3.com.tr',
      NEXT_PUBLIC_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      IYZICO_BASE_URL: 'https://sandbox-api.iyzipay.com',
      RESEND_FROM_EMAIL: 'noreply@axis3.com.tr',
      RESEND_FROM_NAME: 'AXIS3',
      RESEND_REPLY_TO: 'destek@axis3.com.tr',
      ADMIN_NOTIFICATION_EMAIL: 'destek@axis3.com.tr',
    };
  }

  // All environments: strict Supabase validation
  return validateEnv();
}

// Export validated environment
export const env = getEnv();

// Export individual configs for convenience
export const databaseConfig = {
  url: env.DATABASE_URL,
} as const;

export const redisConfig = {
  url: env.REDIS_URL,
} as const;

export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

export const iyzicoConfig = {
  apiKey: env.IYZICO_API_KEY,
  secretKey: env.IYZICO_SECRET_KEY,
  baseUrl: env.IYZICO_BASE_URL,
  isProduction: env.IYZICO_BASE_URL?.includes('api.iyzipay.com') && !env.IYZICO_BASE_URL?.includes('sandbox'),
} as const;

export const resendConfig = {
  apiKey: env.RESEND_API_KEY,
  fromEmail: env.RESEND_FROM_EMAIL,
  fromName: env.RESEND_FROM_NAME,
  replyTo: env.RESEND_REPLY_TO,
  adminNotificationEmail: env.ADMIN_NOTIFICATION_EMAIL,
} as const;

export const analyticsConfig = {
  gaId: env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
} as const;


