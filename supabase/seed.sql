-- ═══════════════════════════════════════════════════════════════════════════════
-- SyndicPulse — SEED DATA (Pilot v1)
-- Inserts all mock data from the 3 pilot buildings.
-- Idempotent: ON CONFLICT (id) DO NOTHING — safe to re-run.
-- Run AFTER pilot_schema.sql in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. RESIDENTS ─────────────────────────────────────────────────────────────
-- portal_pin uses index-based formula (1000 + array_index) matching
-- validateResidentAccess fallback in mockData.js: String(1000 + i)
-- monthly_fee: bld-1 = 850 MAD, bld-2 = 1200 MAD, bld-3 = 1000 MAD

-- Norwest (bld-1 · 12 résidents)
INSERT INTO residents (id, building_id, unit, name, phone, paid_through, floor, since, quota, monthly_fee, portal_pin, portal_code, is_active) VALUES
('r01', 'bld-1', 'Apt 1A',  'Ahmed Benjelloun',  '+212661234567', '2026-02', 1,  '2019', 2.08, 850, '1000', 'NW-4K8MRX', true),
('r02', 'bld-1', 'Apt 1B',  'Khadija Moussaoui', '+212662345678', '2026-02', 1,  '2021', 2.08, 850, '1001', 'NW-B3TPZQ', true),
('r03', 'bld-1', 'Apt 1C',  'Omar Chraibi',      '+212663456789', '2026-02', 1,  '2020', 2.08, 850, '1002', 'NW-7YCNV2', true),
('r04', 'bld-1', 'Apt 1D',  'Nadia El Fassi',    '+212664567890', '2025-11', 1,  '2022', 2.08, 850, '1003', 'NW-P6HJRW', true),
('r05', 'bld-1', 'Apt 2A',  'Youssef Alami',     '+212665678901', '2026-04', 2,  '2018', 2.08, 850, '1004', 'NW-M9KXQB', true),
('r06', 'bld-1', 'Apt 2B',  'Sanae Bouazza',     '+212666789012', '2026-02', 2,  '2023', 2.08, 850, '1005', 'NW-X2RNFG', true),
('r07', 'bld-1', 'Apt 4B',  'Hassan Idrissi',    '+212667890123', '2026-02', 4,  '2020', 2.08, 850, '1006', 'NW-5VZMKY', true),
('r08', 'bld-1', 'Apt 6B',  'Mehdi Chraibi',     '+212668901234', '2026-01', 6,  '2021', 2.08, 850, '1007', 'NW-C8BWPJ', true),
('r09', 'bld-1', 'Apt 7C',  'Rachid Bouazza',    '+212669012345', '2026-01', 7,  '2022', 2.08, 850, '1008', 'NW-Q4TXNR', true),
('r10', 'bld-1', 'Apt 9A',  'Lamia Bensouda',    '+212661123456', '2026-02', 9,  '2019', 2.08, 850, '1009', 'NW-E7GZCA', true),
('r11', 'bld-1', 'Apt 11C', 'Lamia Tazi',        '+212662234567', '2025-11', 11, '2023', 2.08, 850, '1010', 'NW-H3RVMX', true),
('r12', 'bld-1', 'Apt 12A', 'Fatima Zouheir',    '+212663345678', '2026-02', 12, '2020', 2.08, 850, '1011', 'NW-W6YBNP', true)
ON CONFLICT (id) DO NOTHING;

