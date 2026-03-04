/**
 * SyndicPulse — Centralized mock data
 * Replace these with Supabase queries when the backend is live.
 * Each function mirrors what a real Supabase call would return.
 */

// ── Organizations ─────────────────────────────────────────────────────────────
export const ORGANIZATIONS = [
    { id: 'org-1', name: 'Benali Syndic', owner_email: 'omar@norwest.ma', plan: 'elite' },
    { id: 'org-2', name: 'Ezzouine Partners', owner_email: 'sara@atlas.ma', plan: 'pro' },
    { id: 'org-3', name: 'Tahiri Syndic', owner_email: 'karim@jardin.ma', plan: 'pro' },
]

// ── Buildings ─────────────────────────────────────────────────────────────────
export const BUILDINGS = [
    {
        id: 'bld-1',
        org_id: 'org-1',
        name: 'Norwest',
        city: 'Tanger',
        address: 'Av. Mohammed VI, Résidence Norwest, Tanger 90000',
        total_units: 48,
        reserve_fund_mad: 84500,
        color: '#22c55e',
        icon: 'Building2',
        manager: 'Omar Benali',
        collection_rate: 96.8,
        monthly_fee: 850,
        accessCode: 'NRWST-2026',
        shortCode: 'NW',
        payment_rib: '011 780 0123456789 0100',
        payment_bank: 'Attijariwafa Bank',
        payment_account_holder: 'Syndicat Résidence Norwest',
        payment_whatsapp: '+212661234567',
    },
    {
        id: 'bld-2',
        org_id: 'org-2',
        name: 'Résidence Atlas',
        city: 'Casablanca',
        address: 'Bd Anfa, Casablanca 20000',
        total_units: 120,
        reserve_fund_mad: 210000,
        color: '#6366f1',
        icon: 'Landmark',
        manager: 'Sara Ezzouine',
        collection_rate: 88.4,
        monthly_fee: 1200,
        accessCode: 'ATLAS-2026',
        shortCode: 'AT',
        payment_rib: '022 450 9876543210 0200',
        payment_bank: 'CIH Bank',
        payment_account_holder: 'Syndicat Résidence Atlas',
        payment_whatsapp: '+212522001122',
    },
    {
        id: 'bld-3',
        org_id: 'org-3',
        name: 'Jardins du Roi',
        city: 'Rabat',
        address: 'Quartier Agdal, Rabat 10000',
        total_units: 64,
        reserve_fund_mad: 145000,
        color: '#f59e0b',
        icon: 'Leaf',
        manager: 'Karim Tahiri',
        collection_rate: 91.2,
        monthly_fee: 1000,
        accessCode: 'JARDINS-2026',
        shortCode: 'JR',
        payment_rib: '007 127 0011223344 0300',
        payment_bank: 'BMCE Bank of Africa',
        payment_account_holder: 'Syndicat Jardins du Roi',
        payment_whatsapp: '+212537334455',
    },
]

// ── Demo auth users ────────────────────────────────────────────────────────────
// In production: Supabase Auth + users table with role + org_id
export const DEMO_USERS = [
    {
        id: 'usr-admin',
        email: 'admin@syndicpulse.ma',
        password: 'admin',
        full_name: 'Admin SyndicPulse',
        role: 'super_admin',
        org_id: null,
        accessible_building_ids: ['bld-1', 'bld-2', 'bld-3'],
        avatar_bg: '060c18',
        avatar_color: '06b6d4',
    },
    {
        id: 'usr-omar',
        email: 'omar@norwest.ma',
        password: 'omar',
        full_name: 'Omar Benali',
        role: 'syndic_manager',
        org_id: 'org-1',
        accessible_building_ids: ['bld-1'],
        avatar_bg: '0d1629',
        avatar_color: '22c55e',
    },
    {
        id: 'usr-sara',
        email: 'sara@atlas.ma',
        password: 'sara',
        full_name: 'Sara Ezzouine',
        role: 'syndic_manager',
        org_id: 'org-2',
        accessible_building_ids: ['bld-2'],
        avatar_bg: '0d1629',
        avatar_color: '6366f1',
    },
]

