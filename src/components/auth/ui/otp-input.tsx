'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  error = false,
  autoFocus = false,
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit && value.length > 0) return;

    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);
    onChange?.(newValues.join(''));

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newValues.every(v => v !== '') && newValues.join('').length === length) {
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newValues = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i]!;
    }
    setValues(newValues);
    onChange?.(newValues.join(''));

    if (pasted.length === length) {
      onComplete(pasted);
      inputRefs.current[length - 1]?.focus();
    } else {
      const nextIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  }, [length, onComplete, onChange]);

  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label="Doğrulama kodu girişi">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`${index + 1}. hane`}
          className={cn(
            'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-destructive bg-destructive/5'
              : value
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:border-primary/50',
          )}
        />
      ))}
    </div>
  );
}