-- Résidence Atlas (bld-2 · 16 résidents)
INSERT INTO residents (id, building_id, unit, name, phone, paid_through, floor, since, quota, monthly_fee, portal_pin, portal_code, is_active) VALUES
('a01', 'bld-2', 'Apt A-02', 'Rachid Berrada',    '+212661100001', '2026-02', 1, '2018', 0.83, 1200, '1000', 'AT-K5MJWQ', true),
('a02', 'bld-2', 'Apt A-05', 'Houda Cherkaoui',   '+212661100002', '2026-02', 1, '2020', 0.83, 1200, '1001', 'AT-R9XBZN', true),
('a03', 'bld-2', 'Apt B-01', 'Karim Lahlou',      '+212661100003', '2026-02', 2, '2019', 0.83, 1200, '1002', 'AT-2GYPVC', true),
('a04', 'bld-2', 'Apt B-04', 'Zineb Kettani',     '+212661100004', '2025-11', 2, '2021', 0.83, 1200, '1003', 'AT-N7HKXM', true),
('a05', 'bld-2', 'Apt C-02', 'Brahim Sabiri',     '+212661100005', '2026-05', 3, '2017', 0.83, 1200, '1004', 'AT-T4QWRB', true),
('a06', 'bld-2', 'Apt C-07', 'Amina El Alami',    '+212661100006', '2026-01', 3, '2022', 0.83, 1200, '1005', 'AT-6CNFJZ', true),
('a07', 'bld-2', 'Apt D-03', 'Yassine Benkirane', '+212661100007', '2026-02', 4, '2020', 0.83, 1200, '1006', 'AT-8VMKYP', true),
('a08', 'bld-2', 'Apt D-09', 'Salma Fikri',       '+212661100008', '2026-02', 4, '2021', 0.83, 1200, '1007', 'AT-J3BXRW', true),
('a09', 'bld-2', 'Apt E-01', 'Amine Ennaji',      '+212661100009', '2025-10', 5, '2023', 0.83, 1200, '1008', 'AT-D5TZNQ', true),
('a10', 'bld-2', 'Apt E-06', 'Dounia Kabbaj',     '+212661100010', '2026-02', 5, '2019', 0.83, 1200, '1009', 'AT-P8GRXH', true),
('a11', 'bld-2', 'Apt F-02', 'Mehdi Tahiri',      '+212661100011', '2026-01', 6, '2022', 0.83, 1200, '1010', 'AT-Y2WCVN', true),
('a12', 'bld-2', 'Apt F-08', 'Nora Bensouda',     '+212661100012', '2026-02', 6, '2020', 0.83, 1200, '1011', 'AT-M7KBZJ', true),
('a13', 'bld-2', 'Apt G-04', 'Khalid Tazi',       '+212661100013', '2026-02', 7, '2018', 0.83, 1200, '1012', 'AT-X4NRQP', true),
('a14', 'bld-2', 'Apt G-10', 'Leila El Fassi',    '+212661100014', '2025-11', 7, '2023', 0.83, 1200, '1013', 'AT-3FHWYT', true),
('a15', 'bld-2', 'Apt H-03', 'Saad Alaoui',       '+212661100015', '2026-02', 8, '2019', 0.83, 1200, '1014', 'AT-9VZXKM', true),
('a16', 'bld-2', 'Apt H-07', 'Meryem Chraibi',    '+212661100016', '2026-02', 8, '2021', 0.83, 1200, '1015', 'AT-B6JCGR', true)
ON CONFLICT (id) DO NOTHING;

-- Jardins du Roi (bld-3 · 12 résidents)
INSERT INTO residents (id, building_id, unit, name, phone, paid_through, floor, since, quota, monthly_fee, portal_pin, portal_code, is_active) VALUES
('j01', 'bld-3', 'Villa V-01', 'Abdellah Benali',     '+212662200001', '2026-02', 0, '2017', 1.56, 1000, '1000', 'JR-5KMWXB', true),
('j02', 'bld-3', 'Villa V-02', 'Fatima Zhra Idrissi', '+212662200002', '2026-02', 0, '2018', 1.56, 1000, '1001', 'JR-T8PZNQ', true),
('j03', 'bld-3', 'Apt T-01',   'Mohammed Lahlou',     '+212662200003', '2026-02', 1, '2020', 1.56, 1000, '1002', 'JR-2RYCVG', true),
('j04', 'bld-3', 'Apt T-02',   'Hind Fikri',          '+212662200004', '2026-01', 1, '2021', 1.56, 1000, '1003', 'JR-N6XHJW', true),
('j05', 'bld-3', 'Apt T-05',   'Hamid El Mansouri',   '+212662200005', '2026-02', 1, '2019', 1.56, 1000, '1004', 'JR-Q3BKRM', true),
('j06', 'bld-3', 'Apt T-08',   'Souad Cherkaoui',     '+212662200006', '2026-02', 1, '2022', 1.56, 1000, '1005', 'JR-7WGFZP', true),
('j07', 'bld-3', 'Apt R-02',   'Tarik Benkirane',     '+212662200007', '2025-11', 2, '2023', 1.56, 1000, '1006', 'JR-C4YXVN', true),
('j08', 'bld-3', 'Apt R-04',   'Siham Kabbaj',        '+212662200008', '2026-02', 2, '2020', 1.56, 1000, '1007', 'JR-M9JQRB', true),
('j09', 'bld-3', 'Apt R-07',   'Nabil Berrada',       '+212662200009', '2026-02', 2, '2019', 1.56, 1000, '1008', 'JR-H5WKZX', true),
('j10', 'bld-3', 'Apt S-01',   'Loubna Alaoui',       '+212662200010', '2026-02', 3, '2021', 1.56, 1000, '1009', 'JR-R8CNPT', true),
('j11', 'bld-3', 'Apt S-03',   'Youssef Sabiri',      '+212662200011', '2026-01', 3, '2022', 1.56, 1000, '1010', 'JR-6BMJWY', true),
('j12', 'bld-3', 'Apt S-06',   'Rim Tazi',            '+212662200012', '2026-02', 3, '2018', 1.56, 1000, '1011', 'JR-D2VXQK', true)
ON CONFLICT (id) DO NOTHING;