// ── Residents (Norwest · bld-1) ───────────────────────────────────────────────
export const RESIDENTS_BLD1 = [
    { id: 'r01', unit: 'Apt 1A',  name: 'Ahmed Benjelloun',  phone: '+212661234567', paidThrough: '2026-02', floor: 1,  since: '2019', quota: 2.08, portalCode: 'NW-4K8MRX' },
    { id: 'r02', unit: 'Apt 1B',  name: 'Khadija Moussaoui', phone: '+212662345678', paidThrough: '2026-02', floor: 1,  since: '2021', quota: 2.08, portalCode: 'NW-B3TPZQ' },
    { id: 'r03', unit: 'Apt 1C',  name: 'Omar Chraibi',      phone: '+212663456789', paidThrough: '2026-02', floor: 1,  since: '2020', quota: 2.08, portalCode: 'NW-7YCNV2' },
    { id: 'r04', unit: 'Apt 1D',  name: 'Nadia El Fassi',    phone: '+212664567890', paidThrough: '2025-11', floor: 1,  since: '2022', quota: 2.08, portalCode: 'NW-P6HJRW' },
    { id: 'r05', unit: 'Apt 2A',  name: 'Youssef Alami',     phone: '+212665678901', paidThrough: '2026-04', floor: 2,  since: '2018', quota: 2.08, portalCode: 'NW-M9KXQB' },
    { id: 'r06', unit: 'Apt 2B',  name: 'Sanae Bouazza',     phone: '+212666789012', paidThrough: '2026-02', floor: 2,  since: '2023', quota: 2.08, portalCode: 'NW-X2RNFG' },
    { id: 'r07', unit: 'Apt 4B',  name: 'Hassan Idrissi',    phone: '+212667890123', paidThrough: '2026-02', floor: 4,  since: '2020', quota: 2.08, portalCode: 'NW-5VZMKY' },
    { id: 'r08', unit: 'Apt 6B',  name: 'Mehdi Chraibi',     phone: '+212668901234', paidThrough: '2026-01', floor: 6,  since: '2021', quota: 2.08, portalCode: 'NW-C8BWPJ' },
    { id: 'r09', unit: 'Apt 7C',  name: 'Rachid Bouazza',    phone: '+212669012345', paidThrough: '2026-01', floor: 7,  since: '2022', quota: 2.08, portalCode: 'NW-Q4TXNR' },
    { id: 'r10', unit: 'Apt 9A',  name: 'Lamia Bensouda',    phone: '+212661123456', paidThrough: '2026-02', floor: 9,  since: '2019', quota: 2.08, portalCode: 'NW-E7GZCA' },
    { id: 'r11', unit: 'Apt 11C', name: 'Lamia Tazi',        phone: '+212662234567', paidThrough: '2025-11', floor: 11, since: '2023', quota: 2.08, portalCode: 'NW-H3RVMX' },
    { id: 'r12', unit: 'Apt 12A', name: 'Fatima Zouheir',    phone: '+212663345678', paidThrough: '2026-02', floor: 12, since: '2020', quota: 2.08, portalCode: 'NW-W6YBNP' },
]

// ── Maintenance tickets (Norwest · bld-1) ─────────────────────────────────────
export const TICKETS_BLD1 = [
    { id: 't1', title: 'Entretien jardins (espaces verts)', status: 'in_progress', date: '2026-03-01', time: "Aujourd'hui, 08:00", agent: 'Norwest Green Team', priority: 'normal', category: 'espaces_verts' },
    { id: 't2', title: 'Nettoyage piscine', status: 'in_progress', date: '2026-03-01', time: "Aujourd'hui, 14:00", agent: 'H2O Tanger', priority: 'normal', category: 'nettoyage' },
    { id: 't3', title: 'Vérification extincteurs Bloc A–C', status: 'scheduled', date: '2026-03-05', time: 'Jeu. 05 Mars, 10:00', agent: 'SafeGuard Maroc', priority: 'urgent', category: 'securite' },
    { id: 't4', title: 'Remplacement pompes eau Bloc D', status: 'scheduled', date: '2026-03-07', time: 'Sam. 07 Mars, 09:00', agent: 'HydroTech Tanger', priority: 'normal', category: 'plomberie' },
    { id: 't5', title: 'Maintenance ascenseur Bloc B', status: 'scheduled', date: '2026-03-10', time: 'Mar. 10 Mars, 08:00', agent: 'Otis Maroc', priority: 'urgent', category: 'ascenseur' },
    { id: 't6', title: 'Peinture cage escalier Bloc A', status: 'scheduled', date: '2026-03-14', time: 'Sam. 14 Mars, 07:30', agent: 'ColorMat SARL', priority: 'normal', category: 'peinture' },
    { id: 't7', title: 'Réparation éclairage hall entrée', status: 'done', date: '2026-02-28', time: 'Ven. 28 Fév., 09:00', agent: 'Electric Morocco', priority: 'urgent', category: 'electricite' },
    { id: 't8', title: 'Nettoyage façade principale', status: 'done', date: '2026-02-20', time: '20 Fév.', agent: 'CleanPro Tanger', priority: 'normal', category: 'nettoyage' },
    { id: 't9', title: 'Contrôle tableau électrique', status: 'done', date: '2026-02-15', time: '15 Fév.', agent: 'Electric Morocco', priority: 'urgent', category: 'electricite' },
]

// ── Expenses (Norwest · bld-1) ────────────────────────────────────────────────
export const EXPENSES_BLD1 = [
    { category: 'Entretien & réparations', amount: 12400, pct: 38, color: 'bg-cyan-500' },
    { category: 'Gardiennage', amount: 8200, pct: 25, color: 'bg-violet-500' },
    { category: 'Nettoyage', amount: 6500, pct: 20, color: 'bg-emerald-500' },
    { category: 'Eau & Électricité', amount: 4100, pct: 12, color: 'bg-amber-500' },
    { category: 'Administration', amount: 1600, pct: 5, color: 'bg-slate-500' },
]

