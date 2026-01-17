
-- ERM-Ziswaf Database Initialization Script
-- Usage: psql -U <username> -d <database_name> -f init.sql

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS laz_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    scale VARCHAR(50),
    description TEXT,
    api_token_hash VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS risks (
    id VARCHAR(50),
    laz_id INT,
    description TEXT,
    category VARCHAR(50),
    impact VARCHAR(20),
    likelihood VARCHAR(20),
    status VARCHAR(20),
    mitigation_plan TEXT,
    mitigation_status VARCHAR(50) DEFAULT 'Planned',
    mitigation_progress INT DEFAULT 0,
    PRIMARY KEY (id, laz_id)
);

CREATE TABLE IF NOT EXISTS metrics (
    laz_id INT,
    name VARCHAR(50),
    value FLOAT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (laz_id, name)
);

CREATE TABLE IF NOT EXISTS compliance_items (
    id VARCHAR(50),
    laz_id INT,
    text TEXT,
    completed BOOLEAN,
    PRIMARY KEY (id, laz_id)
);

CREATE TABLE IF NOT EXISTS zis_summary (
    laz_id INT PRIMARY KEY,
    total_collected BIGINT,
    total_distributed BIGINT,
    muzakki_count INT,
    mustahik_count INT,
    program_reach INT,
    operational_funds BIGINT,
    productive_funds BIGINT
);

CREATE TABLE IF NOT EXISTS zis_collection (
    laz_id INT,
    category VARCHAR(50),
    value BIGINT,
    PRIMARY KEY (laz_id, category)
);

CREATE TABLE IF NOT EXISTS zis_distribution (
    laz_id INT,
    ashnaf VARCHAR(50),
    amount BIGINT,
    PRIMARY KEY (laz_id, ashnaf)
);