-- ── 2. EXPENSES (individual log entries for the Dépenses tab) ─────────────────
-- Note: EXPENSES_BLD1/2/3 in mockData.js are pie-chart summaries — they stay
-- in the frontend. These are individual entries that map to the expenses table.

INSERT INTO expenses (id, building_id, date, category, vendor, amount, description, has_invoice) VALUES
-- Norwest (bld-1) — from INITIAL_EXPENSE_LOG
('el1',   'bld-1', '2026-02-18', 'Entretien & réparations', 'Otis Morocco',   8400, 'Révision complète ascenseur Bloc B',         true),
('el2',   'bld-1', '2026-02-15', 'Nettoyage',               'ProNet SARL',    3200, 'Nettoyage parties communes — quinzaine',     true),
('el3',   'bld-1', '2026-02-10', 'Eau & Électricité',       'Redal',          1850, 'Facture eau communes — Janvier 2026',        true),
('el4',   'bld-1', '2026-02-08', 'Entretien & réparations', 'IBS Plomberie',  3600, 'Réparation fuite parking sous-sol',          false),
-- Résidence Atlas (bld-2)
('el-a1', 'bld-2', '2026-02-20', 'Entretien & réparations', 'Atlas Lift',     12500, 'Révision ascenseur Tour A',                 true),
('el-a2', 'bld-2', '2026-02-17', 'Nettoyage',               'Brillo Net',     5400,  'Nettoyage parties communes — quinzaine',    true),
('el-a3', 'bld-2', '2026-02-12', 'Eau & Électricité',       'Lydec',          3200,  'Facture eau communes — Janvier 2026',       true),
('el-a4', 'bld-2', '2026-02-05', 'Gardiennage',             'SafeGuard Atlas',9200,  'Rémunération équipe gardiennage — Jan. 2026', true),
-- Jardins du Roi (bld-3)
('el-j1', 'bld-3', '2026-02-22', 'Espaces verts',           'GreenRabat SARL',6200, 'Entretien jardins et haies — Fév. 2026',    true),
('el-j2', 'bld-3', '2026-02-15', 'Entretien & réparations', 'AquaTech Rabat', 3800, 'Remplacement pompe fontaine centrale',       false),
('el-j3', 'bld-3', '2026-02-10', 'Eau & Électricité',       'Redal',          2100, 'Facture eau communes — Janvier 2026',        true)
ON CONFLICT (id) DO NOTHING;

-- ── 3. TICKETS ────────────────────────────────────────────────────────────────
-- Note: apostrophes in time values (Aujourd''hui) are SQL-escaped.

