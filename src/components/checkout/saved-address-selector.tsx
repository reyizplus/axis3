'use client';

import { useEffect, useState } from 'react';
import { getUserAddresses, addressToFormData } from '@/lib/services/address-service';
import type { SavedAddress, AddressFormData } from '@/lib/services/address-service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus } from 'lucide-react';

interface Props {
  onSelect: (data: AddressFormData, addressId?: string) => void;
  selectedId?: string;
}

export function SavedAddressSelector({ onSelect, selectedId }: Props) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUserAddresses();
        setAddresses(data || []);

        // Auto-select default address
        if (!selectedId) {
          const defaultAddr = (data || []).find(a => a.is_default);
          if (defaultAddr) {
            onSelect({ ...addressToFormData(defaultAddr), is_default: true });
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2].map(i => <Skeleton key={i} className="h-20 w-44 shrink-0 rounded-lg" />)}
      </div>
    );
  }

  if (addresses.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kayitli Adresleriniz</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {addresses.map(a => {
          const fd = addressToFormData(a);
          const isSelected = selectedId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(fd, a.id)}
              className={`text-left shrink-0 w-44 p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border/50 bg-muted/20 hover:bg-muted/30 hover:border-border'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-semibold truncate ${isSelected ? 'text-primary' : ''}`}>
                  {a.title}
                </span>
                {a.is_default && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">Varsayilan</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{a.address_line1}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{a.city}, {a.district}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
