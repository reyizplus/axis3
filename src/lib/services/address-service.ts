import { createClient } from '@/lib/supabase/client';

export interface SavedAddress {
  id: string;
  user_id: string;
  title: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  district: string;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  address_type: string;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  title: string;
  full_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  building_no: string;
  apartment_no: string;
  zip_code: string;
  is_default?: boolean;
}

export function addressToFormData(a: SavedAddress): AddressFormData {
  const parts = (a.address_line1 || '').split(', ');
  return {
    title: a.title,
    full_name: a.full_name,
    phone: a.phone,
    city: a.city,
    district: a.district,
    neighborhood: parts[0] || '',
    street: parts[1] || '',
    building_no: parts[2]?.replace('No:', '') || '',
    apartment_no: a.address_line2?.replace('Daire ', '') || '',
    zip_code: a.postal_code || '',
    is_default: a.is_default,
  };
}

export function formDataToAddress(data: AddressFormData): { address_line1: string; address_line2: string | null; city: string; district: string; postal_code: string; full_name: string; phone: string; title: string } {
  return {
    title: data.title,
    full_name: data.full_name,
    phone: data.phone,
    city: data.city,
    district: data.district,
    postal_code: data.zip_code,
    address_line1: [data.neighborhood, data.street, data.building_no ? `No:${data.building_no}` : ''].filter(Boolean).join(', '),
    address_line2: data.apartment_no ? `Daire ${data.apartment_no}` : null,
  };
}

export async function getUserAddresses(): Promise<SavedAddress[]> {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (data || []) as SavedAddress[];
}

export async function saveAddress(data: AddressFormData, existingId?: string): Promise<SavedAddress | null> {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const addressData = {
    ...formDataToAddress(data),
    user_id: user.user.id,
    country: 'TR',
    address_type: 'shipping' as const,
    is_default: data.is_default || false,
  };

  if (existingId) {
    const { data: updated } = await supabase
      .from('addresses')
      .update({ ...addressData, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .select()
      .single();
    return updated as SavedAddress | null;
  }

  const { data: created } = await supabase
    .from('addresses')
    .insert({ ...addressData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
    .single();

  return created as SavedAddress | null;
}

export async function deleteAddress(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('addresses').delete().eq('id', id);
}

export async function setDefaultAddress(id: string): Promise<void> {
  const supabase = createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  // First unset all defaults for this user
  await supabase
    .from('addresses')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.user.id)
    .eq('is_default', true);

  // Then set the new one
  await supabase
    .from('addresses')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id);
}
