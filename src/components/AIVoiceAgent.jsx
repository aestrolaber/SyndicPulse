import { useState } from 'react'
import { Mic, Volume2, X, Zap, Bot, User, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DEMO_SESSIONS = [
    {
        trigger: 'bghit n3ref l mizanya dyal l jarda...',
        label: 'Budget inquiry (Darija)',
        response: 'The Norwest garden budget for Q1 2026 is 45,000 MAD. 60% has been allocated to new irrigation systems. Remaining: 18,000 MAD.',
    },
    {
        trigger: "3andi mochkil f l'ascenseur dyal bloc B",
        label: 'Elevator issue (Darija)',
        response: "Ticket created: Elevator issue in Block B. Otis Morocco has been notified and will inspect within 24h. Reference: TKT-2026-047.",
    },
    {
        trigger: "Quel est le solde du fonds de réserve?",
        label: 'Reserve fund (French)',
        response: "Le fonds de réserve de la Résidence Norwest est actuellement de 84,500 MAD. Ce montant est conforme aux exigences de la Loi 18-00.",
    },
]

export default function AIVoiceAgent({ isOpen, onClose }) {
    const [sessionIndex, setSessionIndex] = useState(0)
    const [phase, setPhase] = useState('idle') // idle | listening | processing | done
    const [transcript, setTranscript] = useState('')
    const [response, setResponse] = useState('')

    const session = DEMO_SESSIONS[sessionIndex]

    function handleMicClick() {
        if (phase === 'listening' || phase === 'processing') return

        setPhase('listening')
        setTranscript('')
        setResponse('')

        // Simulate voice capture
        setTimeout(() => {
            setTranscript(session.trigger)
            setPhase('processing')
            setTimeout(() => {
                setResponse(session.response)
                setPhase('done')
            }, 1800)
        }, 2200)
    }

    function handleReset() {
        setPhase('idle')
        setTranscript('')
        setResponse('')
        setSessionIndex(i => (i + 1) % DEMO_SESSIONS.length)
    }

    function handleClose() {
        handleReset()
        onClose()
    }

    const statusText = {
        idle:       'Appuyez sur le micro pour parler',
        listening:  'Kanesme3 lek...',
        processing: 'Kankhdem 3la t-talb dyalek...',
        done:       'Safi — réponse prête',
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <AnimatePresence>
                <motion.div
                    key="modal"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1,   opacity: 1, y: 0  }}
                    exit={{   scale: 0.9, opacity: 0, y: 20  }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-navy-800 border border-sp/15"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-sp/10 bg-sp/5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sp/15 border border-sp/20 flex items-center justify-center">
                                <Zap size={17} className="text-sp" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">SyndicPulse AI</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Voice Agent · Darija + French</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Simulation</span>
                            </div>
                            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                                <X size={17} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5">

                        {/* Demo notice */}
                        <div className="flex items-center gap-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl px-3.5 py-2.5">
                            <span className="text-base leading-none">🎭</span>
                            <div>
                                <p className="text-[11px] font-bold text-amber-300">Mode démonstration</p>
                                <p className="text-[10px] text-slate-500">Scénarios pré-enregistrés · <span className="text-amber-400">Version Supérieure uniquement</span></p>
                            </div>
                        </div>

                    {/* Demo scenario selector */}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {DEMO_SESSIONS.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setSessionIndex(i)
                                        setPhase('idle')
                                        setTranscript('')
                                        setResponse('')
                                    }}
                                    className={`flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                        sessionIndex === i
                                            ? 'bg-sp/15 text-sp border border-sp/30'
                                            : 'bg-navy-700 text-slate-400 border border-white/5 hover:border-sp/20'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Mic visualizer */}
                        <div className="flex flex-col items-center py-8 rounded-2xl relative overflow-hidden bg-sp/5 border border-sp/10">

                            {/* Background pulse rings */}
                            {phase === 'listening' && (
                                <>
                                    <motion.div
                                        className="absolute w-32 h-32 rounded-full border border-sp/20"
                                        animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="absolute w-32 h-32 rounded-full border border-sp/10"
                                        animate={{ scale: [1, 2.4], opacity: [0.3, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                    />
                                </>
                            )}

                            {/* Mic button */}
                            <motion.button
                                onClick={handleMicClick}
                                animate={phase === 'listening' ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                                transition={{ duration: 0.8, repeat: phase === 'listening' ? Infinity : 0 }}
                                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                                    phase === 'listening'   ? 'bg-red-500 shadow-lg shadow-red-500/30' :
                                    phase === 'processing'  ? 'bg-amber-500 shadow-lg shadow-amber-500/30' :
                                    phase === 'done'        ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' :
                                                              'bg-sp/15 border border-sp/30 hover:bg-sp/25 shadow-glow-cyan'
                                }`}
                            >
                                {phase === 'idle' || phase === 'done'
                                    ? <Mic size={32} className={phase === 'done' ? 'text-white' : 'text-sp'} />
                                    : phase === 'listening'
                                        ? <Mic size={32} className="text-white" />
                                        : <Activity size={32} className="text-white" />
                                }
                            </motion.button>

                            <p className={`mt-5 text-sm font-medium transition-colors ${
                                phase === 'listening'  ? 'text-red-400' :
                                phase === 'processing' ? 'text-amber-400' :
                                phase === 'done'       ? 'text-emerald-400' :
                                                         'text-slate-500'
                            }`}>
                                {statusText[phase]}
                            </p>
                        </div>

                        {/* Transcript */}
                        <AnimatePresence>
                            {transcript && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    {/* User bubble */}
                                    <div className="flex gap-3 items-start">
                                        <div className="w-7 h-7 rounded-lg bg-navy-600 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <User size={13} className="text-slate-400" />
                                        </div>
                                        <div className="flex-1 bg-navy-700 rounded-xl px-4 py-3 border border-white/5">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Vous avez dit</p>
                                            <p className="text-sm text-slate-200 italic">"{transcript}"</p>
                                        </div>
                                    </div>

                                    {/* AI response bubble */}
                                    <AnimatePresence>
                                        {response && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex gap-3 items-start"
                                            >
                                                <div className="w-7 h-7 rounded-lg bg-sp/15 border border-sp/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Bot size={13} className="text-sp" />
                                                </div>
                                                <div className="flex-1 rounded-xl px-4 py-3 border border-sp/15 bg-navy-700">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Volume2 size={10} className="text-sp" />
                                                        <p className="text-[10px] text-sp uppercase tracking-wider font-bold">SyndicPulse AI</p>
                                                    </div>
                                                    <p className="text-sm text-slate-200 leading-relaxed">{response}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Reset / Try again */}
                        {phase === 'done' && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={handleReset}
                                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-navy-700 hover:bg-navy-600 border border-white/5 rounded-xl transition-all"
                            >
                                Essayer un autre scénario →
                            </motion.button>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/5 bg-black/20 text-center">
                        <p className="text-[10px] uppercase tracking-widest font-semibold">
                            <span className="text-slate-500">SyndicPulse Automation Core · </span><span className="text-amber-400">Version Supérieure seulement</span>
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
