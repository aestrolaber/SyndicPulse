/**
 * SyndicPulse — Root application
 *
 * Auth routing:
 *   - Not logged in    → LoginPage
 *   - super_admin      → Full dashboard + building switcher
 *   - syndic_manager   → Dashboard scoped to their building, no switcher
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
    LayoutDashboard, BarChart3, Users, MessageSquare,
    Settings, Bell, Mic, ChevronDown, ChevronLeft, ChevronRight,
    TrendingUp, ShieldCheck, Building2, Landmark, Leaf,
    Zap, ArrowUpRight, ArrowDownRight, CheckCircle2,
    Clock, XCircle, Search, MoreHorizontal,
    CreditCard, Wrench, Phone, Mail, Activity, LogOut,
    Plus, X, Upload, FileText, Check, Download, MessageCircle, Calendar, Pencil, Trash2,
    CalendarCheck, Users2, ClipboardList, Vote,
    UserCog, Key, Eye, EyeOff, Copy,
    Home, TrendingDown,
    Truck, Star, Banknote, Paperclip,
    Megaphone,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'

import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AIVoiceAgent from './components/AIVoiceAgent.jsx'

import {
    BUILDINGS,
    RESIDENTS_BLD1, TICKETS_BLD1, EXPENSES_BLD1, DISPUTES_BLD1,
    RECENT_PAYMENTS_BLD1, COLLECTION_HISTORY_BLD1,
    RESIDENTS_BLD2, TICKETS_BLD2, EXPENSES_BLD2, DISPUTES_BLD2,
    RECENT_PAYMENTS_BLD2, COLLECTION_HISTORY_BLD2,
    RESIDENTS_BLD3, TICKETS_BLD3, EXPENSES_BLD3, DISPUTES_BLD3,
    RECENT_PAYMENTS_BLD3, COLLECTION_HISTORY_BLD3,
    MEETINGS_BLD1, MEETINGS_BLD2, MEETINGS_BLD3,
    SUPPLIERS_BLD1, SUPPLIERS_BLD2, SUPPLIERS_BLD3,
    DEMO_USERS,
} from './lib/mockData.js'

/* ── Payment tracking helpers ─────────────────────────────────────────── */
// Current billing month — update this when connecting real backend
const CURRENT_MONTH = '2026-02'

// Derive paid/pending/overdue from paidThrough date
function computeStatus(paidThrough) {
    if (!paidThrough) return 'overdue'
    const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
    const [py, pm] = paidThrough.split('-').map(Number)
    const behind = (cy - py) * 12 + (cm - pm)
    if (behind <= 0) return 'paid'
    if (behind === 1) return 'pending'
    return 'overdue'
}

// Advance a YYYY-MM date by N months
function advancePaidThrough(paidThrough, months) {
    const [y, m] = (paidThrough || CURRENT_MONTH).split('-').map(Number)
    const total = y * 12 + (m - 1) + months
    const ny = Math.floor(total / 12)
    const nm = (total % 12) + 1
    return `${ny}-${String(nm).padStart(2, '0')}`
}

// Format YYYY-MM → "Fév. 2026"
const MONTH_LABELS = ['Jan.','Fév.','Mar.','Avr.','Mai','Jun.','Jul.','Aoû.','Sep.','Oct.','Nov.','Déc.']
function formatMonth(ym) {
    if (!ym) return '—'
    const [y, m] = ym.split('-').map(Number)
    return `${MONTH_LABELS[m - 1]} ${y}`
}

/* ── WhatsApp helper — opens wa.me link with pre-filled message ── */
function openWhatsApp(phone, name, unit, buildingName, status, paidThrough) {
    const num = phone.replace(/[^0-9]/g, '')
    let msg
    if (status === 'overdue') {
        // Compute list of unpaid months from (paidThrough + 1) up to CURRENT_MONTH
        const MONTH_NAMES_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
        const unpaidMonths = []
        let [y, m] = (paidThrough || '2000-01').split('-').map(Number)
        m++ ; if (m > 12) { m = 1; y++ }           // start one month after last paid
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        while (y < cy || (y === cy && m <= cm)) {
            unpaidMonths.push(`${MONTH_NAMES_FR[m - 1]} ${y}`)
            m++; if (m > 12) { m = 1; y++ }
        }
        const count  = unpaidMonths.length
        const plural = count > 1 ? 's' : ''
        const lastPaidLabel = (() => {
            const [py, pm] = (paidThrough || '2000-01').split('-').map(Number)
            return `${MONTH_NAMES_FR[pm - 1]} ${py}`
        })()
        msg =
`Bonjour ${name},

Nous vous rappelons que votre cotisation de syndic pour l'appartement ${unit} présente ${count} mois${plural} d'impayé${plural}.

📅 Dernière cotisation enregistrée : ${lastPaidLabel}
❌ Mois${plural} en retard (${count}) : ${unpaidMonths.join(', ')}

Merci de régulariser votre situation dans les meilleurs délais par virement bancaire :

🏦 Banque : [NOM BANQUE]
📋 RIB : [XXXX XXXX XXXX XXXX XXXX XX]
👤 Titulaire : ${buildingName} — Syndic

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
— ${buildingName}`
    } else {
        msg =
`Bonjour ${name},

Cordialement,
— ${buildingName}`
    }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
}

/* ── Nav items ── */
const NAV = [
    { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'financials', label: 'Finances',         icon: BarChart3 },
    { id: 'residents',  label: 'Résidents',        icon: Users },
    { id: 'disputes',   label: 'Litiges',          icon: MessageSquare },
    { id: 'planning',   label: 'Planning',         icon: Calendar },
    { id: 'assemblees',   label: 'Assemblées',    icon: CalendarCheck },
    { id: 'fournisseurs', label: 'Fournisseurs',  icon: Truck },
    { id: 'circulaires',  label: 'Circulaires',   icon: Megaphone },
    { id: 'users',        label: 'Utilisateurs',  icon: UserCog, adminOnly: true },
]

/* ── Circulaire templates ── */
const CIRCULAIRE_TEMPLATES = [
    {
        key: 'coupure_eau', label: "Coupure d'eau", icon: '💧', color: '#06b6d4',
        fields: [
            { key: 'date',        label: 'Date',                   type: 'date', required: true },
            { key: 'heure_debut', label: 'Heure début',            type: 'time', required: true, default: '08:00' },
            { key: 'heure_fin',   label: 'Heure fin',              type: 'time', required: true, default: '14:00' },
            { key: 'tranches',    label: 'Tranches / zones',       type: 'text', placeholder: 'Ex: Tranches 2, 3 et 4' },
            { key: 'raison',      label: 'Raison',                 type: 'text', required: true, placeholder: 'Ex: Réparation de la pompe principale' },
        ],
    },
    {
        key: 'coupure_elec', label: "Coupure d'électricité", icon: '⚡', color: '#f59e0b',
        fields: [
            { key: 'date',        label: 'Date',            type: 'date', required: true },
            { key: 'heure_debut', label: 'Heure début',     type: 'time', required: true, default: '09:00' },
            { key: 'heure_fin',   label: 'Heure fin',       type: 'time', required: true, default: '13:00' },
            { key: 'zones',       label: 'Zones concernées',type: 'text', placeholder: 'Ex: Bâtiment A et B' },
            { key: 'raison',      label: 'Raison',          type: 'text', required: true, placeholder: 'Ex: Travaux ONEE' },
        ],
    },
    {
        key: 'travaux', label: 'Travaux / Maintenance', icon: '🔧', color: '#8b5cf6',
        fields: [
            { key: 'date',  label: 'Date de début',      type: 'date', required: true },
            { key: 'zone',  label: 'Équipement / zone',  type: 'text', required: true, placeholder: 'Ex: Ascenseur – Hall principal' },
            { key: 'duree', label: 'Durée estimée',      type: 'text', placeholder: 'Ex: 2 à 3 jours' },
            { key: 'raison',label: 'Nature des travaux', type: 'text', required: true, placeholder: 'Ex: Remplacement câblage ascenseur' },
        ],
    },
    {
        key: 'rappel_ag', label: 'Rappel Assemblée', icon: '🏛️', color: '#10b981',
        fields: [
            { key: 'date',  label: "Date de l'AG", type: 'date', required: true },
            { key: 'heure', label: 'Heure',         type: 'time', required: true, default: '18:00' },
            { key: 'lieu',  label: 'Lieu',          type: 'text', required: true, placeholder: 'Ex: Salle commune – RDC' },
            { key: 'odj',   label: "Ordre du jour", type: 'textarea', placeholder: 'Ex: Approbation comptes, budget 2026, travaux...' },
        ],
    },
    {
        key: 'proprete', label: 'Propreté & Règlement', icon: '🧹', color: '#ec4899',
        fields: [
            { key: 'sujet',    label: 'Sujet',               type: 'text',     required: true, placeholder: 'Ex: Dépôt sauvage dans le hall' },
            { key: 'rappel',   label: 'Rappel réglementaire',type: 'textarea', placeholder: 'Rappeler les règles applicables...' },
            { key: 'sanction', label: 'Sanction prévue',     type: 'text',     placeholder: 'Ex: Mise en demeure' },
        ],
    },
    {
        key: 'avis_libre', label: 'Avis personnalisé', icon: '📝', color: '#6366f1',
        fields: [
            { key: 'titre',   label: "Titre",   type: 'text',     required: true, placeholder: 'Ex: Information importante' },
            { key: 'contenu', label: 'Contenu', type: 'textarea', required: true, placeholder: 'Rédigez votre message ici...' },
        ],
    },
]

function buildCirculaireMessage(templateKey, vars, buildingName) {
    const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const fmtDate = (d) => {
        if (!d) return '—'
        const [y, m, day] = d.split('-')
        return `${parseInt(day)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
    }
    const closing = `\n\nNous nous excusons pour ce désagrément et vous remercions pour votre compréhension.\n\nCordialement,\nLe Bureau du Syndic — ${buildingName}`
    switch (templateKey) {
        case 'coupure_eau':
            return `Avis important — Coupure d'eau\n\nLe bureau du syndic de ${buildingName} informe les résidents${vars.tranches ? ` (${vars.tranches})` : ''} d'une coupure temporaire d'eau le ${fmtDate(vars.date)}, de ${vars.heure_debut ?? '—'} à ${vars.heure_fin ?? '—'}.\n\nRaison : ${vars.raison || '—'}\n\nMerci de prendre les précautions nécessaires.${closing}`
        case 'coupure_elec':
            return `Avis important — Coupure d'électricité\n\nLe bureau du syndic de ${buildingName} informe les résidents${vars.zones ? ` (${vars.zones})` : ''} d'une coupure temporaire d'électricité le ${fmtDate(vars.date)}, de ${vars.heure_debut ?? '—'} à ${vars.heure_fin ?? '—'}.\n\nRaison : ${vars.raison || '—'}\n\nMerci de prendre les précautions nécessaires.${closing}`
        case 'travaux':
            return `Avis — Travaux / Maintenance\n\nLe bureau du syndic de ${buildingName} vous informe de travaux le ${fmtDate(vars.date)}.\n\nÉquipement / zone : ${vars.zone || '—'}\nDurée estimée : ${vars.duree || 'à confirmer'}\nNature des travaux : ${vars.raison || '—'}${closing}`
        case 'rappel_ag':
            return `Rappel — Assemblée Générale\n\nLe bureau du syndic de ${buildingName} vous rappelle que l'Assemblée Générale se tiendra le ${fmtDate(vars.date)} à ${vars.heure ?? '—'}.\n\nLieu : ${vars.lieu || '—'}${vars.odj ? `\n\nOrdre du jour :\n${vars.odj}` : ''}\n\nVotre présence est importante.${closing}`
        case 'proprete':
            return `Avis — Propreté & Règlement intérieur\n\nLe bureau du syndic de ${buildingName} attire votre attention sur : ${vars.sujet || '—'}.${vars.rappel ? `\n\nRappel : ${vars.rappel}` : ''}${vars.sanction ? `\n\nSanction prévue : ${vars.sanction}` : ''}\n\nNous comptons sur votre civisme et coopération.${closing}`
        case 'avis_libre':
        default:
            return `${vars.titre ? `${vars.titre}\n\n` : ''}${vars.contenu || ''}\n\nCordialement,\nLe Bureau du Syndic — ${buildingName}`
    }
}

