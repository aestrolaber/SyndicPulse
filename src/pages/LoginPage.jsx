/**
 * SyndicPulse — Page de connexion
 * Thème: Dark Premium 2.0 — Navy profond × Cyan électrique
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

// ── Palette Dark Premium 2.0 ────────────────────────────────────────────────
const NAVY_BG   = '#080d1a'              // fond principal très sombre
const NAVY_SIDE = '#060c16'              // fond panneau gauche (légèrement plus sombre)
const NAVY_CARD = '#0d1629'             // fond carte formulaire
const NAVY_IN   = '#111d35'             // fond input
const CYAN      = '#06b6d4'             // accent principal
const CYAN_H    = '#22d3ee'             // cyan hover
const WHITE     = '#e8f0ff'             // texte principal (blanc légèrement bleuté)
const MUTED     = 'rgba(148,163,200,0.65)'  // texte secondaire
const IN_BORDER = 'rgba(6,182,212,0.18)'    // bordure input au repos
const IN_FOCUS  = 'rgba(6,182,212,0.50)'    // bordure input focus

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
    const inputStyle = { background: NAVY_IN, border: `1.5px solid ${IN_BORDER}`, color: WHITE }
    const inputClass = "w-full rounded-full px-5 py-3 text-sm transition-all focus:outline-none"
    const labelClass = "block text-xs font-medium mb-2"

    return (
        <div className="min-h-screen flex" style={{ background: NAVY_BG }}>

            {/* ══════════════════════════════════════════
                PANNEAU GAUCHE — Identité & valeurs
            ══════════════════════════════════════════ */}
            <div className="hidden lg:flex flex-col justify-between w-[44%] p-12 relative overflow-hidden"
                style={{ background: NAVY_SIDE }}>

                {/* Grille de points subtile */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035]">
                    <defs>
                        <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                            <circle cx="1.5" cy="1.5" r="1.5" fill="#06b6d4" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#dots)" />
                </svg>

                {/* Lueurs cyan */}
                <div className="absolute top-[-80px] right-[-60px] w-[480px] h-[480px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)' }} />
                <div className="absolute bottom-20 left-[-40px] w-72 h-72 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)' }} />

                {/* Ligne décorative verticale */}
                <div className="absolute top-0 right-0 w-px h-full"
                    style={{ background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.15) 30%, rgba(6,182,212,0.15) 70%, transparent)' }} />

                {/* Logo */}
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)' }}>
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                            <rect x="1"  y="5"  width="6"  height="10" rx="0.6" fill={CYAN} fillOpacity="0.35" stroke={CYAN} strokeWidth="0.9"/>
                            <rect x="9"  y="2"  width="6"  height="13" rx="0.6" fill={CYAN} fillOpacity="0.55" stroke={CYAN} strokeWidth="0.9"/>
                            <rect x="2.5"  y="7"  width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                            <rect x="5"    y="7"  width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                            <rect x="2.5"  y="10" width="1.5" height="1.5" rx="0.3" fill={CYAN} fillOpacity="0.55"/>
                            <rect x="5"    y="10" width="1.5" height="1.5" rx="0.3" fill={CYAN} fillOpacity="0.55"/>
                            <rect x="10.5" y="4"  width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                            <rect x="13"   y="4"  width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                            <rect x="10.5" y="7"  width="1.5" height="1.5" rx="0.3" fill={CYAN} fillOpacity="0.8"/>
                            <rect x="13"   y="7"  width="1.5" height="1.5" rx="0.3" fill={CYAN} fillOpacity="0.8"/>
                            <rect x="10.5" y="10" width="1.5" height="1.5" rx="0.3" fill={CYAN} fillOpacity="0.5"/>
                            <rect x="13"   y="10" width="1.5" height="1.5" rx="0.3" fill={CYAN} fillOpacity="0.5"/>
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight" style={{ color: WHITE }}>
                        Syndic<span style={{ color: CYAN }}>Pulse</span>
                    </span>
                </div>

                {/* Contenu central */}
                <div className="relative z-10">
                    <div className="w-10 h-0.5 mb-7 rounded-full" style={{ background: CYAN, opacity: 0.6 }} />
                    <h1 className="text-[2.7rem] font-bold leading-tight mb-5" style={{ color: WHITE }}>
                        La gestion de<br />
                        copropriété,<br />
                        <span style={{ color: CYAN }}>maîtrisée à 100%.</span>
                    </h1>
                    <p className="text-base leading-relaxed max-w-xs" style={{ color: MUTED }}>
                        Automatisez les rappels, offrez la transparence financière
                        et gérez les conflits — depuis un seul tableau de bord.
                    </p>

                    {/* Pills fonctionnalités */}
                    <div className="flex flex-wrap gap-2 mt-7">
                        {[
                            'Rappels WhatsApp automatiques',
                            'Transparence budgétaire totale',
                            "Gestion d'AG simplifiée",
                            'Conforme Loi 18-00',
                        ].map(f => (
                            <span key={f} className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
                                style={{
                                    background: 'rgba(6,182,212,0.08)',
                                    border: '1px solid rgba(6,182,212,0.22)',
                                    color: 'rgba(232,240,255,0.65)',
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
                        style={{ background: `linear-gradient(to right, ${NAVY_SIDE}, transparent)` }} />
                    <div className="absolute inset-y-0 right-0 w-8 z-10 pointer-events-none"
                        style={{ background: `linear-gradient(to left, ${NAVY_SIDE}, transparent)` }} />
                    <div className="trust-ticker flex gap-2.5" style={{ width: 'max-content' }}>
                        {[...TRUST_BADGES, ...TRUST_BADGES].map(({ icon: Icon, label }, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0"
                                style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.14)' }}>
                                <Icon size={11} style={{ color: CYAN }} strokeWidth={1.8} />
                                <span className="text-[10px] font-medium whitespace-nowrap"
                                    style={{ color: 'rgba(232,240,255,0.4)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                PANNEAU DROIT — Formulaire
            ══════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12"
                style={{ background: NAVY_BG }}>

                {/* Logo mobile */}
                <div className="flex items-center gap-2 mb-10 lg:hidden">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(6,182,212,0.12)', border: `1px solid rgba(6,182,212,0.28)` }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="5"  width="6"  height="10" rx="0.6" fill={CYAN} fillOpacity="0.35" stroke={CYAN} strokeWidth="0.9"/>
                            <rect x="9" y="2"  width="6"  height="13" rx="0.6" fill={CYAN} fillOpacity="0.55" stroke={CYAN} strokeWidth="0.9"/>
                            <rect x="2.5" y="7"  width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                            <rect x="5"   y="7"  width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                            <rect x="10.5" y="4" width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                            <rect x="13"   y="4" width="1.5" height="1.5" rx="0.3" fill={CYAN}/>
                        </svg>
                    </div>
                    <span className="text-lg font-bold" style={{ color: WHITE }}>
                        Syndic<span style={{ color: CYAN }}>Pulse</span>
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
                            style={{ color: MUTED }}
                            onMouseEnter={e => e.currentTarget.style.color = WHITE}
                            onMouseLeave={e => e.currentTarget.style.color = MUTED}>
                            <ChevronLeft size={14} /> Retour à la connexion
                        </button>

                        <div className="rounded-2xl p-8" style={{ background: NAVY_CARD, border: `1px solid rgba(6,182,212,0.12)` }}>
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgba(6,182,212,0.12)', border: `1px solid rgba(6,182,212,0.22)` }}>
                                    <Home size={15} style={{ color: CYAN }} />
                                </div>
                                <h2 className="text-xl font-bold" style={{ color: WHITE }}>Espace Résident</h2>
                            </div>
                            <p className="text-sm leading-relaxed mb-6" style={{ color: MUTED }}>
                                Entrez le code de votre résidence et votre PIN personnel pour accéder à l'espace de transparence.
                            </p>

                            <form onSubmit={handleResidentSubmit} className="space-y-4">
                                <div>
                                    <label className={labelClass} style={{ color: MUTED }}>Code de la résidence</label>
                                    <input type="text" value={residentCode}
                                        onChange={e => { setResidentCode(e.target.value.toUpperCase()); setResidentError('') }}
                                        placeholder="ex : NRWST-2026"
                                        required
                                        className={`${inputClass} font-mono`}
                                        style={{ ...inputStyle, caretColor: CYAN }}
                                        onFocus={e => e.currentTarget.style.border = `1.5px solid ${IN_FOCUS}`}
                                        onBlur={e => e.currentTarget.style.border = `1.5px solid ${IN_BORDER}`} />
                                    <p className="text-[10px] mt-1.5" style={{ color: 'rgba(148,163,200,0.4)' }}>Code partagé par le syndic</p>
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: MUTED }}>
                                        PIN personnel <span className="font-normal" style={{ color: 'rgba(148,163,200,0.4)' }}>— 6 chiffres</span>
                                    </label>
                                    <input type="password" inputMode="numeric" maxLength={6} pattern="[0-9]{6}"
                                        value={residentPin}
                                        onChange={e => { setResidentPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setResidentError('') }}
                                        placeholder="••••••"
                                        required
                                        className={`${inputClass} tracking-widest text-center font-mono`}
                                        style={{ ...inputStyle, caretColor: CYAN }}
                                        onFocus={e => e.currentTarget.style.border = `1.5px solid ${IN_FOCUS}`}
                                        onBlur={e => e.currentTarget.style.border = `1.5px solid ${IN_BORDER}`} />
                                </div>

                                {residentError && (
                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                                        <span>⚠</span> {residentError}
                                    </motion.div>
                                )}

                                <button type="submit" disabled={residentLoading}
                                    className="w-full py-3 font-bold text-sm rounded-full transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                                    style={{ background: CYAN, color: '#080d1a', boxShadow: '0 4px 24px rgba(6,182,212,0.35)' }}
                                    onMouseEnter={e => !residentLoading && (e.currentTarget.style.background = CYAN_H)}
                                    onMouseLeave={e => e.currentTarget.style.background = CYAN}>
                                    {residentLoading
                                        ? <><span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" style={{ borderTopColor: '#080d1a' }} /> Vérification…</>
                                        : <>Accéder à mon espace <ArrowRight size={15} /></>
                                    }
                                </button>
                            </form>
                        </div>

                        <p className="mt-5 text-center text-[11px]" style={{ color: 'rgba(148,163,200,0.4)' }}>
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
                            style={{ color: MUTED }}
                            onMouseEnter={e => e.currentTarget.style.color = WHITE}
                            onMouseLeave={e => e.currentTarget.style.color = MUTED}>
                            <ChevronLeft size={14} /> Retour à la connexion
                        </button>

                        <div className="rounded-2xl p-8" style={{ background: NAVY_CARD, border: `1px solid rgba(6,182,212,0.12)` }}>
                            <h2 className="text-xl font-bold mb-1" style={{ color: WHITE }}>Mot de passe oublié</h2>
                            <p className="text-sm mb-6" style={{ color: MUTED }}>
                                Entrez votre adresse e-mail pour recevoir un mot de passe temporaire.
                            </p>

                            {forgotStatus === null && (
                                <form onSubmit={handleForgotSubmit} className="space-y-4">
                                    <div>
                                        <label className={labelClass} style={{ color: MUTED }}>Adresse e-mail</label>
                                        <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                                            placeholder="vous@exemple.ma"
                                            className={inputClass}
                                            style={{ ...inputStyle, caretColor: CYAN }}
                                            onFocus={e => e.currentTarget.style.border = `1.5px solid ${IN_FOCUS}`}
                                            onBlur={e => e.currentTarget.style.border = `1.5px solid ${IN_BORDER}`} />
                                    </div>
                                    <button type="submit" disabled={forgotLoading}
                                        className="w-full py-3 font-bold text-sm rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ background: CYAN, color: '#080d1a', boxShadow: '0 4px 24px rgba(6,182,212,0.35)' }}
                                        onMouseEnter={e => !forgotLoading && (e.currentTarget.style.background = CYAN_H)}
                                        onMouseLeave={e => e.currentTarget.style.background = CYAN}>
                                        {forgotLoading
                                            ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(8,13,26,0.3)', borderTopColor: '#080d1a' }} /> Vérification…</>
                                            : <><Mail size={15} /> Envoyer le mot de passe temporaire</>
                                        }
                                    </button>
                                </form>
                            )}

                            {forgotStatus === 'sent' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                        <p className="text-sm font-semibold mb-0.5" style={{ color: '#86efac' }}>Mot de passe envoyé ✓</p>
                                        <p className="text-xs" style={{ color: 'rgba(134,239,172,0.7)' }}>Envoyé à <span className="font-semibold">{forgotEmail}</span>. Changez-le après connexion.</p>
                                    </div>
                                    <div className="rounded-xl p-4" style={{ background: NAVY_IN, border: `1px solid ${IN_BORDER}` }}>
                                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: MUTED }}>Mot de passe temporaire</p>
                                        <div className="flex items-center justify-between gap-3">
                                            <code className="text-base font-bold tracking-widest" style={{ color: CYAN }}>{tempPwd}</code>
                                            <button onClick={copyPwd} className="p-2 rounded-lg transition-colors flex-shrink-0"
                                                style={{ background: 'rgba(6,182,212,0.1)', color: CYAN }}>
                                                {pwdCopied ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={closeForgot}
                                        className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
                                        style={{ background: NAVY_IN, color: MUTED }}>
                                        Retour à la connexion
                                    </button>
                                </div>
                            )}

                            {forgotStatus === 'not-found' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                                        <p className="text-sm font-semibold mb-0.5" style={{ color: '#fde68a' }}>Compte introuvable</p>
                                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(253,230,138,0.7)' }}>
                                            L'adresse <span className="font-semibold">{forgotEmail}</span> n'est associée à aucun compte SyndicPulse.
                                        </p>
                                    </div>
                                    <div className="rounded-xl p-4 text-center" style={{ background: NAVY_IN, border: `1px solid ${IN_BORDER}` }}>
                                        <p className="text-xs mb-3" style={{ color: MUTED }}>Vous souhaitez rejoindre la plateforme ?</p>
                                        <a href={`mailto:support@syndicpulse.ma?subject=Demande d'accès SyndicPulse&body=Bonjour, je souhaite obtenir un accès à SyndicPulse. Mon email : ${forgotEmail}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-colors"
                                            style={{ background: 'rgba(6,182,212,0.08)', color: CYAN, borderColor: 'rgba(6,182,212,0.25)' }}>
                                            <Mail size={13} /> Contacter support@syndicpulse.ma
                                        </a>
                                        <p className="text-[10px] mt-2" style={{ color: 'rgba(148,163,200,0.4)' }}>Notre équipe vous contactera dans les 24h.</p>
                                    </div>
                                    <button onClick={() => setForgotStatus(null)}
                                        className="w-full py-2.5 text-xs font-medium transition-colors"
                                        style={{ color: MUTED }}>
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
                    <div className="rounded-2xl p-8" style={{ background: NAVY_CARD, border: `1px solid rgba(6,182,212,0.12)` }}>

                        {/* En-tête */}
                        <div className="mb-7">
                            <h2 className="text-2xl font-bold mb-1" style={{ color: WHITE }}>Bienvenue</h2>
                            <p className="text-sm" style={{ color: MUTED }}>
                                Connectez-vous à votre espace gestionnaire
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Email */}
                            <div>
                                <label className={labelClass} style={{ color: MUTED }}>Adresse Email</label>
                                <div className="relative">
                                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setLoginError('') }}
                                        placeholder="votre@email.ma"
                                        required
                                        className={`${inputClass} pl-10`}
                                        style={{ ...inputStyle, caretColor: CYAN }}
                                        onFocus={e => e.currentTarget.style.border = `1.5px solid ${IN_FOCUS}`}
                                        onBlur={e => e.currentTarget.style.border = `1.5px solid ${IN_BORDER}`}
                                    />
                                </div>
                            </div>

                            {/* Mot de passe */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`${labelClass} !mb-0`} style={{ color: MUTED }}>Mot de passe</label>
                                    <button type="button" onClick={openForgot}
                                        className="text-[11px] font-medium transition-colors"
                                        style={{ color: CYAN }}
                                        onMouseEnter={e => e.currentTarget.style.color = CYAN_H}
                                        onMouseLeave={e => e.currentTarget.style.color = CYAN}>
                                        Oublié ?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setLoginError('') }}
                                        placeholder="••••••••"
                                        required
                                        className={`${inputClass} pl-10 pr-11`}
                                        style={{ ...inputStyle, caretColor: CYAN }}
                                        onFocus={e => e.currentTarget.style.border = `1.5px solid ${IN_FOCUS}`}
                                        onBlur={e => e.currentTarget.style.border = `1.5px solid ${IN_BORDER}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                        style={{ color: MUTED }}
                                        onMouseEnter={e => e.currentTarget.style.color = WHITE}
                                        onMouseLeave={e => e.currentTarget.style.color = MUTED}>
                                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            {/* Rester connecté */}
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setRememberMe(v => !v)}
                                    className="w-4 h-4 rounded-full transition-all flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: rememberMe ? CYAN : 'transparent',
                                        border: `1.5px solid ${rememberMe ? CYAN : IN_BORDER}`,
                                    }}>
                                    {rememberMe && <span style={{ color: '#080d1a', fontSize: '8px', fontWeight: 900 }}>✓</span>}
                                </button>
                                <span className="text-xs" style={{ color: MUTED }}>Rester connecté</span>
                            </div>

                            {/* Erreur */}
                            {loginError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                                    <span>⚠</span> {loginError}
                                </motion.div>
                            )}

                            {/* CTA */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 font-bold text-sm rounded-full transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: CYAN, color: '#080d1a', boxShadow: '0 4px 28px rgba(6,182,212,0.40)' }}
                                onMouseEnter={e => !loading && (e.currentTarget.style.background = CYAN_H)}
                                onMouseLeave={e => e.currentTarget.style.background = CYAN}>
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(8,13,26,0.25)', borderTopColor: '#080d1a' }} />
                                        Connexion en cours...
                                    </>
                                ) : (
                                    <>Se connecter</>
                                )}
                            </button>
                        </form>

                        {/* Lien résident */}
                        <div className="mt-6 pt-5 text-center" style={{ borderTop: `1px solid rgba(6,182,212,0.1)` }}>
                            <p className="text-xs" style={{ color: MUTED }}>
                                Vous êtes résident·e ?{' '}
                                <button onClick={openResident}
                                    className="font-semibold transition-colors"
                                    style={{ color: CYAN }}
                                    onMouseEnter={e => e.currentTarget.style.color = CYAN_H}
                                    onMouseLeave={e => e.currentTarget.style.color = CYAN}>
                                    Accéder à mon espace →
                                </button>
                            </p>
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div className="mt-6 text-center">
                        <p className="text-[9px] uppercase tracking-[2px] mb-3" style={{ color: 'rgba(148,163,200,0.3)' }}>
                            Plateforme certifiée &amp; sécurisée
                        </p>
                        <div className="flex items-center justify-center gap-5">
                            {TRUST_BADGES.slice(0, 3).map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    <Icon size={10} style={{ color: 'rgba(148,163,200,0.3)' }} strokeWidth={1.5} />
                                    <span className="text-[9px] uppercase tracking-wide" style={{ color: 'rgba(148,163,200,0.3)' }}>
                                        {label.replace('Conforme ', '').replace('Certifié ', '').replace('Chiffrement ', '')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
                )}

                </AnimatePresence>
            </div>

        </div>
    )
}
