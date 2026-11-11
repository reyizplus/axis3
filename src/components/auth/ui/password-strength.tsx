'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

interface PasswordRequirementsProps {
  password: string;
  confirmPassword: string;
}

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Zayıf', color: 'bg-destructive', textColor: 'text-destructive', width: 25 };
  if (score <= 3) return { label: 'Orta', color: 'bg-yellow-500', textColor: 'text-yellow-500', width: 50 };
  if (score <= 4) return { label: 'Güçlü', color: 'bg-green-500', textColor: 'text-green-500', width: 75 };
  return { label: 'Çok Güçlü', color: 'bg-emerald-500', textColor: 'text-emerald-500', width: 100 };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', strength.color)}
          style={{ width: `${strength.width}%` }}
        />
      </div>
      <p className={cn('text-xs font-medium', strength.textColor)}>
        Şifre Gücü: {strength.label}
      </p>
    </div>
  );
}

export function PasswordRequirements({ password, confirmPassword }: PasswordRequirementsProps) {
  const checks = useMemo(() => [
    { label: 'En az 8 karakter', passed: password.length >= 8 },
    { label: 'Büyük harf (A-Z)', passed: /[A-Z]/.test(password) },
    { label: 'Küçük harf (a-z)', passed: /[a-z]/.test(password) },
    { label: 'Rakam (0-9)', passed: /[0-9]/.test(password) },
    { label: 'Özel karakter (!@#$%^&*)', passed: /[^a-zA-Z0-9]/.test(password) },
    { label: 'Şifreler eşleşiyor', passed: password.length > 0 && confirmPassword.length > 0 && password === confirmPassword },
  ], [password, confirmPassword]);

  if (!password) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Şifre Gereksinimleri:</p>
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-2">
          <span
            className={cn(
              'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200',
              check.passed ? 'bg-green-500/15 text-green-600' : 'bg-muted-foreground/10 text-muted-foreground'
            )}
          >
            {check.passed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
          </span>
          <span
            className={cn(
              'text-xs transition-colors duration-200',
              check.passed ? 'text-green-600 font-medium' : 'text-muted-foreground'
            )}
          >
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}