// ── Disputes (Norwest · bld-1) ────────────────────────────────────────────────
export const DISPUTES_BLD1 = [
    {
        id: 'DSP-001',
        title: 'Nuisances sonores — Apt 4A vs 4B',
        parties: ['Ahmed Tazi (4A)', 'Hassan Idrissi (4B)'],
        status: 'open',
        priority: 'high',
        date: '18 Fév. 2026',
        ai_suggestion: 'Programmer une réunion de médiation. Art. 22 de la Loi 18-00 s\'applique — recommander un accord sur les heures de silence à documenter lors de la prochaine AG.',
    },
    {
        id: 'DSP-002',
        title: 'Litige de place de parking — Bloc B',
        parties: ['Omar Chraibi (1C)', 'Rachid Bouazza (7C)'],
        status: 'mediation',
        priority: 'medium',
        date: '14 Fév. 2026',
        ai_suggestion: 'Séance de médiation IA complétée. En attente de signature sur l\'amendement d\'attribution des places. Relance dans 5 jours.',
    },
    {
        id: 'DSP-003',
        title: 'Responsabilité fuite d\'eau — Apt 9A',
        parties: ['Lamia Bensouda (9A)', 'Comité de l\'immeuble'],
        status: 'resolved',
        priority: 'low',
        date: '29 Jan. 2026',
        ai_suggestion: 'Résolu. Coût de réparation (2 200 MAD) réparti conformément à l\'Art. 37 de la Loi 18-00. Facture prestataire archivée.',
    },
]

// ── Recent payments (Norwest · bld-1) ─────────────────────────────────────────
export const RECENT_PAYMENTS_BLD1 = [
    { unit: 'Apt 4B', name: 'Hassan Idrissi', amount: '850 MAD', date: '20 Fév.', status: 'paid' },
    { unit: 'Apt 12A', name: 'Fatima Zouheir', amount: '850 MAD', date: '19 Fév.', status: 'paid' },
    { unit: 'Apt 7C', name: 'Rachid Bouazza', amount: '850 MAD', date: '18 Fév.', status: 'pending' },
    { unit: 'Apt 1D', name: 'Nadia El Fassi', amount: '850 MAD', date: '17 Fév.', status: 'overdue' },
    { unit: 'Apt 9A', name: 'Youssef Alami', amount: '850 MAD', date: '15 Fév.', status: 'paid' },
]

