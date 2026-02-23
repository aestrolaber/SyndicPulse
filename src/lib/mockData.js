/**
 * SyndicPulse — Centralized mock data
 * Replace these with Supabase queries when the backend is live.
 * Each function mirrors what a real Supabase call would return.
 */

// ── Organizations ─────────────────────────────────────────────────────────────
export const ORGANIZATIONS = [
    { id: 'org-1', name: 'Benali Syndic',     owner_email: 'omar@norwest.ma',    plan: 'elite' },
    { id: 'org-2', name: 'Ezzouine Partners', owner_email: 'sara@atlas.ma',       plan: 'pro'   },
    { id: 'org-3', name: 'Tahiri Syndic',     owner_email: 'karim@jardin.ma',     plan: 'pro'   },
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
    { id: 'r01', unit: 'Apt 1A', name: 'Ahmed Benjelloun',  phone: '+212661234567', status: 'paid',    floor: 1,  since: '2019', quota: 2.08 },
    { id: 'r02', unit: 'Apt 1B', name: 'Khadija Moussaoui', phone: '+212662345678', status: 'paid',    floor: 1,  since: '2021', quota: 2.08 },
    { id: 'r03', unit: 'Apt 1C', name: 'Omar Chraibi',      phone: '+212663456789', status: 'paid',    floor: 1,  since: '2020', quota: 2.08 },
    { id: 'r04', unit: 'Apt 1D', name: 'Nadia El Fassi',    phone: '+212664567890', status: 'overdue', floor: 1,  since: '2022', quota: 2.08 },
    { id: 'r05', unit: 'Apt 2A', name: 'Youssef Alami',     phone: '+212665678901', status: 'paid',    floor: 2,  since: '2018', quota: 2.08 },
    { id: 'r06', unit: 'Apt 2B', name: 'Sanae Bouazza',     phone: '+212666789012', status: 'paid',    floor: 2,  since: '2023', quota: 2.08 },
    { id: 'r07', unit: 'Apt 4B', name: 'Hassan Idrissi',    phone: '+212667890123', status: 'paid',    floor: 4,  since: '2020', quota: 2.08 },
    { id: 'r08', unit: 'Apt 6B', name: 'Mehdi Chraibi',     phone: '+212668901234', status: 'pending', floor: 6,  since: '2021', quota: 2.08 },
    { id: 'r09', unit: 'Apt 7C', name: 'Rachid Bouazza',    phone: '+212669012345', status: 'pending', floor: 7,  since: '2022', quota: 2.08 },
    { id: 'r10', unit: 'Apt 9A', name: 'Lamia Bensouda',    phone: '+212661123456', status: 'paid',    floor: 9,  since: '2019', quota: 2.08 },
    { id: 'r11', unit: 'Apt 11C', name: 'Lamia Tazi',       phone: '+212662234567', status: 'overdue', floor: 11, since: '2023', quota: 2.08 },
    { id: 'r12', unit: 'Apt 12A', name: 'Fatima Zouheir',   phone: '+212663345678', status: 'paid',    floor: 12, since: '2020', quota: 2.08 },
]

// ── Maintenance tickets (Norwest · bld-1) ─────────────────────────────────────
export const TICKETS_BLD1 = [
    { id: 't1', title: 'Entretien jardins (espaces verts)', status: 'in_progress', time: 'Démarré il y a 1h',   agent: 'Norwest Green Team', priority: 'normal'  },
    { id: 't2', title: 'Nettoyage piscine',                 status: 'scheduled',   time: "Aujourd'hui, 14:00", agent: 'H2O Tanger',         priority: 'normal'  },
    { id: 't3', title: 'Réparation éclairage hall',         status: 'done',        time: '09:00',              agent: 'Electric Morocco',   priority: 'urgent'  },
    { id: 't4', title: 'Maintenance ascenseur Bloc B',      status: 'done',        time: 'Hier',               agent: 'Otis Maroc',         priority: 'urgent'  },
]

