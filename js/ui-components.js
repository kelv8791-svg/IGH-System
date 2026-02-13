{
    const { useState, useEffect, useMemo, useContext } = React;
    const AppContext = window.AppContext;

    const Icon = ({ name, size = 20, className = "" }) => {
        const svgRef = React.useRef(null);
        const isLogo = name === 'logo-box';

        useEffect(() => {
            if (!svgRef.current || isLogo) return;

            if (!window.lucide || !window.lucide.icons) return;
            const iconData = window.lucide.icons[name];
            if (!iconData) {
                // Try to find icon name in different casing or mapping
                const normalizedName = Object.keys(window.lucide.icons).find(k => k.toLowerCase() === name.toLowerCase());
                const finalData = window.lucide.icons[normalizedName] || window.lucide.icons['help-circle'];
                const children = Array.isArray(finalData) && finalData.length > 1 ? finalData[1] : finalData;
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
                return;
            }
            const children = Array.isArray(iconData) && iconData.length > 1 ? iconData[1] : iconData;
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
        }, [name, isLogo]);

        const renderLogo = () => (
            <>
                <polygon points="12,1 23,12 12,23 1,12" fill="currentColor" />
                <polygon points="12,5 19,12 12,19 5,12" fill="#0a0a0a" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </>
        );

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
            >
                {isLogo && renderLogo()}
            </svg>
        );
    };

    const SidebarLink = ({ id, icon, label, isOpen }) => {
        const { activeTab, setActiveTab } = useContext(AppContext);
        const isActive = activeTab === id;
        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full group ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
                <div className={`${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`}>
                    <Icon name={icon} size={20} />
                </div>
                {isOpen && <span className="text-sm truncate">{label}</span>}
            </button>
        );
    };

    const NavTab = ({ id, label }) => {
        const { activeTab, setActiveTab } = useContext(AppContext);
        const isActive = activeTab === id;
        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap ${isActive ? 'bg-primary text-primary-foreground' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
                {label}
            </button>
        );
    };

    const StatCard = ({ label, value, trend, trendType, icon }) => {
        return (
            <div className="brand-card p-6 flex items-start justify-between group hover:shadow-md transition-shadow">
                <div>
                    <p className="brand-label">{label}</p>
                    <h3 className="text-2xl font-black text-foreground">{value}</h3>
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trendType === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <Icon name={trendType === 'up' ? 'arrow-up-right' : 'arrow-down-right'} size={14} />
                            {trend}
                        </div>
                    )}
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon name={icon} size={24} />
                </div>
            </div>
        );
    };

    const LoginScreen = () => {
        const { login } = useContext(AppContext);
        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
        const [showPassword, setShowPassword] = useState(false);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            const success = await login(username, password);
            if (!success) setError('Access Denied. Check credentials.');
            setLoading(false);
        };

        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
                {/* Yellow glow background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[150px]" style={{background: 'radial-gradient(circle, rgba(250,204,21,0.18) 0%, transparent 70%)'}}></div>
                {/* Decorative diamond shapes */}
                <div className="absolute top-[10%] left-[8%] w-14 h-14 border-2 border-yellow-400/25 rotate-45"></div>
                <div className="absolute bottom-[20%] right-[8%] w-10 h-10 bg-yellow-400/15 rotate-45"></div>
                <div className="absolute bottom-[35%] right-[5%] w-5 h-5 bg-yellow-400/25 rotate-45"></div>

                <div className="max-w-sm w-full relative z-10">
                    {/* Logo and Brand */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="mb-5">
                            <svg width="72" height="72" viewBox="0 0 24 24">
                                <polygon points="12,1 23,12 12,23 1,12" fill="#FACC15" />
                                <polygon points="12,5 19,12 12,19 5,12" fill="#0a0a0a" />
                                <circle cx="12" cy="12" r="2.5" fill="#FACC15" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-widest text-center uppercase leading-tight">IDENTITY GRAPHICS<br />HOUZZ</h1>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="h-px w-8 bg-yellow-400"></div>
                            <p className="text-yellow-400 text-[9px] font-bold uppercase tracking-[0.25em]">WHERE CREATIVITY MEETS EXCELLENCE</p>
                            <div className="h-px w-8 bg-yellow-400"></div>
                        </div>
                    </div>

                    {/* Sign In Form Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-xl font-black text-center mb-6 uppercase tracking-widest text-black">SIGN IN</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="brand-label">Username</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Icon name="user" size={15} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Enter your username"
                                        className="brand-input pl-9"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="brand-label">Password</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Icon name="lock" size={15} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Min. 5 characters"
                                        className="brand-input pl-9 pr-12"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        minLength={5}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
                                    </button>
                                </div>
                            </div>

                            {error && <div className="text-red-600 text-xs font-bold text-center bg-red-50 py-2 rounded-lg border border-red-100">{error}</div>}

                            <button type="submit" disabled={loading} className="brand-button-yellow w-full h-11 font-black uppercase tracking-widest text-sm mt-1">
                                {loading ? <Icon name="loader" size={18} className="animate-spin" /> : "SIGN IN →"}
                            </button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-[10px] font-bold text-white/30 uppercase tracking-[0.25em]">
                        © 2026 Identity Graphics Houzz. All rights reserved.
                    </p>
                </div>
            </div>
        );
    };

    const Modal = ({ isOpen, onClose, title, children }) => {
        if (!isOpen) return null;
        return ReactDOM.createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300">
                <div className="brand-card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden glass">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h3 className="text-xl font-bold">{title}</h3>
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-red-600 transition-colors border border-gray-700" title="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
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
    window.SidebarLink = SidebarLink;
    window.StatCard = StatCard;
    window.LoginScreen = LoginScreen;
    window.Modal = Modal;
}
