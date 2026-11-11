-- ============================================
-- AXIS3 - SEED DATA
-- Version: 1.0
-- Date: 2026-04-17
-- Description: Initial data for materials and print settings
-- ============================================

-- ============================================
-- 1. FDM MATERIALS
-- ============================================
INSERT INTO materials (name, code, technology, density, cost_per_gram, color, hex_color, description, properties, is_active, sort_order) VALUES
(
    'PLA (Polylactic Acid)',
    'PLA',
    'FDM',
    1.24,
    0.08,
    'Beyaz',
    '#FFFFFF',
    'En yaygın kullanılan 3D baskı malzemesi. Kolay baskı, düşük maliyet, çevre dostu.',
    '{"strength": "Orta", "flexibility": "Düşük", "temperature_resistance": "Düşük", "food_safe": true, "biodegradable": true}',
    true,
    1
),
(
    'ABS (Acrylonitrile Butadiene Styrene)',
    'ABS',
    'FDM',
    1.04,
    0.10,
    'Siyah',
    '#000000',
    'Dayanıklı ve sağlam malzeme. Yüksek sıcaklık direnci, darbe dayanımı yüksek.',
    '{"strength": "Yüksek", "flexibility": "Orta", "temperature_resistance": "Yüksek", "food_safe": false, "biodegradable": false}',
    true,
    2
),
(
    'PETG (Polyethylene Terephthalate Glycol)',
    'PETG',
    'FDM',
    1.27,
    0.12,
    'Şeffaf',
    '#E0E0E0',
    'PLA ve ABS''nin avantajlarını birleştirir. Dayanıklı, esnek ve kolay baskı.',
    '{"strength": "Yüksek", "flexibility": "Orta", "temperature_resistance": "Orta", "food_safe": true, "biodegradable": false}',
    true,
    3
),
(
    'TPU (Thermoplastic Polyurethane)',
    'TPU',
    'FDM',
    1.21,
    0.25,
    'Kırmızı',
    '#FF0000',
    'Esnek ve elastik malzeme. Darbe emici, aşınmaya dayanıklı.',
    '{"strength": "Orta", "flexibility": "Çok Yüksek", "temperature_resistance": "Orta", "food_safe": false, "biodegradable": false}',
    true,
    4
),
(
    'ASA (Acrylonitrile Styrene Acrylate)',
    'ASA',
    'FDM',
    1.07,
    0.15,
    'Gri',
    '#808080',
    'UV dayanımlı, dış mekan kullanımı için ideal. ABS''ye benzer özellikler.',
    '{"strength": "Yüksek", "flexibility": "Düşük", "temperature_resistance": "Yüksek", "food_safe": false, "biodegradable": false, "uv_resistant": true}',
    true,
    5
);

-- ============================================
-- 2. SLA MATERIALS
-- ============================================
INSERT INTO materials (name, code, technology, density, cost_per_gram, color, hex_color, description, properties, is_active, sort_order) VALUES
(
    'Standart Reçine',
    'RESIN_STANDARD',
    'SLA',
    1.15,
    0.30,
    'Beyaz',
    '#F5F5F5',
    'Genel amaçlı SLA reçinesi. Yüksek detay, pürüzsüz yüzey.',
    '{"strength": "Orta", "flexibility": "Düşük", "detail_level": "Çok Yüksek", "surface_finish": "Pürüzsüz"}',
    true,
    6
),
(
    'Şeffaf Reçine',
    'RESIN_CLEAR',
    'SLA',
    1.15,
    0.35,
    'Şeffaf',
    '#FFFFFF',
    'Şeffaf ve berrak baskılar için. Cam benzeri görünüm.',
    '{"strength": "Orta", "flexibility": "Düşük", "detail_level": "Çok Yüksek", "transparency": "Yüksek", "surface_finish": "Parlak"}',
    true,
    7
),
(
    'Dayanıklı Reçine (Tough)',
    'RESIN_TOUGH',
    'SLA',
    1.18,
    0.45,
    'Gri',
    '#A0A0A0',
    'Yüksek dayanıklılık ve darbe direnci. Fonksiyonel prototipler için.',
    '{"strength": "Çok Yüksek", "flexibility": "Orta", "detail_level": "Yüksek", "impact_resistance": "Çok Yüksek"}',
    true,
    8
),
(
    'Mühendislik Reçinesi',
    'RESIN_ENGINEERING',
    'SLA',
    1.20,
    0.55,
    'Siyah',
    '#2C2C2C',
    'Yüksek sıcaklık direnci ve mekanik dayanım. Endüstriyel uygulamalar için.',
    '{"strength": "Çok Yüksek", "flexibility": "Düşük", "detail_level": "Yüksek", "temperature_resistance": "Çok Yüksek", "chemical_resistance": "Yüksek"}',
    true,
    9
);

