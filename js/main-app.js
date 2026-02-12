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
        if (!context) return <div className="p-20 text-center font-display uppercase tracking-widest animate-pulse">Initializing Core Engine...</div>;

        const { user, logout, activeTab } = context;

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
            <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
                {/* Top Header: Brand & Identity */}
                <header className="bg-black text-white px-8 py-4 flex items-center justify-between z-30 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-brand-500 text-black flex items-center justify-center rounded-sm">
                            <window.Icon name="logo-box" size={32} />
                        </div>
                        <div className="hidden sm:block text-left">
                            <h1 className="text-lg font-display uppercase tracking-tighter leading-none">Identity Graphics Houzz</h1>
                            <p className="text-[10px] text-brand-500 font-display uppercase tracking-[0.2em] italic mt-1">Where creativity meets excellence</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-display uppercase tracking-widest text-slate-400 leading-none mb-1">{user?.email}</p>
                            <p className="text-[9px] text-brand-500 uppercase font-black tracking-widest leading-none italic">System Administrator</p>
                        </div>
                        <button
                            onClick={logout}
                            className="brand-button-yellow !px-6 !py-3 !text-[10px] flex items-center gap-2"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Top Navigation: Module Tabs */}
                <nav className="bg-white border-b border-slate-100 px-8 flex items-center gap-2 sticky top-0 z-20 overflow-x-auto no-scrollbar shadow-sm">
                    <window.NavTab id="dashboard" label="Dashboard" icon="layout-dashboard" />
                    <window.NavTab id="sales" label="Sales" icon="shopping-cart" />
                    <window.NavTab id="expenses" label="Expenses" icon="receipt" />
                    <window.NavTab id="projects" label="Projects" icon="briefcase" />
                    <window.NavTab id="inventory" label="Inventory" icon="package" />
                    <window.NavTab id="clients" label="Clients" icon="users" />
                    <window.NavTab id="suppliers" label="Suppliers" icon="truck" />
                    <window.NavTab id="field_ops" label="Field Ops" icon="radio" />
                    {user?.role === 'admin' && <window.NavTab id="settings" label="Admin" icon="settings" />}
                </nav>

                {/* Main Content Area */}
                <main className="flex-1 p-8 sm:p-12">
                    <div className="max-w-[1600px] mx-auto animate-slide">
                        {renderContent()}
                    </div>
                </main>

                <footer className="p-8 border-t border-slate-100 text-center opacity-30">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-800">
                        Operational Intelligence System // Secure Session Active
                    </p>
                </footer>
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