// ── Collection history (Norwest · bld-1) ──────────────────────────────────────
export const COLLECTION_HISTORY_BLD1 = [
    { month: 'Août', value: 92 },
    { month: 'Sep.', value: 95 },
    { month: 'Oct.', value: 88 },
    { month: 'Nov.', value: 97 },
    { month: 'Déc.', value: 94 },
    { month: 'Jan.', value: 96 },
    { month: 'Fév.', value: 97 },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  RÉSIDENCE ATLAS — bld-2 · Casablanca · 120 unités
// ═══════════════════════════════════════════════════════════════════════════════

export const RESIDENTS_BLD2 = [
    { id: 'a01', unit: 'Apt A-02', name: 'Rachid Berrada',    phone: '+212661100001', paidThrough: '2026-02', floor: 1, since: '2018', quota: 0.83, portalCode: 'AT-K5MJWQ' },
    { id: 'a02', unit: 'Apt A-05', name: 'Houda Cherkaoui',   phone: '+212661100002', paidThrough: '2026-02', floor: 1, since: '2020', quota: 0.83, portalCode: 'AT-R9XBZN' },
    { id: 'a03', unit: 'Apt B-01', name: 'Karim Lahlou',      phone: '+212661100003', paidThrough: '2026-02', floor: 2, since: '2019', quota: 0.83, portalCode: 'AT-2GYPVC' },
    { id: 'a04', unit: 'Apt B-04', name: 'Zineb Kettani',     phone: '+212661100004', paidThrough: '2025-11', floor: 2, since: '2021', quota: 0.83, portalCode: 'AT-N7HKXM' },
    { id: 'a05', unit: 'Apt C-02', name: 'Brahim Sabiri',     phone: '+212661100005', paidThrough: '2026-05', floor: 3, since: '2017', quota: 0.83, portalCode: 'AT-T4QWRB' },
    { id: 'a06', unit: 'Apt C-07', name: 'Amina El Alami',    phone: '+212661100006', paidThrough: '2026-01', floor: 3, since: '2022', quota: 0.83, portalCode: 'AT-6CNFJZ' },
    { id: 'a07', unit: 'Apt D-03', name: 'Yassine Benkirane', phone: '+212661100007', paidThrough: '2026-02', floor: 4, since: '2020', quota: 0.83, portalCode: 'AT-8VMKYP' },
    { id: 'a08', unit: 'Apt D-09', name: 'Salma Fikri',       phone: '+212661100008', paidThrough: '2026-02', floor: 4, since: '2021', quota: 0.83, portalCode: 'AT-J3BXRW' },
    { id: 'a09', unit: 'Apt E-01', name: 'Amine Ennaji',      phone: '+212661100009', paidThrough: '2025-10', floor: 5, since: '2023', quota: 0.83, portalCode: 'AT-D5TZNQ' },
    { id: 'a10', unit: 'Apt E-06', name: 'Dounia Kabbaj',     phone: '+212661100010', paidThrough: '2026-02', floor: 5, since: '2019', quota: 0.83, portalCode: 'AT-P8GRXH' },
    { id: 'a11', unit: 'Apt F-02', name: 'Mehdi Tahiri',      phone: '+212661100011', paidThrough: '2026-01', floor: 6, since: '2022', quota: 0.83, portalCode: 'AT-Y2WCVN' },
    { id: 'a12', unit: 'Apt F-08', name: 'Nora Bensouda',     phone: '+212661100012', paidThrough: '2026-02', floor: 6, since: '2020', quota: 0.83, portalCode: 'AT-M7KBZJ' },
    { id: 'a13', unit: 'Apt G-04', name: 'Khalid Tazi',       phone: '+212661100013', paidThrough: '2026-02', floor: 7, since: '2018', quota: 0.83, portalCode: 'AT-X4NRQP' },
    { id: 'a14', unit: 'Apt G-10', name: 'Leila El Fassi',    phone: '+212661100014', paidThrough: '2025-11', floor: 7, since: '2023', quota: 0.83, portalCode: 'AT-3FHWYT' },
    { id: 'a15', unit: 'Apt H-03', name: 'Saad Alaoui',       phone: '+212661100015', paidThrough: '2026-02', floor: 8, since: '2019', quota: 0.83, portalCode: 'AT-9VZXKM' },
    { id: 'a16', unit: 'Apt H-07', name: 'Meryem Chraibi',    phone: '+212661100016', paidThrough: '2026-02', floor: 8, since: '2021', quota: 0.83, portalCode: 'AT-B6JCGR' },
]

export const TICKETS_BLD2 = [
    { id: 'at1', title: 'Panne ascenseur Tour A', status: 'in_progress', date: '2026-03-01', time: "Aujourd'hui, 07:30", agent: 'Otis Maroc', priority: 'urgent', category: 'ascenseur' },
    { id: 'at2', title: 'Maintenance piscine — contrôle pH', status: 'in_progress', date: '2026-03-01', time: "Aujourd'hui, 11:00", agent: 'AquaPro Casa', priority: 'normal', category: 'nettoyage' },
    { id: 'at3', title: 'Remplacement éclairage parking B2', status: 'scheduled', date: '2026-03-04', time: 'Mar. 04 Mars, 08:00', agent: 'LumièrElec SARL', priority: 'normal', category: 'electricite' },
    { id: 'at4', title: 'Vérification système incendie', status: 'scheduled', date: '2026-03-06', time: 'Jeu. 06 Mars, 09:00', agent: 'SafeGuard Maroc', priority: 'urgent', category: 'securite' },
    { id: 'at5', title: 'Entretien espaces verts communs', status: 'scheduled', date: '2026-03-08', time: 'Dim. 08 Mars, 07:00', agent: 'GreenCasa SARL', priority: 'normal', category: 'espaces_verts' },
    { id: 'at6', title: 'Réparation portail entrée principale', status: 'done', date: '2026-02-28', time: 'Hier', agent: 'Dépann Express', priority: 'urgent', category: 'securite' },
    { id: 'at7', title: 'Nettoyage façade blocs C & D', status: 'done', date: '2026-02-12', time: '12 Fév.', agent: 'CleanPro Casablanca', priority: 'normal', category: 'nettoyage' },
    { id: 'at8', title: 'Remplacement câblage interphone', status: 'done', date: '2026-02-08', time: '08 Fév.', agent: 'TeleTech Casa', priority: 'normal', category: 'electricite' },
]

export const EXPENSES_BLD2 = [
    { category: 'Entretien & réparations', amount: 38500, pct: 35, color: 'bg-cyan-500' },
    { category: 'Gardiennage', amount: 27600, pct: 25, color: 'bg-violet-500' },
    { category: 'Nettoyage', amount: 22000, pct: 20, color: 'bg-emerald-500' },
    { category: 'Eau & Électricité', amount: 13200, pct: 12, color: 'bg-amber-500' },
    { category: 'Ascenseur', amount: 6600, pct: 6, color: 'bg-pink-500' },
    { category: 'Administration', amount: 2200, pct: 2, color: 'bg-slate-500' },
]

export const DISPUTES_BLD2 = [
    {
        id: 'DSP-A01',
        title: 'Occupation abusive — terrasse commune Bloc E',
        parties: ['Amine Ennaji (E-01)', 'Comité de copropriété'],
        status: 'open',
        priority: 'high',
        date: '20 Fév. 2026',
        ai_suggestion: 'Mettre en demeure le résident sous 72h. Conformément à l\'Art. 18 de la Loi 18-00, les parties communes ne peuvent être appropriées. Documenter avec photos avant l\'AG.',
    },
    {
        id: 'DSP-A02',
        title: 'Travaux non autorisés — Apt B-04',
        parties: ['Zineb Kettani (B-04)', 'Syndic Atlas'],
        status: 'open',
        priority: 'medium',
        date: '16 Fév. 2026',
        ai_suggestion: 'Demander un constat contradictoire. Si les travaux affectent les parties communes ou la structure, application de l\'Art. 25 — remise en état aux frais du propriétaire.',
    },
    {
        id: 'DSP-A03',
        title: 'Impayés charges — 3 mois consécutifs (Apt F-02)',
        parties: ['Mehdi Tahiri (F-02)', 'Comité de copropriété'],
        status: 'mediation',
        priority: 'medium',
        date: '10 Fév. 2026',
        ai_suggestion: 'Plan de remboursement proposé : 3 mensualités. En attente de signature. Art. 37 applicable si accord non respecté sous 30 jours.',
    },
    {
        id: 'DSP-A04',
        title: 'Dégât des eaux — Apt G-04 → F-08',
        parties: ['Khalid Tazi (G-04)', 'Nora Bensouda (F-08)'],
        status: 'resolved',
        priority: 'low',
        date: '22 Jan. 2026',
        ai_suggestion: 'Résolu. Réparation (4 800 MAD) prise en charge par assurance du propriétaire Tazi. Rapport d\'expertise archivé.',
    },
]

export const RECENT_PAYMENTS_BLD2 = [
    { unit: 'Apt A-02', name: 'Rachid Berrada', amount: '1 200 MAD', date: '21 Fév.', status: 'paid' },
    { unit: 'Apt G-04', name: 'Khalid Tazi', amount: '1 200 MAD', date: '20 Fév.', status: 'paid' },
    { unit: 'Apt C-02', name: 'Brahim Sabiri', amount: '1 200 MAD', date: '19 Fév.', status: 'paid' },
    { unit: 'Apt B-04', name: 'Zineb Kettani', amount: '1 200 MAD', date: '18 Fév.', status: 'overdue' },
    { unit: 'Apt C-07', name: 'Amina El Alami', amount: '1 200 MAD', date: '17 Fév.', status: 'pending' },
]

export const COLLECTION_HISTORY_BLD2 = [
    { month: 'Août', value: 84 },
    { month: 'Sep.', value: 87 },
    { month: 'Oct.', value: 82 },
    { month: 'Nov.', value: 90 },
    { month: 'Déc.', value: 88 },
    { month: 'Jan.', value: 86 },
    { month: 'Fév.', value: 89 },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  JARDINS DU ROI — bld-3 · Rabat · 64 unités
// ═══════════════════════════════════════════════════════════════════════════════

export const RESIDENTS_BLD3 = [
    { id: 'j01', unit: 'Villa V-01', name: 'Abdellah Benali',     phone: '+212662200001', paidThrough: '2026-02', floor: 0, since: '2017', quota: 1.56, portalCode: 'JR-5KMWXB' },
    { id: 'j02', unit: 'Villa V-02', name: 'Fatima Zhra Idrissi', phone: '+212662200002', paidThrough: '2026-02', floor: 0, since: '2018', quota: 1.56, portalCode: 'JR-T8PZNQ' },
    { id: 'j03', unit: 'Apt T-01',   name: 'Mohammed Lahlou',     phone: '+212662200003', paidThrough: '2026-02', floor: 1, since: '2020', quota: 1.56, portalCode: 'JR-2RYCVG' },
    { id: 'j04', unit: 'Apt T-02',   name: 'Hind Fikri',          phone: '+212662200004', paidThrough: '2026-01', floor: 1, since: '2021', quota: 1.56, portalCode: 'JR-N6XHJW' },
    { id: 'j05', unit: 'Apt T-05',   name: 'Hamid El Mansouri',   phone: '+212662200005', paidThrough: '2026-02', floor: 1, since: '2019', quota: 1.56, portalCode: 'JR-Q3BKRM' },
    { id: 'j06', unit: 'Apt T-08',   name: 'Souad Cherkaoui',     phone: '+212662200006', paidThrough: '2026-02', floor: 1, since: '2022', quota: 1.56, portalCode: 'JR-7WGFZP' },
    { id: 'j07', unit: 'Apt R-02',   name: 'Tarik Benkirane',     phone: '+212662200007', paidThrough: '2025-11', floor: 2, since: '2023', quota: 1.56, portalCode: 'JR-C4YXVN' },
    { id: 'j08', unit: 'Apt R-04',   name: 'Siham Kabbaj',        phone: '+212662200008', paidThrough: '2026-02', floor: 2, since: '2020', quota: 1.56, portalCode: 'JR-M9JQRB' },
    { id: 'j09', unit: 'Apt R-07',   name: 'Nabil Berrada',       phone: '+212662200009', paidThrough: '2026-02', floor: 2, since: '2019', quota: 1.56, portalCode: 'JR-H5WKZX' },
    { id: 'j10', unit: 'Apt S-01',   name: 'Loubna Alaoui',       phone: '+212662200010', paidThrough: '2026-02', floor: 3, since: '2021', quota: 1.56, portalCode: 'JR-R8CNPT' },
    { id: 'j11', unit: 'Apt S-03',   name: 'Youssef Sabiri',      phone: '+212662200011', paidThrough: '2026-01', floor: 3, since: '2022', quota: 1.56, portalCode: 'JR-6BMJWY' },
    { id: 'j12', unit: 'Apt S-06',   name: 'Rim Tazi',            phone: '+212662200012', paidThrough: '2026-02', floor: 3, since: '2018', quota: 1.56, portalCode: 'JR-D2VXQK' },
]

export const TICKETS_BLD3 = [
    { id: 'jt1', title: 'Taille haies & entretien espaces verts', status: 'in_progress', date: '2026-03-01', time: "Aujourd'hui, 08:30", agent: 'GreenRabat SARL', priority: 'normal', category: 'espaces_verts' },
    { id: 'jt2', title: 'Réparation caméra sécurité entrée', status: 'scheduled', date: '2026-03-03', time: 'Lun. 03 Mars, 14:00', agent: 'SafeGuard Maroc', priority: 'urgent', category: 'securite' },
    { id: 'jt3', title: 'Entretien réseau irrigation jardins', status: 'scheduled', date: '2026-03-09', time: 'Lun. 09 Mars, 08:00', agent: 'AquaTech Rabat', priority: 'normal', category: 'plomberie' },
    { id: 'jt4', title: 'Contrôle éclairage allées extérieures', status: 'scheduled', date: '2026-03-12', time: 'Jeu. 12 Mars, 09:00', agent: 'Electric Rabat', priority: 'normal', category: 'electricite' },
    { id: 'jt5', title: 'Remplacement pompe fontaine centrale', status: 'done', date: '2026-02-28', time: 'Hier, 11:00', agent: 'AquaTech Rabat', priority: 'normal', category: 'plomberie' },
    { id: 'jt6', title: 'Peinture portail Villa V-01 → V-04', status: 'done', date: '2026-02-14', time: '14 Fév.', agent: 'ColorMat SARL', priority: 'normal', category: 'peinture' },
]

export const EXPENSES_BLD3 = [
    { category: 'Espaces verts', amount: 18500, pct: 36, color: 'bg-lime-500' },
    { category: 'Gardiennage', amount: 15400, pct: 30, color: 'bg-violet-500' },
    { category: 'Entretien & réparations', amount: 9200, pct: 18, color: 'bg-cyan-500' },
    { category: 'Eau & Électricité', amount: 5600, pct: 11, color: 'bg-amber-500' },
    { category: 'Administration', amount: 2600, pct: 5, color: 'bg-slate-500' },
]

export const DISPUTES_BLD3 = [
    {
        id: 'DSP-J01',
        title: 'Stationnement devant Villa V-02',
        parties: ['Mohammed Lahlou (T-01)', 'Fatima Zhra Idrissi (V-02)'],
        status: 'open',
        priority: 'medium',
        date: '19 Fév. 2026',
        ai_suggestion: 'Envoyer une note de rappel au règlement intérieur (Art. 12). Proposer une solution de marquage au sol. Agenda de la prochaine AG : vote sur plan de stationnement.',
    },
    {
        id: 'DSP-J02',
        title: 'Nuisances — travaux Apt R-02 en dehors des heures',
        parties: ['Tarik Benkirane (R-02)', 'Nabil Berrada (R-09)'],
        status: 'mediation',
        priority: 'medium',
        date: '11 Fév. 2026',
        ai_suggestion: 'Rappel écrit envoyé. Séance de médiation prévue le 28 Fév. Art. 22 de la Loi 18-00 : heures autorisées 08h–20h semaine, 09h–13h weekend.',
    },
    {
        id: 'DSP-J03',
        title: 'Mauvais entretien jardin privatif — Villa V-01',
        parties: ['Abdellah Benali (V-01)', 'Comité Jardins du Roi'],
        status: 'resolved',
        priority: 'low',
        date: '15 Jan. 2026',
        ai_suggestion: 'Résolu. Travaux de remise en état effectués. Aménagement conforme au cahier des charges de la résidence. Dossier clos.',
    },
]

export const RECENT_PAYMENTS_BLD3 = [
    { unit: 'Villa V-01', name: 'Abdellah Benali', amount: '1 000 MAD', date: '20 Fév.', status: 'paid' },
    { unit: 'Apt T-05', name: 'Hamid El Mansouri', amount: '1 000 MAD', date: '20 Fév.', status: 'paid' },
    { unit: 'Apt R-04', name: 'Siham Kabbaj', amount: '1 000 MAD', date: '19 Fév.', status: 'paid' },
    { unit: 'Apt R-02', name: 'Tarik Benkirane', amount: '1 000 MAD', date: '18 Fév.', status: 'overdue' },
    { unit: 'Apt T-02', name: 'Hind Fikri', amount: '1 000 MAD', date: '17 Fév.', status: 'pending' },
]

export const COLLECTION_HISTORY_BLD3 = [
    { month: 'Août', value: 88 },
    { month: 'Sep.', value: 92 },
    { month: 'Oct.', value: 90 },
    { month: 'Nov.', value: 94 },
    { month: 'Déc.', value: 91 },
    { month: 'Jan.', value: 93 },
    { month: 'Fév.', value: 92 },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  ASSEMBLÉES GÉNÉRALES
// ═══════════════════════════════════════════════════════════════════════════════

export const MEETINGS_BLD1 = [
    {
        id: 'ag-n-002',
        title: 'Assemblée Générale Ordinaire 2026',
        date: '2026-04-20', time: '19:00', location: 'Salle commune — RDC',
        status: 'upcoming',
        convocationSent: false,
        agenda: [
            { id: 'b1', title: 'Approbation des comptes 2025/2026' },
            { id: 'b2', title: 'Budget prévisionnel 2026/2027' },
            { id: 'b3', title: 'Renouvellement contrat gardiennage' },
            { id: 'b4', title: 'Travaux ravalement façade Bloc A' },
        ],
        attendance: null, votes: [], notes: '',
    },
    {
        id: 'ag-n-001',
        title: 'Assemblée Générale Ordinaire 2025',
        date: '2026-01-15', time: '19:00', location: 'Salle commune — RDC',
        status: 'completed',
        convocationSent: true,
        agenda: [
            { id: 'a1', title: 'Approbation des comptes 2024/2025' },
            { id: 'a2', title: 'Budget prévisionnel 2025/2026' },
            { id: 'a3', title: 'Réparation ascenseur Bloc B — approbation devis' },
        ],
        attendance: { present: 18, total: 24 },
        votes: [
            { agendaId: 'a1', pour: 16, contre: 1, abstention: 1 },
            { agendaId: 'a2', pour: 14, contre: 2, abstention: 2 },
            { agendaId: 'a3', pour: 15, contre: 2, abstention: 1 },
        ],
        notes: 'Réunion tenue dans les délais légaux. Quorum atteint (75%). Tous les points approuvés.',
    },
]

export const MEETINGS_BLD2 = [
    {
        id: 'ag-a-002',
        title: 'Assemblée Générale Ordinaire 2026',
        date: '2026-05-10', time: '18:30', location: 'Salle de réunion — Bloc A RDC',
        status: 'upcoming',
        convocationSent: false,
        agenda: [
            { id: 'c1', title: 'Approbation des comptes 2025/2026' },
            { id: 'c2', title: 'Remplacement système interphone' },
            { id: 'c3', title: 'Aménagement parking visiteurs' },
        ],
        attendance: null, votes: [], notes: '',
    },
    {
        id: 'ag-a-001',
        title: 'Assemblée Générale Ordinaire 2025',
        date: '2026-01-22', time: '18:30', location: 'Salle de réunion — Bloc A RDC',
        status: 'completed',
        convocationSent: true,
        agenda: [
            { id: 'd1', title: 'Approbation des comptes 2024/2025' },
            { id: 'd2', title: 'Contrat maintenance piscine — renouvellement' },
        ],
        attendance: { present: 12, total: 16 },
        votes: [
            { agendaId: 'd1', pour: 11, contre: 0, abstention: 1 },
            { agendaId: 'd2', pour: 9, contre: 2, abstention: 1 },
        ],
        notes: 'Quorum atteint (75%). Renouvellement contrat piscine approuvé.',
    },
]

export const MEETINGS_BLD3 = [
    {
        id: 'ag-j-002',
        title: 'Assemblée Générale Ordinaire 2026',
        date: '2026-04-28', time: '19:30', location: 'Club house — Jardins du Roi',
        status: 'upcoming',
        convocationSent: true,
        agenda: [
            { id: 'e1', title: 'Approbation des comptes 2025/2026' },
            { id: 'e2', title: 'Vote plan de stationnement résidence' },
            { id: 'e3', title: 'Rénovation espaces verts communs' },
        ],
        attendance: null, votes: [], notes: '',
    },
    {
        id: 'ag-j-001',
        title: 'Assemblée Générale Extraordinaire — Travaux',
        date: '2025-11-05', time: '19:30', location: 'Club house — Jardins du Roi',
        status: 'completed',
        convocationSent: true,
        agenda: [
            { id: 'f1', title: 'Approbation devis réparation réseau eau pluviale' },
            { id: 'f2', title: 'Appel de fonds exceptionnel — 500 MAD/unité' },
        ],
        attendance: { present: 9, total: 12 },
        votes: [
            { agendaId: 'f1', pour: 8, contre: 0, abstention: 1 },
            { agendaId: 'f2', pour: 7, contre: 1, abstention: 1 },
        ],
        notes: 'AG extraordinaire convoquée suite à dégâts eau pluviale. Fonds collectés et travaux planifiés pour Déc. 2025.',
    },
]

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const SUPPLIERS_BLD1 = [
    { id: 'sup-1-01', name: 'TechLift Maroc', category: 'ascenseur', phone: '+212 522 100 200', email: 'contact@techlift.ma', contractRef: 'CTR-2025-001', since: '2024-01', rating: 4, notes: 'Maintenance préventive mensuelle. Intervention sous 24h.' },
    { id: 'sup-1-02', name: 'CleanPro Services', category: 'nettoyage', phone: '+212 661 200 300', email: 'info@cleanpro.ma', contractRef: 'CTR-2025-002', since: '2023-06', rating: 5, notes: '3 passages/semaine. Équipe de 2 agents.' },
    { id: 'sup-1-03', name: 'Électro Bâtiment', category: 'electricite', phone: '+212 672 300 400', email: 'elec@batiment.ma', contractRef: 'CTR-2024-003', since: '2024-03', rating: 3, notes: 'Dépannages électriques. Délai parfois long en semaine.' },
    { id: 'sup-1-04', name: 'Gardex Sécurité', category: 'gardiennage', phone: '+212 655 400 500', email: 'contact@gardex.ma', contractRef: 'CTR-2025-004', since: '2022-01', rating: 4, notes: 'Gardien 24h/7j. Renouvellement contrat Avr 2026.' },
    { id: 'sup-1-05', name: 'AquaPlomb Maroc', category: 'plomberie', phone: '+212 660 500 600', email: 'aquaplomb@gmail.com', contractRef: '', since: '2025-02', rating: 4, notes: 'Interventions ponctuelles. Tarifs corrects.' },
]

export const SUPPLIERS_BLD2 = [
    { id: 'sup-2-01', name: 'Atlas Lift', category: 'ascenseur', phone: '+212 522 200 300', email: 'info@atlaslift.ma', contractRef: 'CTR-2025-010', since: '2023-01', rating: 5, notes: 'Contrat full-service. Très réactifs.' },
    { id: 'sup-2-02', name: 'Brillo Net', category: 'nettoyage', phone: '+212 662 300 400', email: 'brillo@net.ma', contractRef: 'CTR-2025-011', since: '2024-01', rating: 4, notes: 'Nettoyage quotidien parties communes.' },
    { id: 'sup-2-03', name: 'Verde Espaces', category: 'espaces_verts', phone: '+212 673 400 500', email: 'verde@espaces.ma', contractRef: 'CTR-2025-012', since: '2024-04', rating: 4, notes: 'Entretien jardins 2x/mois.' },
    { id: 'sup-2-04', name: 'SafeGuard Atlas', category: 'gardiennage', phone: '+212 656 500 600', email: 'safe@guard.ma', contractRef: 'CTR-2024-013', since: '2021-06', rating: 3, notes: 'Rotation équipe parfois irrégulière.' },
]

export const SUPPLIERS_BLD3 = [
    { id: 'sup-3-01', name: 'Rabat Ascenseurs', category: 'ascenseur', phone: '+212 537 100 200', email: 'rabatasc@ma.ma', contractRef: 'CTR-2025-020', since: '2023-09', rating: 4, notes: 'Maintenance bi-mensuelle. OK.' },
    { id: 'sup-3-02', name: 'Propre Cité', category: 'nettoyage', phone: '+212 663 200 300', email: 'propre@cite.ma', contractRef: 'CTR-2025-021', since: '2024-02', rating: 5, notes: 'Excellent service. Ponctualité impeccable.' },
    { id: 'sup-3-03', name: 'Électricité Agdal', category: 'electricite', phone: '+212 674 300 400', email: 'elec@agdal.ma', contractRef: '', since: '2025-01', rating: 3, notes: 'Prestations ponctuelles uniquement.' },
]

// ── Resident portal access validation ─────────────────────────────────────────

const RESIDENTS_BY_BLDG = {
    'bld-1': RESIDENTS_BLD1,
    'bld-2': RESIDENTS_BLD2,
    'bld-3': RESIDENTS_BLD3,
}

/**
 * Generate a random opaque portal code for a new resident.
 * Format: [BldgShort]-[6 random chars] — e.g. NW-4K8MRX
 * Character set excludes 0, O, 1, I to avoid visual confusion.
 */
export function generatePortalCode(shortCode) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const rand = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    return `${(shortCode ?? 'XX').toUpperCase()}-${rand}`
}

/**
 * Return a resident's portal code.
 * Prefers the stored `portalCode` field; falls back to the legacy
 * initials+phone pattern for any resident that doesn't have one yet.
 */
export function generateResidentCode(resident, building) {
    if (resident.portalCode) return resident.portalCode
    // Legacy fallback for residents without a stored code
    const parts = resident.name.trim().split(/\s+/)
    const n1 = (parts[0]?.[0] ?? 'X').toUpperCase()
    const n2 = (parts[1]?.[0] ?? parts[0]?.[1] ?? 'X').toUpperCase()
    const bldg = (building.shortCode ?? building.name.slice(0, 2)).toUpperCase()
    const digits = (resident.phone ?? '').replace(/\D/g, '')
    const suffix = digits.length >= 4
        ? digits.slice(-4)
        : resident.unit.replace(/\D/g, '').padStart(4, '0').slice(-4)
    return `${n1}${n2}-${bldg}-${suffix}`
}

/**
 * Validate a resident's individual portal code (no unit field needed).
 * Checks static mock data first, then localStorage extras (residents added at runtime).
 */
export function validateResidentCodeDirect(code) {
    const normalized = code.trim().toUpperCase()
    for (const building of BUILDINGS) {
        // Check static mock data
        const residents = RESIDENTS_BY_BLDG[building.id] ?? []
        const resident = residents.find(r =>
            (r.portalCode ?? generateResidentCode(r, building)).toUpperCase() === normalized
        )
        if (resident) return { building, resident }
        // Check residents added at runtime (persisted to localStorage by handleAddResident)
        try {
            const extras = JSON.parse(localStorage.getItem(`sp_residents_extra_${building.id}`) ?? '[]')
            const extraResident = extras.find(r =>
                (r.portalCode ?? generateResidentCode(r, building)).toUpperCase() === normalized
            )
            if (extraResident) return { building, resident: extraResident }
        } catch { }
    }
    return null
}

export function validateResidentAccess(accessCode, unitInput) {
    const building = BUILDINGS.find(
        b => b.accessCode?.toLowerCase() === accessCode.toLowerCase().trim()
    )
    if (!building) return null
    const normalizedUnit = unitInput.toLowerCase().trim()
    const residents = RESIDENTS_BY_BLDG[building.id] ?? []
    const resident = residents.find(r => r.unit.toLowerCase() === normalizedUnit)
    if (resident) return { building, resident }
    // Also check runtime-added residents persisted by handleAddResident
    try {
        const extras = JSON.parse(localStorage.getItem(`sp_residents_extra_${building.id}`) ?? '[]')
        const extra = extras.find(r => r.unit.toLowerCase() === normalizedUnit)
        if (extra) return { building, resident: extra }
    } catch { }
    return null
}