INSERT INTO tickets (id, building_id, title, status, date, time, agent, priority, category) VALUES
-- Norwest (bld-1)
('t1', 'bld-1', 'Entretien jardins (espaces verts)',  'in_progress', '2026-03-01', 'Aujourd''hui, 08:00',     'Norwest Green Team', 'normal', 'espaces_verts'),
('t2', 'bld-1', 'Nettoyage piscine',                  'in_progress', '2026-03-01', 'Aujourd''hui, 14:00',     'H2O Tanger',         'normal', 'nettoyage'),
('t3', 'bld-1', 'Vérification extincteurs Bloc A–C',  'scheduled',   '2026-03-05', 'Jeu. 05 Mars, 10:00',    'SafeGuard Maroc',    'urgent', 'securite'),
('t4', 'bld-1', 'Remplacement pompes eau Bloc D',     'scheduled',   '2026-03-07', 'Sam. 07 Mars, 09:00',    'HydroTech Tanger',   'normal', 'plomberie'),
('t5', 'bld-1', 'Maintenance ascenseur Bloc B',       'scheduled',   '2026-03-10', 'Mar. 10 Mars, 08:00',    'Otis Maroc',         'urgent', 'ascenseur'),
('t6', 'bld-1', 'Peinture cage escalier Bloc A',      'scheduled',   '2026-03-14', 'Sam. 14 Mars, 07:30',    'ColorMat SARL',      'normal', 'peinture'),
('t7', 'bld-1', 'Réparation éclairage hall entrée',   'done',        '2026-02-28', 'Ven. 28 Fév., 09:00',    'Electric Morocco',   'urgent', 'electricite'),
('t8', 'bld-1', 'Nettoyage façade principale',         'done',        '2026-02-20', '20 Fév.',                 'CleanPro Tanger',    'normal', 'nettoyage'),
('t9', 'bld-1', 'Contrôle tableau électrique',        'done',        '2026-02-15', '15 Fév.',                 'Electric Morocco',   'urgent', 'electricite'),
-- Résidence Atlas (bld-2)
('at1', 'bld-2', 'Panne ascenseur Tour A',             'in_progress', '2026-03-01', 'Aujourd''hui, 07:30',    'Otis Maroc',         'urgent', 'ascenseur'),
('at2', 'bld-2', 'Maintenance piscine — contrôle pH',  'in_progress', '2026-03-01', 'Aujourd''hui, 11:00',    'AquaPro Casa',       'normal', 'nettoyage'),
('at3', 'bld-2', 'Remplacement éclairage parking B2', 'scheduled',   '2026-03-04', 'Mar. 04 Mars, 08:00',    'LumièrElec SARL',   'normal', 'electricite'),
('at4', 'bld-2', 'Vérification système incendie',      'scheduled',   '2026-03-06', 'Jeu. 06 Mars, 09:00',    'SafeGuard Maroc',    'urgent', 'securite'),
('at5', 'bld-2', 'Entretien espaces verts communs',   'scheduled',   '2026-03-08', 'Dim. 08 Mars, 07:00',    'GreenCasa SARL',     'normal', 'espaces_verts'),
('at6', 'bld-2', 'Réparation portail entrée principale','done',       '2026-02-28', 'Hier',                    'Dépann Express',     'urgent', 'securite'),
('at7', 'bld-2', 'Nettoyage façade blocs C & D',      'done',        '2026-02-12', '12 Fév.',                 'CleanPro Casablanca','normal', 'nettoyage'),
('at8', 'bld-2', 'Remplacement câblage interphone',   'done',        '2026-02-08', '08 Fév.',                 'TeleTech Casa',      'normal', 'electricite'),
-- Jardins du Roi (bld-3)
('jt1', 'bld-3', 'Taille haies & entretien espaces verts','in_progress','2026-03-01','Aujourd''hui, 08:30',   'GreenRabat SARL',    'normal', 'espaces_verts'),
('jt2', 'bld-3', 'Réparation caméra sécurité entrée', 'scheduled',   '2026-03-03', 'Lun. 03 Mars, 14:00',    'SafeGuard Maroc',    'urgent', 'securite'),
('jt3', 'bld-3', 'Entretien réseau irrigation jardins','scheduled',  '2026-03-09', 'Lun. 09 Mars, 08:00',    'AquaTech Rabat',     'normal', 'plomberie'),
('jt4', 'bld-3', 'Contrôle éclairage allées extérieures','scheduled','2026-03-12', 'Jeu. 12 Mars, 09:00',    'Electric Rabat',     'normal', 'electricite'),
('jt5', 'bld-3', 'Remplacement pompe fontaine centrale','done',      '2026-02-28', 'Hier, 11:00',             'AquaTech Rabat',     'normal', 'plomberie'),
('jt6', 'bld-3', 'Peinture portail Villa V-01 → V-04','done',       '2026-02-14', '14 Fév.',                 'ColorMat SARL',      'normal', 'peinture')
ON CONFLICT (id) DO NOTHING;

