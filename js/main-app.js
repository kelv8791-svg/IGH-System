const { useState, useEffect, useMemo, useContext } = React;

const MainLayout = () => {
    const { user, logout, activeTab } = useContext(AppContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const renderContent = () => {
        switch (activeTab) {
            case 'expenses': return <ExpenseModule />;
            case 'sales': return <SalesModule />;
            case 'inventory': return <InventoryModule />;
            case 'clients': return <ClientModule />;
            case 'suppliers': return <SupplierModule />;
            case 'projects': return <ProjectModule />;
            case 'reports': return <ReportModule />;
            case 'field_ops': return <FieldOpsModule />;
            case 'settings': return <SettingsModule />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
            {/* Sidebar */}
            <aside className={`bg-[#0f172a] text-white transition-all duration-500 ease-in-out flex flex-col z-20 shadow-2xl sidebar ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className={`flex items-center gap-4 transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden shrink-0'}`}>
                        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
                            <img src="logo.jpg" alt="Logo" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex flex-col min-w-max">
                            <span className="text-xl font-black tracking-tighter text-white uppercase italic">IGH Tracker</span>
                            <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest opacity-80 leading-tight mt-1">where creativity meets excellence</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors ${!isSidebarOpen && 'mx-auto'}`}
                    >
                        <Icon name={isSidebarOpen ? 'chevron-left' : 'menu'} size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                    <SidebarLink id="dashboard" icon="layout-dashboard" label="Dashboard" isOpen={isSidebarOpen} />
                    <div className={`pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Operations</div>
                    <SidebarLink id="sales" icon="shopping-cart" label="Sales & Invoices" isOpen={isSidebarOpen} />
                    <SidebarLink id="expenses" icon="receipt" label="Expenditures" isOpen={isSidebarOpen} />
                    <SidebarLink id="projects" icon="briefcase" label="Project Hub" isOpen={isSidebarOpen} />
                    <SidebarLink id="inventory" icon="package" label="Stock & SKU" isOpen={isSidebarOpen} />

                    <div className={`pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Directory</div>
                    <SidebarLink id="clients" icon="users" label="Client Portals" isOpen={isSidebarOpen} />
                    <SidebarLink id="suppliers" icon="truck" label="Vendor Network" isOpen={isSidebarOpen} />

                    <div className={`pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-opacity duration-300 ${!isSidebarOpen && 'opacity-0'}`}>Analytics</div>
                    <SidebarLink id="reports" icon="bar-chart-3" label="Business Intel" isOpen={isSidebarOpen} />
                </nav>

                <div className="p-6 mt-auto border-t border-white/5 bg-black/20">
                    {user?.role === 'admin' && (
                        <SidebarLink id="settings" icon="settings" label="Global Settings" isOpen={isSidebarOpen} />
                    )}
                    <button
                        onClick={logout}
                        className={`w-full flex items-center gap-4 px-4 py-4 mt-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-bold ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <Icon name="log-out" size={24} />
                        <span className={isSidebarOpen ? 'block' : 'hidden'}>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-[#f8fafc] dark:bg-slate-950">
                <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-30 shadow-sm sticky-header dark:bg-slate-900/70 dark:border-slate-800">
                    <div className="flex items-center gap-8 flex-1">
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight capitalize truncate max-w-[150px] sm:max-w-none">{activeTab.replace('_', ' ')}</h2>
                            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest overflow-hidden">
                                <span className="hover:text-brand-600 cursor-pointer transition-colors shrink-0">IGH</span>
                                <Icon name="chevron-right" size={10} />
                                <span className="text-slate-500 truncate">{activeTab}</span>
                            </div>
                        </div>

                        {/* Global Search Bar */}
                        <div className="hidden lg:flex items-center flex-1 max-w-md relative group">
                            <Icon name="search" size={18} className="absolute left-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand-500/10 transition-all dark:bg-slate-800 dark:text-white"
                            />
                            <div className="absolute right-4 flex items-center gap-1">
                                <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-400 dark:bg-slate-700 dark:border-slate-600">CMD</span>
                                <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-400 dark:bg-slate-700 dark:border-slate-600">K</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:scale-105 transition-all shadow-sm"
                            title="Toggle Theme"
                        >
                            <Icon name={isDarkMode ? 'sun' : 'moon'} size={20} />
                        </button>

                        <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                            <Icon name="bell" /><span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black mt-1">{user?.role === 'operative' ? 'Reception' : user?.role}</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-900 dark:bg-brand-500 rounded-xl border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center font-black text-brand-500 dark:text-black text-sm sm:text-base">
                                {user?.name?.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

const App = () => {
    const { user } = useContext(AppContext);
    return (
        <div className="transition-colors duration-300">
            {user ? <MainLayout /> : <LoginScreen />}
        </div>
    );
};

const Root = () => (
    <AppProvider>
        <App />
    </AppProvider>
);

const domNode = document.getElementById('root');
const root = ReactDOM.createRoot(domNode);
root.render(<Root />);
