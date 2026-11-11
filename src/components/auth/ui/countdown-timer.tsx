'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  initialSeconds: number;
  onExpire: () => void;
  showProgress?: boolean;
}

export function CountdownTimer({ initialSeconds, onExpire, showProgress = false }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (seconds <= 0) {
      if (!isExpired) {
        setIsExpired(true);
        onExpire();
      }
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, isExpired, onExpire]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const progress = (seconds / initialSeconds) * 100;

  const getColor = () => {
    if (progress > 50) return 'text-green-500';
    if (progress > 25) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <span className={cn('text-sm font-medium tabular-nums', getColor())}>
          {String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
        </span>
      </div>
      {showProgress && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-linear',
              progress > 50 ? 'bg-green-500' : progress > 25 ? 'bg-yellow-500' : 'bg-destructive'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