-- ── 4. DISPUTES ───────────────────────────────────────────────────────────────
-- Note: apostrophes inside SQL string literals are doubled ('').
-- The JSONB parties field stores a JSON array of party names.

INSERT INTO disputes (id, building_id, title, parties, status, priority, date, ai_suggestion, attachments) VALUES

-- Norwest (bld-1)
('DSP-001', 'bld-1',
 'Nuisances sonores — Apt 4A vs 4B',
 '["Ahmed Tazi (4A)", "Hassan Idrissi (4B)"]'::jsonb,
 'open', 'high', '18 Fév. 2026',
 'Programmer une réunion de médiation. Art. 22 de la Loi 18-00 s''applique — recommander un accord sur les heures de silence à documenter lors de la prochaine AG.',
 '[]'::jsonb),

('DSP-002', 'bld-1',
 'Litige de place de parking — Bloc B',
 '["Omar Chraibi (1C)", "Rachid Bouazza (7C)"]'::jsonb,
 'mediation', 'medium', '14 Fév. 2026',
 'Séance de médiation IA complétée. En attente de signature sur l''amendement d''attribution des places. Relance dans 5 jours.',
 '[]'::jsonb),

('DSP-003', 'bld-1',
 'Responsabilité fuite d''eau — Apt 9A',
 '["Lamia Bensouda (9A)", "Comité de l''immeuble"]'::jsonb,
 'resolved', 'low', '29 Jan. 2026',
 'Résolu. Coût de réparation (2 200 MAD) réparti conformément à l''Art. 37 de la Loi 18-00. Facture prestataire archivée.',
 '[]'::jsonb),

-- Résidence Atlas (bld-2)
('DSP-A01', 'bld-2',
 'Occupation abusive — terrasse commune Bloc E',
 '["Amine Ennaji (E-01)", "Comité de copropriété"]'::jsonb,
 'open', 'high', '20 Fév. 2026',
 'Mettre en demeure le résident sous 72h. Conformément à l''Art. 18 de la Loi 18-00, les parties communes ne peuvent être appropriées. Documenter avec photos avant l''AG.',
 '[]'::jsonb),

('DSP-A02', 'bld-2',
 'Travaux non autorisés — Apt B-04',
 '["Zineb Kettani (B-04)", "Syndic Atlas"]'::jsonb,
 'open', 'medium', '16 Fév. 2026',
 'Demander un constat contradictoire. Si les travaux affectent les parties communes ou la structure, application de l''Art. 25 — remise en état aux frais du propriétaire.',
 '[]'::jsonb),

('DSP-A03', 'bld-2',
 'Impayés charges — 3 mois consécutifs (Apt F-02)',
 '["Mehdi Tahiri (F-02)", "Comité de copropriété"]'::jsonb,
 'mediation', 'medium', '10 Fév. 2026',
 'Plan de remboursement proposé : 3 mensualités. En attente de signature. Art. 37 applicable si accord non respecté sous 30 jours.',
 '[]'::jsonb),

('DSP-A04', 'bld-2',
 'Dégât des eaux — Apt G-04 → F-08',
 '["Khalid Tazi (G-04)", "Nora Bensouda (F-08)"]'::jsonb,
 'resolved', 'low', '22 Jan. 2026',
 'Résolu. Réparation (4 800 MAD) prise en charge par assurance du propriétaire Tazi. Rapport d''expertise archivé.',
 '[]'::jsonb),

-- Jardins du Roi (bld-3)
('DSP-J01', 'bld-3',
 'Stationnement devant Villa V-02',
 '["Mohammed Lahlou (T-01)", "Fatima Zhra Idrissi (V-02)"]'::jsonb,
 'open', 'medium', '19 Fév. 2026',
 'Envoyer une note de rappel au règlement intérieur (Art. 12). Proposer une solution de marquage au sol. Agenda de la prochaine AG : vote sur plan de stationnement.',
 '[]'::jsonb),

('DSP-J02', 'bld-3',
 'Nuisances — travaux Apt R-02 en dehors des heures',
 '["Tarik Benkirane (R-02)", "Nabil Berrada (R-09)"]'::jsonb,
 'mediation', 'medium', '11 Fév. 2026',
 'Rappel écrit envoyé. Séance de médiation prévue le 28 Fév. Art. 22 de la Loi 18-00 : heures autorisées 08h–20h semaine, 09h–13h weekend.',
 '[]'::jsonb),

