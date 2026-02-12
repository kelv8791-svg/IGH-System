{
    const { useState, useEffect, useMemo, useContext } = React;
    const AppContext = window.AppContext;

    const Icon = ({ name, size = 20, className = "" }) => {
        const svgRef = React.useRef(null);
        useEffect(() => {
            if (!svgRef.current) return;

            // Custom Brand Logo
            if (name === 'logo-box') {
                svgRef.current.innerHTML = `
                    <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/>
                    <rect x="8" y="8" width="8" height="8" fill="black"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                    <rect x="11.5" y="6" width="1" height="1" fill="white"/>
                    <rect x="11.5" y="17" width="1" height="1" fill="white"/>
                    <rect x="6" y="11.5" width="1" height="1" fill="white"/>
                    <rect x="17" y="11.5" width="1" height="1" fill="white"/>
                `;
                return;
            }

            if (!window.lucide || !window.lucide.icons) return;
            const iconData = window.lucide.icons[name];
            if (!iconData) {
                svgRef.current.innerHTML = '';
                return;
            }
            const children = iconData[1] || iconData;
            let inner = '';
            if (Array.isArray(children)) {
                children.forEach(child => {
                    if (Array.isArray(child) && child.length >= 2) {
                        const [tag, attrs] = child;
                        const attrStr = Object.entries(attrs || {}).map(([k, v]) => `${k}="${v}"`).join(' ');
                        inner += `<${tag} ${attrStr}/>`;
                    }
                });
            }
            svgRef.current.innerHTML = inner;
        }, [name]);

        return (
            <svg
                ref={svgRef}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
            />
        );
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

    const NavTab = ({ id, label, icon }) => {
        const { activeTab, setActiveTab } = useContext(AppContext);
        const isActive = activeTab === id;
        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-6 py-6 border-b-4 transition-all duration-300 text-[10px] font-display font-black uppercase tracking-widest ${isActive ? 'border-brand-500 text-black bg-brand-500/5' : 'border-transparent text-slate-400 hover:text-black hover:border-slate-200'}`}
            >
                <Icon name={icon} size={16} className={isActive ? 'text-brand-500' : 'text-slate-300'} />
                {label}
            </button>
        );
    };

    const StatCard = ({ label, value, trend, trendType, icon, color = 'white' }) => {
        const bgClass = {
            brand: 'bg-brand-500 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            red: 'bg-rose-600 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            green: 'bg-emerald-500 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            orange: 'bg-amber-500 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            white: 'bg-white text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        }[color] || 'bg-white text-black border-black';

        const labelColor = (color === 'red' || color === 'black') ? 'text-white/60' : 'text-black/40';

        return (
            <div className={`p-8 border-4 ${bgClass} relative overflow-hidden group transition-all hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}>
                <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${labelColor}`}>{label}</p>
                        <h4 className="text-3xl font-display font-black tracking-tighter italic">{value}</h4>
                        {trend && (
                            <div className={`flex items-center gap-1 mt-4 text-[10px] font-black italic tracking-widest ${trendType === 'up' ? 'text-emerald-900' : 'text-rose-900'} opacity-60`}>
                                <Icon name={trendType === 'up' ? 'trending-up' : 'trending-down'} size={12} />
                                {trend} VELOCITY
                            </div>
                        )}
                    </div>
                    <div className={`w-14 h-14 flex items-center justify-center border-2 border-black ${color === 'white' ? 'bg-brand-500 text-black' : 'bg-white/20 text-white'} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                        <Icon name={icon} size={28} />
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-[0.05] translate-x-12 -translate-y-12 rotate-45"></div>
            </div>
        );
    };

    const LoginScreen = () => {
        const { login } = useContext(AppContext);
        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            const success = await login(username, password);
            if (!success) setError('Authentication failed. Check credentials.');
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-6 overflow-hidden relative font-sans">
                {/* Background Glows */}
                <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-brand-500/10 blur-[150px] rounded-full animate-[bg-glow_10s_infinite]"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-brand-500/10 blur-[150px] rounded-full animate-[bg-glow_10s_infinite_reverse]"></div>

                {/* Decorative Diamond Elements */}
                <div className="absolute top-20 left-20 w-16 h-16 border-2 border-brand-500/20 rotate-45 hidden md:block"></div>
                <div className="absolute bottom-40 right-20 w-12 h-12 bg-brand-500/5 rotate-45 hidden md:block"></div>
                <div className="absolute top-1/2 right-10 w-24 h-24 border border-brand-500/10 rotate-12 hidden lg:block"></div>

                <div className="w-full max-w-[450px] relative z-10 flex flex-col items-center">
                    {/* Brand Identity */}
                    <div className="mb-12 text-center">
                        <div className="relative w-24 h-24 mx-auto mb-8 animate-[spin_20s_linear_infinite]">
                            <Icon name="logo-box" size={96} className="text-brand-500" />
                        </div>
                        <h1 className="text-white text-3xl font-display uppercase tracking-tight leading-none mb-1">
                            Identity Graphics<br />Houzz
                        </h1>
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <div className="h-px w-10 bg-brand-500"></div>
                            <p className="text-brand-500 text-[10px] font-display uppercase tracking-[0.2em] italic">Where creativity meets excellence</p>
                            <div className="h-px w-10 bg-brand-500"></div>
                        </div>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white p-12 w-full shadow-[0_30px_60px_-15px_rgba(250,204,21,0.1)]">
                        <h2 className="text-black text-2xl text-center mb-10 font-display">Sign In</h2>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 border-l-4 border-red-500 text-xs font-bold animate-shake">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="brand-label">Access Handle (Username / Email)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Icon name="user" size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        className="brand-input !pl-12 !border-slate-100 focus:!border-brand-500 !text-black"
                                        placeholder="Enter your handle"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="brand-label">Password</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Icon name="lock" size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        className="brand-input !pl-12 !border-slate-100 focus:!border-brand-500 !text-black"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="brand-button-yellow w-full !text-sm group">
                                Sign In
                                <Icon name="arrow-right" size={20} className="group-hover:translate-x-2 transition-transform" />
                            </button>
                        </form>
                    </div>

                    <p className="mt-12 text-slate-600 text-[10px] font-bold uppercase tracking-widest text-center">
                        © 2026 Identity Graphics Houzz. All rights reserved.
                    </p>
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
    window.NavTab = NavTab;
    window.StatCard = StatCard;
    window.LoginScreen = LoginScreen;
    window.Modal = Modal;
}