CREATE TABLE IF NOT EXISTS metric_history (
    id SERIAL PRIMARY KEY,
    laz_id INT,
    metric_name VARCHAR(50),
    value FLOAT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed Data
-- LAZ Partners
INSERT INTO laz_partners (id, name, scale, description) VALUES 
(1, 'LAZNAS Amanah Sejahtera', 'Nasional', 'Mitra Riset 1'),
(2, 'LAZNAS Berkah Umat', 'Nasional', 'Mitra Riset 2')
ON CONFLICT (id) DO NOTHING;

-- Fix Sequence for laz_partners
SELECT setval(pg_get_serial_sequence('laz_partners', 'id'), COALESCE((SELECT MAX(id) + 1 FROM laz_partners), 1), false);

-- Risks
INSERT INTO risks (id, laz_id, description, category, impact, likelihood, status) VALUES 
-- LAZ 1
('OP-001', 1, 'Kurang tepat dalam menentukan delapan ashnaf', 'Operational', 'High', 'Medium', 'Open'),
('OP-002', 1, 'Keterlambatan proses pencairan dana kepada mustahik', 'Operational', 'Medium', 'Low', 'Mitigated'),
('RP-001', 1, 'Kampanye negatif di media sosial', 'Reputation', 'Critical', 'Medium', 'Monitoring'),
('SH-001', 1, 'Instrumen investasi dana ZIS tidak sesuai fatwa DPS', 'ShariaCompliance', 'Critical', 'Low', 'Open'),
('OP-003', 1, 'Kegagalan sistem IT saat pengumpulan dana online', 'Operational', 'High', 'Low', 'Mitigated'),
-- LAZ 2
('OP-001', 2, 'Kurang tepat dalam menentukan delapan ashnaf', 'Operational', 'High', 'Medium', 'Open'),
('OP-002', 2, 'Keterlambatan proses pencairan dana kepada mustahik', 'Operational', 'Medium', 'Low', 'Mitigated'),
('RP-001', 2, 'Kampanye negatif di media sosial', 'Reputation', 'Critical', 'Medium', 'Monitoring'),
('SH-001', 2, 'Instrumen investasi dana ZIS tidak sesuai fatwa DPS', 'ShariaCompliance', 'Critical', 'Low', 'Open'),
('OP-003', 2, 'Kegagalan sistem IT saat pengumpulan dana online', 'Operational', 'High', 'Low', 'Mitigated')
ON CONFLICT (id, laz_id) DO NOTHING;

-- Metrics
INSERT INTO metrics (laz_id, name, value) VALUES
-- LAZ 1
(1, 'RHA', 14.8),
(1, 'ACR', 8.5),
(1, 'AvgMitigationDays', 12),
-- LAZ 2
(2, 'RHA', 13.32),
(2, 'ACR', 7.65),
(2, 'AvgMitigationDays', 10.8)
ON CONFLICT (laz_id, name) DO NOTHING;

-- Compliance Items
INSERT INTO compliance_items (id, laz_id, text, completed) VALUES
-- LAZ 1
('sc-1', 1, 'Struktur akad pengumpulan dana (ZIS) telah disetujui DPS.', true),
('sc-2', 1, 'Proses penyaluran dana sesuai dengan 8 golongan (ashnaf).', true),
('sc-3', 1, 'Investasi dana ZIS ditempatkan pada instrumen syariah yang bebas riba.', false),
('sc-4', 1, 'Laporan keuangan tahunan telah diaudit oleh auditor syariah.', true),
('sc-5', 1, 'Rasio Hak Amil (RHA) tidak melebihi batas yang ditetapkan syariat.', true),
-- LAZ 2 (Note: sc-1 is false based on code logic)
('sc-1', 2, 'Struktur akad pengumpulan dana (ZIS) telah disetujui DPS.', false),
('sc-2', 2, 'Proses penyaluran dana sesuai dengan 8 golongan (ashnaf).', true),
('sc-3', 2, 'Investasi dana ZIS ditempatkan pada instrumen syariah yang bebas riba.', false),
('sc-4', 2, 'Laporan keuangan tahunan telah diaudit oleh auditor syariah.', true),
('sc-5', 2, 'Rasio Hak Amil (RHA) tidak melebihi batas yang ditetapkan syariat.', true)
ON CONFLICT (id, laz_id) DO NOTHING;

-- ZIS Summary
INSERT INTO zis_summary (laz_id, total_collected, total_distributed, muzakki_count, mustahik_count, program_reach, operational_funds, productive_funds) VALUES
(1, 925000000, 710000000, 15480, 8950, 15, 85000000, 150000000),
(2, 1850000000, 1420000000, 30960, 17900, 30, 170000000, 300000000)
ON CONFLICT (laz_id) DO NOTHING;

-- ZIS Collection
INSERT INTO zis_collection (laz_id, category, value) VALUES
-- LAZ 1
(1, 'Zakat', 450000000),
(1, 'Infaq/Sadaqah', 280000000),
(1, 'Wakaf', 120000000),
(1, 'DSKL', 75000000),
-- LAZ 2
(2, 'Zakat', 900000000),
(2, 'Infaq/Sadaqah', 560000000),
(2, 'Wakaf', 240000000),
(2, 'DSKL', 150000000)
ON CONFLICT (laz_id, category) DO NOTHING;

-- ZIS Distribution
INSERT INTO zis_distribution (laz_id, ashnaf, amount) VALUES
-- LAZ 1
(1, 'Fakir', 110000000),
(1, 'Miskin', 150000000),
(1, 'Amil', 85000000),
(1, 'Mualaf', 50000000),
(1, 'Riqab', 20000000),
(1, 'Gharim', 70000000),
(1, 'Fisabilillah', 180000000),
(1, 'Ibnu Sabil', 45000000),
-- LAZ 2
(2, 'Fakir', 220000000),
(2, 'Miskin', 300000000),
(2, 'Amil', 170000000),
(2, 'Mualaf', 100000000),
(2, 'Riqab', 40000000),
(2, 'Gharim', 140000000),
(2, 'Fisabilillah', 360000000),
(2, 'Ibnu Sabil', 90000000)
ON CONFLICT (laz_id, ashnaf) DO NOTHING;
