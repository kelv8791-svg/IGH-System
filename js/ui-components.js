const { useState, useEffect, useMemo, useContext } = React;

const Icon = ({ name, size = 20, className = "" }) => {
    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, [name]);
    return <i data-lucide={name} className={`${className}`} style={{ width: size, height: size }}></i>;
};

const SidebarLink = ({ id, icon, label, isOpen }) => {
    const { activeTab, setActiveTab } = useContext(AppContext);
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'} ${!isOpen ? 'justify-center px-0' : ''}`}
        >
            <Icon name={icon} size={isOpen ? 20 : 24} className={`${isActive ? 'text-black' : 'text-slate-500'} transition-all duration-300 ${!isOpen ? 'scale-110' : ''}`} />
            <span className={`transition-all duration-300 ${isOpen ? 'opacity-100 ml-3' : 'opacity-0 w-0 overflow-hidden'}`}>{label}</span>
        </button>
    );
};

const StatCard = ({ icon, label, value, color, trend }) => {
    const colors = {
        green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        red: 'bg-rose-50 text-rose-600 border-rose-100',
        brand: 'bg-brand-50 text-brand-600 border-brand-100',
        orange: 'bg-amber-50 text-amber-600 border-amber-100',
    };
    return (
        <div className="card p-5 group hover:border-brand-300 transition-all cursor-default">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">{label}</p>
                    <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
                    {trend && (
                        <p className={`text-xs mt-2 font-bold px-2 py-0.5 rounded-full inline-block ${trend.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {trend} vs last month
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 ${colors[color]}`}>
                    <Icon name={icon} size={24} />
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (login(email, password)) {
            setError('');
        } else {
            setError('Invalid credentials. Hint: admin / admin');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 transition-all hover:shadow-2xl">
                <div className="bg-brand-500 p-8 text-center text-white">
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 border border-black/10 shadow-sm">
                        <img src="logo.jpg" alt="IGH Logo" className="w-12 h-12 object-contain" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-black">IGH Expense Tracker</h1>
                    <p className="text-black/60 text-xs font-bold uppercase tracking-widest mt-1">Enterprise Management</p>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 flex items-center gap-2">
                            <Icon name="alert-circle" size={16} />
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block">Username</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Enter your username"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block">Password</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                            <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                            Remember me
                        </label>
                        <a href="#" className="text-brand-600 font-semibold hover:underline">Forgot password?</a>
                    </div>
                    <button type="submit" className="btn-primary w-full py-3 text-lg">
                        Sign In
                    </button>
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => { localStorage.clear(); window.location.reload(); }}
                            className="text-[10px] text-slate-400 hover:text-brand-600 transition-colors uppercase font-bold tracking-widest"
                        >
                            Trouble logging in? Reset system data
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slide">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                        <Icon name="x" size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
