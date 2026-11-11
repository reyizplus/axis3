-- Migration: Add missing nozzle sizes (0.1, 0.3, 0.5, 1.0mm)
-- Description: Extends nozzle_sizes seed data to match UI expectations
-- Common sizes: 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0 (0.7 and 0.9 excluded)
-- Date: 2026-06-10

INSERT INTO nozzle_sizes (size_mm, display_name, compatible_technology, sort_order, is_active)
SELECT * FROM (VALUES
    (0.10::DECIMAL(4,2), '0.1mm Ultra İnce Nozul', 'FDM'::VARCHAR(20), -1, true),
    (0.30::DECIMAL(4,2), '0.3mm İnce Nozul', 'FDM'::VARCHAR(20), 0, true),
    (0.50::DECIMAL(4,2), '0.5mm Orta Nozul', 'FDM'::VARCHAR(20), 2, true),
    (1.00::DECIMAL(4,2), '1.0mm Ekstra Kalın Nozul', 'FDM'::VARCHAR(20), 4, true)
) AS new_rows(sm, dn, ct, so, ia)
WHERE NOT EXISTS (
    SELECT 1 FROM nozzle_sizes n WHERE n.size_mm = new_rows.sm AND n.compatible_technology = new_rows.ct
);
