{
    const { useState, useEffect, useMemo, useContext } = React;
    const AppContext = window.AppContext;

    const Icon = ({ name, size = 20, className = "" }) => {
        const iconData = window.lucide?.icons[name];
        if (!iconData) return <span style={{ width: size, height: size }} className={className} />;

        const renderNodes = (nodes) => nodes.map(([tag, attrs, children], i) =>
            React.createElement(tag, { ...attrs, key: i }, (children && Array.isArray(children)) ? renderNodes(children) : null)
        );

        return React.createElement('svg', {
            xmlns: "http://www.w3.org/2000/svg",
            width: size,
            height: size,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            className: `lucide lucide-${name} ${className}`
        }, renderNodes(iconData));
    };

    const SidebarLink = ({ id, icon, label, isOpen }) => {
        const { activeTab, setActiveTab, isDarkMode } = useContext(AppContext);
        const isActive = activeTab === id;
        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`w-full nav-link group ${isActive ? 'nav-link-active' : 'nav-link-inactive'} ${!isOpen ? 'justify-center px-0' : ''}`}
            >
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-slate-800/10 text-slate-500 group-hover:bg-brand-500/10 group-hover:text-brand-500'} ${!isOpen ? 'mx-auto' : ''}`}>
                    <Icon name={icon} size={18} />
                </div>
                <span className={`transition-all duration-300 font-bold tracking-tight ${isOpen ? 'opacity-100 ml-1' : 'opacity-0 w-0 overflow-hidden'}`}>{label}</span>
                {isActive && isOpen && <div className="ml-auto w-1.5 h-1.5 bg-brand-500 rounded-full shadow-lg shadow-brand-500/50 mr-1"></div>}
            </button>
        );
    };

    const StatCard = ({ icon, label, value, color, trend }) => {
        const colors = {
            green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10',
            red: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/10',
            brand: 'bg-brand-500/10 text-brand-500 border-brand-500/20 shadow-brand-500/10',
            orange: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10',
        };
        const trendColor = trend?.startsWith('+') ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10';

        return (
            <div className="card p-8 group hover:scale-[1.02] transition-all duration-500 cursor-default border-none bg-white dark:bg-white/5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/5 blur-3xl rounded-full group-hover:bg-brand-500/10 transition-colors"></div>

                <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-xl ${colors[color]} border shadow-lg`}>
                                <Icon name={icon} size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                        </div>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{value}</h4>
                        {trend && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black w-fit uppercase tracking-wider ${trendColor}`}>
                                {trend.startsWith('+') ? <Icon name="trending-up" size={12} /> : <Icon name="trending-down" size={12} />}
                                {trend}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const LoginScreen = () => {
        const { login } = useContext(AppContext);
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            const success = await login(email, password);
            if (success) {
                setError('');
            } else {
                setError('Authentication Failed: Invalid Credentials Context');
            }
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] p-8 overflow-hidden relative">
                {/* Visual Blobs */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -ml-48 -mb-48"></div>

                <div className="max-w-md w-full relative z-10">
                    <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-brand-500/40 transform hover:scale-110 transition-transform">
                                <img src="logo.jpg" alt="IGH Logo" className="w-12 h-12 object-contain" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">IGH <span className="text-brand-500">Tracker</span></h1>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Next-Gen Business Control</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-[11px] font-black border border-rose-500/20 uppercase tracking-wider flex items-center gap-3 animate-pulse">
                                    <Icon name="shield-alert" size={16} />
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operator Identity</label>
                                <input
                                    type="text"
                                    className="input-field !bg-white/5 !border-white/10 !text-white focus:!border-brand-500 text-sm"
                                    placeholder="Username or Identifier"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Access Code</label>
                                <input
                                    type="password"
                                    className="input-field !bg-white/5 !border-white/10 !text-white focus:!border-brand-500 text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="w-full bg-brand-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-500/40 hover:bg-brand-500 transition-all active:scale-95 text-xs">
                                Authorize Session
                            </button>

                            <div className="text-center pt-4">
                                <button
                                    type="button"
                                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                                    className="text-[9px] text-slate-500 hover:text-brand-500 transition-colors uppercase font-black tracking-[0.2em]"
                                >
                                    Emergency Reset Procedure
                                </button>
                            </div>
                        </form>
                    </div>
                    <p className="text-center text-slate-500 text-[9px] mt-8 uppercase font-black tracking-widest opacity-50">Secure Enclave v4.0.2 // Proprietary System</p>
                </div>
            </div>
        );
    };
    const Modal = ({ isOpen, onClose, title, children }) => {
        if (!isOpen) return null;
        return ReactDOM.createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md transition-opacity duration-500">
                <div className="bg-slate-50 dark:bg-[#020617] rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-slide border border-white/10">
                    <div className="p-8 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-xl">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{title}</h3>
                            <p className="text-[9px] text-brand-500 font-black uppercase tracking-[0.3em]">Command Interface Overlay</p>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-white/5 rounded-2xl transition-all text-slate-400">
                            <Icon name="x" size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                        {children}
                    </div>
                </div>
            </div>,
            document.body
        );
    };
    // Attach to window for global scoping
    window.Icon = Icon;
    window.SidebarLink = SidebarLink;
    window.StatCard = StatCard;
    window.LoginScreen = LoginScreen;
    window.Modal = Modal;
}
