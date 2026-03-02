/**
 * SyndicPulse — Page de connexion
 * Langue: Français
 */

import { useState } from 'react'
import { Zap, Eye, EyeOff, ArrowRight, Building2, ShieldCheck, Lock, DatabaseBackup, FileCheck, BadgeCheck, Mail, ChevronLeft, Copy, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { DEMO_USERS } from '../lib/mockData.js'
import { motion, AnimatePresence } from 'framer-motion'

// Demo credentials hint shown in development
const DEMO_HINTS = [
    { label: 'Super Admin',     email: 'admin@syndicpulse.ma', password: 'admin', badge: 'Platform' },
    { label: 'Omar (Norwest)',  email: 'omar@norwest.ma',       password: 'omar',  badge: 'Syndic'   },
    { label: 'Sara (Atlas)',    email: 'sara@atlas.ma',         password: 'sara',  badge: 'Syndic'   },
]

const IS_DEV = import.meta.env.DEV

const TRUST_BADGES = [
    { icon: FileCheck,    label: 'Conforme Loi 18-00' },
    { icon: BadgeCheck,   label: 'Certifié CNDP Maroc' },
    { icon: Lock,         label: 'Chiffrement SSL 256-bit' },
    { icon: DatabaseBackup, label: 'Sauvegarde automatique' },
]

export default function LoginPage() {
    const { login, loginError, setLoginError, loading } = useAuth()

    const [email,       setEmail]       = useState('')
    const [password,    setPassword]    = useState('')
    const [showPwd,     setShowPwd]     = useState(false)
    const [rememberMe,  setRememberMe]  = useState(false)

    // Forgot password
    const [showForgot,    setShowForgot]    = useState(false)
    const [forgotEmail,   setForgotEmail]   = useState('')
    const [forgotStatus,  setForgotStatus]  = useState(null) // 'sent' | 'not-found'
    const [forgotLoading, setForgotLoading] = useState(false)
    const [tempPwd,       setTempPwd]       = useState('')
    const [pwdCopied,     setPwdCopied]     = useState(false)

    function openForgot() { setShowForgot(true); setForgotEmail(email); setForgotStatus(null); setTempPwd('') }
    function closeForgot() { setShowForgot(false); setForgotStatus(null) }

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

    function copyPwd() {
        navigator.clipboard.writeText(tempPwd).catch(() => {})
        setPwdCopied(true)
        setTimeout(() => setPwdCopied(false), 2000)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        await login(email.trim(), password)
    }

    function fillDemo(hint) {
        setEmail(hint.email)
        setPassword(hint.password)
        setLoginError('')
    }

    return (
        <div className="min-h-screen bg-navy-900 flex">

            {/* ── Left panel — Branding ── */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] bg-navy-800 border-r border-white/5 p-12 relative overflow-hidden">

                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />

                {/* Logo */}
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-9 h-9 rounded-xl bg-sp flex items-center justify-center shadow-glow-cyan">
                        <Zap size={18} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">
                        Syndic<span className="text-sp">Pulse</span>
                    </span>
                </div>

                {/* Center content */}
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-white leading-tight mb-6">
                        La gestion de<br />
                        copropriété,<br />
                        <span className="text-sp">maîtrisée à 100%.</span>
                    </h1>
                    <p className="text-slate-400 text-base leading-relaxed max-w-sm">
                        Automatisez les rappels, offrez la transparence financière,
                        et gérez les conflits — le tout depuis un seul tableau de bord.
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2 mt-8">
                        {[
                            'Rappels WhatsApp automatiques',
                            'Transparence budgétaire totale',
                            'Gestion d\'AG simplifiée',
                            'Conforme Loi 18-00',
                        ].map(f => (
                            <span key={f} className="text-xs bg-navy-700 text-slate-300 border border-white/8 px-3 py-1.5 rounded-full">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Trust ticker — infinite scroll */}
                <div className="relative z-10 overflow-hidden">
                    <style>{`
                        @keyframes trust-ticker {
                            0%   { transform: translateX(0); }
                            100% { transform: translateX(-50%); }
                        }
                        .trust-ticker { animation: trust-ticker 18s linear infinite; }
                        .trust-ticker:hover { animation-play-state: paused; }
                    `}</style>
                    {/* left + right fade masks */}
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-navy-800 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-navy-800 to-transparent z-10 pointer-events-none" />

                    <div className="trust-ticker flex gap-2.5" style={{ width: 'max-content' }}>
                        {[...TRUST_BADGES, ...TRUST_BADGES].map(({ icon: Icon, label }, i) => (
                            <div key={i}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-700/50 border border-white/6 flex-shrink-0">
                                <Icon size={11} className="text-sp flex-shrink-0" strokeWidth={1.8} />
                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right panel — Login form ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

                {/* Mobile logo */}
                <div className="flex items-center gap-2 mb-10 lg:hidden">
                    <div className="w-8 h-8 rounded-xl bg-sp flex items-center justify-center">
                        <Zap size={16} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-lg font-bold text-white">
                        Syndic<span className="text-sp">Pulse</span>
                    </span>
                </div>

                <AnimatePresence mode="wait">
                {showForgot ? (
                    /* ── Forgot password panel ── */
                    <motion.div key="forgot"
                        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}
                        className="w-full max-w-sm"
                    >
                        <button onClick={closeForgot} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-8">
                            <ChevronLeft size={14} /> Retour à la connexion
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-1">Mot de passe oublié</h2>
                            <p className="text-slate-400 text-sm">Entrez votre adresse e-mail pour recevoir un mot de passe temporaire.</p>
                        </div>

                        {forgotStatus === null && (
                            <form onSubmit={handleForgotSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Adresse e-mail</label>
                                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                                        placeholder="vous@exemple.ma"
                                        className="w-full bg-navy-800 border border-white/8 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sp/50 focus:bg-navy-700 transition-all" />
                                </div>
                                <button type="submit" disabled={forgotLoading}
                                    className="w-full py-3 bg-sp hover:bg-sp-dark disabled:opacity-60 text-navy-900 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                                    {forgotLoading
                                        ? <><span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" /> Vérification…</>
                                        : <><Mail size={15} /> Envoyer le mot de passe temporaire</>
                                    }
                                </button>
                            </form>
                        )}

                        {forgotStatus === 'sent' && (
                            <div className="space-y-4">
                                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                                    <p className="text-sm font-semibold text-emerald-400 mb-1">Mot de passe envoyé ✓</p>
                                    <p className="text-xs text-slate-400">Un mot de passe temporaire a été envoyé à <span className="text-white">{forgotEmail}</span>. Veuillez le changer après connexion.</p>
                                </div>
                                <div className="rounded-xl bg-navy-700 border border-white/8 p-4">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Mot de passe temporaire</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <code className="text-base font-bold text-sp tracking-widest">{tempPwd}</code>
                                        <button onClick={copyPwd} className="p-2 rounded-lg bg-sp/10 hover:bg-sp/20 text-sp transition-colors flex-shrink-0">
                                            {pwdCopied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <button onClick={closeForgot} className="w-full py-2.5 text-sm font-semibold text-slate-300 hover:text-white bg-white/5 rounded-xl transition-colors">
                                    Retour à la connexion
                                </button>
                            </div>
                        )}

                        {forgotStatus === 'not-found' && (
                            <div className="space-y-4">
                                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                                    <p className="text-sm font-semibold text-amber-400 mb-1">Compte introuvable</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        L'adresse <span className="text-white">{forgotEmail}</span> n'est associée à aucun compte SyndicPulse.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-navy-700 border border-white/8 p-4 text-center">
                                    <p className="text-xs text-slate-400 mb-3">Vous souhaitez rejoindre la plateforme ?</p>
                                    <a href={`mailto:support@syndicpulse.ma?subject=Demande d'accès SyndicPulse&body=Bonjour, je souhaite obtenir un accès à SyndicPulse. Mon email : ${forgotEmail}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-sp/10 hover:bg-sp/20 text-sp text-xs font-semibold rounded-lg border border-sp/20 transition-colors">
                                        <Mail size={13} /> Contacter support@syndicpulse.ma
                                    </a>
                                    <p className="text-[10px] text-slate-600 mt-2">Notre équipe vous contactera dans les 24h.</p>
                                </div>
                                <button onClick={() => setForgotStatus(null)} className="w-full py-2.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors">
                                    ← Réessayer avec un autre email
                                </button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                <motion.div key="login"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-1">Connexion</h2>
                        <p className="text-slate-400 text-sm">
                            Gérez votre résidence avec intelligence.
                        </p>
                    </div>

                    {/* ── Demo hints (DEV only) ── */}
                    {IS_DEV && (
                        <div className="mb-6 p-4 rounded-xl border border-sp/20 bg-sp/5">
                            <p className="text-[10px] text-sp font-bold uppercase tracking-wider mb-3">
                                Comptes de démonstration
                            </p>
                            <div className="space-y-2">
                                {DEMO_HINTS.map(h => (
                                    <button
                                        key={h.email}
                                        onClick={() => fillDemo(h)}
                                        className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg hover:bg-navy-700 transition-colors group"
                                    >
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            h.badge === 'Platform'
                                                ? 'bg-violet-500/15 text-violet-400 border-violet-500/20'
                                                : 'bg-cyan-500/15 text-sp border-sp/20'
                                        }`}>
                                            {h.badge}
                                        </span>
                                        <div>
                                            <p className="text-xs font-medium text-slate-200 group-hover:text-white">{h.label}</p>
                                            <p className="text-[11px] text-slate-500">{h.email}</p>
                                        </div>
                                        <ArrowRight size={12} className="ml-auto text-slate-600 group-hover:text-sp transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Form ── */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                                Adresse e-mail
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setLoginError('') }}
                                placeholder="vous@exemple.ma"
                                required
                                className="w-full bg-navy-800 border border-white/8 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sp/50 focus:bg-navy-700 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Mot de passe
                                </label>
                                <button type="button" onClick={openForgot} className="text-[11px] text-sp hover:text-sp-light transition-colors">
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
                                    className="w-full bg-navy-800 border border-white/8 rounded-xl px-4 py-3 pr-11 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sp/50 focus:bg-navy-700 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setRememberMe(v => !v)}
                                className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                                    rememberMe
                                        ? 'bg-sp border-sp'
                                        : 'border-white/20 hover:border-sp/50'
                                }`}
                            >
                                {rememberMe && <span className="text-navy-900 text-[10px] font-black">✓</span>}
                            </button>
                            <span className="text-xs text-slate-400">Rester connecté</span>
                        </div>

                        {/* Error */}
                        {loginError && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y:  0 }}
                                className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl"
                            >
                                <span className="text-red-500">⚠</span>
                                {loginError}
                            </motion.div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-sp hover:bg-sp-dark disabled:opacity-60 disabled:cursor-not-allowed text-navy-900 font-bold text-sm rounded-xl transition-all shadow-glow-cyan flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                                    Connexion en cours...
                                </>
                            ) : (
                                <>
                                    Se connecter <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Resident magic link */}
                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-500 mb-3">Vous êtes résident·e ?</p>
                        <button className="text-xs text-sp hover:text-sp-light transition-colors flex items-center gap-1.5 mx-auto">
                            <Building2 size={12} /> Accéder à mon espace résident →
                        </button>
                    </div>

                    {/* Security note */}
                    <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-600">
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
