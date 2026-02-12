{
    const { useState, useEffect, useMemo, useContext } = React;

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
        const [isSidebarOpen, setIsSidebarOpen] = useState(true);

        if (!context) return <div className="p-20 text-center font-bold">Waiting for System Context...</div>;

        const { user, logout, activeTab, isDarkMode, setIsDarkMode } = context;

        const renderContent = () => {
            // Dynamically grab modules from window to avoid closure/scoping issues
            const {
                Dashboard, SalesModule, ExpenseModule, InventoryModule,
                ClientModule, SupplierModule, ProjectModule, ReportModule,
                FieldOpsModule, SettingsModule
            } = window;

            switch (activeTab) {
                case 'expenses': return ExpenseModule ? <ExpenseModule /> : null;
                case 'sales': return SalesModule ? <SalesModule /> : null;
                case 'inventory': return InventoryModule ? <InventoryModule /> : null;
                case 'clients': return ClientModule ? <ClientModule /> : null;
                case 'suppliers': return SupplierModule ? <SupplierModule /> : null;
                case 'projects': return ProjectModule ? <ProjectModule /> : null;
                case 'reports': return ReportModule ? <ReportModule /> : null;
                case 'field_ops': return FieldOpsModule ? <FieldOpsModule /> : null;
                case 'settings': return SettingsModule ? <SettingsModule /> : null;
                default: return Dashboard ? <Dashboard /> : null;
            }
        };

        return (
            <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
                {/* C7: Mobile overlay backdrop */}
                {isSidebarOpen && (
                    <div className="fixed inset-0 bg-black/50 z-10 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
                )}
                <aside className={`bg-[#0f172a]/95 backdrop-blur-2xl text-white transition-all duration-500 ease-in-out flex flex-col z-20 shadow-[20px_0_50px_rgba(0,0,0,0.1)] border-r border-white/5 fixed lg:sticky top-0 h-screen ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-24 -translate-x-full lg:translate-x-0'}`}>
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div className={`flex items-center gap-3 transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0 hidden'}`}>
                            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-black text-xs">IG</div>
                            <span className="font-black tracking-tighter uppercase italic text-sm">IGH Tracker</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors ${!isSidebarOpen && 'mx-auto'}`}>
                            {window.Icon && <window.Icon name={isSidebarOpen ? "chevron-left" : "menu"} size={20} />}
                        </button>
                    </div>
                    <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
                        {window.SidebarLink && (
                            <>
                                <window.SidebarLink id="dashboard" icon="layout-dashboard" label="Dashboard" isOpen={isSidebarOpen} />
                                <div className={`pt-6 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Core Engine</div>
                                <window.SidebarLink id="sales" icon="shopping-cart" label="Sales Console" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="expenses" icon="receipt" label="Expense Ledger" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="projects" icon="briefcase" label="Project Grid" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="inventory" icon="package" label="Asset Control" isOpen={isSidebarOpen} />
                                <div className={`pt-6 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Intelligence</div>
                                <window.SidebarLink id="reports" icon="bar-chart-3" label="Business Analytics" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="clients" icon="users" label="CRM Access" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="suppliers" icon="truck" label="Supply Chain" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="field_ops" icon="radio" label="Field Operations" isOpen={isSidebarOpen} />
                            </>
                        )}
                    </nav>
                    <div className="p-6 mt-auto border-t border-white/5 bg-black/20">
                        {user?.role === 'admin' && window.SidebarLink && <window.SidebarLink id="settings" icon="settings" label="System Settings" isOpen={isSidebarOpen} />}
                        <button onClick={logout} className={`w-full flex items-center gap-4 px-4 py-4 mt-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${!isSidebarOpen && 'justify-center'}`}>
                            {window.Icon && <window.Icon name="log-out" size={20} />}<span className={isSidebarOpen ? 'block' : 'hidden'}>Terminate Session</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-slate-50 dark:bg-[#020617]">
                    <header className="h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm dark:bg-[#020617]/80 dark:border-white/5">
                        <div className="flex items-center gap-4 sm:gap-8 flex-1">
                            {/* C7: Mobile hamburger */}
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500">
                                {window.Icon && <window.Icon name="menu" size={24} />}
                            </button>
                            <div className="relative group hidden lg:block max-w-md w-full">
                                <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Execute search command..."
                                    className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-xs font-bold focus:ring-2 focus:ring-brand-500/20 transition-all dark:bg-white/5 dark:text-white"
                                />
                            </div>

                            <div className="flex flex-col min-w-0 border-l border-slate-200 dark:border-white/10 pl-8">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight capitalize truncate leading-none mb-1">{activeTab ? activeTab.replace('_', ' ') : 'Dashboard'}</h2>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] italic opacity-70">Secured Control Plane</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl">
                                <button onClick={() => setIsDarkMode(false)} className={`p-2.5 rounded-xl transition-all ${!isDarkMode ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-400'}`}>
                                    <Icon name="sun" size={18} />
                                </button>
                                <button onClick={() => setIsDarkMode(true)} className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-900 text-brand-500 shadow-sm' : 'text-slate-500'}`}>
                                    <Icon name="moon" size={18} />
                                </button>
                            </div>

                            <button className="p-3 text-slate-400 hover:text-brand-500 hover:bg-brand-500/5 rounded-2xl transition-all relative">
                                <Icon name="bell" size={20} />
                                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#020617]"></span>
                            </button>

                            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>

                            <div className="flex items-center gap-4 pl-2 group cursor-pointer">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{user?.name}</p>
                                    <p className="text-[9px] text-brand-500 uppercase font-black tracking-widest leading-none italic">{user?.role}</p>
                                </div>
                                <div className="w-11 h-11 bg-slate-900 dark:bg-brand-500 rounded-2xl border border-white/10 shadow-xl flex items-center justify-center font-black text-brand-500 dark:text-black text-lg group-hover:scale-105 transition-transform">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Avatar" className="w-full h-full rounded-2xl" />
                                </div>
                            </div>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                        <div className="max-w-7xl mx-auto">{renderContent()}</div>
                    </div>
                </main>
            </div>
        );
    };

    const App = () => {
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