function generateCirculaireDoc(building, circ) {
    const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const fmtDate = (d) => {
        if (!d) return new Date().toLocaleDateString('fr-FR')
        const [y, m, day] = d.split('-')
        return `${parseInt(day)} ${MONTHS_FR[parseInt(m) - 1]} ${y}`
    }
    const msg = buildCirculaireMessage(circ.template, circ.vars, building.name)
    const logoHtml = buildingLogoHTML(building, 48)
    const arabicTitles = {
        coupure_eau:  'إعلان هام — انقطاع الماء',
        coupure_elec: 'إعلان هام — انقطاع الكهرباء',
        travaux:      'إعلان — أشغال الصيانة',
        rappel_ag:    'تذكير — اجتماع الجمع العام',
        proprete:     'إعلان — النظافة والنظام الداخلي',
        avis_libre:   'إعلان هام',
    }
    const frTitles = {
        coupure_eau:  "Avis Important — Coupure d'eau",
        coupure_elec: "Avis Important — Coupure d'électricité",
        travaux:      "Avis — Travaux / Maintenance",
        rappel_ag:    "Rappel — Assemblée Générale",
        proprete:     "Avis — Propreté & Règlement intérieur",
        avis_libre:   circ.vars.titre ?? "Avis Important",
    }
    const arTitle = arabicTitles[circ.template] ?? 'إعلان هام'
    const frTitle = frTitles[circ.template] ?? 'Avis Important'
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${frTitle} — ${building.name}</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Times New Roman',serif;background:#fff;color:#1a1a1a;padding:40px 60px;max-width:760px;margin:0 auto}
.header{display:flex;align-items:center;gap:20px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a1a1a}
.bname{font-size:18px;font-weight:bold}.bsub{font-size:13px;color:#555}
.date-right{margin-left:auto;text-align:right;font-size:13px;color:#555}
.title-ar{font-size:20px;font-weight:bold;text-align:center;direction:rtl;margin-bottom:8px;text-decoration:underline;font-family:'Arial',sans-serif}
.title-fr{font-size:18px;font-weight:bold;text-align:center;margin-bottom:28px;text-decoration:underline}
.body{font-size:14px;line-height:2;white-space:pre-wrap;margin-bottom:32px}
.sig{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end}
.stamp{width:90px;height:90px;border:2px solid #aaa;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;color:#aaa;padding:10px}
@media print{body{padding:20px 40px}}
</style></head><body>
<div class="header">${logoHtml}<div><div class="bname">${building.name}</div><div class="bsub">${building.city ?? ''} · Bureau du Syndic</div></div><div class="date-right">${fmtDate(circ.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))}</div></div>
<div class="title-ar">${arTitle}</div>
<div class="title-fr">${frTitle}</div>
<div class="body">${msg.replace(/\n/g, '<br/>')}</div>
<div class="sig"><div><div style="font-size:13px;font-weight:bold">Le Bureau du Syndic</div><div style="font-size:12px;color:#555;margin-top:2px">${building.name}</div><div style="margin-top:24px;border-top:1px solid #555;width:160px;padding-top:6px;font-size:11px;color:#888">Signature</div></div><div class="stamp">Cachet<br/>du<br/>Syndic</div></div>
<script>window.onload=()=>{window.print();}<\/script></body></html>`)
    w.document.close()
}

/* ── Expense category options with theme colors ── */
const EXPENSE_CATEGORIES = [
    { label: 'Entretien & réparations', color: 'bg-cyan-500'    },
    { label: 'Gardiennage',             color: 'bg-violet-500'  },
    { label: 'Nettoyage',               color: 'bg-emerald-500' },
    { label: 'Eau & Électricité',       color: 'bg-amber-500'   },
    { label: 'Administration',          color: 'bg-slate-500'   },
    { label: 'Ascenseur',               color: 'bg-pink-500'    },
    { label: 'Espaces verts',           color: 'bg-lime-500'    },
    { label: 'Autre',                   color: 'bg-navy-500'    },
]

/* ── Initial expense journal (individual transactions) ── */
const INITIAL_EXPENSE_LOG = [
    { id: 'el1', date: '2026-02-18', category: 'Entretien & réparations', vendor: 'Otis Morocco',  amount: 8400, description: 'Révision complète ascenseur Bloc B',        hasInvoice: true  },
    { id: 'el2', date: '2026-02-15', category: 'Nettoyage',               vendor: 'ProNet SARL',   amount: 3200, description: 'Nettoyage parties communes — quinzaine',     hasInvoice: true  },
    { id: 'el3', date: '2026-02-10', category: 'Eau & Électricité',       vendor: 'Redal',         amount: 1850, description: 'Facture eau communes — Janvier 2026',         hasInvoice: true  },
    { id: 'el4', date: '2026-02-08', category: 'Entretien & réparations', vendor: 'IBS Plomberie', amount: 3600, description: 'Réparation fuite parking sous-sol',          hasInvoice: false },
]

/* ── CSV sample data shown in the import wizard preview ── */
const CSV_SAMPLE = [
    { nom: 'Rachid Benkirane',    telephone: '+212 661 234 567', unite: 'C-03', etage: '2', type: 'Propriétaire' },
    { nom: 'Fatima Zahra Alami',  telephone: '+212 672 345 678', unite: 'C-04', etage: '2', type: 'Locataire'    },
    { nom: 'Youssef El Mansouri', telephone: '+212 655 456 789', unite: 'D-01', etage: '3', type: 'Propriétaire' },
]

/* ══════════════════════════════════════════
   ROOT
══════════════════════════════════════════ */
export default function App() {
    const { user, loading } = useAuth()

    // ── Resident portal session (separate from syndic auth) ──────────────────
    const [residentSession, setResidentSession] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('sp_resident_session')) } catch { return null }
    })

    function handleResidentLogin(session) {
        sessionStorage.setItem('sp_resident_session', JSON.stringify(session))
        setResidentSession(session)
    }
    function handleResidentLogout() {
        sessionStorage.removeItem('sp_resident_session')
        setResidentSession(null)
    }

    if (residentSession) return <ResidentPortal session={residentSession} onLogout={handleResidentLogout} />
    if (loading) return <LoadingScreen />
    if (!user)   return <LoginPage onResidentLogin={handleResidentLogin} />
    return <Dashboard />
}

/* ── Loading screen ── */
function LoadingScreen() {
    return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center">
                    <Zap size={20} className="text-sp animate-pulse" />
                </div>
                <p className="text-sm text-slate-400">Chargement de SyndicPulse...</p>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════
   AUTHENTICATED DASHBOARD
══════════════════════════════════════════ */
function Dashboard() {
    const { activeBuilding, setActiveBuilding, accessibleBuildings, canSwitchBuildings } = useAuth()
    const [activeTab,        setActiveTab]       = useState('dashboard')
    const [isVoiceOpen,      setIsVoiceOpen]     = useState(false)
    const [showBuildingMenu, setShowBuildingMenu] = useState(false)
    const [toast,            setToast]           = useState(null) // { message, type }
    const [residentsByBldg,  setResidentsByBldg] = useState({})  // shared across tabs
    const [disputesByBldg,   setDisputesByBldg]  = useState({})  // shared across tabs
    const [meetingsByBldg,   setMeetingsByBldg]  = useState({})  // shared across tabs
    const [buildingSettingsByBldg, setBuildingSettingsByBldg] = useState({})  // logo + name overrides per building
    const [extraBuildings,   setExtraBuildings]  = useState([])  // user-added buildings
    const [showBldgSettings, setShowBldgSettings] = useState(false)
    const [showAddBuilding,  setShowAddBuilding]  = useState(false)

    const buildingData = getBuildingData(activeBuilding?.id)

    // Shared residents state — persists when switching tabs, keyed by building ID
    const residents = residentsByBldg[activeBuilding?.id] ?? buildingData.residents
    function setResidents(fn) {
        const bldgId = activeBuilding.id
        setResidentsByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).residents)
                : fn,
        }))
    }

    // Shared disputes state
    const disputes = disputesByBldg[activeBuilding?.id] ?? buildingData.disputes
    function setDisputes(fn) {
        const bldgId = activeBuilding.id
        setDisputesByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).disputes)
                : fn,
        }))
    }

    // Shared meetings state
    const meetings = meetingsByBldg[activeBuilding?.id] ?? buildingData.meetings
    function setMeetings(fn) {
        const bldgId = activeBuilding.id
        setMeetingsByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).meetings)
                : fn,
        }))
    }

    // Shared suppliers state
    const [suppliersByBldg, setSuppliersByBldg] = useState({})
    const suppliers = suppliersByBldg[activeBuilding?.id] ?? buildingData.suppliers
    function setSuppliers(fn) {
        const bldgId = activeBuilding.id
        setSuppliersByBldg(prev => ({
            ...prev,
            [bldgId]: typeof fn === 'function'
                ? fn(prev[bldgId] ?? getBuildingData(bldgId).suppliers)
                : fn,
        }))
    }

    // Circulaires — persisted in localStorage so ResidentPortal can read them too
    const CIRC_KEY = (id) => `sp_circ_${id}`
    const [circulairesByBldg, setCirculairesByBldg] = useState({})
    const circulaires = circulairesByBldg[activeBuilding?.id] ?? (() => {
        try { return JSON.parse(localStorage.getItem(CIRC_KEY(activeBuilding?.id)) ?? '[]') } catch { return [] }
    })()
    function setCirculaires(fn) {
        const bldgId = activeBuilding.id
        setCirculairesByBldg(prev => {
            const cur = prev[bldgId] ?? (() => { try { return JSON.parse(localStorage.getItem(CIRC_KEY(bldgId)) ?? '[]') } catch { return [] } })()
            const next = typeof fn === 'function' ? fn(cur) : fn
            localStorage.setItem(CIRC_KEY(bldgId), JSON.stringify(next))
            return { ...prev, [bldgId]: next }
        })
    }

    // Merge user-customized settings (logo, name, manager) on top of base building data
    const activeBuildingMerged = activeBuilding
        ? { ...activeBuilding, ...(buildingSettingsByBldg[activeBuilding.id] ?? {}) }
        : null

    // All buildings: seed list + user-added
    const allBuildings = [...accessibleBuildings, ...extraBuildings].map(b => ({
        ...b, ...(buildingSettingsByBldg[b.id] ?? {}),
    }))

    if (!activeBuilding) return <LoadingScreen />

    function showToast(message, type = 'success', duration = 3500) {
        setToast({ message, type })
        setTimeout(() => setToast(null), duration)
    }

    return (
        <div className="flex h-screen bg-navy-900 text-slate-100 font-sans overflow-hidden">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeBuilding={activeBuildingMerged}
                buildings={allBuildings}
                canSwitchBuildings={canSwitchBuildings}
                showBuildingMenu={showBuildingMenu}
                setShowBuildingMenu={setShowBuildingMenu}
                onSwitchBuilding={(b) => {
                    setActiveBuilding(extraBuildings.find(e => e.id === b.id) ?? accessibleBuildings.find(a => a.id === b.id) ?? b)
                    setShowBuildingMenu(false)
                    setActiveTab('dashboard')
                }}
                setIsVoiceOpen={setIsVoiceOpen}
                buildingData={buildingData}
                disputes={disputes}
                onOpenSettings={() => setShowBldgSettings(true)}
                onAddBuilding={() => setShowAddBuilding(true)}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar activeTab={activeTab} activeBuilding={activeBuildingMerged} showToast={showToast} />
                <main className="flex-1 overflow-auto p-8">
                    {activeTab === 'dashboard'  && <DashboardPage  building={activeBuildingMerged} data={buildingData} residents={residents} setIsVoiceOpen={setIsVoiceOpen} setActiveTab={setActiveTab} showToast={showToast} />}
                    {activeTab === 'financials' && <FinancialsPage building={activeBuildingMerged} data={buildingData} residents={residents} setResidents={setResidents} suppliers={suppliers} showToast={showToast} />}
                    {activeTab === 'residents'  && <ResidentsPage  building={activeBuildingMerged} data={buildingData} residents={residents} setResidents={setResidents} showToast={showToast} />}
                    {activeTab === 'disputes'   && <DisputesPage   building={activeBuildingMerged} data={buildingData} disputes={disputes} setDisputes={setDisputes} showToast={showToast} />}
                    {activeTab === 'planning'   && <PlanningPage   building={activeBuildingMerged} data={buildingData} showToast={showToast} />}
                    {activeTab === 'assemblees'   && <AssembliesPage   building={activeBuildingMerged} residents={residents} meetings={meetings} setMeetings={setMeetings} showToast={showToast} />}
                    {activeTab === 'fournisseurs' && <FournisseursPage building={activeBuildingMerged} suppliers={suppliers} setSuppliers={setSuppliers} showToast={showToast} />}
                    {activeTab === 'circulaires' && <CirculairesPage building={activeBuildingMerged} circulaires={circulaires} setCirculaires={setCirculaires} showToast={showToast} />}
                    {activeTab === 'users'        && <UsersPage showToast={showToast} />}
                </main>
            </div>

            <AIVoiceAgent isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />

            {showBldgSettings && activeBuildingMerged && (
                <BuildingSettingsModal
                    building={activeBuildingMerged}
                    onClose={() => setShowBldgSettings(false)}
                    onSave={(overrides) => {
                        setBuildingSettingsByBldg(prev => ({
                            ...prev,
                            [activeBuilding.id]: { ...(prev[activeBuilding.id] ?? {}), ...overrides },
                        }))
                        setShowBldgSettings(false)
                    }}
                />
            )}

            {showAddBuilding && (
                <AddBuildingModal
                    onClose={() => setShowAddBuilding(false)}
                    onSave={(newBld) => {
                        setExtraBuildings(prev => [...prev, newBld])
                        setActiveBuilding(newBld)
                        setShowAddBuilding(false)
                        setActiveTab('dashboard')
                    }}
                />
            )}

            {/* Global toast notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold whitespace-nowrap ${
                            toast.type === 'error'
                                ? 'bg-red-950 border-red-500/30 text-red-300'
                                : 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
                        }`}
                    >
                        {toast.type === 'error' ? <X size={15} /> : <Check size={15} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* Return mock data keyed by building id.
   In production: replaced by Supabase queries per page component. */
function getBuildingData(buildingId) {
    if (buildingId === 'bld-1') return {
        residents:         RESIDENTS_BLD1,
        tickets:           TICKETS_BLD1,
        expenses:          EXPENSES_BLD1,
        disputes:          DISPUTES_BLD1,
        recentPayments:    RECENT_PAYMENTS_BLD1,
        collectionHistory: COLLECTION_HISTORY_BLD1,
        meetings:          MEETINGS_BLD1,
        suppliers:         SUPPLIERS_BLD1,
    }
    if (buildingId === 'bld-2') return {
        residents:         RESIDENTS_BLD2,
        tickets:           TICKETS_BLD2,
        expenses:          EXPENSES_BLD2,
        disputes:          DISPUTES_BLD2,
        recentPayments:    RECENT_PAYMENTS_BLD2,
        collectionHistory: COLLECTION_HISTORY_BLD2,
        meetings:          MEETINGS_BLD2,
        suppliers:         SUPPLIERS_BLD2,
    }
    if (buildingId === 'bld-3') return {
        residents:         RESIDENTS_BLD3,
        tickets:           TICKETS_BLD3,
        expenses:          EXPENSES_BLD3,
        disputes:          DISPUTES_BLD3,
        recentPayments:    RECENT_PAYMENTS_BLD3,
        collectionHistory: COLLECTION_HISTORY_BLD3,
        meetings:          MEETINGS_BLD3,
        suppliers:         SUPPLIERS_BLD3,
    }
    return {
        residents: [], tickets: [], expenses: [], disputes: [],
        recentPayments: [], collectionHistory: [], meetings: [], suppliers: [],
    }
}

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
function Sidebar({ activeTab, setActiveTab, activeBuilding, buildings, canSwitchBuildings, showBuildingMenu, setShowBuildingMenu, onSwitchBuilding, setIsVoiceOpen, buildingData, disputes, onOpenSettings, onAddBuilding }) {
    const { logout, user, isSuperAdmin } = useAuth()
    const menuRef = useRef(null)

    useEffect(() => {
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target))
                setShowBuildingMenu(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [setShowBuildingMenu])

    const openDisputeCount = (disputes ?? buildingData?.disputes ?? []).filter(d => d.status === 'open').length

    return (
        <aside className="w-64 flex-shrink-0 bg-navy-800 border-r border-white/5 flex flex-col h-full">

            {/* Platform brand */}
            <div className="px-5 py-5 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sp flex items-center justify-center shadow-glow-cyan">
                        <Zap size={15} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-bold tracking-tight text-white">
                        Syndic<span className="text-sp">Pulse</span>
                    </span>
                    {isSuperAdmin && (
                        <span className="ml-auto text-[9px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                            ADMIN
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 ml-[37px] tracking-wider uppercase">
                    Plateforme de gestion
                </p>
            </div>

            {/* Building switcher (super_admin only) or static label (syndic_manager) */}
            <div className="px-3 py-3 border-b border-white/5" ref={menuRef}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-2">Propriété active</p>

                {canSwitchBuildings ? (
                    <>
                        <button
                            onClick={() => setShowBuildingMenu(v => !v)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-700 hover:bg-navy-600 border border-white/5 transition-all"
                        >
                            <BuildingAvatar building={activeBuilding} size="sm" />
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{activeBuilding.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{activeBuilding.city} · {activeBuilding.total_units} unités</p>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${showBuildingMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showBuildingMenu && (
                            <div className="mt-2 rounded-xl bg-navy-700 border border-white/8 overflow-hidden shadow-2xl">
                                {buildings.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => onSwitchBuilding(b)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-navy-600 transition-colors text-left ${b.id === activeBuilding.id ? 'bg-navy-600' : ''}`}
                                    >
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{b.name}</p>
                                            <p className="text-[11px] text-slate-400">{b.city} · {b.total_units} unités</p>
                                        </div>
                                        {b.id === activeBuilding.id && <CheckCircle2 size={13} className="text-sp flex-shrink-0" />}
                                    </button>
                                ))}
                                <div className="border-t border-white/5 px-3 py-2">
                                    <button onClick={() => { setShowBuildingMenu(false); onAddBuilding?.() }}
                                        className="text-[11px] text-sp hover:text-sp-light transition-colors flex items-center gap-1">
                                        <Building2 size={11} /> Ajouter une propriété
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-700 border border-white/5">
                        <BuildingAvatar building={activeBuilding} size="sm" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{activeBuilding.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{activeBuilding.city} · {activeBuilding.total_units} unités</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {NAV.filter(item => !item.adminOnly || isSuperAdmin).map(item => {
                    const Icon = item.icon
                    const active = activeTab === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                active
                                    ? 'nav-active text-sp'
                                    : 'text-slate-400 hover:text-white hover:bg-navy-700'
                            }`}
                        >
                            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                            {item.label}
                            {item.id === 'disputes' && openDisputeCount > 0 && (
                                <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                                    {openDisputeCount}
                                </span>
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 pb-3 space-y-1 border-t border-white/5 pt-3">
                <div className="rounded-xl bg-navy-700 border border-sp/10 p-4 mb-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                        <span className="text-[10px] font-semibold text-sp uppercase tracking-wider">Agent IA Actif</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                        Darija + Français · {activeBuilding.name}
                    </p>
                    <button
                        onClick={() => setIsVoiceOpen(true)}
                        className="w-full py-2 bg-sp/10 hover:bg-sp/20 text-sp text-xs font-semibold rounded-lg border border-sp/20 transition-all flex items-center justify-center gap-1.5"
                    >
                        <Mic size={12} /> Ouvrir l'agent vocal
                    </button>
                </div>

                <button onClick={() => onOpenSettings?.()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-navy-700 transition-all">
                    <Settings size={18} strokeWidth={1.5} /> Paramètres
                </button>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                    <LogOut size={18} strokeWidth={1.5} /> Se déconnecter
                </button>

                <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name ?? '')}&background=${user?.avatar_bg}&color=${user?.avatar_color}&bold=true&size=32`}
                        alt=""
                        className="w-7 h-7 rounded-lg"
                    />
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{user?.full_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}

/* ══════════════════════════════════════════
   TOP BAR
══════════════════════════════════════════ */
function TopBar({ activeTab, activeBuilding, showToast }) {
    const pageLabel = NAV.find(n => n.id === activeTab)?.label ?? activeTab
    return (
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-navy-900/80 backdrop-blur-sm flex-shrink-0">
            <div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-0.5">
                    <span>SyndicPulse</span>
                    <ChevronRight size={10} />
                    <span style={{ color: activeBuilding.color }} className="font-medium">
                        {activeBuilding.name} · {activeBuilding.city}
                    </span>
                    <ChevronRight size={10} />
                    <span className="text-slate-300">{pageLabel}</span>
                </div>
                <h1 className="text-xl font-bold text-white">{pageLabel}</h1>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="relative p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-white/5 transition-colors">
                    <Bell size={17} className="text-slate-400" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sp rounded-full border border-navy-800" />
                </button>
                <div className="pl-3 border-l border-white/5 text-right">
                    <p className="text-sm font-semibold text-white">{activeBuilding.manager}</p>
                    <p className="text-[11px] text-slate-400">Gestionnaire syndic</p>
                </div>
            </div>
        </header>
    )
}

/* ══════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════ */
function DashboardPage({ building, data, residents, setIsVoiceOpen, setActiveTab, showToast }) {
    const [showWAModal, setShowWAModal] = useState(false)
    const overdueResidents = residents.filter(r => computeStatus(r.paidThrough) === 'overdue')

    const kpis = [
        { label: 'Taux de recouvrement', value: `${building.collection_rate}%`, delta: '+2.1%', up: true,  icon: TrendingUp,  color: 'emerald' },
        { label: 'Charges impayées',     value: '8 200 MAD',  delta: '-12%',      up: false, icon: CreditCard,  color: 'cyan'    },
        { label: 'Tickets ouverts',      value: data.tickets.filter(t => t.status !== 'done').length.toString(), delta: 'Stable', up: null, icon: Wrench, color: 'amber' },
        { label: 'Transparence',         value: '99/100',     delta: 'Gold Elite', up: null,  icon: ShieldCheck, color: 'violet'  },
    ]

    const statusDot = {
        in_progress: 'bg-sp',
        scheduled:   'bg-slate-500',
        done:        'bg-emerald-500',
    }

    return (
    <>
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        Bonjour, <span className="text-sp">{building.manager.split(' ')[0]}</span> 👋
                    </h2>
                    <p className="text-slate-400 mt-0.5 text-sm">
                        Gestion de <span className="font-semibold" style={{ color: building.color }}>{building.name} · {building.city}</span>
                        {' '}— {building.total_units} unités résidentielles
                    </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                    <p className="font-medium text-slate-300">Février 2026</p>
                    <p>T1 · Semaine 8</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-5">
                {kpis.map(k => <KpiCard key={k.label} {...k} />)}
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-white">Activité maintenance</h3>
                        <button onClick={() => setActiveTab('planning')} className="text-xs text-sp hover:text-sp-light flex items-center gap-1 transition-colors">
                            Voir planning <ChevronRight size={13} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {data.tickets.slice(0, 4).map(t => (
                            <div key={t.id} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-navy-700/60 transition-colors group">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusDot[t.status] ?? 'bg-slate-500'} flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-100 truncate">{t.title}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{t.agent} · {t.time}</p>
                                </div>
                                <StatusBadge status={t.status} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-5">
                    <div className="glass-card p-6 relative overflow-hidden border-sp/15"
                         style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(17,29,53,0.9))' }}>
                        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-sp/10 blur-2xl pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center">
                                    <Mic size={16} className="text-sp" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Agent Vocal IA</p>
                                    <p className="text-[10px] text-slate-400">Darija · Français</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 leading-relaxed italic">
                                "3andi mochkil f l'ascenseur..."
                            </p>
                            <button
                                onClick={() => setIsVoiceOpen(true)}
                                className="w-full py-2.5 bg-sp hover:bg-sp-dark text-navy-900 text-xs font-bold rounded-xl transition-all shadow-glow-cyan flex items-center justify-center gap-1.5"
                            >
                                <Mic size={13} /> Parler à l'IA
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-3">Progression mensuelle</p>
                        <div className="space-y-3">
                            <ProgressRow label="Charges encaissées" value={97} color="bg-emerald-500" />
                            <ProgressRow label="SLA maintenance"    value={82} color="bg-sp" />
                            <ProgressRow label="Budget utilisé"     value={61} color="bg-violet-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-white">Paiements récents</h3>
                    <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="text-xs text-sp hover:text-sp-light flex items-center gap-1 transition-colors">
                        Voir tout <ChevronRight size={13} />
                    </button>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                            <th className="text-left pb-3 font-semibold">Unité</th>
                            <th className="text-left pb-3 font-semibold">Résident</th>
                            <th className="text-left pb-3 font-semibold">Montant</th>
                            <th className="text-left pb-3 font-semibold">Date</th>
                            <th className="text-left pb-3 font-semibold">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                        {data.recentPayments.map((p, i) => (
                            <tr key={i} className="hover:bg-navy-700/40 transition-colors">
                                <td className="py-3 font-mono text-xs text-sp">{p.unit}</td>
                                <td className="py-3 text-slate-200">{p.name}</td>
                                <td className="py-3 text-white font-semibold">{p.amount}</td>
                                <td className="py-3 text-slate-400">{p.date}</td>
                                <td className="py-3"><PaymentBadge status={p.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {overdueResidents.length > 0 && (
                <div className="glass-card p-6" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <MessageCircle size={16} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="font-bold text-white">Résidents en retard</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    <span className="text-amber-400 font-semibold">{overdueResidents.length} résident{overdueResidents.length > 1 ? 's' : ''}</span> — cotisation en attente de règlement
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowWAModal(true)}
                            className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                        >
                            <MessageCircle size={14} /> Envoyer rappel groupé
                        </button>
                    </div>
                </div>
            )}

        </div>

        <AnimatePresence>
            {showWAModal && (
                <WhatsAppGroupModal
                    overdueResidents={overdueResidents}
                    building={building}
                    onClose={() => setShowWAModal(false)}
                />
            )}
        </AnimatePresence>
    </>
    )
}

/* ══════════════════════════════════════════
   FINANCIALS PAGE
══════════════════════════════════════════ */
/* Returns an HTML string (img or SVG initials icon) for use in print documents */
function buildingLogoHTML(building, size = 44) {
    if (building.logo) {
        return `<img src="${building.logo}" style="height:${size}px;width:auto;max-width:${size * 3}px;border-radius:6px;object-fit:contain;flex-shrink:0;" alt="logo"/>`
    }
    const words    = (building.name ?? '').trim().split(/\s+/)
    const initials = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : (building.name ?? '??').slice(0, 2).toUpperCase()
    const color = building.color ?? '#06b6d4'
    const r = Math.round(size / 5)
    const fs = Math.round(size * 0.38)
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><rect width="${size}" height="${size}" rx="${r}" fill="${color}" opacity="0.18"/><rect width="${size}" height="${size}" rx="${r}" fill="none" stroke="${color}" stroke-width="1.5"/><text x="${size/2}" y="${size/2}" dominant-baseline="central" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fs}" font-weight="bold" fill="${color}">${initials}</text></svg>`
}

function generatePaymentReceipt(building, resident, form, coveredThrough) {
    const METHOD_LABELS = { especes: 'Espèces', virement: 'Virement bancaire', cheque: 'Chèque' }
    const dateStr = new Date(form.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const receiptNo = `REC-${Date.now().toString(36).toUpperCase()}`
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Reçu de paiement — ${resident.unit}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 48px; max-width: 600px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #0e7490; }
  .brand { font-size: 20px; font-weight: bold; color: #0e7490; }
  .brand span { color: #111; }
  .receipt-no { font-size: 11px; color: #6b7280; text-align: right; }
  .receipt-no strong { display: block; font-size: 14px; color: #111; margin-bottom: 2px; }
  h2 { font-size: 16px; font-weight: bold; text-align: center; color: #0e7490; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
  .row .lbl { color: #6b7280; }
  .row .val { font-weight: 600; color: #111; text-align: right; }
  .amount-box { background: #ecfdf5; border: 2px solid #6ee7b7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
  .amount-box .amt { font-size: 28px; font-weight: bold; color: #065f46; }
  .amount-box .lbl { font-size: 12px; color: #059669; margin-top: 4px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig { text-align: center; }
  .sig .line { width: 160px; border-top: 1px solid #111; margin: 40px auto 6px; }
  .sig .name { font-size: 11px; color: #6b7280; }
  .legal { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 32px; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;gap:12px">
    ${buildingLogoHTML(building, 44)}
    <div>
      <div class="brand">${building.name}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">${building.city}</div>
    </div>
  </div>
  <div class="receipt-no">
    <strong>REÇU N° ${receiptNo}</strong>
    Date : ${dateStr}
  </div>
</div>

<h2>Reçu de paiement de charges</h2>

<div class="amount-box">
  <div class="amt">${Number(form.amount).toLocaleString('fr-FR')} MAD</div>
  <div class="lbl">${form.months} mois couverts · Jusqu'à ${formatMonth(coveredThrough)}</div>
</div>

<div class="row"><span class="lbl">Résident</span><span class="val">${resident.name}</span></div>
<div class="row"><span class="lbl">Unité</span><span class="val">${resident.unit}</span></div>
<div class="row"><span class="lbl">Mode de paiement</span><span class="val">${METHOD_LABELS[form.method] ?? form.method}</span></div>
<div class="row"><span class="lbl">Date de réception</span><span class="val">${dateStr}</span></div>
<div class="row"><span class="lbl">Période couverte</span><span class="val">${form.months} mois</span></div>
<div class="row"><span class="lbl">Payé jusqu'à</span><span class="val">${formatMonth(coveredThrough)}</span></div>
${form.ref ? `<div class="row"><span class="lbl">Référence / N° reçu</span><span class="val">${form.ref}</span></div>` : ''}

<div class="footer">
  <div class="sig">
    <div class="line"></div>
    <div class="name">Signature du syndic</div>
  </div>
  <div class="sig">
    <div class="line"></div>
    <div class="name">Signature du résident</div>
  </div>
</div>

<div class="legal">Ce reçu est émis par le syndic de ${building.name} conformément à la Loi 18-00. Conservez ce document.</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function exportFinancesCSV(building, residents, expenseLog, data) {
    const BOM = '\uFEFF' // UTF-8 BOM so Excel reads Arabic/French correctly

    // ── Section 1: Header ──────────────────────────────────────────────────────
    const header = [
        [`Rapport financier — ${building.name}`, '', '', '', '', ''],
        [`Immeuble`, building.name, 'Ville', building.city, 'Date', new Date().toLocaleDateString('fr-FR')],
        [],
    ]

    // ── Section 2: Résumé ──────────────────────────────────────────────────────
    const paidCount    = residents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const overdueCount = residents.filter(r => computeStatus(r.paidThrough) === 'overdue').length
    const summary = [
        ['RÉSUMÉ', '', '', '', '', ''],
        ['Unités payées', `${paidCount} / ${building.total_units}`, '', 'Unités en retard', overdueCount, ''],
        ['Budget mensuel', '32 800 MAD', '', 'Fonds de réserve', `${building.reserve_fund_mad?.toLocaleString('fr-FR') ?? '—'} MAD`, ''],
        [],
    ]

    // ── Section 3: Journal des dépenses ────────────────────────────────────────
    const expHeader = [['JOURNAL DES DÉPENSES', '', '', '', '', '']]
    const expCols   = [['Date', 'Catégorie', 'Fournisseur', 'Description', 'Montant (MAD)', 'Facture']]
    const expRows   = expenseLog.map(e => [
        e.date, e.category, e.vendor, e.description,
        e.amount, e.hasInvoice ? 'Oui' : 'Non',
    ])
    const expTotal  = [['', '', '', 'TOTAL', expenseLog.reduce((s, e) => s + e.amount, 0), '']]

    // ── Section 4: Statut paiements résidents ──────────────────────────────────
    const resHeader = [['STATUT PAIEMENTS RÉSIDENTS', '', '', '', '', '']]
    const resCols   = [['Unité', 'Résident', 'Téléphone', 'Statut', 'Payé jusqu\'à', 'Depuis']]
    const resRows   = residents.map(r => {
        const st = computeStatus(r.paidThrough)
        return [r.unit, r.name, r.phone, st === 'paid' ? 'Payé' : st === 'pending' ? 'En attente' : 'En retard', formatMonth(r.paidThrough), r.since]
    })

    // ── Section 5: Répartition dépenses ───────────────────────────────────────
    const repHeader = [['RÉPARTITION DES DÉPENSES', '', '', '', '', '']]
    const repCols   = [['Catégorie', 'Montant (MAD)', '% Budget', '', '', '']]
    const repRows   = data.expenses.map(e => [e.category, e.amount, `${e.pct}%`, '', '', ''])

    const allRows = [
        ...header,
        ...summary,
        ...expHeader, ...expCols, ...expRows, ...expTotal,
        [],
        ...resHeader, ...resCols, ...resRows,
        [],
        ...repHeader, ...repCols, ...repRows,
    ]

    const csv = BOM + allRows.map(row =>
        row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
    ).join('\r\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${building.name.replace(/\s+/g, '_')}_Rapport_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

function exportFinancesPDF(building, residents, expenseLog, data) {
    const paidCount    = residents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const overdueList  = residents.filter(r => computeStatus(r.paidThrough) === 'overdue')
    const totalExp     = expenseLog.reduce((s, e) => s + e.amount, 0)
    const dateStr      = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Rapport financier — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
  h1 { font-size: 20px; color: #0e7490; margin-bottom: 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
  h2 { font-size: 13px; font-weight: bold; color: #0e7490; border-bottom: 2px solid #0e7490; padding-bottom: 4px; margin: 24px 0 10px; text-transform: uppercase; letter-spacing: .5px; }
  .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 8px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
  .kpi .val { font-size: 16px; font-weight: bold; color: #0e7490; }
  .kpi .lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
  td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .badge-paid    { background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
  .badge-pending { background:#fef9c3; color:#b45309; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
  .badge-overdue { background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:99px; font-size:10px; font-weight:600; }
  .total-row td  { font-weight: bold; background: #f8fafc; }
  .footer { margin-top: 32px; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 16px; } button { display:none; } }
</style>
</head>
<body>
<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #0e7490">
  ${buildingLogoHTML(building, 48)}
  <div>
    <h1 style="font-size:20px;color:#0e7490;margin:0">Rapport financier — ${building.name}</h1>
    <p class="meta" style="margin:4px 0 0">${building.city} &nbsp;·&nbsp; Généré le ${dateStr}</p>
  </div>
</div>

<h2>Résumé</h2>
<div class="kpis">
  <div class="kpi"><div class="val">${paidCount} / ${building.total_units}</div><div class="lbl">Unités payées</div></div>
  <div class="kpi"><div class="val" style="color:#dc2626">${overdueList.length}</div><div class="lbl">En retard</div></div>
  <div class="kpi"><div class="val">32 800 MAD</div><div class="lbl">Budget mensuel</div></div>
  <div class="kpi"><div class="val" style="color:#7c3aed">${building.reserve_fund_mad?.toLocaleString('fr-FR') ?? '—'} MAD</div><div class="lbl">Fonds de réserve</div></div>
</div>

<h2>Journal des dépenses</h2>
<table>
  <thead><tr><th>Date</th><th>Catégorie</th><th>Fournisseur</th><th>Description</th><th style="text-align:right">Montant</th><th>Facture</th></tr></thead>
  <tbody>
    ${expenseLog.map(e => `
    <tr>
      <td>${e.date}</td><td>${e.category}</td><td>${e.vendor}</td>
      <td>${e.description}</td>
      <td style="text-align:right;font-weight:600">${e.amount.toLocaleString('fr-FR')} MAD</td>
      <td>${e.hasInvoice ? '✓' : '—'}</td>
    </tr>`).join('')}
    <tr class="total-row"><td colspan="4">TOTAL</td><td style="text-align:right">${totalExp.toLocaleString('fr-FR')} MAD</td><td></td></tr>
  </tbody>
</table>

<h2>Statut paiements résidents</h2>
<table>
  <thead><tr><th>Unité</th><th>Résident</th><th>Statut</th><th>Payé jusqu'à</th><th>Téléphone</th></tr></thead>
  <tbody>
    ${residents.map(r => {
        const st = computeStatus(r.paidThrough)
        const badge = st === 'paid' ? 'badge-paid' : st === 'pending' ? 'badge-pending' : 'badge-overdue'
        const label = st === 'paid' ? 'Payé' : st === 'pending' ? 'En attente' : 'En retard'
        return `<tr><td>${r.unit}</td><td>${r.name}</td><td><span class="${badge}">${label}</span></td><td>${formatMonth(r.paidThrough)}</td><td>${r.phone}</td></tr>`
    }).join('')}
  </tbody>
</table>

<h2>Répartition des dépenses</h2>
<table>
  <thead><tr><th>Catégorie</th><th style="text-align:right">Montant (MAD)</th><th style="text-align:right">% Budget</th></tr></thead>
  <tbody>
    ${data.expenses.map(e => `<tr><td>${e.category}</td><td style="text-align:right">${e.amount.toLocaleString('fr-FR')}</td><td style="text-align:right">${e.pct}%</td></tr>`).join('')}
  </tbody>
</table>

<div class="footer">${building.name} &nbsp;·&nbsp; ${building.city} &nbsp;·&nbsp; ${dateStr}</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function FinancialsPage({ building, data, residents, setResidents, suppliers = [], showToast }) {
    const maxBar = Math.max(...data.collectionHistory.map(h => h.value))

    const [subTab,      setSubTab]      = useState('overview')   // 'overview' | 'recouvrement' | 'depenses'
    const [expenseLog,  setExpenseLog]  = useState(INITIAL_EXPENSE_LOG)
    const [showAddExp,  setShowAddExp]  = useState(false)
    const [showRecPay,  setShowRecPay]  = useState(false)
    const [showAppelDF, setShowAppelDF] = useState(false)
    const [recPayPreset, setRecPayPreset] = useState(null)  // { residentId } pre-fill from recouvrement grid

    // Dépenses date-range filter (empty string = no bound)
    const [expFrom,      setExpFrom]      = useState('')
    const [expTo,        setExpTo]        = useState('')
    const [expActivePill, setExpActivePill] = useState('Tout')   // tracks active preset pill
    function setExpPreset(months, label) {
        setExpActivePill(label)
        if (months === null) { setExpFrom(''); setExpTo(''); return }
        const today = new Date()
        const from  = new Date(today); from.setMonth(from.getMonth() - months)
        setExpFrom(from.toISOString().slice(0, 10))
        setExpTo(today.toISOString().slice(0, 10))
    }

    const overdue = residents.filter(r => computeStatus(r.paidThrough) === 'overdue').map(r => ({
        id: r.id, unit: r.unit, name: r.name, months: 2, amount: '1 700 MAD',
    }))

    function handleAddExpense(entry) {
        setExpenseLog(prev => [{ ...entry, id: `el-${Date.now()}` }, ...prev])
        showToast(`Dépense enregistrée — ${entry.amount.toLocaleString('fr-FR')} MAD`)
    }

    function handleMarkPaid({ residentId, months }) {
        setResidents(prev => prev.map(r => {
            if (r.id !== residentId) return r
            return { ...r, paidThrough: advancePaidThrough(r.paidThrough, months) }
        }))
        showToast(`Paiement enregistré — ${months} mois couverts`)
    }

    const filteredLog = expenseLog.filter(e =>
        (!expFrom || e.date >= expFrom) &&
        (!expTo   || e.date <= expTo)
    )
    const totalExpenseLog = filteredLog.reduce((s, e) => s + e.amount, 0)

    // Dépenses pagination
    const [expPage, setExpPage] = useState(1)
    const EXP_PER_PAGE = 15
    const expTotalPages = Math.max(1, Math.ceil(filteredLog.length / EXP_PER_PAGE))
    const paginatedLog  = filteredLog.slice((expPage - 1) * EXP_PER_PAGE, expPage * EXP_PER_PAGE)
    // Reset page when filter changes
    useEffect(() => setExpPage(1), [expFrom, expTo])

    return (
        <div className="space-y-6">
            {/* Sub-tab nav */}
            <div className="flex gap-2 border-b border-white/8 pb-0">
                {[
                    { id: 'overview',       label: 'Vue d\'ensemble' },
                    { id: 'recouvrement',   label: 'Recouvrement'    },
                    { id: 'depenses',       label: 'Dépenses'        },
                ].map(t => (
                    <button key={t.id} onClick={() => setSubTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                            subTab === t.id
                                ? 'border-sp text-sp'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}>
                        {t.label}
                    </button>
                ))}
                {/* Action buttons always visible */}
                <div className="ml-auto flex items-center gap-2 pb-1">
                    <button onClick={() => setShowAddExp(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-lg text-xs font-bold transition-all">
                        <Plus size={13} /> Dépense
                    </button>
                    <button onClick={() => setShowRecPay(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all">
                        <CheckCircle2 size={13} /> Paiement
                    </button>
                    <button onClick={() => setShowAppelDF(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-bold transition-all">
                        <Banknote size={13} /> Appel de fonds
                    </button>
                </div>
            </div>

            {/* ── Sub-tab: Vue d'ensemble ─────────────────────────────── */}
            {subTab === 'overview' && <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-5">
                {[
                    { label: 'Total encaissé (Fév.)', value: '39 100 MAD', sub: `${residents.filter(r => computeStatus(r.paidThrough) === 'paid').length} / ${building.total_units} unités payées`, color: 'emerald' },
                    { label: 'Charges impayées',      value: '5 100 MAD',  sub: `${overdue.length} unités en retard`,     color: 'red'    },
                    { label: 'Budget mensuel',        value: '32 800 MAD', sub: '61% utilisé',                            color: 'cyan'   },
                    { label: 'Fonds de réserve',      value: `${(building.reserve_fund_mad / 1000).toFixed(0)} 000 MAD`, sub: '+3 200 ce mois', color: 'violet' },
                ].map(s => (
                    <div key={s.label} className="glass-card p-5">
                        <p className="text-xs text-slate-400 mb-2 font-medium">{s.label}</p>
                        <p className={`text-xl font-bold ${
                            s.color === 'emerald' ? 'text-emerald-400' :
                            s.color === 'red'     ? 'text-red-400'     :
                            s.color === 'cyan'    ? 'text-sp'          :
                                                    'text-violet-400'
                        }`}>{s.value}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* nothing here — actions moved to tab header */}

            <div className="grid grid-cols-3 gap-6">
                {/* Collection chart */}
                <div className="col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-white">Taux de recouvrement — 7 derniers mois</h3>
                        <span className="text-xs text-slate-400 bg-navy-700 px-3 py-1 rounded-full border border-white/5">% unités payées</span>
                    </div>
                    {/*
                        Layout math:
                        - Chart width ≈ 690px (col-span-2 minus card padding)
                        - 7 flex-1 columns → ~92px each
                        - Bar fixed at 32px (w-8) = 35% of column, column acts as gap
                        - Container 140px: labels ~38px → usable bar height = 80px max
                    */}
                    <div className="flex items-end justify-between" style={{ height: '140px' }}>
                        {data.collectionHistory.map((h, i) => {
                            const BAR_MAX_PX = 80
                            const barPx = Math.max(4, Math.round((h.value / maxBar) * BAR_MAX_PX))
                            const isLast = i === data.collectionHistory.length - 1
                            return (
                                <div key={h.month} className="flex-1 flex flex-col items-center gap-1.5 justify-end">
                                    <span className="text-[10px] font-bold text-slate-300">{h.value}%</span>
                                    <div className="w-8 rounded-t-md" style={{
                                        height: `${barPx}px`,
                                        background: isLast
                                            ? 'linear-gradient(180deg, #22d3ee, #0891b2)'
                                            : 'rgba(6,182,212,0.25)'
                                    }} />
                                    <span className="text-[10px] text-slate-500">{h.month}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Expense breakdown */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-white mb-5">Répartition des dépenses</h3>
                    <div className="space-y-4">
                        {data.expenses.map(e => (
                            <div key={e.category}>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-slate-300 font-medium">{e.category}</span>
                                    <span className="text-slate-400">{e.pct}%</span>
                                </div>
                                <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden">
                                    <div className={`h-full ${e.color} rounded-full`} style={{ width: `${e.pct}%` }} />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">{e.amount.toLocaleString('fr-FR')} MAD</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overdue table */}
            {overdue.length > 0 && (
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-white">Charges en retard</h3>
                        <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1.5">
                            <Phone size={12} /> Envoyer rappels WhatsApp
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                                <th className="text-left pb-3 font-semibold">Unité</th>
                                <th className="text-left pb-3 font-semibold">Résident</th>
                                <th className="text-left pb-3 font-semibold">Mois dus</th>
                                <th className="text-left pb-3 font-semibold">Montant</th>
                                <th className="text-left pb-3 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {overdue.map((o) => (
                                <tr key={o.id} className="hover:bg-navy-700/40 transition-colors">
                                    <td className="py-3 font-mono text-xs text-sp">{o.unit}</td>
                                    <td className="py-3 text-slate-200">{o.name}</td>
                                    <td className="py-3 text-slate-300">{o.months} mois</td>
                                    <td className="py-3 text-red-400 font-semibold">{o.amount}</td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleMarkPaid(o.id)}
                                                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                                            >
                                                <CheckCircle2 size={11} /> Marquer payé
                                            </button>
                                            <span className="text-slate-700">·</span>
                                            <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="text-[11px] text-sp hover:text-sp-light transition-colors flex items-center gap-1">
                                                <Mic size={11} /> Appel IA
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            </>}
            {/* ── Sub-tab: Recouvrement ──────────────────────────────── */}
            {subTab === 'recouvrement' && <RecouvrementTab building={building} residents={residents} setResidents={setResidents} onRecordPayment={(residentId) => { setRecPayPreset({ residentId }); setShowRecPay(true) }} showToast={showToast} />}

            {/* ── Sub-tab: Dépenses ─────────────────────────────────── */}
            {subTab === 'depenses' && (
                <div className="glass-card p-6 space-y-4">
                    {/* Date range + presets */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs text-slate-400 flex-shrink-0">Du</span>
                            <input type="date" value={expFrom} onChange={e => { setExpFrom(e.target.value); setExpActivePill(null) }}
                                className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                            <span className="text-xs text-slate-400 flex-shrink-0">au</span>
                            <input type="date" value={expTo} onChange={e => { setExpTo(e.target.value); setExpActivePill(null) }}
                                className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                            {[['1M',1],['3M',3],['6M',6],['1an',12],['Tout',null]].map(([lbl,n]) => (
                                <button key={lbl} onClick={() => setExpPreset(n, lbl)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                                        expActivePill === lbl
                                            ? 'bg-sp/20 text-sp border-sp/30'
                                            : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/30 hover:text-sp'
                                    }`}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Header row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-white">Journal des dépenses</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {filteredLog.length} entrées{filteredLog.length !== expenseLog.length && ` / ${expenseLog.length} total`} · {totalExpenseLog.toLocaleString('fr-FR')} MAD
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { exportFinancesCSV(building, residents, filteredLog, data); showToast('Export Excel téléchargé') }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 transition-all">
                                <Download size={12} /> Excel
                            </button>
                            <button onClick={() => exportFinancesPDF(building, residents, filteredLog, data)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-all">
                                <FileText size={12} /> PDF
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                                <th className="text-left pb-3 font-semibold">Date</th>
                                <th className="text-left pb-3 font-semibold">Catégorie</th>
                                <th className="text-left pb-3 font-semibold">Fournisseur</th>
                                <th className="text-left pb-3 font-semibold">Description</th>
                                <th className="text-right pb-3 font-semibold">Montant</th>
                                <th className="text-left pb-3 font-semibold">Facture</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                            {paginatedLog.length === 0 && (
                                <tr><td colSpan={6} className="py-10 text-center text-slate-500 text-sm">Aucune dépense pour cette période.</td></tr>
                            )}
                            {paginatedLog.map((e) => (
                                <motion.tr key={e.id}
                                    initial={e.isNew ? { opacity: 0, y: -8 } : false}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`hover:bg-navy-700/40 transition-colors ${e.isNew ? 'bg-sp/5' : ''}`}
                                >
                                    <td className="py-3 text-slate-400 text-xs">{e.date}</td>
                                    <td className="py-3 text-xs font-medium text-slate-300">{e.category}</td>
                                    <td className="py-3 text-slate-300 text-xs">{e.vendor}</td>
                                    <td className="py-3 text-slate-500 text-xs max-w-xs truncate">{e.description}</td>
                                    <td className="py-3 text-right font-semibold text-white text-xs">{e.amount.toLocaleString('fr-FR')} MAD</td>
                                    <td className="py-3">
                                        {e.hasInvoice
                                            ? <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold"><FileText size={11} /> Jointe</span>
                                            : <span className="text-[10px] text-slate-600">—</span>}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {expTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-[11px] text-slate-500">
                                Page {expPage} / {expTotalPages} · {filteredLog.length} entrées
                            </span>
                            <div className="flex gap-1">
                                <button disabled={expPage === 1} onClick={() => setExpPage(p => p - 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronLeft size={13} />
                                </button>
                                {getPageNumbers(expPage, expTotalPages).map((n, i) =>
                                    n === '…' ? <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-slate-600 text-xs">…</span>
                                    : <button key={n} onClick={() => setExpPage(n)}
                                        className={`w-7 h-7 rounded-lg text-xs font-semibold border transition-all ${expPage === n ? 'bg-sp/20 text-sp border-sp/30' : 'bg-navy-700 text-slate-400 border-white/8 hover:text-slate-200'}`}>
                                        {n}
                                    </button>
                                )}
                                <button disabled={expPage === expTotalPages} onClick={() => setExpPage(p => p + 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showAddExp && (
                    <AddExpenseModal onClose={() => setShowAddExp(false)} onAdd={handleAddExpense} suppliers={suppliers} />
                )}
                {showRecPay && (
                    <RecordPaymentModal
                        building={building} residents={residents}
                        presetResidentId={recPayPreset?.residentId}
                        onClose={() => { setShowRecPay(false); setRecPayPreset(null) }}
                        onRecord={handleMarkPaid}
                    />
                )}
                {showAppelDF && (
                    <AppelDeFondsModal building={building} residents={residents} onClose={() => setShowAppelDF(false)} showToast={showToast} />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   RECOUVREMENT TAB
══════════════════════════════════════════ */
function exportRecouvrementCSV(building, residents, months) {
    const BOM = '\uFEFF'
    const headers = ['Unité', 'Résident', ...months.map(m => formatMonth(m)), 'Total payé'].join(';')
    const rows = residents.map(r => {
        const cells = months.map(m => {
            const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
            const [ry, rm] = m.split('-').map(Number)
            const [py, pm] = (r.paidThrough || '2000-01').split('-').map(Number)
            const monthIdx = (ry - cy) * 12 + (rm - cm)
            const paidIdx  = (py - cy) * 12 + (pm - cm)
            if (monthIdx < 0) return paidIdx >= monthIdx ? 'Payé' : 'Impayé'
            if (monthIdx === 0) return paidIdx >= 0 ? 'Payé' : 'En attente'
            return 'N/A'
        })
        const paidCount = cells.filter(c => c === 'Payé').length
        return [r.unit, r.name, ...cells, `${paidCount}/${months.length}`].join(';')
    })
    const csv = BOM + [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `recouvrement_${building.name}_${CURRENT_MONTH}.csv`; a.click()
    URL.revokeObjectURL(url)
}

function exportRecouvrementPDF(building, residents, months) {
    const logoHTML = buildingLogoHTML(building, 48)
    const rows = residents.map(r => {
        const cells = months.map(m => {
            const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
            const [ry, rm] = m.split('-').map(Number)
            const [py, pm] = (r.paidThrough || '2000-01').split('-').map(Number)
            const monthIdx = (ry - cy) * 12 + (rm - cm)
            const paidIdx  = (py - cy) * 12 + (pm - cm)
            let st, color
            if (monthIdx < 0)      { st = paidIdx >= monthIdx ? '✓' : '✗'; color = paidIdx >= monthIdx ? '#22c55e' : '#ef4444' }
            else if (monthIdx===0) { st = paidIdx >= 0 ? '✓' : '⏳'; color = paidIdx >= 0 ? '#22c55e' : '#f59e0b' }
            else                   { st = '–'; color = '#64748b' }
            return `<td style="text-align:center;color:${color};font-weight:bold">${st}</td>`
        }).join('')
        return `<tr><td style="font-family:monospace;color:#06b6d4">${r.unit}</td><td>${r.name}</td>${cells}</tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recouvrement</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e2e8f0;padding:6px 8px}
    th{background:#f8fafc;font-weight:600;text-align:left}</style></head>
    <body><div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
    ${logoHTML}<div><h2 style="margin:0">Tableau de Recouvrement</h2>
    <p style="margin:4px 0 0;color:#64748b">${building.name} · ${building.city} · ${CURRENT_MONTH}</p></div></div>
    <table><thead><tr><th>Unité</th><th>Résident</th>${months.map(m=>`<th>${formatMonth(m)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table></body></html>`
    const win = window.open('','_blank'); win.document.write(html); win.document.close()
    setTimeout(()=>win.print(), 400)
}

function RecouvrementTab({ building, residents, setResidents, onRecordPayment, showToast }) {
    // Date range state — default last 6 months
    const [recFrom, setRecFrom] = useState(() => {
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        let m = cm - 5; let y = cy
        while (m <= 0) { m += 12; y-- }
        return `${y}-${String(m).padStart(2, '0')}`
    })
    const [recTo, setRecTo] = useState(CURRENT_MONTH)

    // Build months array from recFrom → recTo (capped at 36 months)
    const months = (() => {
        const result = []
        let [y, m] = recFrom.split('-').map(Number)
        const [ty, tm] = recTo.split('-').map(Number)
        while ((y < ty || (y === ty && m <= tm)) && result.length < 36) {
            result.push(`${y}-${String(m).padStart(2, '0')}`)
            m++; if (m > 12) { m = 1; y++ }
        }
        return result
    })()

    const [recActivePill, setRecActivePill] = useState('6M')   // tracks active preset pill

    function setPreset(n, lbl) {
        setRecActivePill(lbl)
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        let fm = cm - (n - 1); let fy = cy
        while (fm <= 0) { fm += 12; fy-- }
        setRecFrom(`${fy}-${String(fm).padStart(2, '0')}`)
        setRecTo(CURRENT_MONTH)
    }

    const paid    = residents.filter(r => computeStatus(r.paidThrough) === 'paid').length
    const pending = residents.filter(r => computeStatus(r.paidThrough) === 'pending').length
    const overdue = residents.filter(r => computeStatus(r.paidThrough) === 'overdue').length
    const rate    = residents.length ? Math.round((paid / residents.length) * 100) : 0

    function cellStatus(r, m) {
        const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
        const [ry, rm] = m.split('-').map(Number)
        const [py, pm] = (r.paidThrough || '2000-01').split('-').map(Number)
        const monthIdx = (ry - cy) * 12 + (rm - cm)
        const paidIdx  = (py - cy) * 12 + (pm - cm)
        if (monthIdx < 0)       return paidIdx >= monthIdx ? 'paid' : 'overdue'
        if (monthIdx === 0)     return paidIdx >= 0 ? 'paid' : 'pending'
        return 'future'
    }

    // Residents pagination
    const [recPage, setRecPage] = useState(1)
    const REC_PER_PAGE = 15
    const recTotalPages = Math.max(1, Math.ceil(residents.length / REC_PER_PAGE))
    const paginatedResidents = residents.slice((recPage - 1) * REC_PER_PAGE, recPage * REC_PER_PAGE)

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Taux actuel',      value: `${rate}%`,          color: 'text-sp'          },
                    { label: 'Unités à jour',     value: paid,                color: 'text-emerald-400' },
                    { label: 'En attente',        value: pending,             color: 'text-amber-400'   },
                    { label: 'En retard',         value: overdue,             color: 'text-red-400'     },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4">
                        <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Date range controls */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-slate-400 flex-shrink-0">De</span>
                    <input type="month" value={recFrom} onChange={e => { setRecFrom(e.target.value); setRecActivePill(null) }}
                        max={recTo}
                        className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    <span className="text-xs text-slate-400 flex-shrink-0">à</span>
                    <input type="month" value={recTo} onChange={e => { setRecTo(e.target.value); setRecActivePill(null) }}
                        min={recFrom}
                        className="flex-1 min-w-0 bg-navy-700 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    {[[3,'3M'],[6,'6M'],[12,'12M'],[24,'24M']].map(([n,lbl]) => (
                        <button key={lbl} onClick={() => setPreset(n, lbl)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                                recActivePill === lbl
                                    ? 'bg-sp/20 text-sp border-sp/30'
                                    : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/30 hover:text-sp'
                            }`}>
                            {lbl}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 ml-auto">
                    <button onClick={() => { exportRecouvrementCSV(building, residents, months); showToast('Export recouvrement téléchargé') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 transition-all">
                        <Download size={12} /> Excel
                    </button>
                    <button onClick={() => exportRecouvrementPDF(building, residents, months)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-all">
                        <FileText size={12} /> PDF
                    </button>
                </div>
            </div>

            {/* Matrix */}
            <div className="glass-card overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                            <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-[#111d35]">Unité</th>
                            <th className="text-left px-4 py-3 font-semibold sticky left-16 bg-[#111d35]">Résident</th>
                            {months.map(m => (
                                <th key={m} className="px-3 py-3 font-semibold text-center whitespace-nowrap">{formatMonth(m)}</th>
                            ))}
                            <th className="px-4 py-3 font-semibold text-center">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                        {paginatedResidents.map(r => {
                            const statuses = months.map(m => cellStatus(r, m))
                            const paidCount = statuses.filter(s => s === 'paid').length
                            return (
                                <tr key={r.id} className="hover:bg-navy-700/40 transition-colors">
                                    <td className="px-4 py-3 font-mono text-sp font-semibold sticky left-0 bg-[#111d35]">{r.unit}</td>
                                    <td className="px-4 py-3 text-slate-200 sticky left-16 bg-[#111d35] whitespace-nowrap">{r.name}</td>
                                    {statuses.map((st, i) => (
                                        <td key={i} className="px-3 py-3 text-center">
                                            {st === 'future' ? (
                                                <span className="text-slate-600">—</span>
                                            ) : (
                                                <button
                                                    onClick={() => st !== 'paid' && onRecordPayment(r.id)}
                                                    title={st !== 'paid' ? 'Cliquer pour enregistrer un paiement' : ''}
                                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold transition-all ${
                                                        st === 'paid'    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                                        st === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/30 cursor-pointer' :
                                                                           'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/30 cursor-pointer'
                                                    }`}
                                                >
                                                    {st === 'paid' ? '✓' : st === 'pending' ? '⏳' : '✗'}
                                                </button>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs font-bold ${paidCount === months.length ? 'text-emerald-400' : paidCount === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                            {paidCount}/{months.length}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {residents.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm">Aucun résident</div>
                )}
                <div className="px-4 py-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500/15 border border-emerald-500/20 inline-flex items-center justify-center text-emerald-400 font-bold">✓</span> Payé</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-500/15 border border-amber-500/20 inline-flex items-center justify-center text-amber-400">⏳</span> En attente</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500/15 border border-red-500/20 inline-flex items-center justify-center text-red-400 font-bold">✗</span> En retard</span>
                    </div>
                    {recTotalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">Page {recPage} / {recTotalPages}</span>
                            <div className="flex gap-1">
                                <button disabled={recPage === 1} onClick={() => setRecPage(p => p - 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronLeft size={13} />
                                </button>
                                {getPageNumbers(recPage, recTotalPages).map((n, i) =>
                                    n === '…' ? <span key={`r${i}`} className="w-7 h-7 flex items-center justify-center text-slate-600 text-xs">…</span>
                                    : <button key={n} onClick={() => setRecPage(n)}
                                        className={`w-7 h-7 rounded-lg text-xs font-semibold border transition-all ${recPage === n ? 'bg-sp/20 text-sp border-sp/30' : 'bg-navy-700 text-slate-400 border-white/8 hover:text-slate-200'}`}>
                                        {n}
                                    </button>
                                )}
                                <button disabled={recPage === recTotalPages} onClick={() => setRecPage(p => p + 1)}
                                    className="w-7 h-7 rounded-lg bg-navy-700 border border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors">
                                    <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════
   APPEL DE FONDS MODAL
══════════════════════════════════════════ */
function generateAppelDeFondsDoc(building, residents, period, dueDate) {
    const logoHTML = buildingLogoHTML(building, 56)
    const [py, pm] = period.split('-').map(Number)
    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const periodLabel = `${monthNames[pm - 1]} ${py}`
    const rows = residents.map(r => {
        const st = computeStatus(r.paidThrough)
        const statusLabel = st === 'paid' ? 'À jour' : st === 'pending' ? 'En attente' : 'En retard'
        const statusColor = st === 'paid' ? '#22c55e' : st === 'pending' ? '#f59e0b' : '#ef4444'
        const quota = r.quota ?? '—'
        return `<tr>
            <td style="font-family:monospace;color:#0891b2">${r.unit}</td>
            <td>${r.name}</td>
            <td style="text-align:right">${typeof quota==='number'?quota.toLocaleString('fr-FR')+' MAD':'—'}</td>
            <td style="color:${statusColor};font-weight:600">${statusLabel}</td>
        </tr>`
    }).join('')
    const total = residents.reduce((s, r) => s + (r.quota ?? 0), 0)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Appel de fonds — ${building.name}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#1e293b;max-width:800px;margin:0 auto}
        h1{font-size:20px;margin:0}h2{font-size:14px;color:#64748b;font-weight:400;margin:4px 0 0}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
        th{background:#f1f5f9;padding:8px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0}
        td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
        .total{font-weight:700;background:#f8fafc}
        .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
        .sig{margin-top:60px;display:flex;gap:80px}
        .sig-block{text-align:center;font-size:11px;color:#64748b}
        .sig-line{width:160px;border-top:1px solid #1e293b;margin-bottom:8px}
        @media print{body{padding:20px}.no-print{display:none!important}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px">
        ${logoHTML}
        <div>
            <h1>APPEL DE FONDS</h1>
            <h2>${building.name} · ${building.city}</h2>
            <p style="font-size:12px;color:#475569;margin:6px 0 0">
                Période : <strong>${periodLabel}</strong> · Échéance : <strong>${dueDate || '—'}</strong>
            </p>
        </div>
    </div>
    <p style="font-size:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:10px 14px;color:#0369a1">
        Conformément aux dispositions de la Loi 18-00, vous êtes priés de régler votre quote-part de charges
        de copropriété pour la période de <strong>${periodLabel}</strong> avant le <strong>${dueDate || 'la date indiquée'}</strong>.
    </p>
    <table>
        <thead><tr><th>Unité</th><th>Copropriétaire</th><th style="text-align:right">Quote-part</th><th>Statut</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total"><td colspan="2" style="font-weight:700">Total à collecter</td>
            <td style="text-align:right;font-weight:700">${total.toLocaleString('fr-FR')} MAD</td><td></td></tr></tfoot>
    </table>
    <div class="sig">
        <div class="sig-block"><div class="sig-line"></div>Le Syndic</div>
    </div>
    <div class="footer">
        <span>Généré par SyndicPulse · ${new Date().toLocaleDateString('fr-FR')}</span>
        <span>${building.name} · ${building.address ?? ''}</span>
    </div>
    </body></html>`
    const win = window.open('', '_blank'); win.document.write(html); win.document.close()
    setTimeout(() => win.print(), 400)
}

function AppelDeFondsModal({ building, residents, onClose, showToast }) {
    const [step, setStep] = useState(1)
    const [period,  setPeriod]  = useState(CURRENT_MONTH)
    const [dueDate, setDueDate] = useState(() => {
        const [y, m] = CURRENT_MONTH.split('-').map(Number)
        const nd = m === 12 ? `${y+1}-01-15` : `${y}-${String(m+1).padStart(2,'0')}-15`
        return nd
    })
    const [wacopied, setWaCopied] = useState(false)

    const unpaid = residents.filter(r => computeStatus(r.paidThrough) !== 'paid')
    const total  = residents.reduce((s, r) => s + (r.quota ?? 0), 0)

    function buildWAText() {
        const [py, pm] = period.split('-').map(Number)
        const mNames = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc']
        return `📢 *APPEL DE FONDS — ${building.name}*\n\nPériode : ${mNames[pm-1]}. ${py}\nÉchéance : ${dueDate || '—'}\n\nMerci de régler votre quote-part de charges avant la date limite.\n\n${unpaid.length} unité(s) en attente de règlement.\n\n_Syndic ${building.name}_`
    }

    function copyWA() {
        navigator.clipboard.writeText(buildWAText())
        setWaCopied(true); setTimeout(() => setWaCopied(false), 2500)
        showToast('Message WhatsApp copié')
    }

    return (
        <Modal title="Appel de fonds" subtitle={`${building.name} · générer et envoyer`} onClose={onClose} width="max-w-2xl">
            {step === 1 && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Période *</label>
                            <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date d'échéance</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                    </div>
                    <div className="bg-navy-700 rounded-xl p-4 border border-white/8 space-y-2">
                        <p className="text-xs font-semibold text-slate-400">Résumé</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div><p className="text-lg font-bold text-white">{residents.length}</p><p className="text-[11px] text-slate-500">Unités</p></div>
                            <div><p className="text-lg font-bold text-amber-400">{unpaid.length}</p><p className="text-[11px] text-slate-500">En attente</p></div>
                            <div><p className="text-lg font-bold text-sp">{total.toLocaleString('fr-FR')} MAD</p><p className="text-[11px] text-slate-500">Total attendu</p></div>
                        </div>
                    </div>
                    <button onClick={() => setStep(2)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-navy-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                        <Banknote size={15} /> Générer l'appel de fonds
                    </button>
                </div>
            )}
            {step === 2 && (
                <div className="space-y-5">
                    <div className="rounded-xl border border-white/8 overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0">
                                <tr className="bg-navy-700 text-[10px] text-slate-500 uppercase tracking-wider">
                                    {['Unité','Résident','Quote-part','Statut'].map(h=><th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {residents.map(r => {
                                    const st = computeStatus(r.paidThrough)
                                    return (
                                        <tr key={r.id} className="hover:bg-navy-700/40">
                                            <td className="px-3 py-2.5 font-mono text-sp">{r.unit}</td>
                                            <td className="px-3 py-2.5 text-slate-200">{r.name}</td>
                                            <td className="px-3 py-2.5 text-slate-300">{r.quota ? `${r.quota.toLocaleString('fr-FR')} MAD` : '—'}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    st==='paid' ? 'bg-emerald-500/15 text-emerald-400' :
                                                    st==='pending' ? 'bg-amber-500/15 text-amber-400' :
                                                    'bg-red-500/15 text-red-400'}`}>
                                                    {st==='paid'?'À jour':st==='pending'?'En attente':'En retard'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => generateAppelDeFondsDoc(building, residents, period, dueDate)}
                            className="flex-1 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            <FileText size={14} /> Imprimer / PDF
                        </button>
                        <button onClick={copyWA}
                            className="flex-1 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            {wacopied ? <><Check size={14}/> Copié !</> : <><MessageCircle size={14}/> Message WhatsApp</>}
                        </button>
                    </div>
                    <button onClick={() => setStep(1)} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">← Modifier la période</button>
                </div>
            )}
        </Modal>
    )
}

/* ══════════════════════════════════════════
   FOURNISSEURS PAGE
══════════════════════════════════════════ */
const SUPPLIER_CATS = [
    { key: 'ascenseur',    label: 'Ascenseur',     color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
    { key: 'nettoyage',    label: 'Nettoyage',     color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20'       },
    { key: 'electricite',  label: 'Électricité',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/20'    },
    { key: 'plomberie',    label: 'Plomberie',     color: 'bg-blue-500/15 text-blue-400 border-blue-500/20'       },
    { key: 'gardiennage',  label: 'Gardiennage',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    { key: 'peinture',     label: 'Peinture',      color: 'bg-pink-500/15 text-pink-400 border-pink-500/20'       },
    { key: 'espaces_verts',label: 'Espaces verts', color: 'bg-lime-500/15 text-lime-400 border-lime-500/20'       },
    { key: 'autre',        label: 'Autre',         color: 'bg-slate-500/15 text-slate-400 border-slate-500/20'    },
]
function catInfo(key) { return SUPPLIER_CATS.find(c => c.key === key) ?? SUPPLIER_CATS[7] }

function StarRating({ value, onChange, size = 16 }) {
    const [hover, setHover] = useState(0)
    return (
        <div className="flex gap-0.5">
            {[1,2,3,4,5].map(n => (
                <button key={n} type="button"
                    onClick={() => onChange?.(n)}
                    onMouseEnter={() => onChange && setHover(n)}
                    onMouseLeave={() => onChange && setHover(0)}
                    className={`transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
                >
                    <Star size={size} className={`transition-colors ${
                        n <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`} />
                </button>
            ))}
        </div>
    )
}

/* ════════════════════════════════════
   CIRCULAIRES PAGE
════════════════════════════════════ */
function CirculairesPage({ building, circulaires, setCirculaires, showToast }) {
    const [showAdd, setShowAdd] = useState(false)

    const MONTHS_S = ['Jan.','Fév.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.']
    const fmtDate = (iso) => {
        if (!iso) return '—'
        const d = new Date(iso)
        return `${d.getDate()} ${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`
    }

    function handleAdd(circ) {
        setCirculaires(prev => [circ, ...prev])
        showToast('Circulaire enregistrée', 'success')
    }
    function handleDelete(id) {
        setCirculaires(prev => prev.filter(c => c.id !== id))
        showToast('Circulaire supprimée', 'success')
    }
    function handleMarkSent(id) {
        setCirculaires(prev => prev.map(c => c.id === id ? { ...c, diffuse: true } : c))
        showToast('Marqué comme diffusé', 'success')
    }
    function handleCopyWA(circ) {
        const msg = buildCirculaireMessage(circ.template, circ.vars, building.name)
        navigator.clipboard.writeText(msg).then(() =>
            showToast('Message copié — collez-le dans WhatsApp Broadcast', 'success'))
    }

    const thisMonth = new Date().toISOString().slice(0, 7)
    const countThisMonth = circulaires.filter(c => c.createdAt?.startsWith(thisMonth)).length
    const countDiffuses  = circulaires.filter(c => c.diffuse).length

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Circulaires & Avis</h2>
                    <p className="text-xs text-slate-400 mt-1">Rédigez et diffusez les avis aux résidents en quelques clics</p>
                </div>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                    <Megaphone size={15} /> Nouvel avis
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Ce mois-ci',   val: countThisMonth, color: 'text-cyan-400' },
                    { label: 'Diffusés',      val: countDiffuses,  color: 'text-emerald-400' },
                    { label: 'Total archivés',val: circulaires.length, color: 'text-slate-300' },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4">
                        <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Quick-launch templates */}
            <div className="glass-card p-5">
                <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-4">Lancement rapide</p>
                <div className="grid grid-cols-3 gap-3">
                    {CIRCULAIRE_TEMPLATES.map(t => (
                        <button key={t.key} onClick={() => setShowAdd({ defaultTemplate: t.key })}
                            className="flex items-center gap-3 p-3 rounded-xl bg-navy-700/60 border border-white/8 hover:border-white/20 hover:bg-navy-700 transition-all text-left">
                            <span className="text-xl flex-shrink-0">{t.icon}</span>
                            <span className="text-sm font-medium text-slate-200 leading-tight">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* History */}
            {circulaires.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-5xl mb-4">📢</div>
                    <p className="text-slate-400 text-sm">Aucune circulaire pour l'instant.</p>
                    <p className="text-slate-500 text-xs mt-2">Cliquez "Nouvel avis" pour rédiger votre premier avis.</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-white/5">
                        <p className="text-sm font-semibold text-white">Historique ({circulaires.length})</p>
                    </div>
                    <div className="divide-y divide-white/5">
                        {circulaires.map(circ => {
                            const tmpl = CIRCULAIRE_TEMPLATES.find(t => t.key === circ.template) ?? { icon: '📝', label: 'Avis' }
                            const summary = circ.vars.titre ?? circ.vars.raison ?? circ.vars.sujet ?? circ.vars.zone ?? circ.vars.contenu?.slice(0, 70) ?? '—'
                            return (
                                <div key={circ.id} className="flex items-center gap-4 px-5 py-4 hover:bg-navy-700/30 transition-colors">
                                    <span className="text-2xl flex-shrink-0">{tmpl.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-semibold text-white">{tmpl.label}</span>
                                            {circ.diffuse && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Diffusé</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">{summary}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{fmtDate(circ.createdAt)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button onClick={() => generateCirculaireDoc(building, circ)} title="Imprimer / PDF"
                                            className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-navy-600 text-slate-400 hover:text-white border border-white/8 transition-colors">
                                            <FileText size={13} />
                                        </button>
                                        <button onClick={() => handleCopyWA(circ)} title="Copier message WhatsApp"
                                            className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/8 transition-colors">
                                            <Copy size={13} />
                                        </button>
                                        {!circ.diffuse && (
                                            <button onClick={() => handleMarkSent(circ.id)} title="Marquer comme diffusé"
                                                className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/8 transition-colors">
                                                <Check size={13} />
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(circ.id)} title="Supprimer"
                                            className="p-1.5 rounded-lg bg-navy-700/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/8 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {showAdd && (
                <AddCirculaireModal
                    building={building}
                    defaultTemplate={typeof showAdd === 'object' ? showAdd.defaultTemplate : undefined}
                    onClose={() => setShowAdd(false)}
                    onAdd={handleAdd}
                    showToast={showToast}
                />
            )}
        </div>
    )
}

function AddCirculaireModal({ building, defaultTemplate, onClose, onAdd, showToast }) {
    const [step, setStep] = useState(defaultTemplate ? 2 : 1)
    const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate ?? null)
    const [vars, setVars] = useState({})
    const [preview, setPreview] = useState(false)
    const [copied, setCopied] = useState(false)

    const tmpl = CIRCULAIRE_TEMPLATES.find(t => t.key === selectedTemplate)

    useEffect(() => {
        if (tmpl) {
            const defaults = {}
            tmpl.fields.forEach(f => { if (f.default) defaults[f.key] = f.default })
            setVars(defaults)
        }
    }, [selectedTemplate])

    const msgText = selectedTemplate ? buildCirculaireMessage(selectedTemplate, vars, building.name) : ''

    function handleSave() {
        const missing = tmpl?.fields.filter(f => f.required && !vars[f.key]) ?? []
        if (missing.length > 0) { showToast(`Champ requis : ${missing[0].label}`, 'error'); return }
        onAdd({
            id: `circ-${Date.now()}`,
            template: selectedTemplate,
            vars,
            createdAt: new Date().toISOString(),
            diffuse: false,
        })
        onClose()
    }

    function copyToClipboard() {
        navigator.clipboard.writeText(msgText).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        })
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1629] border border-white/12 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                            <Megaphone size={15} className="text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Nouvel avis</p>
                            <p className="text-xs text-slate-400">{step === 1 ? 'Choisir un template' : `${tmpl?.icon ?? ''} ${tmpl?.label ?? ''}`}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-navy-700 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                <div className="p-5">
                    {/* STEP 1 — Template picker */}
                    {step === 1 && (
                        <div className="grid grid-cols-2 gap-3">
                            {CIRCULAIRE_TEMPLATES.map(t => (
                                <button key={t.key}
                                    onClick={() => { setSelectedTemplate(t.key); setStep(2) }}
                                    className="flex items-start gap-4 p-4 rounded-xl bg-navy-700/60 border border-white/8 hover:border-white/25 hover:bg-navy-700 transition-all text-left">
                                    <span className="text-2xl flex-shrink-0 mt-0.5">{t.icon}</span>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{t.label}</p>
                                        <p className="text-xs text-slate-500 mt-1">{t.fields.map(f => f.label).join(' · ')}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 2 — Fill form */}
                    {step === 2 && tmpl && (
                        <div className="space-y-4">
                            {/* Back + template label */}
                            {!defaultTemplate && (
                                <button onClick={() => { setStep(1); setSelectedTemplate(null); setVars({}) }}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors mb-2">
                                    ← Changer de template
                                </button>
                            )}

                            {/* Dynamic fields */}
                            {tmpl.fields.map(field => (
                                <div key={field.key}>
                                    <label className="block text-xs text-slate-400 mb-1.5">
                                        {field.label} {field.required && <span className="text-red-400">*</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={vars[field.key] ?? ''}
                                            onChange={e => setVars(v => ({ ...v, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder ?? ''}
                                            rows={3}
                                            className="w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                                        />
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={vars[field.key] ?? ''}
                                            onChange={e => setVars(v => ({ ...v, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder ?? ''}
                                            className="w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                                        />
                                    )}
                                </div>
                            ))}

                            {/* Preview toggle */}
                            <button onClick={() => setPreview(p => !p)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                {preview ? '▼ Masquer l\'aperçu' : '▶ Aperçu du message généré'}
                            </button>
                            {preview && (
                                <div className="bg-black/30 border border-white/8 rounded-xl p-4">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Aperçu message</p>
                                    <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">{msgText}</pre>
                                </div>
                            )}

                            {/* WhatsApp how-to */}
                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-xs text-slate-400">
                                <p className="text-emerald-400 font-semibold mb-1">📱 Comment diffuser sur WhatsApp ?</p>
                                <p>1. Copiez le message ci-dessous → 2. Ouvrez WhatsApp → Nouvelle liste de diffusion → collez le message → envoyez à tous les résidents en une seule fois.</p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => generateCirculaireDoc(building, { template: selectedTemplate, vars, createdAt: new Date().toISOString() })}
                                    className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-navy-700/60 border border-white/12 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white transition-colors">
                                    <FileText size={14} /> Imprimer / PDF
                                </button>
                                <button onClick={copyToClipboard}
                                    className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                                    <Copy size={14} /> {copied ? 'Copié !' : 'Copier message WA'}
                                </button>
                            </div>
                            <button onClick={handleSave}
                                className="w-full py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/25 transition-colors">
                                Enregistrer dans les archives
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function FournisseursPage({ building, suppliers, setSuppliers, showToast }) {
    const [search,      setSearch]      = useState('')
    const [catFilter,   setCatFilter]   = useState('all')
    const [showAdd,     setShowAdd]     = useState(false)
    const [editing,     setEditing]     = useState(null)

    const filtered = suppliers.filter(s => {
        const matchCat  = catFilter === 'all' || s.category === catFilter
        const matchName = s.name.toLowerCase().includes(search.toLowerCase())
        return matchCat && matchName
    })

    const avgRating = suppliers.length
        ? (suppliers.reduce((a, s) => a + (s.rating || 0), 0) / suppliers.length).toFixed(1)
        : '—'

    function handleAdd(s) {
        setSuppliers(prev => [{ ...s, id: `sup-${Date.now()}` }, ...prev])
        showToast(`${s.name} ajouté`)
    }

    function handleSave(updated) {
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s))
        setEditing(null)
        showToast(`${updated.name} — modifications enregistrées`)
    }

    function handleDelete(id) {
        const s = suppliers.find(x => x.id === id)
        setSuppliers(prev => prev.filter(x => x.id !== id))
        setEditing(null)
        showToast(`${s?.name} supprimé`)
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 flex items-center gap-3">
                    <Truck size={20} className="text-sp flex-shrink-0" />
                    <div>
                        <p className="text-2xl font-bold text-white">{suppliers.length}</p>
                        <p className="text-xs text-slate-400">Fournisseurs</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <Star size={20} className="text-amber-400 flex-shrink-0" />
                    <div>
                        <p className="text-2xl font-bold text-white">{avgRating}</p>
                        <p className="text-xs text-slate-400">Note moyenne</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-2xl font-bold text-white">{suppliers.filter(s => s.contractRef).length}</p>
                        <p className="text-xs text-slate-400">Sous contrat</p>
                    </div>
                </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all shadow-glow-cyan flex-shrink-0">
                    <Plus size={15} /> Ajouter un fournisseur
                </button>
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-navy-800 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                {/* Category pills */}
                <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setCatFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${catFilter==='all'?'bg-sp/15 border-sp/30 text-sp':'bg-navy-800 border-white/8 text-slate-400 hover:border-sp/20'}`}>
                        Tous
                    </button>
                    {SUPPLIER_CATS.map(c => (
                        <button key={c.key} onClick={() => setCatFilter(c.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${catFilter===c.key?c.color:'bg-navy-800 border-white/8 text-slate-400 hover:border-white/20'}`}>
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <Truck size={36} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucun fournisseur{catFilter !== 'all' ? ' dans cette catégorie' : ''}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {filtered.map(s => {
                        const ci = catInfo(s.category)
                        return (
                            <div key={s.id} className="glass-card p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ci.color}`}>{ci.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StarRating value={s.rating ?? 0} />
                                        <button onClick={() => setEditing(s)}
                                            className="p-1.5 rounded-lg hover:bg-navy-600 text-slate-500 hover:text-slate-200 transition-colors">
                                            <Pencil size={13} />
                                        </button>
                                    </div>
                                </div>
                                <p className="font-bold text-white text-base">{s.name}</p>
                                <div className="space-y-1.5 text-xs text-slate-400">
                                    {s.phone && <p className="flex items-center gap-2"><Phone size={11} className="flex-shrink-0" />{s.phone}</p>}
                                    {s.email && <p className="flex items-center gap-2"><Mail size={11} className="flex-shrink-0" />{s.email}</p>}
                                    {(s.contractRef || s.since) && (
                                        <p className="flex items-center gap-2">
                                            <FileText size={11} className="flex-shrink-0" />
                                            {s.contractRef ? `Réf: ${s.contractRef}` : ''}
                                            {s.contractRef && s.since ? ' · ' : ''}
                                            {s.since ? `Depuis ${s.since.slice(0,7).replace('-','/')}` : ''}
                                        </p>
                                    )}
                                </div>
                                {s.notes && (
                                    <p className="text-[11px] text-slate-500 bg-navy-700/50 rounded-lg px-3 py-2 border border-white/5 line-clamp-2">{s.notes}</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <AnimatePresence>
                {showAdd  && <AddSupplierModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
                {editing  && <EditSupplierModal supplier={editing} onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} />}
            </AnimatePresence>
        </div>
    )
}

/* ── Supplier modals ───────────────────────────────────────────────────────── */
function SupplierForm({ form, set }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom *</label>
                    <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="Ex: TechLift Maroc"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Catégorie</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors">
                        {SUPPLIER_CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Note</label>
                    <StarRating value={form.rating} onChange={v => set('rating', v)} size={20} />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone</label>
                    <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="+212 6XX XXX XXX"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        placeholder="contact@fournisseur.ma"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Réf. contrat</label>
                    <input type="text" value={form.contractRef} onChange={e => set('contractRef', e.target.value)}
                        placeholder="CTR-2025-XXX"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Depuis</label>
                    <input type="month" value={form.since} onChange={e => set('since', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Conditions, historique, remarques..." rows={3}
                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
            </div>
        </div>
    )
}

function AddSupplierModal({ onClose, onAdd }) {
    const EMPTY = { name: '', category: 'autre', phone: '', email: '', contractRef: '', since: '', rating: 0, notes: '' }
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)
    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.name.trim()) return
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onAdd({ ...form })
        setSaving(false)
        onClose()
    }

    return (
        <Modal title="Nouveau fournisseur" onClose={onClose} width="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <SupplierForm form={form} set={set} />
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">Annuler</button>
                    <button type="submit" disabled={saving || !form.name.trim()}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Check size={14}/> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

function EditSupplierModal({ supplier, onClose, onSave, onDelete }) {
    const [form, setForm]           = useState({ ...supplier })
    const [confirmDelete, setCD]    = useState(false)
    const [confirmSave,   setCS]    = useState(false)
    const [saving, setSaving]       = useState(false)
    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setCS(false) }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onSave({ ...form })
    }

    return (
        <Modal title="Modifier le fournisseur" subtitle={supplier.name} onClose={onClose} width="max-w-2xl">
            <div className="space-y-4">
                <SupplierForm form={form} set={set} />
                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">Annuler</button>
                        <button type="button" onClick={() => setCS(true)} disabled={!form.name.trim()}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            <Check size={14}/> Enregistrer
                        </button>
                    </div>
                ) : (
                    <div className="bg-sp/8 border border-sp/25 rounded-xl p-3.5">
                        <p className="text-xs text-slate-300 text-center mb-3">Confirmer les modifications ?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCS(false)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">Revenir</button>
                            <button onClick={doSave} disabled={saving}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-sp/20 text-sp border border-sp/30 hover:bg-sp/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={12}/> Confirmer</>}
                            </button>
                        </div>
                    </div>
                )}
                {!confirmDelete ? (
                    <button type="button" onClick={() => setCD(true)} className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">Supprimer ce fournisseur</button>
                ) : (
                    <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-3.5">
                        <p className="text-xs text-red-300 text-center mb-3">Supprimer <span className="font-semibold text-white">{supplier.name}</span> définitivement ?</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCD(false)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">Annuler</button>
                            <button onClick={() => onDelete(supplier.id)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">Supprimer</button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   RESIDENTS PAGE
══════════════════════════════════════════ */
const RESIDENTS_PAGE_SIZE = 15

function getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = [1]
    if (current > 3) pages.push('...')
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
    if (current < total - 2) pages.push('...')
    pages.push(total)
    return pages
}

function ResidentsPage({ building, data, residents, setResidents, showToast }) {
    const [search,           setSearch]          = useState('')
    const [filter,           setFilter]          = useState('all')
    const [page,             setPage]            = useState(1)
    const [showAddResident,  setShowAddResident] = useState(false)
    const [showImportCSV,    setShowImportCSV]   = useState(false)
    const [showGroupWA,      setShowGroupWA]     = useState(false)
    const [editingResident,  setEditingResident] = useState(null)

    function handleEditResident(updated) {
        setResidents(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
        setEditingResident(null)
        showToast(`${updated.name} — modifications enregistrées`)
    }

    function handleDeleteResident(id) {
        const r = residents.find(x => x.id === id)
        setResidents(prev => prev.filter(x => x.id !== id))
        setEditingResident(null)
        showToast(`${r?.name} supprimé(e)`)
    }

    const filtered = residents.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                            r.unit.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || computeStatus(r.paidThrough) === filter
        return matchSearch && matchFilter
    })

    // Reset to page 1 whenever filter or search changes
    useEffect(() => { setPage(1) }, [search, filter])

    const totalPages = Math.ceil(filtered.length / RESIDENTS_PAGE_SIZE)
    const paginated  = filtered.slice((page - 1) * RESIDENTS_PAGE_SIZE, page * RESIDENTS_PAGE_SIZE)

    const counts = {
        all:     residents.length,
        paid:    residents.filter(r => computeStatus(r.paidThrough) === 'paid').length,
        pending: residents.filter(r => computeStatus(r.paidThrough) === 'pending').length,
        overdue: residents.filter(r => computeStatus(r.paidThrough) === 'overdue').length,
    }

    const filterLabels = { all: 'Tous', paid: 'Payés', pending: 'En attente', overdue: 'En retard' }

    function handleAddResident(r) {
        setResidents(prev => [r, ...prev])
        showToast(`${r.name} ajouté(e) — invitation WhatsApp envoyée`)
        setTimeout(() => setResidents(prev => prev.map(x => x.id === r.id ? { ...x, isNew: false } : x)), 5000)
    }

    function handleImport(newResidents) {
        setResidents(prev => [...prev, ...newResidents])
        showToast(`${newResidents.length} résidents importés avec succès`)
        const ids = new Set(newResidents.map(r => r.id))
        setTimeout(() => setResidents(prev => prev.map(x => ids.has(x.id) ? { ...x, isNew: false } : x)), 5000)
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Unités totales', value: building.total_units, color: 'text-slate-300'  },
                    { label: 'Payés',          value: counts.paid,          color: 'text-emerald-400' },
                    { label: 'En attente',     value: counts.pending,       color: 'text-amber-400'  },
                    { label: 'En retard',      value: counts.overdue,       color: 'text-red-400'    },
                ].map(s => (
                    <div key={s.label} className="glass-card p-4 flex items-center gap-3">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <p className="text-sm text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Action bar + Search + Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <button
                    onClick={() => setShowAddResident(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all shadow-glow-cyan flex-shrink-0"
                >
                    <Plus size={15} /> Ajouter un résident
                </button>
                <button
                    onClick={() => setShowImportCSV(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-navy-700 hover:bg-navy-600 text-slate-200 rounded-xl text-sm font-semibold transition-all border border-white/8 flex-shrink-0"
                >
                    <Upload size={15} /> Importer CSV / Excel
                </button>
                {counts.overdue > 0 && (
                    <button
                        onClick={() => setShowGroupWA(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-all border border-emerald-500/20 flex-shrink-0"
                    >
                        <MessageCircle size={15} /> Rappel groupé ({counts.overdue} en retard)
                    </button>
                )}
                <div className="flex-1 relative min-w-[200px]">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher un résident ou une unité..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-navy-800 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    {Object.entries(filterLabels).map(([f, label]) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                filter === f
                                    ? 'bg-sp text-navy-900'
                                    : 'bg-navy-800 text-slate-400 border border-white/8 hover:border-sp/30'
                            }`}
                        >
                            {label} {f !== 'all' && `(${counts[f]})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                            {['Unité', 'Résident', 'Téléphone', 'Étage', 'Depuis', 'Statut', 'Actions'].map(h => (
                                <th key={h} className="text-left px-6 py-4 font-semibold">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                        {paginated.map(r => (
                            <motion.tr
                                key={r.id}
                                initial={r.isNew ? { opacity: 0, backgroundColor: 'rgba(6,182,212,0.08)' } : false}
                                animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                                transition={{ duration: 0.5 }}
                                className="hover:bg-navy-700/40 transition-colors group"
                            >
                                <td className="px-6 py-3.5 font-mono text-xs text-sp font-semibold">{r.unit}</td>
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=111d35&color=06b6d4&size=28`}
                                             alt="" className="w-7 h-7 rounded-lg flex-shrink-0" />
                                        <div>
                                            <span className="text-slate-200 font-medium">{r.name}</span>
                                            {r.isNew && (
                                                <span className="ml-2 text-[9px] font-bold bg-sp/15 text-sp border border-sp/20 px-1.5 py-0.5 rounded-full">NOUVEAU</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">{r.phone}</td>
                                <td className="px-6 py-3.5 text-slate-400">Ét. {r.floor}</td>
                                <td className="px-6 py-3.5 text-slate-400">{r.since}</td>
                                <td className="px-6 py-3.5">
                                    {(() => {
                                        const st = computeStatus(r.paidThrough)
                                        return (
                                            <div className="space-y-1">
                                                <span className={`inline-block text-xs font-semibold rounded-lg px-2.5 py-1 border ${
                                                    st === 'paid'    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    st === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                       'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                    {st === 'paid' ? '✓ Payé' : st === 'pending' ? '⏳ En attente' : '⚠ En retard'}
                                                </span>
                                                <p className="text-[10px] text-slate-500">
                                                    jusqu'à {formatMonth(r.paidThrough)}
                                                </p>
                                            </div>
                                        )
                                    })()}
                                </td>
                                <td className="px-6 py-3.5">
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ActionBtn
                                            color="green"
                                            icon={<MessageCircle size={12} />}
                                            title={computeStatus(r.paidThrough) === 'overdue'
                                                ? 'Envoyer un rappel de paiement WhatsApp'
                                                : 'Ouvrir une conversation WhatsApp'}
                                            onClick={() => openWhatsApp(r.phone, r.name, r.unit, building.name, computeStatus(r.paidThrough), r.paidThrough)}
                                        />
                                        <ActionBtn icon={<Phone size={12} />} title="Appeler le résident" onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} />
                                        <ActionBtn icon={<Mail size={12} />} title="Envoyer un e-mail" onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} />
                                        <ActionBtn icon={<Pencil size={12} />} title="Modifier le résident" onClick={() => setEditingResident(r)} />
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <Users size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun résident trouvé</p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                        <p className="text-xs text-slate-500">
                            {(page - 1) * RESIDENTS_PAGE_SIZE + 1}–{Math.min(page * RESIDENTS_PAGE_SIZE, filtered.length)} sur {filtered.length} résidents
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-navy-700 text-slate-400 hover:text-slate-200 hover:bg-navy-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/8"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {getPageNumbers(page, totalPages).map((p, i) => (
                                p === '...'
                                    ? <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-500 text-xs select-none">…</span>
                                    : <button key={p} onClick={() => setPage(p)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                                            p === page ? 'bg-sp text-navy-900' : 'bg-navy-700 text-slate-400 hover:text-slate-200 hover:bg-navy-600 border border-white/8'
                                        }`}>{p}</button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-navy-700 text-slate-400 hover:text-slate-200 hover:bg-navy-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/8"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showAddResident && (
                    <AddResidentModal onClose={() => setShowAddResident(false)} onAdd={handleAddResident} />
                )}
                {showImportCSV && (
                    <ImportCSVModal onClose={() => setShowImportCSV(false)} onImport={handleImport} />
                )}
                {showGroupWA && (
                    <WhatsAppGroupModal
                        overdueResidents={residents.filter(r => computeStatus(r.paidThrough) === 'overdue')}
                        building={building}
                        onClose={() => setShowGroupWA(false)}
                    />
                )}
                {editingResident && (
                    <EditResidentModal
                        resident={editingResident}
                        onSave={handleEditResident}
                        onDelete={handleDeleteResident}
                        onClose={() => setEditingResident(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   DISPUTES PAGE
══════════════════════════════════════════ */
function DisputesPage({ building, data, disputes, setDisputes, showToast }) {
    const STATUS_INFO = {
        open:      { label: 'Ouvert',    cls: 'bg-red-500/15 text-red-400 border-red-500/20',              btnCls: 'border-red-500/40 text-red-400 bg-red-500/10'             },
        mediation: { label: 'Médiation', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20',        btnCls: 'border-amber-500/40 text-amber-400 bg-amber-500/10'       },
        resolved:  { label: 'Résolu',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',  btnCls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
        closed:    { label: 'Clôturé',   cls: 'bg-slate-500/15 text-slate-400 border-slate-500/20',        btnCls: 'border-slate-500/40 text-slate-400 bg-slate-500/10'       },
    }
    const priorityColor = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-slate-400' }
    const priorityLabel = { high: 'ÉLEVÉ', medium: 'MOYEN', low: 'FAIBLE' }

    const [filter,          setFilter]          = useState('all')
    const [showAdd,         setShowAdd]         = useState(false)
    const [editingDispute,  setEditingDispute]  = useState(null)

    const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

    function handleAdd(d) {
        const prefix = building.id === 'bld-1' ? 'DSP' : building.id === 'bld-2' ? 'DSP-A' : 'DSP-J'
        const newId = `${prefix}-${String(disputes.length + 1).padStart(3, '0')}`
        const now = new Date()
        const dateStr = `${now.getDate()} ${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`
        setDisputes(prev => [{
            ...d, id: newId, date: dateStr,
            ai_suggestion: 'Nouveau litige enregistré. Analyse IA en cours selon la Loi 18-00.',
        }, ...prev])
        showToast(`Litige "${d.title}" créé`)
    }

    function handleSaveEdit(d) {
        setDisputes(prev => prev.map(x => x.id === d.id ? d : x))
        showToast('Litige mis à jour')
        setEditingDispute(null)
    }

    function handleDelete(id) {
        setDisputes(prev => prev.filter(x => x.id !== id))
        showToast('Litige supprimé', 'error')
        setEditingDispute(null)
    }

    const FILTER_TABS = [
        { key: 'all',       label: 'Tous' },
        { key: 'open',      label: 'Ouvert' },
        { key: 'mediation', label: 'Médiation' },
        { key: 'resolved',  label: 'Résolu' },
        { key: 'closed',    label: 'Clôturé' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">Litiges</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{building.name} · {building.city} — {disputes.length} litige{disputes.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-sp/10 hover:bg-sp/20 text-sp border border-sp/25 rounded-xl px-4 py-2 text-sm font-semibold transition-all">
                    <Plus size={15} /> Nouveau litige
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {['open', 'mediation', 'resolved', 'closed'].map(s => (
                    <div key={s} className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-white/10 transition-colors" onClick={() => setFilter(s)}>
                        <div className={`text-2xl font-bold ${STATUS_INFO[s].cls.split(' ').find(c => c.startsWith('text-'))}`}>
                            {disputes.filter(d => d.status === s).length}
                        </div>
                        <p className="text-xs font-medium text-slate-300">{STATUS_INFO[s].label}</p>
                    </div>
                ))}
            </div>

            {/* AI Banner */}
            <div className="glass-card p-5 flex items-center gap-4 border-sp/15"
                 style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.06), transparent)' }}>
                <div className="w-10 h-10 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center flex-shrink-0">
                    <Activity size={20} className="text-sp" />
                </div>
                <div>
                    <p className="text-sm font-bold text-white">Médiation IA — Active</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        SyndicPulse analyse les litiges selon la Loi 18-00 et génère des scripts de médiation en Darija et Français.
                    </p>
                </div>
                <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)} className="ml-auto text-xs bg-sp/10 text-sp border border-sp/20 px-4 py-2 rounded-lg hover:bg-sp/20 transition-colors flex-shrink-0">
                    Voir les logs IA
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
                {FILTER_TABS.map(t => (
                    <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            filter === t.key
                                ? 'bg-sp/15 text-sp border-sp/30'
                                : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/15'
                        }`}>
                        {t.label}
                        {t.key !== 'all' && (
                            <span className="ml-1.5 opacity-60">{disputes.filter(d => d.status === t.key).length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Disputes list */}
            <div className="space-y-4">
                {filtered.length === 0 && (
                    <div className="glass-card p-10 text-center text-slate-500 text-sm">Aucun litige pour ce filtre.</div>
                )}
                {filtered.map(d => (
                    <div key={d.id} className={`glass-card p-6 transition-opacity ${d.status === 'closed' ? 'opacity-55' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-[11px] text-slate-500 bg-navy-700 px-2 py-0.5 rounded">{d.id}</span>
                                <h3 className="font-semibold text-white">{d.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityColor[d.priority]}`}>
                                    {priorityLabel[d.priority]}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${STATUS_INFO[d.status]?.cls ?? STATUS_INFO.closed.cls}`}>
                                    {STATUS_INFO[d.status]?.label ?? 'Clôturé'}
                                </span>
                                <button onClick={() => setEditingDispute(d)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-navy-700 transition-colors ml-1">
                                    <Pencil size={13} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {d.parties.map(p => (
                                <span key={p} className="text-xs bg-navy-700 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5">{p}</span>
                            ))}
                        </div>

                        {d.notes && (
                            <div className="bg-navy-700/60 rounded-xl p-3 border border-white/5 mb-4">
                                <p className="text-xs text-slate-400 leading-relaxed">{d.notes}</p>
                            </div>
                        )}

                        <div className="bg-navy-700/60 rounded-xl p-4 border border-sp/8">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={12} className="text-sp" />
                                <span className="text-[10px] font-bold text-sp uppercase tracking-wider">Suggestion IA</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{d.ai_suggestion}</p>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Clock size={11} /> {d.date}
                                </span>
                                {d.attachments?.length > 0 && (
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Paperclip size={11} /> {d.attachments.length}
                                    </span>
                                )}
                            </div>
                            {d.status !== 'closed' && (
                                <div className="flex gap-2">
                                    {d.status !== 'resolved' && (
                                        <button onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)}
                                            className="text-xs bg-sp/10 text-sp border border-sp/20 px-3 py-1.5 rounded-lg hover:bg-sp/20 transition-colors flex items-center gap-1">
                                            <Mic size={11} /> Médiation IA
                                        </button>
                                    )}
                                    <button onClick={() => setEditingDispute(d)}
                                        className="text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors">
                                        Modifier
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {showAdd && (
                    <AddDisputeModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />
                )}
                {editingDispute && (
                    <EditDisputeModal
                        dispute={editingDispute}
                        onClose={() => setEditingDispute(null)}
                        onSave={handleSaveEdit}
                        onDelete={handleDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   ADD DISPUTE MODAL
══════════════════════════════════════════ */
const DISPUTE_PRIORITY_BTNS = [
    { key: 'high',   label: 'ÉLEVÉ',  cls: 'border-red-500/40 text-red-400 bg-red-500/10'     },
    { key: 'medium', label: 'MOYEN',  cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { key: 'low',    label: 'FAIBLE', cls: 'border-slate-500/40 text-slate-400 bg-slate-500/10' },
]

/* ── Pièces jointes — shared by Add/Edit dispute modals ─────────── */
function AttachmentsField({ attachments, setAttachments }) {
    const [fileError, setFileError] = useState('')
    const inputRef = useRef(null)
    const MAX_FILES = 5
    const MAX_SIZE  = 5 * 1024 * 1024 // 5 MB

    function handleFiles(e) {
        setFileError('')
        const files = Array.from(e.target.files ?? [])
        if (attachments.length + files.length > MAX_FILES) {
            setFileError(`Maximum ${MAX_FILES} fichiers autorisés`)
            e.target.value = ''
            return
        }
        const oversized = files.filter(f => f.size > MAX_SIZE)
        if (oversized.length) {
            setFileError('Fichier trop volumineux (max 5 Mo par fichier)')
            e.target.value = ''
            return
        }
        files.forEach(file => {
            const reader = new FileReader()
            reader.onload = ev => {
                setAttachments(prev => [
                    ...prev,
                    { id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, type: file.type, dataUrl: ev.target.result, size: file.size },
                ])
            }
            reader.readAsDataURL(file)
        })
        e.target.value = ''
    }

    function remove(id) {
        setAttachments(prev => prev.filter(a => a.id !== id))
        setFileError('')
    }

    return (
        <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Pièces jointes</label>
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map(a => (
                        <div key={a.id} className="relative group flex flex-col items-center">
                            {a.type.startsWith('image/') ? (
                                <img src={a.dataUrl} alt={a.name} className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                            ) : (
                                <div className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border border-white/10 bg-navy-700 gap-1">
                                    <FileText size={20} className="text-slate-400" />
                                    <span className="text-[9px] text-slate-500 uppercase">{a.name.split('.').pop()}</span>
                                </div>
                            )}
                            <button type="button" onClick={() => remove(a.id)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={9} className="text-white" />
                            </button>
                            <p className="text-[9px] text-slate-500 mt-0.5 w-16 truncate text-center">{a.name}</p>
                        </div>
                    ))}
                </div>
            )}
            {fileError && <p className="text-[11px] text-red-400 mb-2">{fileError}</p>}
            {attachments.length < MAX_FILES && (
                <>
                    <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFiles} className="hidden" />
                    <button type="button" onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs text-slate-400 border border-dashed border-white/15 rounded-lg px-3 py-2 hover:border-sp/40 hover:text-sp transition-colors">
                        <Paperclip size={12} /> Ajouter un fichier
                    </button>
                </>
            )}
        </div>
    )
}

function AddDisputeModal({ onClose, onAdd }) {
    const [form, setForm]         = useState({ title: '', parties: ['', ''], priority: 'medium', notes: '' })
    const [errors, setErrors]     = useState({})
    const [saving, setSaving]     = useState(false)
    const [attachments, setAttachments] = useState([])

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
    function setParty(i, v) { setForm(f => { const p = [...f.parties]; p[i] = v; return { ...f, parties: p } }) }
    function addParty()      { setForm(f => ({ ...f, parties: [...f.parties, ''] })) }
    function removeParty(i)  { setForm(f => ({ ...f, parties: f.parties.filter((_, j) => j !== i) })) }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.title.trim()) errs.title = 'Titre requis'
        if (form.parties.filter(p => p.trim()).length === 0) errs.parties = 'Au moins une partie requise'
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 700))
        onAdd({ title: form.title.trim(), parties: form.parties.filter(p => p.trim()), priority: form.priority, notes: form.notes.trim(), status: 'open', attachments })
        setSaving(false)
        onClose()
    }

    return (
        <Modal title="Nouveau litige" subtitle="Enregistrer un nouveau litige" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre *</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        placeholder="Ex: Nuisances sonores — Apt 4A vs 4B"
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                    {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Parties impliquées</label>
                    <div className="space-y-2">
                        {form.parties.map((p, i) => (
                            <div key={i} className="flex gap-2">
                                <input type="text" value={p} onChange={e => setParty(i, e.target.value)}
                                    placeholder={`Partie ${i + 1} (ex: Ahmed Tazi, Apt 4A)`}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.parties.length > 1 && (
                                    <button type="button" onClick={() => removeParty(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.parties.length < 4 && (
                            <button type="button" onClick={addParty}
                                className="text-xs text-sp hover:text-sp/80 flex items-center gap-1 transition-colors">
                                <Plus size={12} /> Ajouter une partie
                            </button>
                        )}
                    </div>
                    {errors.parties && <p className="text-[11px] text-red-400 mt-1">{errors.parties}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
                    <div className="flex gap-2">
                        {DISPUTE_PRIORITY_BTNS.map(b => (
                            <button type="button" key={b.key} onClick={() => set('priority', b.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    form.priority === b.key ? b.cls : 'bg-navy-700 border-white/8 text-slate-500 hover:border-white/15'
                                }`}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes internes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                        placeholder="Contexte, preuves, détails supplémentaires..." rows={3}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
                </div>

                <AttachmentsField attachments={attachments} setAttachments={setAttachments} />

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Check size={15} /> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   EDIT DISPUTE MODAL
══════════════════════════════════════════ */
function EditDisputeModal({ dispute, onClose, onSave, onDelete }) {
    const EDIT_STATUS_INFO = {
        open:      { label: 'Ouvert',    cls: 'border-red-500/40 text-red-400 bg-red-500/10'             },
        mediation: { label: 'Médiation', cls: 'border-amber-500/40 text-amber-400 bg-amber-500/10'       },
        resolved:  { label: 'Résolu',    cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
        closed:    { label: 'Clôturé',   cls: 'border-slate-500/40 text-slate-400 bg-slate-500/10'       },
    }
    const [form, setForm]         = useState({
        title:    dispute.title,
        parties:  [...dispute.parties],
        priority: dispute.priority,
        status:   dispute.status,
        notes:    dispute.notes ?? '',
    })
    const [attachments, setAttachments]     = useState(dispute.attachments ?? [])
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmSave,   setConfirmSave]   = useState(false)
    const [saving, setSaving]               = useState(false)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setConfirmSave(false) }
    function setParty(i, v) { setForm(f => { const p = [...f.parties]; p[i] = v; return { ...f, parties: p } }); setConfirmSave(false) }
    function addParty()      { setForm(f => ({ ...f, parties: [...f.parties, ''] })); setConfirmSave(false) }
    function removeParty(i)  { setForm(f => ({ ...f, parties: f.parties.filter((_, j) => j !== i) })); setConfirmSave(false) }

    function handleSubmit(e) {
        e.preventDefault()
        if (!form.title.trim()) return
        setConfirmSave(true)
    }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onSave({ ...dispute, ...form, parties: form.parties.filter(p => p.trim()), attachments })
    }

    return (
        <Modal title="Modifier le litige" subtitle={`Réf. ${dispute.id}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre *</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Parties impliquées</label>
                    <div className="space-y-2">
                        {form.parties.map((p, i) => (
                            <div key={i} className="flex gap-2">
                                <input type="text" value={p} onChange={e => setParty(i, e.target.value)}
                                    placeholder={`Partie ${i + 1}`}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.parties.length > 1 && (
                                    <button type="button" onClick={() => removeParty(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.parties.length < 4 && (
                            <button type="button" onClick={addParty}
                                className="text-xs text-sp hover:text-sp/80 flex items-center gap-1 transition-colors">
                                <Plus size={12} /> Ajouter une partie
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
                    <div className="flex gap-2">
                        {DISPUTE_PRIORITY_BTNS.map(b => (
                            <button type="button" key={b.key} onClick={() => set('priority', b.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    form.priority === b.key ? b.cls : 'bg-navy-700 border-white/8 text-slate-500 hover:border-white/15'
                                }`}>
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(EDIT_STATUS_INFO).map(([key, info]) => (
                            <button type="button" key={key} onClick={() => set('status', key)}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                    form.status === key ? info.cls : 'bg-navy-700 border-white/8 text-slate-500 hover:border-white/15'
                                }`}>
                                {info.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes internes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                        placeholder="Contexte, preuves, détails supplémentaires..." rows={3}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
                </div>

                <AttachmentsField attachments={attachments} setAttachments={setAttachments} />

                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Annuler
                        </button>
                        <button type="submit"
                            className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            <Check size={15} /> Enregistrer
                        </button>
                    </div>
                ) : (
                    <div className="bg-sp/8 border border-sp/25 rounded-xl p-3.5">
                        <p className="text-xs text-slate-300 text-center mb-3">
                            Confirmer les modifications pour <span className="text-white font-semibold">"{form.title}"</span> ?
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmSave(false)}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                Revenir
                            </button>
                            <button type="button" onClick={doSave} disabled={saving}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-sp/20 text-sp border border-sp/30 hover:bg-sp/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={12} /> Oui, enregistrer</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete zone */}
                <div className="border-t border-white/5 pt-3">
                    {!confirmDelete ? (
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            className="w-full py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5">
                            <Trash2 size={12} /> Supprimer ce litige
                        </button>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <p className="text-xs text-red-300 text-center mb-3">Supprimer définitivement ce litige ?</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                    Revenir
                                </button>
                                <button type="button" onClick={() => onDelete(dispute.id)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                                    Oui, supprimer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   PLANNING PAGE
══════════════════════════════════════════ */
const CATEGORY_META = {
    espaces_verts: { icon: Leaf,        label: 'Espaces verts', color: 'text-emerald-400' },
    electricite:   { icon: Zap,         label: 'Électricité',   color: 'text-yellow-400'  },
    plomberie:     { icon: Activity,    label: 'Plomberie',     color: 'text-blue-400'    },
    nettoyage:     { icon: CheckCircle2,label: 'Nettoyage',     color: 'text-cyan-400'    },
    securite:      { icon: ShieldCheck, label: 'Sécurité',      color: 'text-violet-400'  },
    ascenseur:     { icon: Wrench,      label: 'Ascenseur',     color: 'text-orange-400'  },
    peinture:      { icon: Wrench,      label: 'Peinture',      color: 'text-pink-400'    },
}

/* Pure display card — used both in kanban and in DragOverlay */
function TicketCard({ t, ghost = false, onEdit }) {
    const cat = CATEGORY_META[t.category] ?? CATEGORY_META.plomberie
    const CatIcon = cat.icon
    return (
        <div className={`glass-card p-4 border-l-4 select-none ${
            t.status === 'in_progress' ? 'border-l-sp' :
            t.status === 'scheduled'   ? 'border-l-amber-400' :
                                         'border-l-emerald-500'
        } ${ghost ? 'opacity-30' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                    <CatIcon size={13} className={cat.color} />
                    <span className="text-[10px] text-slate-500 font-medium">{cat.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {t.priority === 'urgent'
                        ? <span className="text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full flex-shrink-0">URGENT</span>
                        : <span className="text-[9px] font-semibold bg-slate-700/60 text-slate-400 border border-white/8 px-1.5 py-0.5 rounded-full flex-shrink-0">NORMAL</span>
                    }
                    {onEdit && (
                        <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); onEdit(t) }}
                            className="p-0.5 rounded text-slate-600 hover:text-slate-300 hover:bg-navy-600 transition-colors flex-shrink-0"
                        >
                            <Pencil size={11} />
                        </button>
                    )}
                </div>
            </div>
            <p className={`text-sm font-semibold mb-2 leading-snug ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                {t.title}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Activity size={11} />
                <span className="truncate">{t.agent}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={11} />
                <span>{t.time}</span>
            </div>
        </div>
    )
}

/* Draggable wrapper around TicketCard */
function DraggableTicketCard({ t, onEdit }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id })
    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{
                transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 999 : 'auto',
                touchAction: 'none',
            }}
        >
            <TicketCard t={t} ghost={isDragging} onEdit={onEdit} />
        </div>
    )
}

/* Droppable kanban column */
function KanbanColumn({ status, label, dot, count, children }) {
    const { setNodeRef, isOver } = useDroppable({ id: status })
    const badgeCls =
        status === 'in_progress' ? 'bg-sp/15 text-sp' :
        status === 'scheduled'   ? 'bg-amber-400/15 text-amber-400' :
                                    'bg-emerald-500/15 text-emerald-400'
    const borderCls =
        status === 'in_progress' ? 'border-b-sp/50' :
        status === 'scheduled'   ? 'border-b-amber-400/50' :
                                    'border-b-emerald-500/50'
    return (
        <div>
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderCls}`}>
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{count}</span>
            </div>
            <div
                ref={setNodeRef}
                className={`min-h-[100px] space-y-3 rounded-xl p-1 transition-all duration-150 ${
                    isOver ? 'bg-white/[0.04] ring-1 ring-white/10 scale-[1.01]' : ''
                }`}
            >
                {children}
                {count === 0 && !isOver && (
                    <p className="text-xs text-slate-700 text-center py-8">Glissez une tâche ici</p>
                )}
            </div>
        </div>
    )
}

/* Edit ticket modal */
function EditTicketModal({ ticket, onSave, onClose }) {
    const [form, setForm] = useState({
        title:    ticket.title,
        agent:    ticket.agent,
        time:     ticket.time,
        date:     ticket.date ?? '',
        category: ticket.category,
        priority: ticket.priority,
    })
    function set(field, val) { setForm(prev => ({ ...prev, [field]: val })) }
    const categories = Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k, label: v.label }))
    return (
        <Modal title="Modifier la tâche" subtitle={form.title} onClose={onClose}>
            <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Titre</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Prestataire</label>
                    <input type="text" value={form.agent} onChange={e => set('agent', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Heure</label>
                        <input type="text" placeholder="ex: Lun. 10:00" value={form.time} onChange={e => set('time', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Catégorie</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors">
                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-2 font-medium">Priorité</label>
                    <div className="flex gap-2">
                        <button onClick={() => set('priority', 'normal')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                                form.priority !== 'urgent'
                                    ? 'bg-slate-700/60 text-slate-200 border-white/15'
                                    : 'bg-navy-700 text-slate-500 border-white/8 hover:border-white/20'
                            }`}>Normal</button>
                        <button onClick={() => set('priority', 'urgent')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                                form.priority === 'urgent'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                    : 'bg-navy-700 text-slate-500 border-white/8 hover:border-red-500/30 hover:text-red-400'
                            }`}>URGENT</button>
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-navy-700 text-slate-300 border border-white/10 hover:bg-navy-600 transition-colors">
                        Annuler
                    </button>
                    <button onClick={() => onSave(form)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-sp hover:bg-sp-dark text-navy-900 transition-all shadow-glow-cyan">
                        Enregistrer
                    </button>
                </div>
            </div>
        </Modal>
    )
}

function PlanningPage({ building, data, showToast }) {
    const [tickets,       setTickets]       = useState(data.tickets)
    const [filter,        setFilter]        = useState('all')
    const [search,        setSearch]        = useState('')
    const [activeId,      setActiveId]      = useState(null)
    const [editingTicket, setEditingTicket] = useState(null)

    function handleSaveEdit(form) {
        setTickets(prev => prev.map(t => t.id === editingTicket.id ? { ...t, ...form } : t))
        setEditingTicket(null)
        showToast('Tâche mise à jour')
    }

    const activeTicket = activeId ? tickets.find(t => t.id === activeId) : null

    const counts = {
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        scheduled:   tickets.filter(t => t.status === 'scheduled').length,
        done:        tickets.filter(t => t.status === 'done').length,
    }

    const filterLabels = { all: 'Tous', in_progress: 'En cours', scheduled: 'Planifié', done: 'Terminé' }

    const columns = [
        { status: 'in_progress', label: 'En cours', dot: 'bg-sp'          },
        { status: 'scheduled',   label: 'Planifié',  dot: 'bg-amber-400'   },
        { status: 'done',        label: 'Terminé',   dot: 'bg-emerald-500' },
    ]

    function handleDragStart({ active }) {
        setActiveId(active.id)
    }

    function handleDragEnd({ active, over }) {
        setActiveId(null)
        if (!over || active.id === over.id) return
        const newStatus = over.id
        if (!['in_progress', 'scheduled', 'done'].includes(newStatus)) return
        setTickets(prev => prev.map(t => t.id === active.id ? { ...t, status: newStatus } : t))
    }

    function handleDragCancel() { setActiveId(null) }

    const filtered = tickets.filter(t => {
        const q = search.toLowerCase()
        return (t.title.toLowerCase().includes(q) || t.agent.toLowerCase().includes(q)) &&
               (filter === 'all' || t.status === filter)
    })

    const showKanban = filter === 'all' && !search

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Planning maintenance</h2>
                    <p className="text-slate-400 mt-0.5 text-sm">
                        <span className="font-semibold" style={{ color: building.color }}>{building.name} · {building.city}</span>
                        {' '}— {tickets.length} tâches au total
                    </p>
                </div>
                <button
                    onClick={() => showToast('Fonctionnalité disponible prochainement', 'success', 1500)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all shadow-glow-cyan"
                >
                    <Plus size={15} /> Nouvelle tâche
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'En cours', value: counts.in_progress, color: 'text-sp',          border: 'border-sp/20'          },
                    { label: 'Planifié', value: counts.scheduled,   color: 'text-amber-400',   border: 'border-amber-400/20'   },
                    { label: 'Terminé',  value: counts.done,        color: 'text-emerald-400', border: 'border-emerald-400/20' },
                ].map(s => (
                    <div key={s.label} className={`glass-card p-5 border ${s.border}`}>
                        <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                        <p className="text-sm text-slate-400 font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filter bar + Search */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-2">
                    {Object.entries(filterLabels).map(([f, label]) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                filter === f ? 'bg-sp text-navy-900' : 'bg-navy-800 text-slate-400 border border-white/8 hover:border-sp/30'
                            }`}
                        >
                            {label}{f !== 'all' && ` (${counts[f] ?? 0})`}
                        </button>
                    ))}
                </div>
                <div className="flex-1 relative min-w-[200px]">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Rechercher une tâche ou un prestataire..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-navy-800 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>
                {showKanban && (
                    <p className="text-[11px] text-slate-600 flex-shrink-0">Glisser-déposer pour changer le statut</p>
                )}
            </div>

            {/* Kanban with DnD */}
            {showKanban ? (
                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                    <div className="grid grid-cols-3 gap-5">
                        {columns.map(col => (
                            <KanbanColumn key={col.status} {...col} count={counts[col.status]}>
                                {tickets.filter(t => t.status === col.status).map(t => (
                                    <DraggableTicketCard key={t.id} t={t} onEdit={setEditingTicket} />
                                ))}
                            </KanbanColumn>
                        ))}
                    </div>
                    <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
                        {activeTicket && (
                            <div className="rotate-2 scale-105 shadow-2xl opacity-95">
                                <TicketCard t={activeTicket} />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            ) : (
                /* List view when filtered or searching */
                <div className="space-y-3">
                    {filtered.map(t => {
                        const cat = CATEGORY_META[t.category] ?? CATEGORY_META.plomberie
                        const CatIcon = cat.icon
                        return (
                            <div key={t.id} className={`glass-card p-4 border-l-4 flex items-center gap-5 ${
                                t.status === 'in_progress' ? 'border-l-sp' :
                                t.status === 'scheduled'   ? 'border-l-amber-400' :
                                                             'border-l-emerald-500'
                            }`}>
                                <CatIcon size={16} className={`${cat.color} flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-sm ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                                        {t.title}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">{t.agent} · {t.time}</p>
                                </div>
                                <StatusBadge status={t.status} />
                                {t.priority === 'urgent' && (
                                    <span className="text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full">URGENT</span>
                                )}
                                <button onClick={() => setEditingTicket(t)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-navy-600 transition-colors flex-shrink-0">
                                    <Pencil size={13} />
                                </button>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucune tâche trouvée</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {editingTicket && (
                    <EditTicketModal
                        ticket={editingTicket}
                        onSave={handleSaveEdit}
                        onClose={() => setEditingTicket(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   MODAL WRAPPER
══════════════════════════════════════════ */
function Modal({ title, subtitle, onClose, children, width = 'max-w-lg' }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.18 }}
                className={`relative w-full ${width} bg-navy-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
            >
                <div className="flex items-start justify-between p-6 border-b border-white/5 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-white">{title}</h2>
                        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-navy-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </motion.div>
        </div>
    )
}

/* ── Small spinner ── */
function Spinner() {
    return <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
}

/* ══════════════════════════════════════════
   ADD EXPENSE MODAL
══════════════════════════════════════════ */
function AddExpenseModal({ onClose, onAdd, suppliers = [] }) {
    const [form, setForm] = useState({
        category:    EXPENSE_CATEGORIES[0].label,
        amount:      '',
        vendorId:    suppliers.length > 0 ? '' : 'autre',  // '' = not chosen yet, 'autre' = free text
        vendor:      '',
        date:        new Date().toISOString().slice(0, 10),
        description: '',
        hasInvoice:  false,
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function handleVendorSelect(e) {
        const id = e.target.value
        if (id === 'autre') {
            setForm(f => ({ ...f, vendorId: 'autre', vendor: '' }))
        } else {
            const sup = suppliers.find(s => s.id === id)
            setForm(f => ({ ...f, vendorId: id, vendor: sup ? sup.name : '' }))
        }
        setErrors(p => ({ ...p, vendor: null }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Montant requis'
        if (!form.vendor.trim())                       errs.vendor = 'Fournisseur requis'
        if (suppliers.length > 0 && !form.vendorId)   errs.vendor = 'Sélectionnez un fournisseur ou "Autre"'
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        const cat = EXPENSE_CATEGORIES.find(c => c.label === form.category)
        onAdd({
            category:    form.category,
            amount:      parseInt(form.amount),
            color:       cat?.color ?? 'bg-slate-500',
            vendor:      form.vendor.trim(),
            date:        form.date,
            description: form.description,
            hasInvoice:  form.hasInvoice,
            isNew:       true,
        })
        setSaving(false)
        onClose()
    }

    return (
        <Modal
            title="Ajouter une dépense"
            subtitle="Enregistrée dans le journal de transparence · visible aux résidents"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Catégorie</label>
                    <select
                        value={form.category}
                        onChange={e => set('category', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors"
                    >
                        {EXPENSE_CATEGORIES.map(c => (
                            <option key={c.label} value={c.label}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Montant (MAD) *</label>
                        <input
                            type="number" min="1" placeholder="0"
                            value={form.amount}
                            onChange={e => { set('amount', e.target.value); setErrors(p => ({ ...p, amount: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.amount ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                        {errors.amount && <p className="text-[10px] text-red-400 mt-1">{errors.amount}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date *</label>
                        <input
                            type="date" value={form.date}
                            onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fournisseur / Prestataire *</label>
                    {suppliers.length > 0 ? (
                        <div className="space-y-2">
                            <select
                                value={form.vendorId}
                                onChange={handleVendorSelect}
                                className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors ${errors.vendor ? 'border-red-500/50 text-red-300' : 'border-white/10 focus:border-sp/40 text-slate-200'}`}
                            >
                                <option value="" disabled>— Sélectionner un fournisseur —</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} · {catInfo(s.category).label}</option>
                                ))}
                                <option value="autre">— Autre (prestataire non répertorié) —</option>
                            </select>
                            {form.vendorId === 'autre' && (
                                <input
                                    type="text" placeholder="Nom du prestataire…"
                                    value={form.vendor}
                                    onChange={e => { set('vendor', e.target.value); setErrors(p => ({ ...p, vendor: null })) }}
                                    autoFocus
                                    className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.vendor ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                                />
                            )}
                        </div>
                    ) : (
                        <input
                            type="text" placeholder="ex: Otis Morocco, ProNettoyage SARL…"
                            value={form.vendor}
                            onChange={e => { set('vendor', e.target.value); setErrors(p => ({ ...p, vendor: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.vendor ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                    )}
                    {errors.vendor && <p className="text-[10px] text-red-400 mt-1">{errors.vendor}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                    <textarea
                        placeholder="Détail de la prestation…"
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        rows={2}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none"
                    />
                </div>

                {/* Invoice toggle */}
                <div
                    onClick={() => set('hasInvoice', !form.hasInvoice)}
                    className={`border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${
                        form.hasInvoice ? 'border-sp/50 bg-sp/5' : 'border-white/10 hover:border-sp/30'
                    }`}
                >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${form.hasInvoice ? 'bg-sp/20' : 'bg-navy-600'}`}>
                        {form.hasInvoice ? <Check size={16} className="text-sp" /> : <Upload size={16} className="text-slate-400" />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-200">
                            {form.hasInvoice ? 'Facture jointe ✓' : 'Joindre une facture'}
                        </p>
                        <p className="text-[11px] text-slate-500">PDF, JPG, PNG · Visible aux résidents</p>
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Plus size={15} /> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ── Searchable resident combobox ─────────────────────────────────────── */
function ResidentCombobox({ residents, value, onChange }) {
    const [open,  setOpen]  = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef(null)
    const inputRef     = useRef(null)

    const selected = residents.find(r => r.id === value)

    const filteredOptions = residents.filter(r => {
        if (!query) return true
        const q = query.toLowerCase()
        return r.name.toLowerCase().includes(q) || r.unit.toLowerCase().includes(q)
    })

    // Close when clicking outside
    useEffect(() => {
        function onDown(e) { if (!containerRef.current?.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [])

    // Auto-focus search input when opening
    useEffect(() => {
        if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 30) }
    }, [open])

    function select(id) { onChange(id); setOpen(false) }

    function stColor(r) {
        const s = computeStatus(r.paidThrough)
        return s === 'paid' ? 'text-emerald-400' : s === 'pending' ? 'text-amber-400' : 'text-red-400'
    }
    function stIcon(r) {
        const s = computeStatus(r.paidThrough)
        return s === 'paid' ? '✓' : s === 'pending' ? '⏳' : '⚠'
    }
    function stLabel(r) {
        const s = computeStatus(r.paidThrough)
        return s === 'paid' ? 'À jour' : s === 'pending' ? 'Attente' : 'Retard'
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-left flex items-center gap-2 hover:border-white/20 focus:outline-none focus:border-sp/40 transition-colors"
            >
                {selected ? (
                    <>
                        <span className={`text-xs flex-shrink-0 ${stColor(selected)}`}>{stIcon(selected)}</span>
                        <span className="font-mono text-[11px] text-sp/80 flex-shrink-0">{selected.unit}</span>
                        <span className="text-slate-200 flex-1 truncate">— {selected.name}</span>
                    </>
                ) : (
                    <span className="text-slate-500 flex-1">Sélectionner un résident…</span>
                )}
                <ChevronDown size={13} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-[#0d1629] border border-white/12 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-white/8">
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Nom ou numéro d'unité…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                                className="w-full bg-navy-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 border border-white/8 focus:border-sp/30 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Results */}
                    <div className="max-h-52 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-4">Aucun résultat</p>
                        ) : filteredOptions.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => select(r.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-colors ${
                                    r.id === value ? 'bg-sp/12 text-sp' : 'hover:bg-navy-700 text-slate-300'
                                }`}
                            >
                                <span className={`flex-shrink-0 w-4 text-center ${stColor(r)}`}>{stIcon(r)}</span>
                                <span className="font-mono text-[10px] text-slate-500 flex-shrink-0 w-10">{r.unit}</span>
                                <span className={`flex-1 truncate ${r.id === value ? 'font-semibold' : ''}`}>{r.name}</span>
                                <span className={`flex-shrink-0 text-[10px] font-semibold ${stColor(r)}`}>{stLabel(r)}</span>
                            </button>
                        ))}
                    </div>

                    {filteredOptions.length > 0 && (
                        <div className="px-3 py-1.5 border-t border-white/5 text-[10px] text-slate-600 text-right">
                            {filteredOptions.length} résultat{filteredOptions.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/* ══════════════════════════════════════════
   RECORD PAYMENT MODAL
══════════════════════════════════════════ */
function RecordPaymentModal({ building, residents, onClose, onRecord, presetResidentId }) {
    const [form, setForm] = useState({
        residentId: presetResidentId ?? residents[0]?.id ?? '',
        months:     1,
        amount:     '',
        method:     'especes',
        date:       new Date().toISOString().slice(0, 10),
        ref:        '',
    })
    const [saving, setSaving] = useState(false)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    const selectedResident = residents.find(r => r.id === form.residentId)
    const coveredThrough = selectedResident
        ? advancePaidThrough(selectedResident.paidThrough, form.months)
        : null

    async function handleSubmit(e) {
        e.preventDefault()
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        onRecord({ residentId: form.residentId, months: form.months })
        if (form.amount && selectedResident) generatePaymentReceipt(building, selectedResident, form, coveredThrough)
        setSaving(false)
        onClose()
    }

    return (
        <Modal
            title="Enregistrer un paiement"
            subtitle="Le statut sera recalculé automatiquement"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Résident *</label>
                    <ResidentCombobox
                        residents={residents}
                        value={form.residentId}
                        onChange={id => set('residentId', id)}
                    />
                    {selectedResident && (
                        <p className="text-[10px] text-slate-500 mt-1.5">
                            Actuellement payé jusqu'à : <span className="text-slate-300 font-medium">{formatMonth(selectedResident.paidThrough)}</span>
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Nombre de mois couverts *</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 6, 12].map(n => (
                            <button type="button" key={n} onClick={() => set('months', n)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    form.months === n
                                        ? 'bg-sp/15 border-sp/40 text-sp'
                                        : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                }`}>
                                {n === 12 ? '1 an' : `${n} mois`}
                            </button>
                        ))}
                    </div>
                    {coveredThrough && (
                        <div className="mt-2.5 flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2">
                            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                            <p className="text-xs text-emerald-300">
                                Couvert jusqu'à : <span className="font-bold">{formatMonth(coveredThrough)}</span>
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Montant payé</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            placeholder="ex: 1500"
                            value={form.amount}
                            onChange={e => set('amount', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 pr-14 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">MAD</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mode de paiement</label>
                        <div className="flex flex-col gap-1.5">
                            {[
                                { value: 'especes',  label: 'Espèces'  },
                                { value: 'virement', label: 'Virement' },
                                { value: 'cheque',   label: 'Chèque'   },
                            ].map(m => (
                                <button type="button" key={m.value} onClick={() => set('method', m.value)}
                                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                        form.method === m.value
                                            ? 'bg-sp/15 border-sp/40 text-sp'
                                            : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                    }`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date de réception</label>
                            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Référence / N° reçu</label>
                            <input type="text" placeholder="Optionnel" value={form.ref} onChange={e => set('ref', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><CheckCircle2 size={15} /> Confirmer le paiement</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   ADD RESIDENT MODAL
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   WHATSAPP GROUP REMINDER MODAL
══════════════════════════════════════════ */
function WhatsAppGroupModal({ overdueResidents, building, onClose }) {
    const defaultMsg =
`Bonjour,

Nous vous rappelons que votre cotisation de syndic est actuellement en retard de paiement.

Merci de régulariser votre situation dans les meilleurs délais par virement bancaire :

🏦 Banque : [NOM BANQUE]
📋 RIB : [XXXX XXXX XXXX XXXX XXXX XX]
👤 Titulaire : ${building.name} — Syndic

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
— ${building.name}`
    const [msg, setMsg] = useState(defaultMsg)

    return (
        <Modal title="Rappel de paiement groupé" subtitle={`${overdueResidents.length} résident${overdueResidents.length > 1 ? 's' : ''} en retard`} onClose={onClose} width="max-w-xl">
            <div className="mb-5">
                <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider font-semibold">Message</label>
                <textarea
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    rows={4}
                    className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-sp/50 resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">Vous pouvez modifier le message avant d'envoyer.</p>
            </div>
            <div className="space-y-2">
                {overdueResidents.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-navy-800 border border-white/5">
                        <div>
                            <p className="text-sm font-medium text-slate-200">{r.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{r.unit} · {r.phone}</p>
                        </div>
                        <button
                            onClick={() => {
                                const num = r.phone.replace(/[^0-9]/g, '')
                                window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
                            }}
                            className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                        >
                            <MessageCircle size={12} /> Envoyer
                        </button>
                    </div>
                ))}
            </div>
        </Modal>
    )
}

function EditResidentModal({ resident, onSave, onDelete, onClose }) {
    const [form, setForm] = useState({
        name:  resident.name,
        phone: resident.phone === '—' ? '' : resident.phone,
        unit:  resident.unit,
        floor: resident.floor?.toString() ?? '',
        type:  resident.type ?? 'proprietaire',
    })
    const [saving,       setSaving]       = useState(false)
    const [confirmSave,  setConfirmSave]  = useState(false)
    const [confirmDel,   setConfirmDel]   = useState(false)
    const [errors,       setErrors]       = useState({})

    function set(k, v) {
        setForm(f => ({ ...f, [k]: v }))
        setConfirmSave(false) // reset confirm if user keeps editing
    }

    function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.name.trim()) errs.name = 'Nom requis'
        if (!form.unit.trim()) errs.unit = "Numéro d'unité requis"
        if (Object.keys(errs).length) { setErrors(errs); return }
        setConfirmSave(true)
    }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onSave({
            ...resident,
            name:  form.name.trim(),
            unit:  form.unit.toUpperCase(),
            phone: form.phone || '—',
            floor: parseInt(form.floor) || 0,
            type:  form.type,
        })
    }

    return (
        <Modal title="Modifier le résident" subtitle={resident.name} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom complet *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => { set('name', e.target.value); setErrors(p => ({ ...p, name: null })) }}
                        className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                    />
                    {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Numéro d'unité *</label>
                        <input
                            type="text"
                            value={form.unit}
                            onChange={e => { set('unit', e.target.value); setErrors(p => ({ ...p, unit: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.unit ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                        {errors.unit && <p className="text-[10px] text-red-400 mt-1">{errors.unit}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Étage</label>
                        <input
                            type="number" min={0}
                            value={form.floor}
                            onChange={e => set('floor', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone WhatsApp</label>
                    <input
                        type="tel" placeholder="+212 6XX XXX XXX"
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: 'proprietaire', label: 'Propriétaire' },
                            { value: 'locataire',    label: 'Locataire'    },
                        ].map(t => (
                            <button
                                type="button" key={t.value}
                                onClick={() => set('type', t.value)}
                                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    form.type === t.value
                                        ? 'bg-sp/15 border-sp/40 text-sp'
                                        : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save buttons — step 1: normal, step 2: confirm */}
                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <Spinner /> : <><Check size={14} /> Enregistrer</>}
                        </button>
                    </div>
                ) : (
                    <div className="border border-sp/30 bg-sp/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs text-slate-300 text-center leading-relaxed">
                            Confirmer les modifications pour <span className="font-bold text-white">{form.name.trim() || resident.name}</span> ?
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmSave(false)}
                                className="flex-1 py-2 bg-navy-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                                Revenir
                            </button>
                            <button type="button" onClick={doSave} disabled={saving}
                                className="flex-1 py-2 bg-sp hover:bg-sp-dark text-navy-900 rounded-lg text-xs font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={13} /> Oui, enregistrer</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete zone */}
                <div className={`border rounded-xl transition-all overflow-hidden ${confirmDel ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'}`}>
                    {!confirmDel ? (
                        <button type="button" onClick={() => setConfirmDel(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={13} /> Supprimer ce résident
                        </button>
                    ) : (
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-red-300 text-center leading-relaxed">
                                Supprimer <span className="font-bold text-white">{resident.name}</span> définitivement ?<br />
                                <span className="text-slate-500">Cette action est irréversible.</span>
                            </p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmDel(false)}
                                    className="flex-1 py-2 bg-navy-700 text-slate-300 rounded-lg text-xs font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                                    Annuler
                                </button>
                                <button type="button" onClick={() => onDelete(resident.id)}
                                    className="flex-1 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1.5">
                                    <Trash2 size={12} /> Confirmer la suppression
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    )
}

function AddResidentModal({ onClose, onAdd }) {
    const [form, setForm] = useState({
        name:  '',
        phone: '',
        unit:  '',
        floor: '',
        type:  'proprietaire',
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.name.trim()) errs.name = 'Nom requis'
        if (!form.unit.trim()) errs.unit = "Numéro d'unité requis"
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        onAdd({
            id:     `r-${Date.now()}`,
            unit:   form.unit.toUpperCase(),
            name:   form.name.trim(),
            phone:  form.phone || '—',
            floor:       parseInt(form.floor) || 0,
            paidThrough: advancePaidThrough(CURRENT_MONTH, -1),
            since:       new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
            type:        form.type,
            isNew:       true,
        })
        setSaving(false)
        onClose()
    }

    return (
        <Modal
            title="Ajouter un résident"
            subtitle="Une invitation sera envoyée automatiquement par WhatsApp"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom complet *</label>
                    <input
                        type="text" placeholder="Prénom et Nom"
                        value={form.name}
                        onChange={e => { set('name', e.target.value); setErrors(p => ({ ...p, name: null })) }}
                        className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                    />
                    {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Numéro d'unité *</label>
                        <input
                            type="text" placeholder="ex: B-07"
                            value={form.unit}
                            onChange={e => { set('unit', e.target.value); setErrors(p => ({ ...p, unit: null })) }}
                            className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.unit ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                        />
                        {errors.unit && <p className="text-[10px] text-red-400 mt-1">{errors.unit}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Étage</label>
                        <input
                            type="number" placeholder="ex: 3" min={0}
                            value={form.floor}
                            onChange={e => set('floor', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone WhatsApp</label>
                    <input
                        type="tel" placeholder="+212 6XX XXX XXX"
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: 'proprietaire', label: 'Propriétaire' },
                            { value: 'locataire',    label: 'Locataire'    },
                        ].map(t => (
                            <button
                                type="button" key={t.value}
                                onClick={() => set('type', t.value)}
                                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    form.type === t.value
                                        ? 'bg-sp/15 border-sp/40 text-sp'
                                        : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
                    <Phone size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-emerald-300 leading-relaxed">
                        Un message WhatsApp sera envoyé pour inviter le résident à accéder à son espace personnel.
                    </p>
                </div>

                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Plus size={15} /> Ajouter</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   IMPORT CSV / EXCEL MODAL  (3-step wizard)
══════════════════════════════════════════ */

// Column header aliases → internal key mapping (handles French accents + common variants)
const COL_ALIAS = {
    nom: 'nom', name: 'nom', 'nom complet': 'nom', 'full name': 'nom',
    telephone: 'telephone', tel: 'telephone', phone: 'telephone', mobile: 'telephone',
    'téléphone': 'telephone', 'numero': 'telephone', 'numéro': 'telephone',
    unite: 'unite', 'unité': 'unite', unit: 'unite', appartement: 'unite',
    appart: 'unite', appt: 'unite', 'n° appart': 'unite', 'n°appart': 'unite',
    etage: 'etage', 'étage': 'etage', floor: 'etage', niveau: 'etage',
    type: 'type', 'type résident': 'type', 'type resident': 'type',
    quota: 'quota', 'quote-part': 'quota', 'quotepart': 'quota',
}

const COL_LABEL = {
    nom: 'Nom complet', telephone: 'Téléphone WhatsApp',
    unite: 'Unité', etage: 'Étage', type: 'Type de résident', quota: 'Quote-part',
}

function normalizeHeader(h) {
    return COL_ALIAS[
        String(h).toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
            .replace(/[^a-z0-9 °#-]/g, '')                      // keep alphanums + space/dash
            .trim()
    ] || null
}

function mapRowsToObjects(rawHeaders, dataLines) {
    const mapped = rawHeaders.map(h => normalizeHeader(h))
    if (!mapped.includes('nom') || !mapped.includes('unite')) {
        throw new Error('Colonnes obligatoires manquantes : "nom" et "unite" (ou "unité") doivent être présentes.')
    }
    return dataLines
        .filter(row => row.some(c => String(c).trim() !== ''))
        .map(row => {
            const obj = {}
            mapped.forEach((key, i) => { if (key) obj[key] = String(row[i] ?? '').trim() })
            return obj
        })
        .filter(r => r.nom && r.unite)
}

function downloadResidentsTemplate() {
    const headers = 'nom;telephone;unite;etage;type;quota'
    const example = 'Rachid Benkirane;+212 661 234 567;A-01;1;Propriétaire;250'
    const blob = new Blob(['\uFEFF' + headers + '\n' + example + '\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modele_residents_syndicpulse.csv'; a.click()
    URL.revokeObjectURL(url)
}

function ImportCSVModal({ onClose, onImport }) {
    const [step,        setStep]        = useState(1)
    const [fileName,    setFileName]    = useState('')
    const [parsedRows,  setParsedRows]  = useState([])
    const [parseError,  setParseError]  = useState('')
    const [importing,   setImporting]   = useState(false)
    const fileRef = useRef(null)

    const detectedCols = parsedRows.length > 0
        ? Object.keys(parsedRows[0]).filter(k => COL_LABEL[k])
        : []
    const previewRows  = parsedRows.slice(0, 5)

    async function handleFile(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setParseError('')
        setFileName(file.name)
        try {
            let rows
            if (/\.xlsx?$/i.test(file.name)) {
                // Excel: parse with SheetJS
                const buffer = await file.arrayBuffer()
                const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
                if (data.length < 2) throw new Error('Le fichier Excel est vide ou ne contient pas de données.')
                rows = mapRowsToObjects(data[0].map(String), data.slice(1))
            } else {
                // CSV: parse natively
                const text = await file.text()
                const firstLine = text.split('\n')[0]
                const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','
                const lines = text.trim().split(/\r?\n/).map(l =>
                    l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
                )
                if (lines.length < 2) throw new Error('Le fichier CSV est vide.')
                rows = mapRowsToObjects(lines[0], lines.slice(1))
            }
            if (rows.length === 0) throw new Error('Aucun résident valide trouvé (les colonnes "nom" et "unité" sont obligatoires).')
            setParsedRows(rows)
            setStep(2)
        } catch (err) {
            setParseError(err.message || 'Erreur de lecture du fichier.')
            fileRef.current.value = ''
        }
    }

    async function handleImport() {
        setImporting(true)
        await new Promise(r => setTimeout(r, 900))
        onImport(parsedRows.map((row, i) => ({
            id:          `csv-${Date.now()}-${i}`,
            unit:        row.unite,
            name:        row.nom,
            phone:       row.telephone || '',
            floor:       parseInt(row.etage) || 0,
            paidThrough: advancePaidThrough(CURRENT_MONTH, -1),
            since:       formatMonth(CURRENT_MONTH),
            type:        (row.type || 'propriétaire').toLowerCase(),
            quota:       row.quota ? parseFloat(row.quota) : null,
            isNew:       true,
        })))
        setImporting(false)
        setStep(3)
    }

    const STEPS = [
        { n: 1, label: 'Sélectionner fichier'       },
        { n: 2, label: 'Vérifier la correspondance' },
        { n: 3, label: 'Confirmation'               },
    ]

    return (
        <Modal
            title="Importer depuis Excel / CSV"
            subtitle="Migrez vos données existantes en quelques secondes"
            onClose={onClose}
            width="max-w-2xl"
        >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
                {STEPS.map(({ n, label }, idx) => (
                    <div key={n} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                            step > n  ? 'bg-emerald-500 text-white' :
                            step === n ? 'bg-sp text-navy-900'      :
                                         'bg-navy-600 text-slate-500'
                        }`}>
                            {step > n ? <Check size={12} /> : n}
                        </div>
                        <span className={`text-xs ${step === n ? 'text-slate-200 font-semibold' : 'text-slate-500'}`}>{label}</span>
                        {idx < STEPS.length - 1 && <div className={`w-8 h-px ${step > n ? 'bg-emerald-500' : 'bg-navy-600'}`} />}
                    </div>
                ))}
            </div>

            {/* Step 1: Drop zone */}
            {step === 1 && (
                <div>
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-white/15 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-sp/40 hover:bg-sp/3 transition-all group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-navy-700 border border-white/8 flex items-center justify-center group-hover:border-sp/20 transition-all">
                            <Upload size={24} className="text-slate-400 group-hover:text-sp transition-colors" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-200 mb-1">Glissez votre fichier ici</p>
                            <p className="text-xs text-slate-500">ou cliquez pour parcourir</p>
                            <p className="text-[11px] text-slate-600 mt-1">Excel (.xlsx / .xls) · CSV · max 10 Mo</p>
                        </div>
                        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                    </div>
                    {parseError && (
                        <div className="mt-3 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300">{parseError}</p>
                        </div>
                    )}
                    <div className="mt-4 flex items-center justify-between px-1">
                        <p className="text-xs text-slate-500">Colonnes requises : <span className="font-mono text-slate-400">nom, unite</span></p>
                        <button onClick={downloadResidentsTemplate} className="text-xs text-sp hover:text-sp-light flex items-center gap-1.5 transition-colors">
                            <Download size={12} /> Télécharger le modèle CSV
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Column mapping + data preview */}
            {step === 2 && (
                <div className="space-y-5">
                    {/* File info */}
                    <div className="flex items-center gap-3 bg-navy-700 rounded-xl px-4 py-3 border border-white/5">
                        <FileText size={16} className="text-sp flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{fileName}</p>
                            <p className="text-[11px] text-slate-500">
                                {parsedRows.length} résident{parsedRows.length > 1 ? 's' : ''} détecté{parsedRows.length > 1 ? 's' : ''} · {detectedCols.length} colonnes mappées automatiquement
                            </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                            Valide
                        </span>
                    </div>

                    {/* Column mapping */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2.5">Correspondance des colonnes détectées</p>
                        <div className="space-y-2">
                            {detectedCols.map(key => (
                                <div key={key} className="flex items-center gap-3 text-xs">
                                    <span className="font-mono text-slate-500 bg-navy-700 px-2 py-1 rounded text-[11px] w-28 text-center truncate">{key}</span>
                                    <ChevronRight size={10} className="text-slate-600 flex-shrink-0" />
                                    <span className="text-slate-300 font-medium flex-1">{COL_LABEL[key]}</span>
                                    <Check size={12} className="text-emerald-400 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data preview */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2.5">
                            Aperçu{parsedRows.length > 5 ? ` (5 premiers sur ${parsedRows.length})` : ''}
                        </p>
                        <div className="rounded-xl border border-white/8 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-navy-700">
                                        {['Unité', 'Nom', 'Téléphone', 'Ét.', 'Type'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {previewRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-navy-700/40">
                                            <td className="px-3 py-2.5 font-mono text-sp font-semibold">{row.unite}</td>
                                            <td className="px-3 py-2.5 text-slate-200">{row.nom}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.telephone || '—'}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.etage || '—'}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.type || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => { setStep(1); fileRef.current && (fileRef.current.value = '') }}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Retour
                        </button>
                        <button onClick={handleImport} disabled={importing}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                            {importing
                                ? <><Spinner /> Importation en cours…</>
                                : `Importer ${parsedRows.length} résident${parsedRows.length > 1 ? 's' : ''}`
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="text-center py-4 space-y-5">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white">
                            {parsedRows.length} résident{parsedRows.length > 1 ? 's' : ''} importé{parsedRows.length > 1 ? 's' : ''} !
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Ils apparaissent dans la liste avec le statut{' '}
                            <span className="text-amber-400 font-semibold">En attente</span>.
                        </p>
                    </div>
                    <div className="bg-navy-700 rounded-xl p-4 text-left space-y-2.5 border border-white/5 max-h-48 overflow-y-auto">
                        {parsedRows.map((row, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-sm">
                                <span className="font-mono text-[11px] text-sp bg-sp/10 px-1.5 py-0.5 rounded flex-shrink-0">{row.unite}</span>
                                <span className="text-slate-200 truncate">{row.nom}</span>
                                <CheckCircle2 size={13} className="text-emerald-400 ml-auto flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                    <button onClick={onClose}
                        className="w-full py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all">
                        Fermer
                    </button>
                </div>
            )}
        </Modal>
    )
}

/* ══════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   BUILDING SETTINGS MODAL
══════════════════════════════════════════ */
function BuildingSettingsModal({ building, onClose, onSave }) {
    const [form, setForm] = useState({
        name:    building.name    ?? '',
        city:    building.city    ?? '',
        manager: building.manager ?? '',
        logo:    building.logo    ?? null,
    })
    const [confirmSave, setConfirmSave] = useState(false)
    const [saving,      setSaving]      = useState(false)
    const [logoPreview, setLogoPreview] = useState(building.logo ?? null)
    const fileRef = useRef(null)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setConfirmSave(false) }

    function handleLogoChange(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => { set('logo', ev.target.result); setLogoPreview(ev.target.result) }
        reader.readAsDataURL(file)
    }

    function handleSubmit(e) { e.preventDefault(); if (!form.name.trim()) return; setConfirmSave(true) }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 500))
        onSave({ ...form })
    }

    const logoColor    = building.color ?? '#06b6d4'
    const logoInitials = form.name.trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase() || '??'

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                    <h2 className="text-base font-bold text-white">Paramètres de la propriété</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Logo section */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Logo de la syndic</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0"
                                 style={{ backgroundColor: logoColor + '22' }}>
                                {logoPreview
                                    ? <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-xl font-bold" style={{ color: logoColor }}>{logoInitials}</span>
                                }
                            </div>
                            <div className="space-y-2">
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="px-3 py-1.5 bg-sp/10 hover:bg-sp/20 text-sp text-xs font-semibold rounded-lg border border-sp/20 transition-all flex items-center gap-1.5">
                                    <Upload size={12} /> {logoPreview ? 'Changer le logo' : 'Importer un logo'}
                                </button>
                                {logoPreview && (
                                    <button type="button" onClick={() => { set('logo', null); setLogoPreview(null) }}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all">
                                        Supprimer le logo
                                    </button>
                                )}
                                <p className="text-[10px] text-slate-500">PNG, JPG — max 2 Mo</p>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nom de la propriété</label>
                            <input value={form.name} onChange={e => set('name', e.target.value)} required
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Ville</label>
                            <input value={form.city} onChange={e => set('city', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Gestionnaire</label>
                            <input value={form.manager} onChange={e => set('manager', e.target.value)}
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sp/50" />
                        </div>
                    </div>

                    {confirmSave ? (
                        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-4 flex items-center justify-between gap-3">
                            <p className="text-sm text-cyan-300 font-medium">Confirmer les modifications ?</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmSave(false)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-white/5 rounded-lg transition-colors">
                                    Revenir
                                </button>
                                <button type="button" onClick={doSave} disabled={saving}
                                    className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
                                    {saving ? 'Enregistrement…' : <><Check size={12} /> Oui, enregistrer</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-end gap-3 pt-1">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                                Annuler
                            </button>
                            <button type="submit"
                                className="px-4 py-2 text-sm font-semibold bg-sp hover:bg-sp-light text-white rounded-xl transition-colors flex items-center gap-1.5">
                                <Check size={14} /> Enregistrer
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════
   ADD BUILDING MODAL
══════════════════════════════════════════ */
const BUILDING_COLORS = ['#22c55e','#06b6d4','#6366f1','#f59e0b','#ec4899','#ef4444','#8b5cf6','#14b8a6']

function AddBuildingModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        name: '', city: '', address: '', manager: '',
        total_units: '', monthly_charge: '',
        color: BUILDING_COLORS[0],
        logo: null,
    })
    const [saving,      setSaving]      = useState(false)
    const [logoPreview, setLogoPreview] = useState(null)
    const fileRef = useRef(null)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function handleLogoChange(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => { set('logo', ev.target.result); setLogoPreview(ev.target.result) }
        reader.readAsDataURL(file)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.name.trim() || !form.city.trim() || !form.manager.trim()) return
        setSaving(true)
        await new Promise(r => setTimeout(r, 700))
        onSave({
            id:                 `bld-${Date.now()}`,
            name:               form.name.trim(),
            city:               form.city.trim(),
            address:            form.address.trim(),
            manager:            form.manager.trim(),
            total_units:        Number(form.total_units) || 0,
            monthly_charge_mad: Number(form.monthly_charge) || 0,
            reserve_fund_mad:   0,
            color:              form.color,
            icon:               'Building2',
            logo:               form.logo,
            collection_rate:    100,
        })
    }

    const logoInitials = form.name.trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase() || '??'

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                    <h2 className="text-base font-bold text-white">Ajouter une propriété</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Logo + color */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Logo de la syndic</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0"
                                 style={{ backgroundColor: form.color + '22' }}>
                                {logoPreview
                                    ? <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-xl font-bold" style={{ color: form.color }}>{logoInitials}</span>
                                }
                            </div>
                            <div className="space-y-2 flex-1">
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="px-3 py-1.5 bg-sp/10 hover:bg-sp/20 text-sp text-xs font-semibold rounded-lg border border-sp/20 transition-all flex items-center gap-1.5">
                                    <Upload size={12} /> {logoPreview ? 'Changer le logo' : 'Importer un logo'}
                                </button>
                                {logoPreview && (
                                    <button type="button" onClick={() => { set('logo', null); setLogoPreview(null) }}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 transition-all">
                                        Supprimer
                                    </button>
                                )}
                                <p className="text-[10px] text-slate-500">Optionnel — une icône générée sera utilisée si absent</p>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Couleur :</span>
                            {BUILDING_COLORS.map(c => (
                                <button key={c} type="button" onClick={() => set('color', c)}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-125' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nom de la propriété <span className="text-red-400">*</span></label>
                            <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="ex. Résidence Al Amal"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Ville <span className="text-red-400">*</span></label>
                            <input value={form.city} onChange={e => set('city', e.target.value)} required placeholder="ex. Marrakech"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Gestionnaire <span className="text-red-400">*</span></label>
                            <input value={form.manager} onChange={e => set('manager', e.target.value)} required placeholder="ex. Karim Alami"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Adresse</label>
                            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="ex. Bd Mohammed V, 40000"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nombre d'unités</label>
                            <input type="number" min="1" value={form.total_units} onChange={e => set('total_units', e.target.value)} placeholder="ex. 24"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cotisation mensuelle (MAD)</label>
                            <input type="number" min="0" value={form.monthly_charge} onChange={e => set('monthly_charge', e.target.value)} placeholder="ex. 1500"
                                className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sp/50" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving || !form.name.trim() || !form.city.trim() || !form.manager.trim()}
                            className="px-4 py-2 text-sm font-semibold bg-sp hover:bg-sp-light text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5">
                            {saving ? 'Création…' : <><Plus size={14} /> Créer la propriété</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const BUILDING_ICON_MAP = { Building2, Landmark, Leaf }

function BuildingAvatar({ building, size = 'sm' }) {
    const dim      = size === 'sm' ? 'w-8 h-8'  : 'w-10 h-10'
    const iconSize = size === 'sm' ? 15          : 18
    const Icon     = BUILDING_ICON_MAP[building.icon] ?? Building2
    if (building.logo) {
        return (
            <div className={`${dim} rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden`}
                 style={{ border: `1px solid ${building.color}55` }}>
                <img src={building.logo} alt="" className="w-full h-full object-cover" />
            </div>
        )
    }
    return (
        <div className={`${dim} rounded-lg flex items-center justify-center flex-shrink-0`}
             style={{ backgroundColor: building.color + '33', border: `1px solid ${building.color}55` }}>
            <Icon size={iconSize} style={{ color: building.color }} strokeWidth={1.5} />
        </div>
    )
}

function KpiCard({ label, value, delta, up, icon: Icon, color }) {
    const colorMap = {
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
        cyan:    { bg: 'bg-sp/10',          border: 'border-sp/20',          text: 'text-sp'          },
        amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400'  },
        violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  text: 'text-violet-400' },
    }
    const c = colorMap[color] ?? colorMap.cyan
    return (
        <div className="glass-card p-5 group hover:border-sp/20 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} group-hover:scale-110 transition-transform`}>
                    <Icon size={18} className={c.text} strokeWidth={1.5} />
                </div>
                {up !== null ? (
                    <div className={`flex items-center gap-1 text-[11px] font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                        {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {delta}
                    </div>
                ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>{delta}</span>
                )}
            </div>
            <p className="text-slate-400 text-xs font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    )
}

function StatusBadge({ status }) {
    const map = {
        in_progress: 'bg-sp/15 text-sp border-sp/20',
        scheduled:   'bg-slate-500/15 text-slate-400 border-slate-500/20',
        done:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    }
    const label = { in_progress: 'En cours', scheduled: 'Planifié', done: 'Terminé' }
    return (
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${map[status] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
            {label[status] ?? status}
        </span>
    )
}

function PaymentBadge({ status }) {
    const map = {
        paid:    { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: 'Payé',       icon: CheckCircle2 },
        pending: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20',       label: 'En attente', icon: Clock        },
        overdue: { cls: 'bg-red-500/15 text-red-400 border-red-500/20',             label: 'En retard',  icon: XCircle      },
    }
    const { cls, label, icon: Icon } = map[status] ?? map.pending
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
            <Icon size={10} strokeWidth={2.5} /> {label}
        </span>
    )
}

function ProgressRow({ label, value, color }) {
    return (
        <div>
            <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-300 font-semibold">{value}%</span>
            </div>
            <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
            </div>
        </div>
    )
}

function ActionBtn({ icon, onClick, color = 'sp', title }) {
    const hoverMap = {
        sp:    'hover:bg-sp/20 hover:text-sp',
        green: 'hover:bg-emerald-500/20 hover:text-emerald-400',
        blue:  'hover:bg-blue-500/20 hover:text-blue-400',
        amber: 'hover:bg-amber-500/20 hover:text-amber-400',
    }
    return (
        <button onClick={onClick} title={title}
                className={`p-1.5 rounded-lg bg-navy-600 ${hoverMap[color] ?? hoverMap.sp} text-slate-400 transition-all`}>
            {icon}
        </button>
    )
}

/* ══════════════════════════════════════════
   AG DOCUMENT GENERATORS
══════════════════════════════════════════ */
function fmtDate(iso) {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d} ${MONTH_LABELS[Number(m) - 1]} ${y}`
}

function generateConvocation(building, residents, meeting) {
    const deadlineDate = new Date(meeting.date)
    deadlineDate.setDate(deadlineDate.getDate() - 15)
    const waText = `📢 *Convocation — Assemblée Générale*\n*${building.name} · ${building.city}*\n\nVous êtes convoqué(e) à l'Assemblée Générale le :\n📅 *${fmtDate(meeting.date)}* à *${meeting.time}*\n📍 ${meeting.location}\n\n*Ordre du jour :*\n${meeting.agenda.map((a, i) => `${i + 1}. ${a.title}`).join('\n')}\n\n⚠️ Votre présence est indispensable (quorum requis).\nEn cas d'absence, vous pouvez donner procuration à un autre copropriétaire.\n\n— Syndic ${building.name}`

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Convocation AG — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; max-width: 680px; margin: 0 auto; }
  .header { border-bottom: 2px solid #0e7490; padding-bottom: 16px; margin-bottom: 28px; }
  .brand { font-size: 18px; font-weight: bold; color: #0e7490; }
  h1 { font-size: 17px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px; }
  .sub { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 28px; }
  .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .info-row { display: flex; gap: 12px; margin-bottom: 8px; }
  .info-row:last-child { margin-bottom: 0; }
  .info-lbl { font-weight: 600; min-width: 80px; color: #0e7490; }
  .agenda { margin-bottom: 28px; }
  .agenda h3 { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0e7490; margin-bottom: 12px; letter-spacing: .5px; }
  .agenda-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .agenda-num { font-weight: bold; color: #0e7490; min-width: 24px; }
  .legal { font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-bottom: 28px; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig { text-align: center; }
  .sig .line { width: 160px; border-top: 1px solid #111; margin: 36px auto 6px; }
  .sig .name { font-size: 11px; color: #6b7280; }
  /* WhatsApp panel — hidden on print */
  .wa-panel { margin-top: 40px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; }
  .wa-panel h3 { color: #166534; font-size: 13px; font-weight: bold; margin-bottom: 12px; }
  .wa-text { font-family: monospace; font-size: 12px; white-space: pre-wrap; background: #fff; border: 1px solid #d1fae5; border-radius: 6px; padding: 12px; color: #111; }
  .wa-btn { margin-top: 10px; background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: bold; cursor: pointer; }
  @media print { .wa-panel { display: none; } body { padding: 32px; } }
</style>
</head>
<body>
<div class="header">
  <div class="brand" style="display:flex;align-items:center;gap:10px">${buildingLogoHTML(building, 36)}<span>${building.name}</span></div>
  <div style="font-size:11px;color:#6b7280;margin-top:3px">${building.name} &nbsp;·&nbsp; ${building.city} &nbsp;·&nbsp; Loi 18-00 relative au statut de la copropriété</div>
</div>

<h1>Convocation à l'Assemblée Générale</h1>
<p class="sub">${meeting.title}</p>

<div class="info-box">
  <div class="info-row"><span class="info-lbl">Date :</span><span>${fmtDate(meeting.date)}</span></div>
  <div class="info-row"><span class="info-lbl">Heure :</span><span>${meeting.time}</span></div>
  <div class="info-row"><span class="info-lbl">Lieu :</span><span>${meeting.location}</span></div>
  <div class="info-row"><span class="info-lbl">Convoqués :</span><span>Tous les copropriétaires de ${building.name}</span></div>
</div>

<div class="agenda">
  <h3>Ordre du jour</h3>
  ${meeting.agenda.map((a, i) => `<div class="agenda-item"><span class="agenda-num">${i + 1}.</span><span>${a.title}</span></div>`).join('')}
</div>

<div class="legal">
  Conformément à l'article 25 de la Loi 18-00, cette convocation est adressée à tous les copropriétaires au moins 15 jours avant la tenue de l'assemblée. En cas d'empêchement, vous pouvez donner procuration écrite à un autre copropriétaire. Le quorum est atteint si la majorité des copropriétaires est présente ou représentée.
</div>

<div class="sig-row">
  <div class="sig"><div class="line"></div><div class="name">Le Syndic — ${building.name}</div></div>
  <div class="sig"><div class="line"></div><div class="name">Date d'envoi</div></div>
</div>

<div class="wa-panel">
  <h3>💬 Message WhatsApp (copier-coller dans le groupe)</h3>
  <div class="wa-text" id="watext">${waText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  <button class="wa-btn" onclick="navigator.clipboard.writeText(document.getElementById('watext').innerText).then(()=>this.textContent='✓ Copié !')">📋 Copier le message</button>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function generateAttendanceSheet(building, residents, meeting) {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Feuille de présence — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
  .header { border-bottom: 2px solid #0e7490; padding-bottom: 12px; margin-bottom: 24px; display:flex; justify-content:space-between; }
  h1 { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #6b7280; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0e7490; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .sig-cell { width: 140px; }
  .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:flex-start;gap:10px">
    ${buildingLogoHTML(building, 36)}
    <div>
      <h1>Feuille de présence — AG</h1>
      <div class="meta">${building.name} · ${building.city} &nbsp;|&nbsp; ${fmtDate(meeting.date)} à ${meeting.time} &nbsp;|&nbsp; ${meeting.location}</div>
    </div>
  </div>
  <div style="font-size:11px;color:#6b7280;text-align:right">Total copropriétaires : ${residents.length}<br/>Quorum (50%+1) : ${Math.ceil(residents.length / 2)}</div>
</div>

<table>
  <thead><tr><th>#</th><th>Unité</th><th>Copropriétaire</th><th>Présent(e)</th><th>Procuration donnée à</th><th>Signature</th></tr></thead>
  <tbody>
    ${residents.map((r, i) => `<tr><td>${i + 1}</td><td>${r.unit}</td><td>${r.name}</td><td style="text-align:center">☐</td><td class="sig-cell">&nbsp;</td><td class="sig-cell">&nbsp;</td></tr>`).join('')}
  </tbody>
</table>

<div class="footer">
  <div>Présents : ______ / ${residents.length} &nbsp;&nbsp; Quorum atteint : ☐ Oui &nbsp; ☐ Non</div>
  <div>Signature du Syndic : _______________________</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

function generatePV(building, meeting) {
    const quorumOk = meeting.attendance ? meeting.attendance.present >= Math.ceil(meeting.attendance.total / 2) : false
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Procès-verbal AG — ${building.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; max-width: 700px; margin: 0 auto; }
  .header { border-bottom: 2px solid #0e7490; padding-bottom: 14px; margin-bottom: 28px; }
  h1 { font-size: 17px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .sub { text-align: center; color: #6b7280; font-size: 12px; }
  h2 { font-size: 13px; font-weight: bold; color: #0e7490; text-transform: uppercase; letter-spacing: .5px; margin: 24px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .info-row { display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; }
  .info-lbl { font-weight: 600; min-width: 120px; }
  .vote-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .vote-title { font-weight: bold; margin-bottom: 8px; }
  .vote-row { display: flex; gap: 24px; font-size: 12px; margin-bottom: 4px; }
  .vote-row span { min-width: 120px; }
  .result { font-weight: bold; margin-top: 6px; font-size: 12px; }
  .adopted { color: #16a34a; }
  .rejected { color: #dc2626; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 48px; gap: 20px; }
  .sig { text-align: center; flex: 1; }
  .sig .line { border-top: 1px solid #111; margin: 40px 0 6px; }
  .sig .name { font-size: 11px; color: #6b7280; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">${buildingLogoHTML(building, 36)}<span style="font-size:13px;font-weight:bold;color:#0e7490">${building.name}</span></div>
  <div style="font-size:11px;color:#6b7280">${building.name} &nbsp;·&nbsp; ${building.city} · Loi 18-00 relative au statut de la copropriété</div>
</div>

<h1>Procès-verbal</h1>
<p class="sub">${meeting.title}</p>

<h2>Informations de séance</h2>
<div class="info-row"><span class="info-lbl">Date :</span><span>${fmtDate(meeting.date)}</span></div>
<div class="info-row"><span class="info-lbl">Heure :</span><span>${meeting.time}</span></div>
<div class="info-row"><span class="info-lbl">Lieu :</span><span>${meeting.location}</span></div>
<div class="info-row"><span class="info-lbl">Présents :</span><span>${meeting.attendance?.present ?? '—'} / ${meeting.attendance?.total ?? '—'} copropriétaires</span></div>
<div class="info-row"><span class="info-lbl">Quorum :</span><span style="font-weight:bold;color:${quorumOk ? '#16a34a' : '#dc2626'}">${quorumOk ? '✓ Atteint' : '✗ Non atteint'}</span></div>

<h2>Résultats des votes</h2>
${meeting.agenda.map((a, i) => {
    const v = (meeting.votes ?? []).find(x => x.agendaId === a.id)
    const total = v ? (v.pour + v.contre + v.abstention) : 0
    const adopted = v && v.pour > v.contre
    return `<div class="vote-item">
  <div class="vote-title">${i + 1}. ${a.title}</div>
  ${v ? `
  <div class="vote-row"><span>✅ Pour :</span><span>${v.pour} voix</span></div>
  <div class="vote-row"><span>❌ Contre :</span><span>${v.contre} voix</span></div>
  <div class="vote-row"><span>⬜ Abstention :</span><span>${v.abstention} voix</span></div>
  <div class="result ${adopted ? 'adopted' : 'rejected'}">${adopted ? '✓ POINT ADOPTÉ' : '✗ POINT REJETÉ'}</div>
  ` : '<div style="color:#9ca3af;font-size:12px">Votes non enregistrés</div>'}
</div>`
}).join('')}

${meeting.notes ? `<h2>Notes</h2><p style="font-size:12px;color:#374151;line-height:1.6">${meeting.notes}</p>` : ''}

<div class="sig-row">
  <div class="sig"><div class="line"></div><div class="name">Le Syndic</div></div>
  <div class="sig"><div class="line"></div><div class="name">Témoin 1</div></div>
  <div class="sig"><div class="line"></div><div class="name">Témoin 2</div></div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}

/* ══════════════════════════════════════════
   ASSEMBLÉES PAGE
══════════════════════════════════════════ */
function AssembliesPage({ building, residents, meetings, setMeetings, showToast }) {
    const [filter,        setFilter]        = useState('all')
    const [showAdd,       setShowAdd]       = useState(false)
    const [editingMeeting, setEditingMeeting] = useState(null)

    const filtered = filter === 'all' ? meetings : meetings.filter(m => m.status === filter)
    const upcoming = meetings.filter(m => m.status === 'upcoming')
    const completed = meetings.filter(m => m.status === 'completed')
    const next = upcoming.sort((a, b) => a.date.localeCompare(b.date))[0]

    function daysUntil(iso) {
        const diff = Math.ceil((new Date(iso) - new Date()) / 86400000)
        if (diff < 0) return `il y a ${Math.abs(diff)} j`
        if (diff === 0) return "aujourd'hui"
        return `dans ${diff} j`
    }

    function handleAdd(m) {
        const newId = `ag-${building.id.replace('bld-', '')}-${Date.now().toString(36)}`
        setMeetings(prev => [{ ...m, id: newId, status: 'upcoming', convocationSent: false, votes: [], attendance: null, notes: '' }, ...prev])
        showToast(`AG "${m.title}" planifiée`)
    }

    function handleSaveEdit(m) {
        setMeetings(prev => prev.map(x => x.id === m.id ? m : x))
        showToast('AG mise à jour')
        setEditingMeeting(null)
    }

    function handleDelete(id) {
        setMeetings(prev => prev.filter(x => x.id !== id))
        showToast('AG supprimée', 'error')
        setEditingMeeting(null)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">Assemblées Générales</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{building.name} · {upcoming.length} à venir · {completed.length} terminée{completed.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-sp/10 hover:bg-sp/20 text-sp border border-sp/25 rounded-xl px-4 py-2 text-sm font-semibold transition-all">
                    <Plus size={15} /> Planifier une AG
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div onClick={() => setFilter('upcoming')} className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-sp/20 transition-colors">
                    <CalendarCheck size={22} className="text-sp flex-shrink-0" />
                    <div>
                        <p className="text-xl font-bold text-sp">{upcoming.length}</p>
                        <p className="text-xs text-slate-400">À venir</p>
                    </div>
                </div>
                <div onClick={() => setFilter('completed')} className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-500/20 transition-colors">
                    <ClipboardList size={22} className="text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-xl font-bold text-emerald-400">{completed.length}</p>
                        <p className="text-xs text-slate-400">Terminées</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <Calendar size={22} className="text-amber-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-400">{next ? fmtDate(next.date) : '—'}</p>
                        <p className="text-xs text-slate-400">{next ? `Prochaine · ${daysUntil(next.date)}` : 'Aucune planifiée'}</p>
                    </div>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5">
                {[{ key: 'all', label: 'Toutes' }, { key: 'upcoming', label: 'À venir' }, { key: 'completed', label: 'Terminées' }].map(t => (
                    <button key={t.key} onClick={() => setFilter(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            filter === t.key ? 'bg-sp/15 text-sp border-sp/30' : 'bg-navy-700 text-slate-400 border-white/8 hover:border-sp/15'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* AG cards */}
            <div className="space-y-4">
                {filtered.length === 0 && (
                    <div className="glass-card p-10 text-center text-slate-500 text-sm">Aucune assemblée pour ce filtre.</div>
                )}
                {filtered.map(m => (
                    <div key={m.id} className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${
                                    m.status === 'upcoming'
                                        ? 'bg-sp/15 text-sp border-sp/25'
                                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                }`}>
                                    {m.status === 'upcoming' ? 'À venir' : 'Terminée'}
                                </span>
                                {m.convocationSent && (
                                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                        <Check size={10} /> Convocation envoyée
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setEditingMeeting(m)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-navy-700 transition-colors ml-2">
                                <Pencil size={13} />
                            </button>
                        </div>

                        <h3 className="font-bold text-white text-base mb-1">{m.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(m.date)} · {m.time}</span>
                            <span className="flex items-center gap-1"><ClipboardList size={11} /> {m.agenda.length} point{m.agenda.length !== 1 ? 's' : ''} à l'ordre du jour</span>
                            {m.status === 'upcoming' && <span className="text-amber-400 font-semibold">{daysUntil(m.date)}</span>}
                            {m.status === 'completed' && m.attendance && (
                                <span className="flex items-center gap-1"><Users2 size={11} /> {m.attendance.present} / {m.attendance.total} présents</span>
                            )}
                        </div>

                        {/* Agenda preview */}
                        <div className="space-y-1 mb-5">
                            {m.agenda.slice(0, 3).map((a, i) => (
                                <div key={a.id} className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="w-4 h-4 rounded-full bg-navy-600 text-[9px] font-bold text-slate-300 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                    {a.title}
                                </div>
                            ))}
                            {m.agenda.length > 3 && <p className="text-[11px] text-slate-600 pl-6">+{m.agenda.length - 3} autre{m.agenda.length - 3 > 1 ? 's' : ''} point{m.agenda.length - 3 > 1 ? 's' : ''}…</p>}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap border-t border-white/5 pt-4">
                            {m.status === 'upcoming' && (<>
                                <button onClick={() => generateConvocation(building, residents, m)}
                                    className="flex items-center gap-1.5 text-xs bg-sp/10 text-sp border border-sp/20 px-3 py-1.5 rounded-lg hover:bg-sp/20 transition-colors">
                                    <FileText size={12} /> Générer convocation
                                </button>
                                <button onClick={() => generateAttendanceSheet(building, residents, m)}
                                    className="flex items-center gap-1.5 text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors">
                                    <Users2 size={12} /> Feuille de présence
                                </button>
                            </>)}
                            {m.status === 'completed' && (<>
                                <button onClick={() => generatePV(building, m)}
                                    className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">
                                    <ClipboardList size={12} /> Voir le PV
                                </button>
                                <button onClick={() => generateAttendanceSheet(building, residents, m)}
                                    className="flex items-center gap-1.5 text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors">
                                    <Users2 size={12} /> Feuille de présence
                                </button>
                            </>)}
                            <button onClick={() => setEditingMeeting(m)}
                                className="flex items-center gap-1.5 text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors ml-auto">
                                <Pencil size={12} /> Modifier
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {showAdd && <AddAGModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
                {editingMeeting && (
                    <EditAGModal
                        meeting={editingMeeting}
                        onClose={() => setEditingMeeting(null)}
                        onSave={handleSaveEdit}
                        onDelete={handleDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   ADD AG MODAL
══════════════════════════════════════════ */
function AddAGModal({ onClose, onAdd }) {
    const year = new Date().getFullYear()
    const [form, setForm] = useState({
        title:    `Assemblée Générale Ordinaire ${year}`,
        date:     '',
        time:     '19:00',
        location: 'Salle commune — RDC',
        agenda:   [{ id: 'n1', title: 'Approbation des comptes' }, { id: 'n2', title: 'Budget prévisionnel' }],
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
    function setAgenda(i, v) { setForm(f => { const a = [...f.agenda]; a[i] = { ...a[i], title: v }; return { ...f, agenda: a } }) }
    function addPoint()      { setForm(f => ({ ...f, agenda: [...f.agenda, { id: `n${Date.now()}`, title: '' }] })) }
    function removePoint(i)  { setForm(f => ({ ...f, agenda: f.agenda.filter((_, j) => j !== i) })) }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.date) errs.date = 'Date requise'
        if (form.agenda.filter(a => a.title.trim()).length === 0) errs.agenda = 'Au moins un point requis'
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        onAdd({ ...form, agenda: form.agenda.filter(a => a.title.trim()) })
        setSaving(false)
        onClose()
    }

    return (
        <Modal title="Planifier une AG" subtitle="Nouvelle assemblée générale" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date *</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                        {errors.date && <p className="text-[11px] text-red-400 mt-1">{errors.date}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Heure</label>
                        <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Lieu</label>
                    <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ordre du jour</label>
                    <div className="space-y-2">
                        {form.agenda.map((a, i) => (
                            <div key={a.id} className="flex gap-2">
                                <span className="w-5 h-9 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}.</span>
                                <input type="text" value={a.title} onChange={e => setAgenda(i, e.target.value)}
                                    placeholder={`Point ${i + 1}`}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.agenda.length > 1 && (
                                    <button type="button" onClick={() => removePoint(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.agenda.length < 8 && (
                            <button type="button" onClick={addPoint}
                                className="text-xs text-sp hover:text-sp/80 flex items-center gap-1 transition-colors">
                                <Plus size={12} /> Ajouter un point
                            </button>
                        )}
                    </div>
                    {errors.agenda && <p className="text-[11px] text-red-400 mt-1">{errors.agenda}</p>}
                </div>
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Annuler
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Spinner /> : <><Check size={15} /> Enregistrer</>}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   EDIT AG MODAL
══════════════════════════════════════════ */
function EditAGModal({ meeting, onClose, onSave, onDelete }) {
    const [form, setForm] = useState({
        title:    meeting.title,
        date:     meeting.date,
        time:     meeting.time,
        location: meeting.location,
        status:   meeting.status,
        convocationSent: meeting.convocationSent,
        agenda:   meeting.agenda.map(a => ({ ...a })),
        attendance: meeting.attendance ? { ...meeting.attendance } : { present: '', total: '' },
        votes:    meeting.votes.map(v => ({ ...v })),
        notes:    meeting.notes ?? '',
    })
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmSave,   setConfirmSave]   = useState(false)
    const [saving, setSaving]               = useState(false)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setConfirmSave(false) }
    function setAgenda(i, v) { setForm(f => { const a = [...f.agenda]; a[i] = { ...a[i], title: v }; return { ...f, agenda: a } }); setConfirmSave(false) }
    function addPoint()      { setForm(f => ({ ...f, agenda: [...f.agenda, { id: `e${Date.now()}`, title: '' }] })) }
    function removePoint(i)  { setForm(f => ({ ...f, agenda: f.agenda.filter((_, j) => j !== i) })) }
    function setVote(agendaId, field, val) {
        setForm(f => {
            const votes = f.votes.map(v => v.agendaId === agendaId ? { ...v, [field]: Number(val) } : v)
            if (!votes.find(v => v.agendaId === agendaId)) votes.push({ agendaId, pour: 0, contre: 0, abstention: 0, [field]: Number(val) })
            return { ...f, votes }
        })
        setConfirmSave(false)
    }

    function handleSubmit(e) {
        e.preventDefault()
        setConfirmSave(true)
    }

    async function doSave() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        const att = form.status === 'completed' && form.attendance?.present !== ''
            ? { present: Number(form.attendance.present), total: Number(form.attendance.total) }
            : meeting.attendance
        onSave({ ...meeting, ...form, agenda: form.agenda.filter(a => a.title.trim()), attendance: att })
    }

    return (
        <Modal title="Modifier l'AG" subtitle={`${meeting.title}`} onClose={onClose} width="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Heure</label>
                        <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Lieu</label>
                    <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Statut</label>
                    <div className="flex gap-2">
                        {[{ key: 'upcoming', label: 'À venir', cls: 'border-sp/40 text-sp bg-sp/10' }, { key: 'completed', label: 'Terminée', cls: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' }].map(s => (
                            <button type="button" key={s.key} onClick={() => set('status', s.key)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.status === s.key ? s.cls : 'bg-navy-700 border-white/8 text-slate-500'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => set('convocationSent', !form.convocationSent)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.convocationSent ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 bg-navy-700'}`}>
                        {form.convocationSent && <Check size={11} className="text-white" />}
                    </button>
                    <span className="text-xs text-slate-400">Convocation envoyée aux résidents</span>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ordre du jour</label>
                    <div className="space-y-2">
                        {form.agenda.map((a, i) => (
                            <div key={a.id} className="flex gap-2">
                                <span className="w-5 h-9 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}.</span>
                                <input type="text" value={a.title} onChange={e => setAgenda(i, e.target.value)}
                                    className="flex-1 bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                                {form.agenda.length > 1 && (
                                    <button type="button" onClick={() => removePoint(i)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {form.agenda.length < 8 && (
                            <button type="button" onClick={addPoint} className="text-xs text-sp hover:text-sp/80 flex items-center gap-1">
                                <Plus size={12} /> Ajouter un point
                            </button>
                        )}
                    </div>
                </div>

                {form.status === 'completed' && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Présents</label>
                                <input type="number" min="0" value={form.attendance?.present ?? ''} onChange={e => set('attendance', { ...form.attendance, present: e.target.value })}
                                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Total copropriétaires</label>
                                <input type="number" min="0" value={form.attendance?.total ?? ''} onChange={e => set('attendance', { ...form.attendance, total: e.target.value })}
                                    className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Résultats des votes</label>
                            <div className="space-y-2">
                                {form.agenda.filter(a => a.title.trim()).map(a => {
                                    const v = form.votes.find(x => x.agendaId === a.id) ?? { pour: 0, contre: 0, abstention: 0 }
                                    return (
                                        <div key={a.id} className="bg-navy-700/60 rounded-xl p-3 border border-white/5">
                                            <p className="text-xs font-semibold text-slate-300 mb-2">{a.title}</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[['pour', 'Pour', 'text-emerald-400'], ['contre', 'Contre', 'text-red-400'], ['abstention', 'Abstention', 'text-slate-400']].map(([field, label, cls]) => (
                                                    <div key={field}>
                                                        <label className={`block text-[10px] font-semibold ${cls} mb-1`}>{label}</label>
                                                        <input type="number" min="0" value={v[field] ?? 0}
                                                            onChange={e => setVote(a.id, field, e.target.value)}
                                                            className="w-full bg-navy-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sp/40 transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                        placeholder="Observations, décisions complémentaires..."
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors resize-none" />
                </div>

                {!confirmSave ? (
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Annuler
                        </button>
                        <button type="submit"
                            className="flex-1 py-2.5 bg-sp hover:bg-sp/90 text-navy-900 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                            <Check size={15} /> Enregistrer
                        </button>
                    </div>
                ) : (
                    <div className="bg-sp/8 border border-sp/25 rounded-xl p-3.5">
                        <p className="text-xs text-slate-300 text-center mb-3">
                            Confirmer les modifications pour <span className="text-white font-semibold">"{form.title}"</span> ?
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmSave(false)}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                Revenir
                            </button>
                            <button type="button" onClick={doSave} disabled={saving}
                                className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-sp/20 text-sp border border-sp/30 hover:bg-sp/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                                {saving ? <Spinner /> : <><Check size={12} /> Oui, enregistrer</>}
                            </button>
                        </div>
                    </div>
                )}

                <div className="border-t border-white/5 pt-3">
                    {!confirmDelete ? (
                        <button type="button" onClick={() => setConfirmDelete(true)}
                            className="w-full py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5">
                            <Trash2 size={12} /> Supprimer cette AG
                        </button>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <p className="text-xs text-red-300 text-center mb-3">Supprimer définitivement cette AG ?</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-navy-700 text-slate-300 border border-white/8 hover:bg-navy-600 transition-colors">
                                    Revenir
                                </button>
                                <button type="button" onClick={() => onDelete(meeting.id)}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                                    Oui, supprimer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    )
}

/* ══════════════════════════════════════════
   USERS PAGE  (super_admin only)
══════════════════════════════════════════ */
function UsersPage({ showToast }) {
    const [showCreate, setShowCreate] = useState(false)
    const [, forceUpdate] = useState(0)

    function getAllUsers() {
        const created = JSON.parse(localStorage.getItem('sp_created_users') ?? '[]')
        return [...DEMO_USERS, ...created]
    }

    const users = getAllUsers()

    const ROLE_META = {
        super_admin:    { label: 'Super Admin', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
        syndic_manager: { label: 'Syndic',      cls: 'bg-sp/15 text-sp border-sp/20' },
    }

    function handleCreated() {
        forceUpdate(n => n + 1)
        showToast?.('Compte créé avec succès.', 'success')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{users.length} compte{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 font-bold text-sm rounded-xl transition-all shadow-glow-cyan">
                    <Plus size={16} /> Créer un compte
                </button>
            </div>

            {/* Users table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-4 py-2.5 border-b border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nom / Email</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rôle</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accès bâtiments</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut</span>
                </div>
                {users.map(u => {
                    const meta = ROLE_META[u.role] ?? ROLE_META.syndic_manager
                    const isDemo = DEMO_USERS.some(d => d.id === u.id)
                    return (
                        <div key={u.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-4 py-3.5 border-b border-white/4 hover:bg-white/2 transition-colors items-center">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: `#${u.avatar_bg ?? '0d1629'}`, color: `#${u.avatar_color ?? '06b6d4'}`, border: `1px solid #${u.avatar_color ?? '06b6d4'}33` }}>
                                    {(u.full_name ?? u.email).slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-200 truncate">{u.full_name ?? '—'}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit ${meta.cls}`}>
                                {meta.label}
                            </span>
                            <span className="text-xs text-slate-400">{u.accessible_building_ids?.length ?? 0} bâtiment{(u.accessible_building_ids?.length ?? 0) > 1 ? 's' : ''}</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDemo ? 'bg-slate-700 text-slate-400 border border-white/8' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'}`}>
                                    {isDemo ? 'Démo' : 'Actif'}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <AnimatePresence>
                {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   CREATE USER MODAL  (super_admin only)
══════════════════════════════════════════ */
function CreateUserModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ fullName: '', syndicName: '', buildingIds: '' })
    const [saving, setSaving] = useState(false)
    const [done, setDone] = useState(null) // { email, password }
    const [showPwd, setShowPwd] = useState(false)
    const [copied, setCopied] = useState(false)

    // Auto-derive email from syndicName
    const emailSlug = form.syndicName.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '')
        || 'syndic'
    const derivedEmail = `syndic_manager@${emailSlug}.ma`

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    function generatePassword() {
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
        const lower = 'abcdefghjkmnpqrstuvwxyz'
        const digits = '23456789'
        return (
            upper[Math.floor(Math.random() * upper.length)] +
            lower[Math.floor(Math.random() * lower.length)] +
            digits[Math.floor(Math.random() * digits.length)] +
            upper[Math.floor(Math.random() * upper.length)] +
            lower[Math.floor(Math.random() * lower.length)] +
            digits[Math.floor(Math.random() * digits.length)]
        )
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!form.syndicName.trim()) return
        setSaving(true)
        await new Promise(r => setTimeout(r, 800))

        const pwd = generatePassword()
        const bldIds = form.buildingIds.split(',').map(s => s.trim()).filter(Boolean)
        const newUser = {
            id: `usr-${Date.now()}`,
            email: derivedEmail,
            password: pwd,
            full_name: form.fullName.trim() || derivedEmail,
            role: 'syndic_manager',
            org_id: `org-${Date.now()}`,
            accessible_building_ids: bldIds.length ? bldIds : ['bld-1'],
            avatar_bg: '0d1629',
            avatar_color: '06b6d4',
        }

        const existing = JSON.parse(localStorage.getItem('sp_created_users') ?? '[]')
        localStorage.setItem('sp_created_users', JSON.stringify([...existing, newUser]))

        setSaving(false)
        setDone({ email: derivedEmail, password: pwd })
        onCreated?.()
    }

    function copyCredentials() {
        navigator.clipboard.writeText(`Email: ${done.email}\nMot de passe: ${done.password}`).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Modal title="Créer un compte" subtitle="Nouveau gestionnaire de syndic" onClose={onClose} width="max-w-md">
            {!done ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom du syndic <span className="text-red-400">*</span></label>
                        <input type="text" value={form.syndicName} onChange={e => set('syndicName', e.target.value)}
                            placeholder="ex : Norwest, Résidence Atlas…"
                            required
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                        <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                            <Mail size={11} className="text-sp" /> Email généré : <span className="text-sp font-mono">{derivedEmail}</span>
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom complet du gestionnaire</label>
                        <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                            placeholder="ex : Omar Benali"
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">IDs de bâtiments accessibles</label>
                        <input type="text" value={form.buildingIds} onChange={e => set('buildingIds', e.target.value)}
                            placeholder="ex : bld-1, bld-2"
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors" />
                        <p className="text-[11px] text-slate-500 mt-1">Séparez les IDs par une virgule. Défaut : bld-1</p>
                    </div>

                    <div className="rounded-xl bg-sp/5 border border-sp/15 p-3">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            <span className="text-sp font-bold">Convention :</span> Email au format <span className="font-mono text-sp">syndic_manager@syndicname.ma</span>. Le mot de passe temporaire généré devra être communiqué au gestionnaire.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-semibold text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving || !form.syndicName.trim()}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp-dark disabled:opacity-50 text-navy-900 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                            {saving
                                ? <><span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" /> Création…</>
                                : <><Key size={14} /> Créer le compte</>
                            }
                        </button>
                    </div>
                </form>
            ) : (
                /* ── Success state — show credentials ── */
                <div className="space-y-4">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                        <p className="text-sm font-bold text-emerald-400 mb-1">Compte créé avec succès ✓</p>
                        <p className="text-xs text-slate-400">Communiquez ces identifiants au gestionnaire de façon sécurisée.</p>
                    </div>
                    <div className="rounded-xl bg-navy-700 border border-white/8 p-4 space-y-3">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Email</p>
                            <p className="font-mono text-sm text-sp">{done.email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Mot de passe temporaire</p>
                            <div className="flex items-center gap-3">
                                <code className="font-mono text-base font-bold text-white tracking-widest flex-1">
                                    {showPwd ? done.password : '••••••'}
                                </code>
                                <button type="button" onClick={() => setShowPwd(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button onClick={copyCredentials}
                        className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors bg-sp/10 hover:bg-sp/20 text-sp border-sp/20">
                        {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier les identifiants</>}
                    </button>
                    <button onClick={onClose}
                        className="w-full py-2.5 text-sm font-semibold text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                        Fermer
                    </button>
                </div>
            )}
        </Modal>
    )
}

/* ══════════════════════════════════════════
   RESIDENT PORTAL  (read-only transparency)
══════════════════════════════════════════ */
function ResidentPortal({ session, onLogout }) {
    const { buildingId, resident } = session
    const building  = BUILDINGS.find(b => b.id === buildingId) ?? {}
    const bldgData  = getBuildingData(buildingId)
    const expenses  = bldgData.expenses ?? []
    const meetings  = bldgData.meetings ?? []
    const status    = computeStatus(resident.paidThrough)

    const nextAG = meetings.find(m => m.status === 'upcoming')

    const STATUS_META = {
        paid:    { label: 'À jour',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
        pending: { label: 'En attente',  cls: 'bg-amber-500/15  text-amber-400  border-amber-500/20'  },
        overdue: { label: 'En retard',   cls: 'bg-red-500/15    text-red-400    border-red-500/20'    },
    }
    const sm = STATUS_META[status]

    const Icon = BUILDING_ICON_MAP[building.icon] ?? Home

    return (
        <div className="min-h-screen bg-navy-900">

            {/* ── Header ── */}
            <header className="bg-navy-800 border-b border-white/5 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${building.color ?? '#06b6d4'}20`, border: `1px solid ${building.color ?? '#06b6d4'}40` }}>
                            <Icon size={18} style={{ color: building.color ?? '#06b6d4' }} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">{building.name ?? '—'}</p>
                            <p className="text-[11px] text-slate-500">
                                Espace Résident · {resident.unit} · {resident.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={onLogout}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors">
                        <LogOut size={13} /> Se déconnecter
                    </button>
                </div>
            </header>

            {/* ── Content ── */}
            <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                {/* Welcome banner */}
                <div className="rounded-2xl glass-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center flex-shrink-0">
                        <Home size={18} className="text-sp" />
                    </div>
                    <div>
                        <p className="text-base font-bold text-white">Bienvenue, {resident.name.split(' ')[0]} !</p>
                        <p className="text-xs text-slate-400 mt-0.5">Voici les informations de transparence pour votre résidence <span className="text-white font-semibold">{building.name}</span>.</p>
                    </div>
                </div>

                {/* ── Avis en cours (Circulaires) ── */}
                {(() => {
                    let circs = []
                    try { circs = JSON.parse(localStorage.getItem(`sp_circ_${buildingId}`) ?? '[]') } catch {}
                    // Last 30 days only
                    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
                    const recent = circs.filter(c => new Date(c.createdAt).getTime() >= cutoff).slice(0, 3)
                    if (!recent.length) return null
                    return (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Megaphone size={15} className="text-amber-400" />
                                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Avis de la résidence</p>
                            </div>
                            <div className="space-y-2">
                                {recent.map(c => {
                                    const tpl = CIRCULAIRE_TEMPLATES.find(t => t.key === c.template)
                                    const label  = tpl?.label ?? c.template
                                    const icon   = tpl?.icon  ?? '📢'
                                    const when   = new Date(c.createdAt).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' })
                                    const msg    = buildCirculaireMessage(c.template, c.vars, building.name ?? '')
                                    const preview = msg.split('\n').find(l => l.trim()) ?? label
                                    return (
                                        <div key={c.id} className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/12 rounded-xl px-3 py-2.5">
                                            <span className="text-base leading-none mt-0.5">{icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-amber-200">{label}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{preview}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{when}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })()}

                {/* 2-col grid */}
                <div className="grid lg:grid-cols-2 gap-4">

                    {/* ── Left col — Personal ── */}
                    <div className="space-y-4">

                        {/* Mon appartement */}
                        <div className="glass-card rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Mon appartement</p>
                            <div className="space-y-2.5">
                                {[
                                    ['Unité',  resident.unit],
                                    ['Étage',  resident.floor != null ? `Étage ${resident.floor}` : '—'],
                                    ['Depuis', resident.since ?? '—'],
                                    ['Quote-part', `${resident.quota ?? '—'}%`],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">{k}</span>
                                        <span className="text-xs font-semibold text-slate-200">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mes charges */}
                        <div className="glass-card rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Mes charges</p>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-slate-400">Statut de paiement</span>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sm.cls}`}>
                                    {sm.label}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">À jour jusqu'à</span>
                                <span className="text-xs font-semibold text-slate-200">{formatMonth(resident.paidThrough)}</span>
                            </div>
                            {status !== 'paid' && (
                                <div className="mt-3 rounded-xl bg-amber-500/8 border border-amber-500/15 p-3">
                                    <p className="text-[11px] text-amber-300">Pour régulariser votre situation, contactez votre syndic.</p>
                                </div>
                            )}
                        </div>

                        {/* Historique des 6 derniers mois */}
                        {(() => {
                            // Build last-6-months list relative to CURRENT_MONTH
                            const [cy, cm] = CURRENT_MONTH.split('-').map(Number)
                            const months = Array.from({ length: 6 }, (_, i) => {
                                let m = cm - 5 + i
                                let y = cy
                                while (m <= 0) { m += 12; y-- }
                                return `${y}-${String(m).padStart(2, '0')}`
                            })
                            const [py, pm] = (resident.paidThrough ?? '0000-00').split('-').map(Number)
                            return (
                                <div className="glass-card rounded-2xl p-5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Historique des 6 derniers mois</p>
                                    <div className="space-y-2">
                                        {months.map(ym => {
                                            const [y, m] = ym.split('-').map(Number)
                                            const paid = y < py || (y === py && m <= pm)
                                            return (
                                                <div key={ym} className="flex items-center justify-between">
                                                    <span className="text-xs text-slate-400">{formatMonth(ym)}</span>
                                                    <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                                        paid
                                                            ? 'bg-emerald-500/12 text-emerald-400'
                                                            : ym === CURRENT_MONTH
                                                                ? 'bg-amber-500/12 text-amber-400'
                                                                : 'bg-red-500/12 text-red-400'
                                                    }`}>
                                                        {paid ? '✓' : ym === CURRENT_MONTH ? '–' : '✗'}
                                                        {paid ? 'Payé' : ym === CURRENT_MONTH ? 'En attente' : 'Non payé'}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })()}

                    </div>

                    {/* ── Right col — Building ── */}
                    <div className="space-y-4">

                        {/* Budget résidence */}
                        <div className="glass-card rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Budget de la résidence</p>
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Taux de recouvrement</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${building.collection_rate ?? 0}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400">{building.collection_rate ?? '—'}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Fonds de réserve</span>
                                    <span className="text-xs font-semibold text-slate-200">
                                        {building.reserve_fund_mad?.toLocaleString('fr-MA') ?? '—'} MAD
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Nombre d'unités</span>
                                    <span className="text-xs font-semibold text-slate-200">{building.total_units ?? '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dépenses */}
                        {expenses.length > 0 && (
                            <div className="glass-card rounded-2xl p-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Répartition des dépenses</p>
                                <div className="space-y-3">
                                    {expenses.slice(0, 4).map(exp => (
                                        <div key={exp.category}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] text-slate-400 truncate pr-2">{exp.category}</span>
                                                <span className="text-[11px] font-semibold text-slate-200 flex-shrink-0">
                                                    {exp.amount.toLocaleString('fr-MA')} MAD
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                                                <div className={`h-full ${exp.color ?? 'bg-sp'} rounded-full`} style={{ width: `${exp.pct}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prochaine AG */}
                        {nextAG && (
                            <div className="glass-card rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prochaine AG</p>
                                    <span className="text-[9px] font-bold bg-sp/15 text-sp border border-sp/20 px-2 py-0.5 rounded-full">À VENIR</span>
                                </div>
                                <p className="text-sm font-semibold text-white mb-1">{nextAG.title}</p>
                                <p className="text-xs text-slate-400 mb-3">
                                    {fmtDate(nextAG.date)} · {nextAG.time} · {nextAG.location}
                                </p>
                                {nextAG.agenda?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Ordre du jour</p>
                                        <ul className="space-y-1">
                                            {nextAG.agenda.map((a, i) => (
                                                <li key={a.id} className="text-xs text-slate-400 flex gap-2">
                                                    <span className="text-slate-600 flex-shrink-0">{i + 1}.</span>
                                                    {a.title}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                {/* Contact syndic footer */}
                <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-white">Contacter le syndic</p>
                        <p className="text-xs text-slate-400 mt-0.5">{building.name} · {building.manager ?? 'Gestionnaire'}</p>
                    </div>
                    <div className="flex gap-3">
                        {building.manager && (
                            <a href={`mailto:contact@syndicpulse.ma?subject=Résidence ${building.name} — Demande résident (${resident.unit})`}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sp/10 hover:bg-sp/20 text-sp border border-sp/20 text-xs font-semibold transition-colors">
                                <Mail size={13} /> E-mail
                            </a>
                        )}
                        <a href="https://wa.me/212600000000"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors">
                            <Phone size={13} /> WhatsApp
                        </a>
                    </div>
                </div>

                {/* Transparency footer note */}
                <p className="text-center text-[11px] text-slate-600 pb-4">
                    Ces données sont fournies par votre syndic dans le cadre de la transparence financière prévue par la Loi 18-00.
                </p>

            </main>
        </div>
    )
}