// ── Expenses (Norwest · bld-1) ────────────────────────────────────────────────
export const EXPENSES_BLD1 = [
    { category: 'Entretien & réparations', amount: 12400, pct: 38, color: 'bg-cyan-500'    },
    { category: 'Gardiennage',             amount:  8200, pct: 25, color: 'bg-violet-500'  },
    { category: 'Nettoyage',               amount:  6500, pct: 20, color: 'bg-emerald-500' },
    { category: 'Eau & Électricité',       amount:  4100, pct: 12, color: 'bg-amber-500'   },
    { category: 'Administration',          amount:  1600, pct:  5, color: 'bg-slate-500'   },
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
    { unit: 'Apt 4B',  name: 'Hassan Idrissi',  amount: '850 MAD', date: '20 Fév.', status: 'paid'    },
    { unit: 'Apt 12A', name: 'Fatima Zouheir',  amount: '850 MAD', date: '19 Fév.', status: 'paid'    },
    { unit: 'Apt 7C',  name: 'Rachid Bouazza',  amount: '850 MAD', date: '18 Fév.', status: 'pending' },
    { unit: 'Apt 1D',  name: 'Nadia El Fassi',  amount: '850 MAD', date: '17 Fév.', status: 'overdue' },
    { unit: 'Apt 9A',  name: 'Youssef Alami',   amount: '850 MAD', date: '15 Fév.', status: 'paid'    },
]