('DSP-J03', 'bld-3',
 'Mauvais entretien jardin privatif — Villa V-01',
 '["Abdellah Benali (V-01)", "Comité Jardins du Roi"]'::jsonb,
 'resolved', 'low', '15 Jan. 2026',
 'Résolu. Travaux de remise en état effectués. Aménagement conforme au cahier des charges de la résidence. Dossier clos.',
 '[]'::jsonb)

ON CONFLICT (id) DO NOTHING;

-- ── 5. SUPPLIERS ──────────────────────────────────────────────────────────────

INSERT INTO suppliers (id, building_id, name, category, phone, email, contract_ref, since, rating, notes) VALUES
-- Norwest (bld-1)
('sup-1-01', 'bld-1', 'TechLift Maroc',    'ascenseur',   '+212 522 100 200', 'contact@techlift.ma',  'CTR-2025-001', '2024-01', 4, 'Maintenance préventive mensuelle. Intervention sous 24h.'),
('sup-1-02', 'bld-1', 'CleanPro Services', 'nettoyage',   '+212 661 200 300', 'info@cleanpro.ma',    'CTR-2025-002', '2023-06', 5, '3 passages/semaine. Équipe de 2 agents.'),
('sup-1-03', 'bld-1', 'Électro Bâtiment',  'electricite', '+212 672 300 400', 'elec@batiment.ma',    'CTR-2024-003', '2024-03', 3, 'Dépannages électriques. Délai parfois long en semaine.'),
('sup-1-04', 'bld-1', 'Gardex Sécurité',   'gardiennage', '+212 655 400 500', 'contact@gardex.ma',   'CTR-2025-004', '2022-01', 4, 'Gardien 24h/7j. Renouvellement contrat Avr 2026.'),
('sup-1-05', 'bld-1', 'AquaPlomb Maroc',   'plomberie',   '+212 660 500 600', 'aquaplomb@gmail.com', '',             '2025-02', 4, 'Interventions ponctuelles. Tarifs corrects.'),
-- Résidence Atlas (bld-2)
('sup-2-01', 'bld-2', 'Atlas Lift',        'ascenseur',     '+212 522 200 300', 'info@atlaslift.ma', 'CTR-2025-010', '2023-01', 5, 'Contrat full-service. Très réactifs.'),
('sup-2-02', 'bld-2', 'Brillo Net',        'nettoyage',     '+212 662 300 400', 'brillo@net.ma',     'CTR-2025-011', '2024-01', 4, 'Nettoyage quotidien parties communes.'),
('sup-2-03', 'bld-2', 'Verde Espaces',     'espaces_verts', '+212 673 400 500', 'verde@espaces.ma',  'CTR-2025-012', '2024-04', 4, 'Entretien jardins 2x/mois.'),
('sup-2-04', 'bld-2', 'SafeGuard Atlas',   'gardiennage',   '+212 656 500 600', 'safe@guard.ma',     'CTR-2024-013', '2021-06', 3, 'Rotation équipe parfois irrégulière.'),
-- Jardins du Roi (bld-3)
('sup-3-01', 'bld-3', 'Rabat Ascenseurs',  'ascenseur',   '+212 537 100 200', 'rabatasc@ma.ma', 'CTR-2025-020', '2023-09', 4, 'Maintenance bi-mensuelle. OK.'),
('sup-3-02', 'bld-3', 'Propre Cité',       'nettoyage',   '+212 663 200 300', 'propre@cite.ma', 'CTR-2025-021', '2024-02', 5, 'Excellent service. Ponctualité impeccable.'),
('sup-3-03', 'bld-3', 'Électricité Agdal', 'electricite', '+212 674 300 400', 'elec@agdal.ma',  '',             '2025-01', 3, 'Prestations ponctuelles uniquement.')
ON CONFLICT (id) DO NOTHING;

-- ── 6. MEETINGS (Assemblées Générales) ────────────────────────────────────────
-- agenda/votes/attendance stored as JSONB.
-- agendaId keys in votes match agenda item ids.

INSERT INTO meetings (id, building_id, title, date, time, location, status, convocation_sent, agenda, attendance, votes, notes) VALUES

