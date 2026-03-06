/**
 * SyndicPulse — Page de connexion
 * Thème: Premium Marocain — Terracotta chaud × Or brûlé
 */

import { useState } from 'react'
import { Eye, EyeOff, ArrowRight, Building2, ShieldCheck, Lock, DatabaseBackup, FileCheck, BadgeCheck, Mail, ChevronLeft, Copy, Check, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { DEMO_USERS, validateResidentAccess } from '../lib/mockData.js'
import { motion, AnimatePresence } from 'framer-motion'

const IS_DEV = import.meta.env.DEV

const TRUST_BADGES = [
    { icon: FileCheck,      label: 'Conforme Loi 18-00'      },
    { icon: BadgeCheck,     label: 'Certifié CNDP Maroc'     },
    { icon: Lock,           label: 'Chiffrement SSL 256-bit'  },
    { icon: DatabaseBackup, label: 'Sauvegarde automatique'   },
]

// ── Palette Marocaine ────────────────────────────────────────────────────────
const TERRA   = '#2d1b0e'   // fond panneau gauche
const GOLD    = '#c9972a'   // accent principal
const GOLD_H  = '#d4a840'   // gold hover
const CREAM   = '#faf8f4'   // fond panneau droit
const CHARCOAL= '#1a1208'   // texte principal droit
const STONE   = '#7a6e62'   // texte secondaire droit
const SAND_IN = '#f0ebe3'   // fond input
const SAND_BR = '#d4c9b8'   // bordure input

export default function LoginPage({ onResidentLogin }) {
    const { login, loginError, setLoginError, loading } = useAuth()

    const [email,       setEmail]       = useState('')
    const [password,    setPassword]    = useState('')
    const [showPwd,     setShowPwd]     = useState(false)
    const [rememberMe,  setRememberMe]  = useState(false)

    const [showForgot,    setShowForgot]    = useState(false)
    const [forgotEmail,   setForgotEmail]   = useState('')
    const [forgotStatus,  setForgotStatus]  = useState(null)
    const [forgotLoading, setForgotLoading] = useState(false)
    const [tempPwd,       setTempPwd]       = useState('')
    const [pwdCopied,     setPwdCopied]     = useState(false)

    const [showResident,    setShowResident]    = useState(false)
    const [residentCode,    setResidentCode]    = useState('')
    const [residentPin,     setResidentPin]     = useState('')
    const [residentError,   setResidentError]   = useState('')
    const [residentLoading, setResidentLoading] = useState(false)

    function openForgot()    { setShowForgot(true);    setForgotEmail(email); setForgotStatus(null); setTempPwd('') }
    function closeForgot()   { setShowForgot(false);   setForgotStatus(null) }
    function openResident()  { setShowResident(true);  setResidentCode(''); setResidentPin(''); setResidentError('') }
    function closeResident() { setShowResident(false); setResidentError('') }

    async function handleForgotSubmit(e) {
        e.preventDefault()
        setForgotLoading(true)
        await new Promise(r => setTimeout(r, 1000))
        const createdUsers = JSON.parse(localStorage.getItem('sp_created_users') ?? '[]')
        const allUsers = [...DEMO_USERS, ...createdUsers]
        const found = allUsers.find(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase())
        if (found) {
            const pwd = Math.random().toString(36).slice(2, 6).toUpperCase() +
                        Math.random().toString(36).slice(2, 6)
            setTempPwd(pwd)
            setForgotStatus('sent')
        } else {
            setForgotStatus('not-found')
        }
        setForgotLoading(false)
    }

    async function handleResidentSubmit(e) {
        e.preventDefault()
        setResidentError('')
        setResidentLoading(true)
        let liveResidentsByBldg = {}
        try {
            const { BUILDINGS } = await import('../lib/mockData.js')
            const matchedBuilding = BUILDINGS.find(
                b => b.accessCode?.toLowerCase() === residentCode.toLowerCase().trim()
            )
            if (matchedBuilding) {
                const { fetchResidents } = await import('../lib/db.js')
                const liveResidents = await fetchResidents(matchedBuilding.id)
                if (liveResidents.length > 0) liveResidentsByBldg = { [matchedBuilding.id]: liveResidents }
            }
        } catch { /* fall through to mock validation */ }
        const result = await validateResidentAccess(residentCode, residentPin, liveResidentsByBldg)
        if (!result) {
            setResidentError('Code ou PIN incorrect. Vérifiez le code de votre résidence et votre PIN à 6 chiffres.')
            setResidentLoading(false)
            return
        }
        setResidentLoading(false)
        onResidentLogin?.({ buildingId: result.building.id, resident: result.resident })
    }

    function copyPwd() {
        navigator.clipboard.writeText(tempPwd).catch(() => {})
        setPwdCopied(true)
        setTimeout(() => setPwdCopied(false), 2000)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        await login(email.trim(), password)
    }

    const panelKey = showResident ? 'resident' : showForgot ? 'forgot' : 'login'

    // ── Styles réutilisables ─────────────────────────────────────────────────
    const inputStyle = {
        background: SAND_IN,
        border: `1.5px solid ${SAND_BR}`,
        color: CHARCOAL,
    }
    const inputFocusClass = "focus:outline-none focus:ring-2 focus:ring-[#c9972a]/40 focus:border-[#c9972a]"
    const inputClass = `w-full rounded-xl px-4 py-3 text-sm placeholder-[#b5a99a] transition-all ${inputFocusClass}`
    const labelClass = "block text-xs font-semibold uppercase tracking-wider mb-2"

    return (
        <div className="min-h-screen flex" style={{ background: CREAM }}>

            {/* ══════════════════════════════════════════
                PANNEAU GAUCHE — Identité & valeurs
            ══════════════════════════════════════════ */}
            <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 relative overflow-hidden"
                style={{ background: TERRA }}>

                {/* Zellige géométrique — fond décoratif */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <pattern id="zellige" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
                            <g fill="none" stroke="#c9972a" strokeWidth="0.45" opacity="0.22">
                                <polygon points="24,1 47,24 24,47 1,24" />
                                <polygon points="24,9 39,24 24,39 9,24" />
                                <line x1="24" y1="1"  x2="24" y2="9"  />
                                <line x1="47" y1="24" x2="39" y2="24" />
                                <line x1="24" y1="47" x2="24" y2="39" />
                                <line x1="1"  y1="24" x2="9"  y2="24" />
                            </g>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#zellige)" />
                </svg>

                {/* Lueurs chaudes */}
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(201,151,42,0.14) 0%, transparent 68%)' }} />
                <div className="absolute bottom-20 left-0 w-72 h-72 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(201,151,42,0.08) 0%, transparent 70%)' }} />

                {/* Arche marocaine décorative */}
                <svg viewBox="0 0 200 260" className="absolute bottom-0 right-[-20px] w-52 h-64 pointer-events-none opacity-[0.07]">
                    <path d="M 20 260 L 20 128 C 20 44 55 4 100 4 C 145 4 180 44 180 128 L 180 260"
                        fill="none" stroke="#c9972a" strokeWidth="7" strokeLinejoin="round"/>
                    <path d="M 38 260 L 38 130 C 38 60 66 22 100 22 C 134 22 162 60 162 130 L 162 260"
                        fill="none" stroke="#c9972a" strokeWidth="3.5"/>
                    <circle cx="100" cy="38" r="10" fill="none" stroke="#c9972a" strokeWidth="3"/>
                    <line x1="100" y1="28" x2="100" y2="18" stroke="#c9972a" strokeWidth="2"/>
                    <line x1="88"  y1="32" x2="82"  y2="24" stroke="#c9972a" strokeWidth="2"/>
                    <line x1="112" y1="32" x2="118" y2="24" stroke="#c9972a" strokeWidth="2"/>
                </svg>

                {/* Logo */}
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(201,151,42,0.18)', border: '1px solid rgba(201,151,42,0.4)' }}>
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                            <rect x="1"  y="5"  width="6"  height="10" rx="0.6" fill={GOLD} fillOpacity="0.4"  stroke={GOLD} strokeWidth="1"/>
                            <rect x="9"  y="2"  width="6"  height="13" rx="0.6" fill={GOLD} fillOpacity="0.6"  stroke={GOLD} strokeWidth="1"/>
                            <rect x="2.5"  y="7"  width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                            <rect x="5"    y="7"  width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                            <rect x="2.5"  y="10" width="1.5" height="1.5" rx="0.3" fill={GOLD} fillOpacity="0.6"/>
                            <rect x="5"    y="10" width="1.5" height="1.5" rx="0.3" fill={GOLD} fillOpacity="0.6"/>
                            <rect x="10.5" y="4"  width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                            <rect x="13"   y="4"  width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                            <rect x="10.5" y="7"  width="1.5" height="1.5" rx="0.3" fill={GOLD} fillOpacity="0.85"/>
                            <rect x="13"   y="7"  width="1.5" height="1.5" rx="0.3" fill={GOLD} fillOpacity="0.85"/>
                            <rect x="10.5" y="10" width="1.5" height="1.5" rx="0.3" fill={GOLD} fillOpacity="0.6"/>
                            <rect x="13"   y="10" width="1.5" height="1.5" rx="0.3" fill={GOLD} fillOpacity="0.6"/>
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">
                        Syndic<span style={{ color: GOLD }}>Pulse</span>
                    </span>
                </div>

                {/* Contenu central */}
                <div className="relative z-10">
                    {/* Ligne décorative or */}
                    <div className="w-10 h-0.5 mb-6 rounded-full" style={{ background: GOLD, opacity: 0.6 }} />

                    <h1 className="text-[2.6rem] font-bold text-white leading-tight mb-5">
                        La gestion de<br />
                        copropriété,<br />
                        <span style={{ color: GOLD }}>maîtrisée à 100%.</span>
                    </h1>
                    <p className="text-base leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        Automatisez les rappels, offrez la transparence financière
                        et gérez les conflits — depuis un seul tableau de bord.
                    </p>

                    {/* Pills */}
                    <div className="flex flex-wrap gap-2 mt-7">
                        {[
                            'Rappels WhatsApp automatiques',
                            'Transparence budgétaire totale',
                            "Gestion d'AG simplifiée",
                            'Conforme Loi 18-00',
                        ].map(f => (
                            <span key={f} className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
                                style={{
                                    background: 'rgba(201,151,42,0.13)',
                                    border: '1px solid rgba(201,151,42,0.32)',
                                    color: 'rgba(255,255,255,0.7)',
                                }}>
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Trust ticker */}
                <div className="relative z-10 overflow-hidden">
                    <style>{`
                        @keyframes trust-ticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
                        .trust-ticker { animation: trust-ticker 18s linear infinite; }
                        .trust-ticker:hover { animation-play-state: paused; }
                    `}</style>
                    <div className="absolute inset-y-0 left-0 w-8 z-10 pointer-events-none"
                        style={{ background: `linear-gradient(to right, ${TERRA}, transparent)` }} />
                    <div className="absolute inset-y-0 right-0 w-8 z-10 pointer-events-none"
                        style={{ background: `linear-gradient(to left, ${TERRA}, transparent)` }} />
                    <div className="trust-ticker flex gap-2.5" style={{ width: 'max-content' }}>
                        {[...TRUST_BADGES, ...TRUST_BADGES].map(({ icon: Icon, label }, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0"
                                style={{ background: 'rgba(201,151,42,0.1)', border: '1px solid rgba(201,151,42,0.18)' }}>
                                <Icon size={11} style={{ color: GOLD }} strokeWidth={1.8} />
                                <span className="text-[10px] font-medium whitespace-nowrap"
                                    style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                PANNEAU DROIT — Formulaire
            ══════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12"
                style={{ background: CREAM }}>

                {/* Logo mobile */}
                <div className="flex items-center gap-2 mb-10 lg:hidden">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(201,151,42,0.15)', border: `1px solid rgba(201,151,42,0.35)` }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="5"  width="6"  height="10" rx="0.6" fill={GOLD} fillOpacity="0.4" stroke={GOLD} strokeWidth="1"/>
                            <rect x="9" y="2"  width="6"  height="13" rx="0.6" fill={GOLD} fillOpacity="0.6" stroke={GOLD} strokeWidth="1"/>
                            <rect x="2.5" y="7"  width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                            <rect x="5"   y="7"  width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                            <rect x="10.5" y="4" width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                            <rect x="13"   y="4" width="1.5" height="1.5" rx="0.3" fill={GOLD}/>
                        </svg>
                    </div>
                    <span className="text-lg font-bold" style={{ color: CHARCOAL }}>
                        Syndic<span style={{ color: GOLD }}>Pulse</span>
                    </span>
                </div>

                <AnimatePresence mode="wait">

                {/* ── Espace résident ── */}
                {panelKey === 'resident' && (
                    <motion.div key="resident"
                        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}
                        className="w-full max-w-sm"
                    >
                        <button onClick={closeResident}
                            className="flex items-center gap-1.5 text-xs font-medium mb-8 transition-colors"
                            style={{ color: STONE }}
                            onMouseEnter={e => e.currentTarget.style.color = CHARCOAL}
                            onMouseLeave={e => e.currentTarget.style.color = STONE}>
                            <ChevronLeft size={14} /> Retour à la connexion
                        </button>

                        <div className="bg-white rounded-2xl p-8 shadow-[0_8px_48px_rgba(26,18,8,0.08)]">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgba(201,151,42,0.12)', border: `1px solid rgba(201,151,42,0.25)` }}>
                                    <Home size={15} style={{ color: GOLD }} />
                                </div>
                                <h2 className="text-xl font-bold" style={{ color: CHARCOAL }}>Espace Résident</h2>
                            </div>
                            <p className="text-sm leading-relaxed mb-6" style={{ color: STONE }}>
                                Entrez le code de votre résidence et votre PIN personnel pour accéder à l'espace de transparence.
                            </p>

                            <form onSubmit={handleResidentSubmit} className="space-y-4">
                                <div>
                                    <label className={labelClass} style={{ color: STONE }}>Code de la résidence</label>
                                    <input type="text" value={residentCode}
                                        onChange={e => { setResidentCode(e.target.value.toUpperCase()); setResidentError('') }}
                                        placeholder="ex : NRWST-2026"
                                        required
                                        className={`${inputClass} font-mono`}
                                        style={inputStyle} />
                                    <p className="text-[10px] mt-1.5" style={{ color: '#b5a99a' }}>Code partagé par le syndic</p>
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: STONE }}>
                                        PIN personnel <span className="normal-case font-normal" style={{ color: '#b5a99a' }}>— 6 chiffres</span>
                                    </label>
                                    <input type="password" inputMode="numeric" maxLength={6} pattern="[0-9]{6}"
                                        value={residentPin}
                                        onChange={e => { setResidentPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setResidentError('') }}
                                        placeholder="••••••"
                                        required
                                        className={`${inputClass} tracking-widest text-center font-mono`}
                                        style={inputStyle} />
                                </div>

                                {residentError && (
                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                                        <span>⚠</span> {residentError}
                                    </motion.div>
                                )}

                                <button type="submit" disabled={residentLoading}
                                    className="w-full py-3 font-bold text-sm rounded-full text-white transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                                    style={{ background: residentLoading ? GOLD : GOLD }}
                                    onMouseEnter={e => !residentLoading && (e.currentTarget.style.background = GOLD_H)}
                                    onMouseLeave={e => e.currentTarget.style.background = GOLD}>
                                    {residentLoading
                                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Vérification…</>
                                        : <>Accéder à mon espace <ArrowRight size={15} /></>
                                    }
                                </button>
                            </form>
                        </div>

                        <p className="mt-5 text-center text-[11px]" style={{ color: '#b5a99a' }}>
                            Votre PIN vous a été communiqué par votre syndic via WhatsApp.
                        </p>
                    </motion.div>
                )}

                {/* ── Mot de passe oublié ── */}
                {panelKey === 'forgot' && (
                    <motion.div key="forgot"
                        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}
                        className="w-full max-w-sm"
                    >
                        <button onClick={closeForgot}
                            className="flex items-center gap-1.5 text-xs font-medium mb-8 transition-colors"
                            style={{ color: STONE }}
                            onMouseEnter={e => e.currentTarget.style.color = CHARCOAL}
                            onMouseLeave={e => e.currentTarget.style.color = STONE}>
                            <ChevronLeft size={14} /> Retour à la connexion
                        </button>

                        <div className="bg-white rounded-2xl p-8 shadow-[0_8px_48px_rgba(26,18,8,0.08)]">
                            <h2 className="text-xl font-bold mb-1" style={{ color: CHARCOAL }}>Mot de passe oublié</h2>
                            <p className="text-sm mb-6" style={{ color: STONE }}>
                                Entrez votre adresse e-mail pour recevoir un mot de passe temporaire.
                            </p>

                            {forgotStatus === null && (
                                <form onSubmit={handleForgotSubmit} className="space-y-4">
                                    <div>
                                        <label className={labelClass} style={{ color: STONE }}>Adresse e-mail</label>
                                        <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                                            placeholder="vous@exemple.ma"
                                            className={inputClass}
                                            style={inputStyle} />
                                    </div>
                                    <button type="submit" disabled={forgotLoading}
                                        className="w-full py-3 font-bold text-sm rounded-full text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                        style={{ background: GOLD }}
                                        onMouseEnter={e => !forgotLoading && (e.currentTarget.style.background = GOLD_H)}
                                        onMouseLeave={e => e.currentTarget.style.background = GOLD}>
                                        {forgotLoading
                                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Vérification…</>
                                            : <><Mail size={15} /> Envoyer le mot de passe temporaire</>
                                        }
                                    </button>
                                </form>
                            )}

                            {forgotStatus === 'sent' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                                        <p className="text-sm font-semibold text-emerald-700 mb-1">Mot de passe envoyé ✓</p>
                                        <p className="text-xs text-emerald-600">Envoyé à <span className="font-semibold">{forgotEmail}</span>. Veuillez le changer après connexion.</p>
                                    </div>
                                    <div className="rounded-xl p-4" style={{ background: SAND_IN, border: `1px solid ${SAND_BR}` }}>
                                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: STONE }}>Mot de passe temporaire</p>
                                        <div className="flex items-center justify-between gap-3">
                                            <code className="text-base font-bold tracking-widest" style={{ color: GOLD }}>{tempPwd}</code>
                                            <button onClick={copyPwd} className="p-2 rounded-lg transition-colors flex-shrink-0"
                                                style={{ background: 'rgba(201,151,42,0.1)', color: GOLD }}>
                                                {pwdCopied ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={closeForgot}
                                        className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
                                        style={{ background: SAND_IN, color: STONE }}>
                                        Retour à la connexion
                                    </button>
                                </div>
                            )}

                            {forgotStatus === 'not-found' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                                        <p className="text-sm font-semibold text-amber-700 mb-1">Compte introuvable</p>
                                        <p className="text-xs text-amber-600 leading-relaxed">
                                            L'adresse <span className="font-semibold">{forgotEmail}</span> n'est associée à aucun compte SyndicPulse.
                                        </p>
                                    </div>
                                    <div className="rounded-xl p-4 text-center" style={{ background: SAND_IN, border: `1px solid ${SAND_BR}` }}>
                                        <p className="text-xs mb-3" style={{ color: STONE }}>Vous souhaitez rejoindre la plateforme ?</p>
                                        <a href={`mailto:support@syndicpulse.ma?subject=Demande d'accès SyndicPulse&body=Bonjour, je souhaite obtenir un accès à SyndicPulse. Mon email : ${forgotEmail}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-colors"
                                            style={{ background: 'rgba(201,151,42,0.1)', color: GOLD, borderColor: 'rgba(201,151,42,0.3)' }}>
                                            <Mail size={13} /> Contacter support@syndicpulse.ma
                                        </a>
                                        <p className="text-[10px] mt-2" style={{ color: '#b5a99a' }}>Notre équipe vous contactera dans les 24h.</p>
                                    </div>
                                    <button onClick={() => setForgotStatus(null)}
                                        className="w-full py-2.5 text-xs font-medium transition-colors"
                                        style={{ color: STONE }}>
                                        ← Réessayer avec un autre email
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Formulaire de connexion ── */}
                {panelKey === 'login' && (
                <motion.div key="login"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-sm"
                >
                    {/* Carte formulaire */}
                    <div className="bg-white rounded-2xl p-8 shadow-[0_8px_48px_rgba(26,18,8,0.08)]">

                        {/* En-tête */}
                        <div className="mb-7">
                            <div className="w-8 h-0.5 rounded-full mb-4" style={{ background: GOLD }} />
                            <h2 className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>Connexion</h2>
                            <p className="text-sm" style={{ color: STONE }}>
                                Gérez votre résidence avec intelligence.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Email */}
                            <div>
                                <label className={labelClass} style={{ color: STONE }}>Adresse e-mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setLoginError('') }}
                                    placeholder="vous@exemple.ma"
                                    required
                                    className={inputClass}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Mot de passe */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`${labelClass} !mb-0`} style={{ color: STONE }}>Mot de passe</label>
                                    <button type="button" onClick={openForgot}
                                        className="text-[11px] font-medium transition-colors"
                                        style={{ color: GOLD }}
                                        onMouseEnter={e => e.currentTarget.style.color = GOLD_H}
                                        onMouseLeave={e => e.currentTarget.style.color = GOLD}>
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setLoginError('') }}
                                        placeholder="••••••••"
                                        required
                                        className={`${inputClass} pr-11`}
                                        style={inputStyle}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                                        style={{ color: '#b5a99a' }}
                                        onMouseEnter={e => e.currentTarget.style.color = STONE}
                                        onMouseLeave={e => e.currentTarget.style.color = '#b5a99a'}>
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Rester connecté */}
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setRememberMe(v => !v)}
                                    className="w-4 h-4 rounded transition-all flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: rememberMe ? GOLD : 'transparent',
                                        border: `1.5px solid ${rememberMe ? GOLD : SAND_BR}`,
                                    }}>
                                    {rememberMe && <span className="text-white text-[9px] font-black">✓</span>}
                                </button>
                                <span className="text-xs" style={{ color: STONE }}>Rester connecté</span>
                            </div>

                            {/* Erreur */}
                            {loginError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                                    <span>⚠</span> {loginError}
                                </motion.div>
                            )}

                            {/* CTA */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 font-bold text-sm rounded-full text-white transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ background: GOLD, boxShadow: '0 4px 20px rgba(201,151,42,0.35)' }}
                                onMouseEnter={e => !loading && (e.currentTarget.style.background = GOLD_H)}
                                onMouseLeave={e => e.currentTarget.style.background = GOLD}>
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Connexion en cours...
                                    </>
                                ) : (
                                    <>Se connecter <ArrowRight size={16} /></>
                                )}
                            </button>
                        </form>

                        {/* Lien résident */}
                        <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: SAND_BR }}>
                            <p className="text-xs mb-2.5" style={{ color: '#b5a99a' }}>Vous êtes résident·e ?</p>
                            <button onClick={openResident}
                                className="text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors"
                                style={{ color: GOLD }}
                                onMouseEnter={e => e.currentTarget.style.color = GOLD_H}
                                onMouseLeave={e => e.currentTarget.style.color = GOLD}>
                                <Building2 size={12} /> Accéder à mon espace résident →
                            </button>
                        </div>
                    </div>

                    {/* Note sécurité */}
                    <div className="mt-5 flex items-center justify-center gap-2 text-[11px]" style={{ color: '#b5a99a' }}>
                        <ShieldCheck size={12} />
                        Données chiffrées · Conforme CNDP Maroc
                    </div>
                </motion.div>
                )}

                </AnimatePresence>
            </div>

        </div>
    )
}
