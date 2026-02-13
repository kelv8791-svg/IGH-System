{
    const { useState, useContext } = React;

    // --- Error Boundary for production safety ---
    class ErrorBoundary extends React.Component {
        constructor(props) {
            super(props);
            this.state = { hasError: false, error: null };
        }
        static getDerivedStateFromError(error) {
            return { hasError: true, error };
        }
        componentDidCatch(error, errorInfo) {
            console.error("React Error Boundary caught an error:", error, errorInfo);
        }
        render() {
            if (this.state.hasError) {
                return (
                    <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
                        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border border-rose-100 text-center">
                            <div className="text-5xl mb-4">🩹</div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Component Level Crash</h2>
                            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                Something went wrong while rendering this part of the app.
                                <br /><br />
                                <code className="bg-slate-50 text-rose-500 p-2 rounded text-xs block text-left overflow-auto max-h-32">
                                    {this.state.error?.message || "Unknown Rendering Error"}
                                </code>
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-brand-500 text-black py-3 rounded-xl font-bold hover:bg-brand-400 transition-all uppercase tracking-widest text-xs"
                            >
                                Reload System
                            </button>
                        </div>
                    </div>
                );
            }
            return this.props.children;
        }
    }

    // --- Top Level Components to prevent re-declaration loops ---

    const MainLayout = () => {
        const context = useContext(window.AppContext);
        if (!context) return <div className="p-20 text-center animate-pulse font-heading" style={{color:'#888'}}>INITIALIZING ENGINE...</div>;

        const { user, logout, activeTab, setActiveTab } = context;
        const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

        const renderContent = () => {
            const {
                Dashboard, SalesModule, ExpenseModule, InventoryModule,
                ClientModule, SupplierModule, ProjectModule, ReportModule,
                SettingsModule
            } = window;

            switch (activeTab) {
                case 'expenses': return ExpenseModule ? <ExpenseModule /> : null;
                case 'sales': return SalesModule ? <SalesModule /> : null;
                case 'inventory': return InventoryModule ? <InventoryModule /> : null;
                case 'clients': return ClientModule ? <ClientModule /> : null;
                case 'suppliers': return SupplierModule ? <SupplierModule /> : null;
                case 'projects': return ProjectModule ? <ProjectModule /> : null;
                case 'reports': return ReportModule ? <ReportModule /> : null;
                case 'settings': return SettingsModule ? <SettingsModule /> : null;
                default: return Dashboard ? <Dashboard /> : null;
            }
        };

        const navItems = [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'sales', label: 'Sales' },
            { id: 'expenses', label: 'Expenses' },
            { id: 'suppliers', label: 'Suppliers' },
            { id: 'clients', label: 'Clients' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'projects', label: 'Projects' },
            ...(user?.role === 'admin' ? [{ id: 'reports', label: 'Reports' }, { id: 'settings', label: 'Admin' }] : []),
        ];

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col text-foreground font-sans selection:bg-primary selection:text-black">
                {/* Fixed Top Header */}
                <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800 h-16">
                    <div className="h-full flex items-center justify-between px-6 gap-4">
                        {/* Logo + Brand */}
                        <div className="flex items-center gap-3 shrink-0">
                            <svg width="34" height="34" viewBox="0 0 24 24" className="shrink-0">
                                <polygon points="12,1 23,12 12,23 1,12" fill="#FACC15" />
                                <polygon points="12,5 19,12 12,19 5,12" fill="#0a0a0a" />
                                <circle cx="12" cy="12" r="2.5" fill="#FACC15" />
                            </svg>
                            <div className="hidden sm:block">
                                <p className="text-white font-black text-[11px] tracking-widest leading-none uppercase">IDENTITY GRAPHICS HOUZZ</p>
                                <p className="text-yellow-400 text-[8px] font-bold uppercase tracking-widest leading-none mt-0.5">WHERE CREATIVITY MEETS EXCELLENCE</p>
                            </div>
                        </div>

                        {/* Desktop Navigation Tabs */}
                        <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 justify-center">
                            {navItems.map(item => (
                                <window.NavTab key={item.id} id={item.id} label={item.label} />
                            ))}
                        </nav>

                        {/* Right side: User Info + Logout + Hamburger */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right hidden lg:block">
                                <p className="text-xs text-zinc-300 font-bold leading-none">{user?.username}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{user?.role === 'admin' ? 'Administrator' : (user?.display_name || user?.role || 'Operator')}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-90 transition-all shrink-0"
                            >
                                LOGOUT
                            </button>
                            {/* Hamburger — mobile only */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden flex flex-col gap-[5px] p-2 rounded-lg hover:bg-zinc-800 transition-all"
                                aria-label="Toggle menu"
                            >
                                <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
                                <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                                <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="fixed top-16 left-0 right-0 z-40 bg-black border-b border-zinc-800 flex flex-col p-3 gap-1 md:hidden shadow-2xl">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                                className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest rounded-md transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 mt-16 overflow-y-auto custom-scrollbar">
                    <div className="max-w-[1400px] mx-auto p-4 md:p-8 animate-slide">
                        {renderContent()}
                    </div>
                </main>

                {/* Footer */}
                <footer className="p-4 text-center border-t border-gray-200 bg-white">
                    <p className="text-[10px] font-heading font-black uppercase tracking-[0.4em] text-gray-300">IDENTITY GRAPHICS HOUZZ // SECURE SESSION ACTIVE</p>
                </footer>
            </div>
        );
    };

    const App = () => {
        if (!window.AppContext || !window.AppProvider || !window.LoginScreen) {
            return <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#666' }}>
                [BOOT] INITIALIZING SYSTEM INFRASTRUCTURE...
            </div>;
        }
        const context = useContext(window.AppContext);
        const user = context ? context.user : null;
        return (
            <div className="transition-colors duration-300">
                {user ? <MainLayout /> : (window.LoginScreen ? <window.LoginScreen /> : null)}
            </div>
        );
    };

    const initSystem = () => {
        console.log('IGH System: Starting bootstrap sequence');

        const { AppContext, AppProvider, Dashboard } = window;

        if (!AppContext || !AppProvider || !Dashboard) {
            console.warn('System still booting, partial dependency load. Retrying...');
            setTimeout(initSystem, 100);
            return;
        }

        const domNode = document.getElementById('root');
        if (!domNode) return;

        // Clear any previous root if it somehow exists (tho unlikely here)
        const root = ReactDOM.createRoot(domNode);
        root.render(
            <ErrorBoundary>
                <AppProvider>
                    <App />
                </AppProvider>
            </ErrorBoundary>
        );
        console.log('IGH System: Initialized correctly');
    };

    // Start boot sequence
    if (document.readyState === 'complete') {
        setTimeout(initSystem, 500);
    } else {
        window.addEventListener('load', () => setTimeout(initSystem, 500));
    }
}