-- Norwest (bld-1)
('ag-n-002', 'bld-1',
 'Assemblée Générale Ordinaire 2026',
 '2026-04-20', '19:00', 'Salle commune — RDC', 'upcoming', false,
 '[{"id":"b1","title":"Approbation des comptes 2025/2026"},{"id":"b2","title":"Budget prévisionnel 2026/2027"},{"id":"b3","title":"Renouvellement contrat gardiennage"},{"id":"b4","title":"Travaux ravalement façade Bloc A"}]'::jsonb,
 NULL,
 '[]'::jsonb,
 ''),

('ag-n-001', 'bld-1',
 'Assemblée Générale Ordinaire 2025',
 '2026-01-15', '19:00', 'Salle commune — RDC', 'completed', true,
 '[{"id":"a1","title":"Approbation des comptes 2024/2025"},{"id":"a2","title":"Budget prévisionnel 2025/2026"},{"id":"a3","title":"Réparation ascenseur Bloc B — approbation devis"}]'::jsonb,
 '{"present":18,"total":24}'::jsonb,
 '[{"agendaId":"a1","pour":16,"contre":1,"abstention":1},{"agendaId":"a2","pour":14,"contre":2,"abstention":2},{"agendaId":"a3","pour":15,"contre":2,"abstention":1}]'::jsonb,
 'Réunion tenue dans les délais légaux. Quorum atteint (75%). Tous les points approuvés.'),

-- Résidence Atlas (bld-2)
('ag-a-002', 'bld-2',
 'Assemblée Générale Ordinaire 2026',
 '2026-05-10', '18:30', 'Salle de réunion — Bloc A RDC', 'upcoming', false,
 '[{"id":"c1","title":"Approbation des comptes 2025/2026"},{"id":"c2","title":"Remplacement système interphone"},{"id":"c3","title":"Aménagement parking visiteurs"}]'::jsonb,
 NULL,
 '[]'::jsonb,
 ''),

('ag-a-001', 'bld-2',
 'Assemblée Générale Ordinaire 2025',
 '2026-01-22', '18:30', 'Salle de réunion — Bloc A RDC', 'completed', true,
 '[{"id":"d1","title":"Approbation des comptes 2024/2025"},{"id":"d2","title":"Contrat maintenance piscine — renouvellement"}]'::jsonb,
 '{"present":12,"total":16}'::jsonb,
 '[{"agendaId":"d1","pour":11,"contre":0,"abstention":1},{"agendaId":"d2","pour":9,"contre":2,"abstention":1}]'::jsonb,
 'Quorum atteint (75%). Renouvellement contrat piscine approuvé.'),

-- Jardins du Roi (bld-3)
('ag-j-002', 'bld-3',
 'Assemblée Générale Ordinaire 2026',
 '2026-04-28', '19:30', 'Club house — Jardins du Roi', 'upcoming', true,
 '[{"id":"e1","title":"Approbation des comptes 2025/2026"},{"id":"e2","title":"Vote plan de stationnement résidence"},{"id":"e3","title":"Rénovation espaces verts communs"}]'::jsonb,
 NULL,
 '[]'::jsonb,
 ''),

('ag-j-001', 'bld-3',
 'Assemblée Générale Extraordinaire — Travaux',
 '2025-11-05', '19:30', 'Club house — Jardins du Roi', 'completed', true,
 '[{"id":"f1","title":"Approbation devis réparation réseau eau pluviale"},{"id":"f2","title":"Appel de fonds exceptionnel — 500 MAD/unité"}]'::jsonb,
 '{"present":9,"total":12}'::jsonb,
 '[{"agendaId":"f1","pour":8,"contre":0,"abstention":1},{"agendaId":"f2","pour":7,"contre":1,"abstention":1}]'::jsonb,
 'AG extraordinaire convoquée suite à dégâts eau pluviale. Fonds collectés et travaux planifiés pour Déc. 2025.')

ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- End of seed data. Total rows:
--   residents: 40 (12 + 16 + 12)
--   expenses:  11 (4 + 4 + 3)
--   tickets:   23 (9 + 8 + 6)
--   disputes:  10 (3 + 4 + 3)
--   suppliers: 12 (5 + 4 + 3)
--   meetings:   6 (2 + 2 + 2)
-- ═══════════════════════════════════════════════════════════════════════════════