-- ============================================
-- 3. FDM PRINT SETTINGS
-- ============================================
INSERT INTO print_settings (name, code, technology, layer_height, infill_percentage, print_speed, time_multiplier, price_multiplier, description, is_active, sort_order) VALUES
(
    'Standart Kalite',
    'FDM_STANDARD',
    'FDM',
    0.2,
    20,
    60,
    1.0,
    1.0,
    'Günlük kullanım için ideal. Hız ve kalite dengesi.',
    true,
    1
),
(
    'Yüksek Kalite',
    'FDM_HIGH_QUALITY',
    'FDM',
    0.1,
    30,
    40,
    1.5,
    1.3,
    'Detaylı ve pürüzsüz yüzey. Görsel modeller için.',
    true,
    2
),
(
    'Hızlı Baskı',
    'FDM_DRAFT',
    'FDM',
    0.3,
    15,
    80,
    0.7,
    0.9,
    'Hızlı prototipleme. Düşük detay, yüksek hız.',
    true,
    3
),
(
    'Ekstra Dayanıklı',
    'FDM_STRONG',
    'FDM',
    0.2,
    50,
    50,
    1.3,
    1.2,
    'Maksimum dayanıklılık. Fonksiyonel parçalar için.',
    true,
    4
);

-- ============================================
-- 4. SLA PRINT SETTINGS
-- ============================================
INSERT INTO print_settings (name, code, technology, layer_thickness, exposure_time, time_multiplier, price_multiplier, description, is_active, sort_order) VALUES
(
    'Standart SLA',
    'SLA_STANDARD',
    'SLA',
    0.05,
    8.0,
    1.0,
    1.0,
    'Genel amaçlı SLA baskı. İyi detay ve hız dengesi.',
    true,
    5
),
(
    'Yüksek Detay SLA',
    'SLA_HIGH_DETAIL',
    'SLA',
    0.025,
    10.0,
    1.8,
    1.5,
    'Maksimum detay seviyesi. Minyatür ve hassas modeller için.',
    true,
    6
),
(
    'Hızlı SLA',
    'SLA_FAST',
    'SLA',
    0.1,
    6.0,
    0.6,
    0.85,
    'Hızlı prototipleme. Kabul edilebilir detay seviyesi.',
    true,
    7
);

-- ============================================
-- 5. SYSTEM SETTINGS (Initial Configuration)
-- ============================================
INSERT INTO system_settings (key, value, description, is_public) VALUES
(
    'pricing.labor_rate_per_hour',
    '{"value": 50, "currency": "TRY"}',
    'Saat başına işçilik maliyeti',
    false
),
(
    'pricing.electricity_rate_per_kwh',
    '{"value": 2.5, "currency": "TRY"}',
    'kWh başına elektrik maliyeti',
    false
),
(
    'pricing.profit_margin',
    '{"value": 0.30}',
    'Kar marjı yüzdesi (0.30 = %30)',
    false
),
(
    'pricing.overhead_percentage',
    '{"value": 0.15}',
    'Genel gider yüzdesi (0.15 = %15)',
    false
),
(
    'pricing.quantity_discounts',
    '{"2": 0.05, "5": 0.10, "10": 0.15, "20": 0.20}',
    'Toplu sipariş indirim oranları',
    true
),
(
    'shipping.free_shipping_threshold',
    '{"value": 500, "currency": "TRY"}',
    'Ücretsiz kargo eşik değeri',
    true
),
(
    'shipping.standard_cost',
    '{"value": 15, "currency": "TRY"}',
    'Standart kargo ücreti',
    true
),
(
    'file.max_size_mb',
    '{"value": 100}',
    'Maksimum dosya boyutu (MB)',
    true
),
(
    'file.allowed_extensions',
    '["stl", "STL"]',
    'İzin verilen dosya uzantıları',
    true
),
(
    'site.maintenance_mode',
    '{"enabled": false}',
    'Bakım modu durumu',
    true
);

-- ============================================
-- 6. BLOG CATEGORIES (Initial)
-- ============================================
INSERT INTO blog_categories (name, slug, description, is_active, sort_order) VALUES
(
    '3D Baskı',
    '3d-baski',
    '3D baskı teknolojisi ve uygulamaları hakkında',
    true,
    1
),
(
    'Malzemeler',
    'malzemeler',
    'FDM ve SLA malzemeleri hakkında bilgiler',
    true,
    2
),
(
    'Tasarım İpuçları',
    'tasarim-ipuclari',
    '3D model tasarımı için ipuçları ve püf noktaları',
    true,
    3
),
(
    'Proje Örnekleri',
    'proje-ornekleri',
    'Başarılı 3D baskı projeleri ve örnekler',
    true,
    4
),
(
    'Haberler',
    'haberler',
    'Axis3 ve 3D baskı dünyasından haberler',
    true,
    5
);

-- ============================================
-- SEED DATA COMPLETE
-- ============================================
-- Materials: 9 (5 FDM + 4 SLA)
-- Print Settings: 7 (4 FDM + 3 SLA)
-- System Settings: 10
-- Blog Categories: 5
-- ============================================
