/**
 * SyndicPulse — Root application
 *
 * Auth routing:
 *   - Not logged in    → LoginPage
 *   - super_admin      → Full dashboard + building switcher
 *   - syndic_manager   → Dashboard scoped to their building, no switcher
 */

import { useState, useRef, useEffect } from 'react'
import {
    LayoutDashboard, BarChart3, Users, MessageSquare,
    Settings, Bell, Mic, ChevronDown, ChevronRight,
    TrendingUp, ShieldCheck, Building2, Landmark, Leaf,
    Zap, ArrowUpRight, ArrowDownRight, CheckCircle2,
    Clock, XCircle, Search, MoreHorizontal,
    CreditCard, Wrench, Phone, Mail, Activity, LogOut,
    Plus, X, Upload, FileText, Check, Download,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AIVoiceAgent from './components/AIVoiceAgent.jsx'

import {
    RESIDENTS_BLD1, TICKETS_BLD1, EXPENSES_BLD1, DISPUTES_BLD1,
    RECENT_PAYMENTS_BLD1, COLLECTION_HISTORY_BLD1,
    RESIDENTS_BLD2, TICKETS_BLD2, EXPENSES_BLD2, DISPUTES_BLD2,
    RECENT_PAYMENTS_BLD2, COLLECTION_HISTORY_BLD2,
    RESIDENTS_BLD3, TICKETS_BLD3, EXPENSES_BLD3, DISPUTES_BLD3,
    RECENT_PAYMENTS_BLD3, COLLECTION_HISTORY_BLD3,
} from './lib/mockData.js'

/* ── Nav items ── */
const NAV = [
    { id: 'dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'financials', label: 'Finances',         icon: BarChart3 },
    { id: 'residents',  label: 'Résidents',        icon: Users },
    { id: 'disputes',   label: 'Litiges',          icon: MessageSquare },
]

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

    if (loading) return <LoadingScreen />
    if (!user)   return <LoginPage />
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

    const buildingData = getBuildingData(activeBuilding?.id)

    if (!activeBuilding) return <LoadingScreen />

    function showToast(message, type = 'success') {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    return (
        <div className="flex h-screen bg-navy-900 text-slate-100 font-sans overflow-hidden">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeBuilding={activeBuilding}
                buildings={accessibleBuildings}
                canSwitchBuildings={canSwitchBuildings}
                showBuildingMenu={showBuildingMenu}
                setShowBuildingMenu={setShowBuildingMenu}
                onSwitchBuilding={(b) => {
                    setActiveBuilding(b)
                    setShowBuildingMenu(false)
                    setActiveTab('dashboard')
                }}
                setIsVoiceOpen={setIsVoiceOpen}
                buildingData={buildingData}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar activeTab={activeTab} activeBuilding={activeBuilding} />
                <main className="flex-1 overflow-auto p-8">
                    {activeTab === 'dashboard'  && <DashboardPage  building={activeBuilding} data={buildingData} setIsVoiceOpen={setIsVoiceOpen} />}
                    {activeTab === 'financials' && <FinancialsPage building={activeBuilding} data={buildingData} showToast={showToast} />}
                    {activeTab === 'residents'  && <ResidentsPage  building={activeBuilding} data={buildingData} showToast={showToast} />}
                    {activeTab === 'disputes'   && <DisputesPage   building={activeBuilding} data={buildingData} />}
                </main>
            </div>

            <AIVoiceAgent isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />

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
    }
    if (buildingId === 'bld-2') return {
        residents:         RESIDENTS_BLD2,
        tickets:           TICKETS_BLD2,
        expenses:          EXPENSES_BLD2,
        disputes:          DISPUTES_BLD2,
        recentPayments:    RECENT_PAYMENTS_BLD2,
        collectionHistory: COLLECTION_HISTORY_BLD2,
    }
    if (buildingId === 'bld-3') return {
        residents:         RESIDENTS_BLD3,
        tickets:           TICKETS_BLD3,
        expenses:          EXPENSES_BLD3,
        disputes:          DISPUTES_BLD3,
        recentPayments:    RECENT_PAYMENTS_BLD3,
        collectionHistory: COLLECTION_HISTORY_BLD3,
    }
    return {
        residents: [], tickets: [], expenses: [], disputes: [],
        recentPayments: [], collectionHistory: [],
    }
}

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
function Sidebar({ activeTab, setActiveTab, activeBuilding, buildings, canSwitchBuildings, showBuildingMenu, setShowBuildingMenu, onSwitchBuilding, setIsVoiceOpen, buildingData }) {
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

    const openDisputeCount = (buildingData?.disputes ?? []).filter(d => d.status === 'open').length

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
                                    <button className="text-[11px] text-sp hover:text-sp-light transition-colors flex items-center gap-1">
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
                {NAV.map(item => {
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

                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-navy-700 transition-all">
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
function TopBar({ activeTab, activeBuilding }) {
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
                <button className="relative p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-white/5 transition-colors">
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
function DashboardPage({ building, data, setIsVoiceOpen }) {
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
                        <button className="text-xs text-sp hover:text-sp-light flex items-center gap-1 transition-colors">
                            Voir planning <ChevronRight size={13} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {data.tickets.map(t => (
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
                    <div className="glass-card p-6 flex-1 relative overflow-hidden border-sp/15"
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
                    <button className="text-xs text-sp hover:text-sp-light flex items-center gap-1 transition-colors">
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
        </div>
    )
}

/* ══════════════════════════════════════════
   FINANCIALS PAGE
══════════════════════════════════════════ */
function FinancialsPage({ building, data, showToast }) {
    const maxBar = Math.max(...data.collectionHistory.map(h => h.value))

    /* Local state so new entries appear immediately in the demo */
    const [residents,   setResidents]  = useState(data.residents)
    const [expenseLog,  setExpenseLog] = useState(INITIAL_EXPENSE_LOG)
    const [showAddExp,  setShowAddExp] = useState(false)
    const [showRecPay,  setShowRecPay] = useState(false)

    const overdue = residents.filter(r => r.status === 'overdue').map(r => ({
        id: r.id, unit: r.unit, name: r.name, months: 2, amount: '1 700 MAD',
    }))

    function handleAddExpense(entry) {
        setExpenseLog(prev => [{ ...entry, id: `el-${Date.now()}` }, ...prev])
        showToast(`Dépense enregistrée — ${entry.amount.toLocaleString('fr-FR')} MAD`)
    }

    function handleMarkPaid(residentId) {
        setResidents(prev => prev.map(r => r.id === residentId ? { ...r, status: 'paid' } : r))
        showToast('Paiement enregistré — statut mis à jour')
    }

    const totalExpenseLog = expenseLog.reduce((s, e) => s + e.amount, 0)

    return (
        <div className="space-y-8">
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-5">
                {[
                    { label: 'Total encaissé (Fév.)', value: '39 100 MAD', sub: `${residents.filter(r => r.status === 'paid').length} / ${building.total_units} unités payées`, color: 'emerald' },
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

            {/* Action bar */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowAddExp(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all shadow-glow-cyan"
                >
                    <Plus size={15} /> Ajouter une dépense
                </button>
                <button
                    onClick={() => setShowRecPay(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all"
                >
                    <CheckCircle2 size={15} /> Enregistrer un paiement
                </button>
                <span className="ml-auto text-xs text-slate-500">
                    {expenseLog.length} dépenses · {totalExpenseLog.toLocaleString('fr-FR')} MAD total
                </span>
            </div>

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
                        <button className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1.5">
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
                                            <button className="text-[11px] text-sp hover:text-sp-light transition-colors flex items-center gap-1">
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

            {/* Expense journal */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="font-bold text-white">Journal des dépenses</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Toutes les transactions — visible aux résidents</p>
                    </div>
                    <button
                        onClick={() => setShowAddExp(true)}
                        className="flex items-center gap-1.5 text-xs text-sp hover:text-sp-light transition-colors"
                    >
                        <Plus size={13} /> Nouvelle dépense
                    </button>
                </div>
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
                        {expenseLog.map((e) => (
                            <motion.tr
                                key={e.id}
                                initial={e.isNew ? { opacity: 0, y: -8 } : false}
                                animate={{ opacity: 1, y: 0 }}
                                className={`hover:bg-navy-700/40 transition-colors ${e.isNew ? 'bg-sp/5' : ''}`}
                            >
                                <td className="py-3 text-slate-400 text-xs">{e.date}</td>
                                <td className="py-3 text-xs font-medium text-slate-300">{e.category}</td>
                                <td className="py-3 text-slate-300 text-xs">{e.vendor}</td>
                                <td className="py-3 text-slate-500 text-xs max-w-xs truncate">{e.description}</td>
                                <td className="py-3 text-right font-semibold text-white text-xs">
                                    {e.amount.toLocaleString('fr-FR')} MAD
                                </td>
                                <td className="py-3">
                                    {e.hasInvoice
                                        ? <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold"><FileText size={11} /> Jointe</span>
                                        : <span className="text-[10px] text-slate-600">—</span>
                                    }
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showAddExp && (
                    <AddExpenseModal onClose={() => setShowAddExp(false)} onAdd={handleAddExpense} />
                )}
                {showRecPay && (
                    <RecordPaymentModal residents={residents} onClose={() => setShowRecPay(false)} onRecord={handleMarkPaid} />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   RESIDENTS PAGE
══════════════════════════════════════════ */
function ResidentsPage({ building, data, showToast }) {
    const [residents,        setResidents]       = useState(data.residents)
    const [search,           setSearch]          = useState('')
    const [filter,           setFilter]          = useState('all')
    const [showAddResident,  setShowAddResident] = useState(false)
    const [showImportCSV,    setShowImportCSV]   = useState(false)

    const filtered = residents.filter(r => {
        const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                            r.unit.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || r.status === filter
        return matchSearch && matchFilter
    })

    const counts = {
        all:     residents.length,
        paid:    residents.filter(r => r.status === 'paid').length,
        pending: residents.filter(r => r.status === 'pending').length,
        overdue: residents.filter(r => r.status === 'overdue').length,
    }

    const filterLabels = { all: 'Tous', paid: 'Payés', pending: 'En attente', overdue: 'En retard' }

    function handleAddResident(r) {
        setResidents(prev => [r, ...prev])
        showToast(`${r.name} ajouté(e) — invitation WhatsApp envoyée`)
    }

    function handleImport(newResidents) {
        setResidents(prev => [...prev, ...newResidents])
        showToast(`${newResidents.length} résidents importés avec succès`)
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
                        {filtered.map(r => (
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
                                <td className="px-6 py-3.5"><PaymentBadge status={r.status} /></td>
                                <td className="px-6 py-3.5">
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ActionBtn icon={<Phone size={12} />} />
                                        <ActionBtn icon={<Mail size={12} />} />
                                        <ActionBtn icon={<MoreHorizontal size={12} />} />
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
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showAddResident && (
                    <AddResidentModal onClose={() => setShowAddResident(false)} onAdd={handleAddResident} />
                )}
                {showImportCSV && (
                    <ImportCSVModal onClose={() => setShowImportCSV(false)} onImport={handleImport} />
                )}
            </AnimatePresence>
        </div>
    )
}

/* ══════════════════════════════════════════
   DISPUTES PAGE
══════════════════════════════════════════ */
function DisputesPage({ building, data }) {
    const statusInfo = {
        open:      { label: 'Ouvert',    cls: 'bg-red-500/15 text-red-400 border-red-500/20'             },
        mediation: { label: 'Médiation', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20'       },
        resolved:  { label: 'Résolu',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    }
    const priorityColor = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-slate-400' }
    const priorityLabel = { high: 'ÉLEVÉ', medium: 'MOYEN', low: 'FAIBLE' }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-5">
                {['open', 'mediation', 'resolved'].map(s => (
                    <div key={s} className="glass-card p-5 flex items-center gap-4">
                        <div className={`text-3xl font-bold ${statusInfo[s].cls.split(' ').find(c => c.startsWith('text-'))}`}>
                            {data.disputes.filter(d => d.status === s).length}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-200">{statusInfo[s].label}</p>
                            <p className="text-[11px] text-slate-400">{building.name} · {building.city}</p>
                        </div>
                    </div>
                ))}
            </div>

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
                <button className="ml-auto text-xs bg-sp/10 text-sp border border-sp/20 px-4 py-2 rounded-lg hover:bg-sp/20 transition-colors flex-shrink-0">
                    Voir les logs IA
                </button>
            </div>

            <div className="space-y-4">
                {data.disputes.map(d => (
                    <div key={d.id} className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-[11px] text-slate-500 bg-navy-700 px-2 py-0.5 rounded">{d.id}</span>
                                <h3 className="font-semibold text-white">{d.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityColor[d.priority]}`}>
                                    {priorityLabel[d.priority]}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${statusInfo[d.status].cls}`}>
                                    {statusInfo[d.status].label}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {d.parties.map(p => (
                                <span key={p} className="text-xs bg-navy-700 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5">{p}</span>
                            ))}
                        </div>

                        <div className="bg-navy-700/60 rounded-xl p-4 border border-sp/8">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={12} className="text-sp" />
                                <span className="text-[10px] font-bold text-sp uppercase tracking-wider">Suggestion IA</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{d.ai_suggestion}</p>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Clock size={11} /> {d.date}
                            </span>
                            {d.status !== 'resolved' && (
                                <div className="flex gap-2">
                                    <button className="text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors">
                                        Voir détails
                                    </button>
                                    <button className="text-xs bg-sp/10 text-sp border border-sp/20 px-3 py-1.5 rounded-lg hover:bg-sp/20 transition-colors flex items-center gap-1">
                                        <Mic size={11} /> Médiation IA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
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
function AddExpenseModal({ onClose, onAdd }) {
    const [form, setForm] = useState({
        category:    EXPENSE_CATEGORIES[0].label,
        amount:      '',
        vendor:      '',
        date:        new Date().toISOString().slice(0, 10),
        description: '',
        hasInvoice:  false,
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Montant requis'
        if (!form.vendor.trim())                       errs.vendor = 'Fournisseur requis'
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
                    <input
                        type="text" placeholder="ex: Otis Morocco, ProNettoyage SARL…"
                        value={form.vendor}
                        onChange={e => { set('vendor', e.target.value); setErrors(p => ({ ...p, vendor: null })) }}
                        className={`w-full bg-navy-700 border rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors ${errors.vendor ? 'border-red-500/50' : 'border-white/10 focus:border-sp/40'}`}
                    />
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

/* ══════════════════════════════════════════
   RECORD PAYMENT MODAL
══════════════════════════════════════════ */
function RecordPaymentModal({ residents, onClose, onRecord }) {
    const eligible = residents.filter(r => r.status !== 'paid')
    const [form, setForm] = useState({
        residentId: eligible[0]?.id ?? '',
        amount:     '850',
        method:     'especes',
        date:       new Date().toISOString().slice(0, 10),
        ref:        '',
    })
    const [saving, setSaving] = useState(false)

    function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

    if (eligible.length === 0) {
        return (
            <Modal title="Enregistrer un paiement" onClose={onClose}>
                <div className="text-center py-8">
                    <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-300 font-semibold">Tous les résidents sont à jour !</p>
                    <p className="text-xs text-slate-500 mt-1">Aucun paiement en attente ou en retard.</p>
                    <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-navy-700 text-slate-200 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                        Fermer
                    </button>
                </div>
            </Modal>
        )
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setSaving(true)
        await new Promise(r => setTimeout(r, 900))
        onRecord(form.residentId)
        setSaving(false)
        onClose()
    }

    return (
        <Modal
            title="Enregistrer un paiement"
            subtitle="Le statut du résident sera mis à jour immédiatement"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Résident *</label>
                    <select
                        value={form.residentId}
                        onChange={e => set('residentId', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors"
                    >
                        {eligible.map(r => (
                            <option key={r.id} value={r.id}>{r.unit} — {r.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Montant (MAD) *</label>
                        <input
                            type="number" value={form.amount}
                            onChange={e => set('amount', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date de réception</label>
                        <input
                            type="date" value={form.date}
                            onChange={e => set('date', e.target.value)}
                            className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sp/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mode de paiement</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'especes',  label: 'Espèces'  },
                            { value: 'virement', label: 'Virement' },
                            { value: 'cheque',   label: 'Chèque'   },
                        ].map(m => (
                            <button
                                type="button" key={m.value}
                                onClick={() => set('method', m.value)}
                                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    form.method === m.value
                                        ? 'bg-sp/15 border-sp/40 text-sp'
                                        : 'bg-navy-700 border-white/8 text-slate-400 hover:border-sp/20'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Référence / N° reçu</label>
                    <input
                        type="text" placeholder="Optionnel"
                        value={form.ref}
                        onChange={e => set('ref', e.target.value)}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sp/40 transition-colors"
                    />
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
            floor:  parseInt(form.floor) || 0,
            status: 'pending',
            since:  new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
            type:   form.type,
            isNew:  true,
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
   IMPORT CSV MODAL  (3-step wizard)
══════════════════════════════════════════ */
function ImportCSVModal({ onClose, onImport }) {
    const [step,      setStep]      = useState(1)
    const [fileName,  setFileName]  = useState('')
    const [importing, setImporting] = useState(false)
    const fileRef = useRef(null)

    function handleFile(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        setTimeout(() => setStep(2), 300)
    }

    async function handleImport() {
        setImporting(true)
        await new Promise(r => setTimeout(r, 1500))
        onImport(CSV_SAMPLE.map((row, i) => ({
            id:     `csv-${Date.now()}-${i}`,
            unit:   row.unite,
            name:   row.nom,
            phone:  row.telephone,
            floor:  parseInt(row.etage),
            status: 'pending',
            since:  'Fév. 2026',
            type:   row.type.toLowerCase(),
            isNew:  true,
        })))
        setImporting(false)
        setStep(3)
    }

    const COLUMNS = [
        { csv: 'nom',       mapped: 'Nom complet'       },
        { csv: 'telephone', mapped: 'Téléphone WhatsApp' },
        { csv: 'unite',     mapped: 'Unité'              },
        { csv: 'etage',     mapped: 'Étage'              },
        { csv: 'type',      mapped: 'Type de résident'   },
    ]

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
                            <p className="text-[11px] text-slate-600 mt-1">Excel (.xlsx) · CSV · max 10 Mo</p>
                        </div>
                        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                    </div>
                    <div className="mt-4 flex items-center justify-between px-1">
                        <p className="text-xs text-slate-500">Vous avez un fichier existant ?</p>
                        <button className="text-xs text-sp hover:text-sp-light flex items-center gap-1.5 transition-colors">
                            <Download size={12} /> Télécharger le modèle Excel
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
                            <p className="text-sm font-medium text-slate-200 truncate">{fileName || 'residents_norwest.xlsx'}</p>
                            <p className="text-[11px] text-slate-500">3 résidents détectés · 5 colonnes mappées automatiquement</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                            Valide
                        </span>
                    </div>

                    {/* Column mapping */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2.5">Correspondance des colonnes</p>
                        <div className="space-y-2">
                            {COLUMNS.map(col => (
                                <div key={col.csv} className="flex items-center gap-3 text-xs">
                                    <span className="font-mono text-slate-500 bg-navy-700 px-2 py-1 rounded text-[11px] w-24 text-center">{col.csv}</span>
                                    <ChevronRight size={10} className="text-slate-600 flex-shrink-0" />
                                    <span className="text-slate-300 font-medium flex-1">{col.mapped}</span>
                                    <Check size={12} className="text-emerald-400 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data preview */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2.5">Aperçu des données importées</p>
                        <div className="rounded-xl border border-white/8 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-navy-700">
                                        {['Unité', 'Nom', 'Téléphone', 'Ét.', 'Type'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {CSV_SAMPLE.map((row, i) => (
                                        <tr key={i} className="hover:bg-navy-700/40">
                                            <td className="px-3 py-2.5 font-mono text-sp font-semibold">{row.unite}</td>
                                            <td className="px-3 py-2.5 text-slate-200">{row.nom}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.telephone}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.etage}</td>
                                            <td className="px-3 py-2.5 text-slate-400">{row.type}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep(1)}
                            className="flex-1 py-2.5 bg-navy-700 text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors border border-white/8">
                            Retour
                        </button>
                        <button onClick={handleImport} disabled={importing}
                            className="flex-1 py-2.5 bg-sp hover:bg-sp-dark text-navy-900 rounded-xl text-sm font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                            {importing
                                ? <><Spinner /> Importation en cours…</>
                                : 'Importer 3 résidents'
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
                        <p className="text-lg font-bold text-white">3 résidents importés !</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Ils apparaissent dans la liste avec le statut{' '}
                            <span className="text-amber-400 font-semibold">En attente</span>.
                        </p>
                    </div>
                    <div className="bg-navy-700 rounded-xl p-4 text-left space-y-2.5 border border-white/5">
                        {CSV_SAMPLE.map((row, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-sm">
                                <span className="font-mono text-[11px] text-sp bg-sp/10 px-1.5 py-0.5 rounded flex-shrink-0">{row.unite}</span>
                                <span className="text-slate-200">{row.nom}</span>
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
const BUILDING_ICON_MAP = { Building2, Landmark, Leaf }

function BuildingAvatar({ building, size = 'sm' }) {
    const dim      = size === 'sm' ? 'w-8 h-8'  : 'w-10 h-10'
    const iconSize = size === 'sm' ? 15          : 18
    const Icon     = BUILDING_ICON_MAP[building.icon] ?? Building2
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

function ActionBtn({ icon }) {
    return (
        <button className="p-1.5 rounded-lg bg-navy-600 hover:bg-sp/20 text-slate-400 hover:text-sp transition-all">
            {icon}
        </button>
    )
}
