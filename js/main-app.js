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
                <aside className={`bg-[#0f172a] text-white transition-all duration-500 ease-in-out flex flex-col z-20 shadow-2xl sidebar ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
                    <div className="p-8 border-b border-white/5 flex items-center justify-center">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors ${isSidebarOpen ? 'rotate-0' : 'rotate-180'}`}>
                            {window.Icon && <window.Icon name="chevron-left" size={24} />}
                        </button>
                    </div>
                    <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                        {window.SidebarLink && (
                            <>
                                <window.SidebarLink id="dashboard" icon="layout-dashboard" label="Dashboard" isOpen={isSidebarOpen} />
                                <div className={`pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Operations</div>
                                <window.SidebarLink id="sales" icon="shopping-cart" label="Sales & Invoices" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="expenses" icon="receipt" label="Expenditures" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="projects" icon="briefcase" label="Project Hub" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="inventory" icon="package" label="Stock & SKU" isOpen={isSidebarOpen} />
                                <div className={`pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Directory</div>
                                <window.SidebarLink id="clients" icon="users" label="Client Portals" isOpen={isSidebarOpen} />
                                <window.SidebarLink id="suppliers" icon="truck" label="Vendor Network" isOpen={isSidebarOpen} />
                                <div className={`pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Analytics</div>
                                <window.SidebarLink id="reports" icon="bar-chart-3" label="Business Intel" isOpen={isSidebarOpen} />
                            </>
                        )}
                    </nav>
                    <div className="p-6 mt-auto border-t border-white/5 bg-black/20">
                        {user?.role === 'admin' && window.SidebarLink && <window.SidebarLink id="settings" icon="settings" label="Global Settings" isOpen={isSidebarOpen} />}
                        <button onClick={logout} className={`w-full flex items-center gap-4 px-4 py-4 mt-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-bold ${!isSidebarOpen && 'justify-center'}`}>
                            {window.Icon && <window.Icon name="log-out" size={24} />}<span className={isSidebarOpen ? 'block' : 'hidden'}>Sign Out</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-[#f8fafc] dark:bg-slate-950">
                    <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-30 shadow-sm sticky-header dark:bg-slate-900/70 dark:border-slate-800">
                        <div className="flex items-center gap-6 flex-1">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-900 dark:text-white transition-all"
                            >
                                <Icon name="menu" size={24} />
                            </button>

                            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-6">
                                <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20 hover:scale-105 transition-transform cursor-pointer">
                                    <img src="logo.jpg" alt="Logo" className="w-7 h-7 object-contain" />
                                </div>
                                <div className="hidden sm:flex flex-col">
                                    <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">IGH Tracker</span>
                                    <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest opacity-80 leading-tight mt-1">where creativity meets excellence</span>
                                </div>
                            </div>

                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden lg:block mx-2"></div>

                            <div className="flex flex-col min-w-0">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight capitalize truncate">{activeTab ? activeTab.replace('_', ' ') : 'Dashboard'}</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Live Session Control</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-6">
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:scale-105 transition-all shadow-sm">
                                {window.Icon && <window.Icon name={isDarkMode ? 'sun' : 'moon'} size={20} />}
                            </button>
                            <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                                {window.Icon && <window.Icon name="bell" />}<span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                            </button>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user?.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black mt-1">{user?.role === 'reception' ? 'Reception' : user?.role}</p>
                                </div>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-900 dark:bg-brand-500 rounded-xl border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center font-black text-brand-500 dark:text-black text-sm sm:text-base">
                                    {user?.name?.charAt(0)}
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
