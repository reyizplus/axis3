export interface CargoCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  trackingUrlPattern: string;
  phone?: string;
}

const CARGO_COMPANIES: CargoCompany[] = [
  {
    id: 'surat',
    name: 'Sürat Kargo',
    slug: 'surat',
    logoUrl: '/images/cargo/surat.png',
    trackingUrlPattern: 'https://www.suratkargo.com.tr/KargoTakip/?kargotakip={tracking_no}',
    phone: '444 6 333',
  },
  {
    id: 'ups',
    name: 'UPS',
    slug: 'ups',
    logoUrl: '/images/cargo/ups.svg',
    trackingUrlPattern: 'https://www.ups.com/track?tracknum={tracking_no}',
    phone: '444 4 777',
  },
  {
    id: 'aras',
    name: 'Aras Kargo',
    slug: 'aras',
    logoUrl: '/images/cargo/aras.svg',
    trackingUrlPattern: 'https://www.araskargo.com.tr/tr/tracking?trackingNumber={tracking_no}',
    phone: '444 4 444',
  },
  {
    id: 'hepsijet',
    name: 'HepsiJet',
    slug: 'hepsijet',
    logoUrl: '/images/cargo/hepsijet.svg',
    trackingUrlPattern: 'https://www.hepsijet.com/takip?trackingNumber={tracking_no}',
    phone: '444 4 111',
  },
  {
    id: 'ptt',
    name: 'PTT Kargo',
    slug: 'ptt',
    logoUrl: '/images/cargo/ptt.png',
    trackingUrlPattern: 'https://gonderitakip.ptt.gov.tr/?code={tracking_no}',
    phone: '444 1 788',
  },
];

export function getCargoCompanies(): CargoCompany[] {
  return CARGO_COMPANIES;
}

export function getCargoCompanyById(id: string): CargoCompany | undefined {
  return CARGO_COMPANIES.find((c) => c.id === id);
}

export function getTrackingUrl(companyId: string, trackingNumber: string): string {
  const company = getCargoCompanyById(companyId);
  if (!company || !trackingNumber) return '';
  return company.trackingUrlPattern.replace('{tracking_no}', encodeURIComponent(trackingNumber));
}
