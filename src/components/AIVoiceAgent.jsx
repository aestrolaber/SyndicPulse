import { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AIVoiceAgent({ isOpen, onClose }) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [status, setStatus] = useState('Ready to assist')
    const [aiResponse, setAiResponse] = useState('')

    const toggleListening = () => {
        setIsListening(!isListening)
        if (!isListening) {
            setStatus('Listening in Darija/French...')
            setTranscript('Sbah lkhir, bghit n3lem 3la mouchkil d lme f l garage...')
            setTimeout(() => {
                setStatus('Processing request...')
                setTimeout(() => {
                    setStatus('Action complete')
                    setAiResponse('Maintenance ticket #842 created for Basement Leakage. Notification sent to Otis Morocco.')
                }, 1500)
            }, 2000)
        } else {
            setStatus('Ready to assist')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#16161c] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center">
                                <Sparkles className="text-indigo-400 w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">SyndicPulse AI</h2>
                                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Voice Automation</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center justify-center py-12 bg-black/20 rounded-[2rem] border border-white/5 mb-8 relative">
                        <div className="absolute top-4 left-4 flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tight">Active Mediation</span>
                        </div>

                        <motion.div
                            animate={{
                                scale: isListening ? [1, 1.2, 1] : 1,
                                boxShadow: isListening ? ["0 0 0 0px rgba(99,102,241,0.2)", "0 0 0 20px rgba(99,102,241,0)"] : "none"
                            }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isListening ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'
                                }`}
                            onClick={toggleListening}
                        >
                            {isListening ? <Mic size={40} /> : <MicOff size={40} />}
                        </motion.div>

                        <p className={`mt-8 font-medium transition-colors ${isListening ? 'text-indigo-400' : 'text-slate-500'}`}>
                            {status}
                        </p>
                    </div>

                    <AnimatePresence>
                        {transcript && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-widest">User (Darija)</p>
                                    <p className="text-sm text-slate-300 italic">"{transcript}"</p>
                                </div>

                                {aiResponse && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Volume2 className="text-indigo-400 w-4 h-4" />
                                            <p className="text-xs text-indigo-400 uppercase font-bold tracking-widest">SyndicPulse AI</p>
                                        </div>
                                        <p className="text-sm text-indigo-100">{aiResponse}</p>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="bg-black/40 p-6 flex justify-center border-t border-white/5">
                    <p className="text-[10px] text-slate-500 text-center max-w-[250px]">
                        Powered by GPT-4o Architecture. Real-time translation and dispute resolution enabled.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
