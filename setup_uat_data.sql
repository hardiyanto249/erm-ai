-- 1. Insert "Rumah Zakat" if it doesn't exist
INSERT INTO laz_partners (name, scale, description, is_active)
SELECT 'Rumah Zakat', 'Nasional', 'UAT Testing', TRUE
WHERE NOT EXISTS (SELECT 1 FROM laz_partners WHERE name = 'Rumah Zakat');

-- Get the ID of Rumah Zakat
DO $$
DECLARE
    v_laz_id INT;
BEGIN
    SELECT id INTO v_laz_id FROM laz_partners WHERE name = 'Rumah Zakat';

    -- 2. Populate metric_history for RHA (Normal Usage ~12-13%)
    -- Clear old history for this LAZ/Metric to avoid noise
    DELETE FROM metric_history WHERE laz_id = v_laz_id AND metric_name = 'RHA';

    INSERT INTO metric_history (laz_id, metric_name, value, recorded_at) VALUES 
    (v_laz_id, 'RHA', 12.5, NOW() - INTERVAL '30 days'),
    (v_laz_id, 'RHA', 12.6, NOW() - INTERVAL '29 days'),
    (v_laz_id, 'RHA', 12.4, NOW() - INTERVAL '28 days'),
    (v_laz_id, 'RHA', 12.5, NOW() - INTERVAL '27 days'),
    (v_laz_id, 'RHA', 12.7, NOW() - INTERVAL '26 days'),
    (v_laz_id, 'RHA', 12.3, NOW() - INTERVAL '25 days'),
    (v_laz_id, 'RHA', 12.5, NOW() - INTERVAL '24 days'),
    (v_laz_id, 'RHA', 12.8, NOW() - INTERVAL '23 days'),
    (v_laz_id, 'RHA', 12.4, NOW() - INTERVAL '22 days'),
    (v_laz_id, 'RHA', 12.5, NOW() - INTERVAL '2 days');

    -- 3. Set Current Metric in `metrics` table to be ABNORMAL (> Normal Limit)
    -- Normal Mean approx 12.5, StdDev approx 0.2 -> Limit ~ 12.9
    -- Set to 18.5 (High RHA)
    DELETE FROM metrics WHERE laz_id = v_laz_id AND name = 'RHA';
    INSERT INTO metrics (laz_id, name, value, updated_at) 
    VALUES (v_laz_id, 'RHA', 18.5, NOW());

    -- Also add ACR just in case
    DELETE FROM metrics WHERE laz_id = v_laz_id AND name = 'ACR';
    INSERT INTO metrics (laz_id, name, value, updated_at) 
    VALUES (v_laz_id, 'ACR', 8.5, NOW());

END $$;
