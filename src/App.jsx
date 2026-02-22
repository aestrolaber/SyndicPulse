import { useState } from 'react'
import {
    BarChart3,
    MessageSquare,
    Settings,
    Users,
    Bell,
    Home,
    Mic,
    ChevronRight,
    AlertCircle,
    TrendingUp,
    ShieldCheck
} from 'lucide-react'
import AIVoiceAgent from './components/AIVoiceAgent'

function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [isVoiceOpen, setIsVoiceOpen] = useState(false)

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Sidebar */}
            <nav className="fixed left-0 top-0 h-full w-64 bg-[#0f0f13] border-r border-white/5 flex flex-col p-6 z-50">
                <div className="flex items-center gap-3 mb-12 px-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ShieldCheck className="text-white w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        SyndicPulse
                    </span>
                </div>

                <div className="space-y-2 flex-1">
                    <NavItem
                        icon={<Home size={20} />}
                        label="Dashboard"
                        active={activeTab === 'dashboard'}
                        onClick={() => setActiveTab('dashboard')}
                    />
                    <NavItem
                        icon={<BarChart3 size={20} />}
                        label="Financials"
                        active={activeTab === 'financials'}
                        onClick={() => setActiveTab('financials')}
                    />
                    <NavItem
                        icon={<Users size={20} />}
                        label="Residents"
                        active={activeTab === 'residents'}
                        onClick={() => setActiveTab('residents')}
                    />
                    <NavItem
                        icon={<MessageSquare size={20} />}
                        label="Disputes"
                        active={activeTab === 'disputes'}
                        onClick={() => setActiveTab('disputes')}
                    />
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4 rounded-2xl border border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Mic className="text-indigo-400 w-4 h-4" />
                            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">AI Voice Active</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                            "Tell me the latest maintenance update for Block C."
                        </p>
                        <button
                            onClick={() => setIsVoiceOpen(true)}
                            className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium rounded-lg transition-all border border-indigo-500/30"
                        >
                            Configure Voice Bot
                        </button>
                    </div>
                    <NavItem icon={<Settings size={20} />} label="Settings" active={false} />
                </div>
            </nav>

            {/* Main Content */}
            <main className="ml-64 p-10 max-w-7xl">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Welcome Back, Omar</h1>
                        <p className="text-slate-400">Managing <b>Residence Al-Andalus</b> • Tangier, Morocco</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-[#0a0a0c]"></span>
                        </button>
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                            <img src="https://ui-avatars.com/api/?name=Omar+Tangier&background=6366f1&color=fff" alt="User" />
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6 mb-12">
                    <StatCard
                        title="Collection Rate"
                        value="94.2%"
                        trend="+2.1%"
                        icon={<TrendingUp className="text-emerald-400" />}
                        color="emerald"
                    />
                    <StatCard
                        title="Pending Dues"
                        value="12,450 MAD"
                        trend="-5%"
                        icon={<BarChart3 className="text-indigo-400" />}
                        color="indigo"
                    />
                    <StatCard
                        title="Open Tickets"
                        value="8"
                        trend="Needs Attention"
                        icon={<AlertCircle className="text-amber-400" />}
                        color="amber"
                    />
                    <StatCard
                        title="Transparency Score"
                        value="98/100"
                        trend="Elite"
                        icon={<ShieldCheck className="text-purple-400" />}
                        color="purple"
                    />
                </div>

                {/* Main Section */}
                <div className="grid grid-cols-3 gap-8">
                    <div className="col-span-2 space-y-8">
                        <div className="bg-[#0f0f13] border border-white/5 rounded-3xl p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-white">Maintenance Overview</h3>
                                <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                                    View Schedule <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <ActivityItem
                                    title="Elevator Maintenance (Block A)"
                                    status="In Progress"
                                    time="Started 2h ago"
                                    agent="Otis Morocco"
                                    dotColor="bg-indigo-500"
                                />
                                <ActivityItem
                                    title="Garden Irrigation Fix"
                                    status="Scheduled"
                                    time="Tomorrow, 09:00"
                                    agent="Green Tangier"
                                    dotColor="bg-slate-600"
                                />
                                <ActivityItem
                                    title="Security Camera Upgrade"
                                    status="Completed"
                                    time="Yesterday"
                                    agent="Securitas Tangier"
                                    dotColor="bg-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-4">AI Voice Command</h3>
                                <p className="text-indigo-100/80 text-sm mb-6 leading-relaxed">
                                    Trigger automation tasks across your property using natural language.
                                </p>
                                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-6">
                                    <p className="italic text-sm text-indigo-100">"Submit a complaint about water leakage in the basement parking."</p>
                                </div>
                                <button
                                    onClick={() => setIsVoiceOpen(true)}
                                    className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-50 shadow-xl transition-all"
                                >
                                    <Mic size={20} /> Start Voice Session
                                </button>
                            </div>
                            {/* Decorative Elements */}
                            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>
                        </div>
                    </div>
                </div>
            </main>

            <AIVoiceAgent isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
        </div>
    )
}

function NavItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${active
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    )
}

function StatCard({ title, value, trend, icon, color }) {
    return (
        <div className="bg-[#0f0f13] border border-white/5 rounded-3xl p-6 hover:shadow-2xl transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                    {trend}
                </span>
            </div>
            <h4 className="text-slate-400 text-sm mb-1">{title}</h4>
            <div className="text-2xl font-bold text-white">{value}</div>
        </div>
    )
}

function ActivityItem({ title, status, time, agent, dotColor }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
            <div className={`w-3 h-3 rounded-full ${dotColor} shadow-[0_0_8px] shadow-current`}></div>
            <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-0.5">{title}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span>{agent}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                    <span>{time}</span>
                </div>
            </div>
            <div className="text-xs font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">
                {status}
            </div>
        </div>
    )
}

export default App
