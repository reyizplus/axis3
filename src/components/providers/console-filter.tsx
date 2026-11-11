'use client';

import { useEffect } from 'react';

/**
 * Console Filter - Production & Development
 *
 * Development: Filters harmless third-party warnings
 * Production: Suppresses non-critical console output for cleaner logs
 */
export function ConsoleFilter() {
  useEffect(() => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // Production: Filter non-critical messages
    if (isProduction) {
      // Filter console.warn in production
      console.warn = (...args: unknown[]) => {
        const message = args.join(' ');
        
        // Suppress known non-critical warnings
        if (
          message.includes('[PRICING-ENGINE] Failed to fetch cargo days') ||
          message.includes('[DELIVERY-CALCULATOR] Failed to fetch production capacity') ||
          message.includes('⚠️ [VALIDATION FAILED]') ||
          message.includes('⚠️ [DEBUG]') ||
          message.includes('Storage delete failed (file may not exist)') ||
          message.includes('RESEND_API_KEY is not defined') ||
          message.includes('preloaded with link preload was not used') ||
          message.includes('[PaymentGateway]') ||
          message.includes('[Checkout] Failed to load payment gateways')
        ) {
          return; // Suppress
        }
        
        // Pass through critical warnings
        originalWarn.apply(console, args);
      };

      // Filter console.log in production (suppress all)
      console.log = (...args: unknown[]) => {
        const message = args.join(' ');
        
        // Only allow critical system logs
        if (
          message.includes('[CRITICAL]') ||
          message.includes('[SECURITY]')
        ) {
          originalLog.apply(console, args);
        }
        // Suppress all other logs in production
      };

      // Filter console.error in production
      console.error = (...args: unknown[]) => {
        const message = args.join(' ');
        
        // Suppress known non-critical errors
        if (
          message.includes('❌ [DEBUG]') ||
          message.includes('Non-JSON response:') ||
          message.includes('Cross-Origin Request Blocked') ||
          message.includes('cloudflareinsights') ||
          message.includes('beacon.min.js') ||
          message.includes('sha512') ||
          message.includes('integrity attribute') ||
          message.includes('CORS request did not succeed') ||
          message.includes('WebGL warning') ||
          message.includes('Alpha-premult and y-flip are deprecated')
        ) {
          return; // Suppress
        }
        
        // Pass through all other errors
        originalError.apply(console, args);
      };
    } else {
      // Development: Only filter harmless third-party warnings
      console.error = (...args: unknown[]) => {
        const message = args.join(' ');

        // Filter out script tag warnings from next-themes
        if (
          message.includes('Encountered a script tag while rendering React component') ||
          message.includes('Scripts inside React components are never executed')
        ) {
          return; // Suppress
        }

        // Pass through all other errors
        originalError.apply(console, args);
      };
    }

    // Cleanup: restore original console methods on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  return null;
}