// ── Collection history (Norwest · bld-1) ──────────────────────────────────────
export const COLLECTION_HISTORY_BLD1 = [
    { month: 'Août',  value: 92 },
    { month: 'Sep.',  value: 95 },
    { month: 'Oct.',  value: 88 },
    { month: 'Nov.',  value: 97 },
    { month: 'Déc.',  value: 94 },
    { month: 'Jan.',  value: 96 },
    { month: 'Fév.',  value: 97 },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  RÉSIDENCE ATLAS — bld-2 · Casablanca · 120 unités
// ═══════════════════════════════════════════════════════════════════════════════

export const RESIDENTS_BLD2 = [
    { id: 'a01', unit: 'Apt A-02', name: 'Rachid Berrada',      phone: '+212661100001', status: 'paid',    floor: 1,  since: '2018', quota: 0.83 },
    { id: 'a02', unit: 'Apt A-05', name: 'Houda Cherkaoui',     phone: '+212661100002', status: 'paid',    floor: 1,  since: '2020', quota: 0.83 },
    { id: 'a03', unit: 'Apt B-01', name: 'Karim Lahlou',        phone: '+212661100003', status: 'paid',    floor: 2,  since: '2019', quota: 0.83 },
    { id: 'a04', unit: 'Apt B-04', name: 'Zineb Kettani',       phone: '+212661100004', status: 'overdue', floor: 2,  since: '2021', quota: 0.83 },
    { id: 'a05', unit: 'Apt C-02', name: 'Brahim Sabiri',       phone: '+212661100005', status: 'paid',    floor: 3,  since: '2017', quota: 0.83 },
    { id: 'a06', unit: 'Apt C-07', name: 'Amina El Alami',      phone: '+212661100006', status: 'pending', floor: 3,  since: '2022', quota: 0.83 },
    { id: 'a07', unit: 'Apt D-03', name: 'Yassine Benkirane',   phone: '+212661100007', status: 'paid',    floor: 4,  since: '2020', quota: 0.83 },
    { id: 'a08', unit: 'Apt D-09', name: 'Salma Fikri',         phone: '+212661100008', status: 'paid',    floor: 4,  since: '2021', quota: 0.83 },
    { id: 'a09', unit: 'Apt E-01', name: 'Amine Ennaji',        phone: '+212661100009', status: 'overdue', floor: 5,  since: '2023', quota: 0.83 },
    { id: 'a10', unit: 'Apt E-06', name: 'Dounia Kabbaj',       phone: '+212661100010', status: 'paid',    floor: 5,  since: '2019', quota: 0.83 },
    { id: 'a11', unit: 'Apt F-02', name: 'Mehdi Tahiri',        phone: '+212661100011', status: 'pending', floor: 6,  since: '2022', quota: 0.83 },
    { id: 'a12', unit: 'Apt F-08', name: 'Nora Bensouda',       phone: '+212661100012', status: 'paid',    floor: 6,  since: '2020', quota: 0.83 },
    { id: 'a13', unit: 'Apt G-04', name: 'Khalid Tazi',         phone: '+212661100013', status: 'paid',    floor: 7,  since: '2018', quota: 0.83 },
    { id: 'a14', unit: 'Apt G-10', name: 'Leila El Fassi',      phone: '+212661100014', status: 'overdue', floor: 7,  since: '2023', quota: 0.83 },
    { id: 'a15', unit: 'Apt H-03', name: 'Saad Alaoui',         phone: '+212661100015', status: 'paid',    floor: 8,  since: '2019', quota: 0.83 },
    { id: 'a16', unit: 'Apt H-07', name: 'Meryem Chraibi',      phone: '+212661100016', status: 'paid',    floor: 8,  since: '2021', quota: 0.83 },
]

export const TICKETS_BLD2 = [
    { id: 'at1', title: 'Panne ascenseur Tour A',              status: 'in_progress', time: 'Démarré il y a 3h',  agent: 'Otis Maroc',          priority: 'urgent' },
    { id: 'at2', title: 'Maintenance piscine — contrôle pH',   status: 'scheduled',   time: "Demain, 09:00",      agent: 'AquaPro Casa',        priority: 'normal' },
    { id: 'at3', title: 'Remplacement éclairage parking B2',   status: 'scheduled',   time: "Ven. 27 Fév.",       agent: 'LumièrElec SARL',     priority: 'normal' },
    { id: 'at4', title: 'Réparation portail entrée principale', status: 'done',        time: 'Hier',               agent: 'Dépann Express',      priority: 'urgent' },
    { id: 'at5', title: 'Nettoyage façade blocs C & D',        status: 'done',        time: '12 Fév.',            agent: 'CleanPro Casablanca', priority: 'normal' },
]

export const EXPENSES_BLD2 = [
    { category: 'Entretien & réparations', amount: 38500, pct: 35, color: 'bg-cyan-500'    },
    { category: 'Gardiennage',             amount: 27600, pct: 25, color: 'bg-violet-500'  },
    { category: 'Nettoyage',              amount: 22000, pct: 20, color: 'bg-emerald-500' },
    { category: 'Eau & Électricité',       amount: 13200, pct: 12, color: 'bg-amber-500'   },
    { category: 'Ascenseur',              amount:  6600, pct:  6, color: 'bg-pink-500'     },
    { category: 'Administration',          amount:  2200, pct:  2, color: 'bg-slate-500'   },
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
    { unit: 'Apt A-02', name: 'Rachid Berrada',    amount: '1 200 MAD', date: '21 Fév.', status: 'paid'    },
    { unit: 'Apt G-04', name: 'Khalid Tazi',        amount: '1 200 MAD', date: '20 Fév.', status: 'paid'    },
    { unit: 'Apt C-02', name: 'Brahim Sabiri',      amount: '1 200 MAD', date: '19 Fév.', status: 'paid'    },
    { unit: 'Apt B-04', name: 'Zineb Kettani',      amount: '1 200 MAD', date: '18 Fév.', status: 'overdue' },
    { unit: 'Apt C-07', name: 'Amina El Alami',     amount: '1 200 MAD', date: '17 Fév.', status: 'pending' },
]

export const COLLECTION_HISTORY_BLD2 = [
    { month: 'Août',  value: 84 },
    { month: 'Sep.',  value: 87 },
    { month: 'Oct.',  value: 82 },
    { month: 'Nov.',  value: 90 },
    { month: 'Déc.',  value: 88 },
    { month: 'Jan.',  value: 86 },
    { month: 'Fév.',  value: 89 },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  JARDINS DU ROI — bld-3 · Rabat · 64 unités
// ═══════════════════════════════════════════════════════════════════════════════

export const RESIDENTS_BLD3 = [
    { id: 'j01', unit: 'Villa V-01', name: 'Abdellah Benali',     phone: '+212662200001', status: 'paid',    floor: 0, since: '2017', quota: 1.56 },
    { id: 'j02', unit: 'Villa V-02', name: 'Fatima Zhra Idrissi', phone: '+212662200002', status: 'paid',    floor: 0, since: '2018', quota: 1.56 },
    { id: 'j03', unit: 'Apt T-01',  name: 'Mohammed Lahlou',     phone: '+212662200003', status: 'paid',    floor: 1, since: '2020', quota: 1.56 },
    { id: 'j04', unit: 'Apt T-02',  name: 'Hind Fikri',          phone: '+212662200004', status: 'pending', floor: 1, since: '2021', quota: 1.56 },
    { id: 'j05', unit: 'Apt T-05',  name: 'Hamid El Mansouri',   phone: '+212662200005', status: 'paid',    floor: 1, since: '2019', quota: 1.56 },
    { id: 'j06', unit: 'Apt T-08',  name: 'Souad Cherkaoui',     phone: '+212662200006', status: 'paid',    floor: 1, since: '2022', quota: 1.56 },
    { id: 'j07', unit: 'Apt R-02',  name: 'Tarik Benkirane',     phone: '+212662200007', status: 'overdue', floor: 2, since: '2023', quota: 1.56 },
    { id: 'j08', unit: 'Apt R-04',  name: 'Siham Kabbaj',        phone: '+212662200008', status: 'paid',    floor: 2, since: '2020', quota: 1.56 },
    { id: 'j09', unit: 'Apt R-07',  name: 'Nabil Berrada',       phone: '+212662200009', status: 'paid',    floor: 2, since: '2019', quota: 1.56 },
    { id: 'j10', unit: 'Apt S-01',  name: 'Loubna Alaoui',       phone: '+212662200010', status: 'paid',    floor: 3, since: '2021', quota: 1.56 },
    { id: 'j11', unit: 'Apt S-03',  name: 'Youssef Sabiri',      phone: '+212662200011', status: 'pending', floor: 3, since: '2022', quota: 1.56 },
    { id: 'j12', unit: 'Apt S-06',  name: 'Rim Tazi',            phone: '+212662200012', status: 'paid',    floor: 3, since: '2018', quota: 1.56 },
]

export const TICKETS_BLD3 = [
    { id: 'jt1', title: 'Taille haies & entretien espaces verts', status: 'in_progress', time: "Aujourd'hui, 08:30", agent: 'GreenRabat SARL',    priority: 'normal' },
    { id: 'jt2', title: 'Réparation caméra sécurité entrée',      status: 'scheduled',   time: "Jeu. 26 Fév.",      agent: 'SafeGuard Maroc',   priority: 'urgent' },
    { id: 'jt3', title: 'Remplacement pompe fontaine centrale',    status: 'done',        time: 'Hier, 11:00',       agent: 'AquaTech Rabat',    priority: 'normal' },
    { id: 'jt4', title: 'Peinture portail Villa V-01 → V-04',     status: 'done',        time: '14 Fév.',           agent: 'ColorMat SARL',     priority: 'normal' },
]

export const EXPENSES_BLD3 = [
    { category: 'Espaces verts',           amount: 18500, pct: 36, color: 'bg-lime-500'     },
    { category: 'Gardiennage',             amount: 15400, pct: 30, color: 'bg-violet-500'   },
    { category: 'Entretien & réparations', amount:  9200, pct: 18, color: 'bg-cyan-500'     },
    { category: 'Eau & Électricité',       amount:  5600, pct: 11, color: 'bg-amber-500'    },
    { category: 'Administration',          amount:  2600, pct:  5, color: 'bg-slate-500'    },
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
    { unit: 'Villa V-01', name: 'Abdellah Benali',     amount: '1 000 MAD', date: '20 Fév.', status: 'paid'    },
    { unit: 'Apt T-05',   name: 'Hamid El Mansouri',   amount: '1 000 MAD', date: '20 Fév.', status: 'paid'    },
    { unit: 'Apt R-04',   name: 'Siham Kabbaj',        amount: '1 000 MAD', date: '19 Fév.', status: 'paid'    },
    { unit: 'Apt R-02',   name: 'Tarik Benkirane',     amount: '1 000 MAD', date: '18 Fév.', status: 'overdue' },
    { unit: 'Apt T-02',   name: 'Hind Fikri',          amount: '1 000 MAD', date: '17 Fév.', status: 'pending' },
]

export const COLLECTION_HISTORY_BLD3 = [
    { month: 'Août',  value: 88 },
    { month: 'Sep.',  value: 92 },
    { month: 'Oct.',  value: 90 },
    { month: 'Nov.',  value: 94 },
    { month: 'Déc.',  value: 91 },
    { month: 'Jan.',  value: 93 },
    { month: 'Fév.',  value: 92 },
]
