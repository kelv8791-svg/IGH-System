{
    const { useState, useEffect, useMemo, useContext } = React;
    const AppContext = window.AppContext;

    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) {
            alert("No data available to export.");
            return;
        }
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const val = row[header];
                return `"${typeof val === 'object' ? JSON.stringify(val).replace(/"/g, '""') : val}"`;
            }).join(','))
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const ExportDropdown = ({ data, filename }) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-xs font-black uppercase tracking-widest hover:bg-accent transition-all shadow-sm"
                >
                    <Icon name="Download" size={14} /> Export Sequence
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-2xl border border-border z-50 overflow-hidden animate-slide glass">
                        <button onClick={() => { downloadCSV(data, filename); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white flex items-center gap-3 transition-colors border-b border-border/50">
                            <Icon name="FileSpreadsheet" size={14} /> CSV Spreadsheet
                        </button>
                        <button onClick={() => { downloadCSV(data, filename); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white flex items-center gap-3 transition-colors border-b border-border/50">
                            <Icon name="FileCode" size={14} /> JSON Matrix
                        </button>
                        <button onClick={() => { window.print(); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white flex items-center gap-3 transition-colors">
                            <Icon name="Printer" size={14} /> Print Hardcopy
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const Dashboard = () => {
        const { data, setActiveTab, isDarkMode } = useContext(AppContext);
        const [chartRange, setChartRange] = useState('6M');

        const stats = useMemo(() => {
            const revenue = data.sales.reduce((sum, s) => {
                const amount = parseFloat(s.total) || parseFloat(s.amount) || 0;
                const itemsTotal = s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.qty || 0) * parseFloat(i.price || 0)), 0) : 0;
                return sum + (amount || itemsTotal || 0);
            }, 0);
            const expenses = data.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            const activeProjects = data.projects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').length;
            const pendingInvoices = data.sales.filter(s => s.status === 'Pending').length;

            // Simplified trend calculation for demo
            const trends = {
                revenue: { val: '+12.4%', type: 'up' },
                expenses: { val: '-2.1%', type: 'down' },
                projects: { val: '+3', type: 'up' },
                pending: { val: '-1', type: 'down' }
            };

            const catMap = data.expenses.reduce((acc, exp) => {
                const cat = exp.category || 'Other';
                acc[cat] = (acc[cat] || 0) + parseFloat(exp.amount || 0);
                return acc;
            }, {});

            const topExpenses = Object.entries(catMap)
                .map(([name, amount]) => ({ name, amount }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5);

            const maxExp = Math.max(...topExpenses.map(e => e.amount), 1);
            const topExpensesWithPct = topExpenses.map(e => ({
                ...e,
                pct: (e.amount / maxExp) * 100
            }));

            return {
                revenue, expenses, activeProjects, pendingInvoices,
                trends, topExpenses: topExpensesWithPct
            };
        }, [data]);

        const lowStockItems = useMemo(() => {
            return data.inventory
                .filter(i => (parseFloat(i.quantity) || 0) <= (parseFloat(i.min_threshold) || 5))
                .sort((a, b) => (parseFloat(a.quantity) || 0) - (parseFloat(b.quantity) || 0))
                .slice(0, 5);
        }, [data.inventory]);

        useEffect(() => {
            const chartDom = document.getElementById('revenueChart');
            if (!chartDom) return;

            const ctx = chartDom.getContext('2d');
            const existingChart = Chart.getChart('revenueChart');
            if (existingChart) existingChart.destroy();

            const isDark = document.documentElement.classList.contains('dark');
            const primaryColor = 'hsl(221.2, 83.2%, 53.3%)';

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB'],
                    datasets: [{
                        label: 'Revenue (KSh)',
                        data: [1200000, 1900000, 1500000, 2400000, 2100000, stats.revenue || 2800000],
                        borderColor: primaryColor,
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 4,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: primaryColor,
                        pointBorderColor: isDark ? '#000' : '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            titleColor: isDark ? '#fff' : '#1e293b',
                            bodyColor: isDark ? '#cbd5e1' : '#64748b',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: (context) => ` KSh ${context.raw.toLocaleString()}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                            ticks: {
                                color: isDark ? '#64748b' : '#94a3b8',
                                font: { size: 10, weight: 'bold' },
                                callback: (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString()
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: isDark ? '#64748b' : '#94a3b8',
                                font: { size: 10, weight: 'black' }
                            }
                        }
                    }
                }
            });
        }, [stats.revenue, isDarkMode]);

        return (
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter">DASHBOARD</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1 italic">Operational Intelligence Sequence // 12-BETA</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ExportDropdown data={[...data.sales, ...data.expenses]} filename="IGH_Global_Audit" />
                        <button onClick={() => window.print()} className="brand-button-black !bg-slate-950 !text-white h-10 px-6 uppercase tracking-widest text-[10px]">
                            <Icon name="Printer" size={14} /> Full Audit Print
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        label="Total Revenue"
                        value={`KSh ${stats.revenue.toLocaleString()}`}
                        trend={stats.trends.revenue.val}
                        trendType={stats.trends.revenue.type}
                        icon="Coins"
                    />
                    <StatCard
                        label="Total Expenses"
                        value={`KSh ${stats.expenses.toLocaleString()}`}
                        trend={stats.trends.expenses.val}
                        trendType={stats.trends.expenses.type}
                        icon="TrendingDown"
                    />
                    <StatCard
                        label="Active Projects"
                        value={stats.activeProjects}
                        trend={stats.trends.projects.val}
                        trendType={stats.trends.projects.type}
                        icon="Briefcase"
                    />
                    <StatCard
                        label="Pending Invoices"
                        value={stats.pendingInvoices}
                        trend={stats.trends.pending.val}
                        trendType={stats.trends.pending.type}
                        icon="Receipt"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 brand-card p-8 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all duration-700 group-hover:bg-primary/10"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h2 className="text-xl font-black italic tracking-tight uppercase">Revenue Analytics</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Capital Velocity // 6-Month Trajectory</p>
                            </div>
                            <div className="flex gap-2 p-1 bg-accent/50 rounded-xl border border-border">
                                {['1M', '3M', '6M', '1Y'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setChartRange(t)}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${t === chartRange ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[350px] relative z-10 w-full">
                            <canvas id="revenueChart"></canvas>
                        </div>
                    </div>

                    <div className="brand-card p-8 flex flex-col relative overflow-hidden">
                        <div className="mb-8">
                            <h2 className="text-xl font-black italic tracking-tight uppercase">Burn Breakdown</h2>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Expense Segmentation matrix</p>
                        </div>
                        <div className="flex-1 space-y-7">
                            {stats.topExpenses.length > 0 ? stats.topExpenses.map((ex, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.1em]">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                                            {ex.name}
                                        </span>
                                        <span className="text-foreground">KSh {ex.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-accent rounded-full h-2 overflow-hidden border border-border/50">
                                        <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${ex.pct}%` }}></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-20">
                                    <Icon name="Activity" size={48} className="mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No spectral data detected</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 pt-8 border-t border-border">
                            <button onClick={() => setActiveTab('expenses')} className="w-full h-12 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-black font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 group transition-all hover:gap-4 shadow-xl shadow-black/10">
                                View Full Ledger <Icon name="ArrowRight" size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="brand-card lg:col-span-2 p-8 flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-lg font-black italic tracking-tight uppercase">Low Stock Alerts</h2>
                                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1">Critical threshold interrupts</p>
                            </div>
                            <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/5">
                                <Icon name="PackageSearch" size={24} />
                            </div>
                        </div>
                        <div className="space-y-6 flex-1">
                            {lowStockItems.length > 0 ? lowStockItems.map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-accent/50 border border-border group hover:border-rose-500/50 transition-all cursor-default">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-foreground italic group-hover:text-rose-600 transition-colors">{item.name}</span>
                                        <span className="px-2 py-1 bg-rose-500 text-white rounded-md tabular-nums">{item.quantity} {item.unit}</span>
                                    </div>
                                    <div className="mt-2 text-[8px] text-muted-foreground font-bold tracking-[0.2em] flex items-center gap-2">
                                        CAT: {item.category} // THRESHOLD: {item.min_threshold}
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                                    <Icon name="ShieldCheck" size={64} className="text-emerald-500 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest italic">All systems nominal</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 pt-8 border-t border-border">
                            <button onClick={() => setActiveTab('inventory')} className="w-full text-center text-[10px] font-black text-primary hover:tracking-[0.3em] transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 italic">
                                Inventory Systems Access <Icon name="BarChart" size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="brand-card lg:col-span-3 p-8 flex flex-col bg-white relative overflow-hidden group border border-gray-200 shadow-2xl">
                        <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-[5000ms] pointer-events-none">
                            <Icon name="Activity" size={400} />
                        </div>

                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div>
                                <h2 className="text-xl font-black italic tracking-tight uppercase text-primary">Activity Telemetry</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Live operational sequence feed</p>
                            </div>
                            <div className="h-8 px-5 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-full shadow-lg shadow-primary/10">
                                <div className="w-2 h-2 bg-primary rounded-full animate-ping mr-3"></div>
                                <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">Live Uplink</span>
                            </div>
                        </div>

                        <div className="space-y-5 relative z-10">
                            {(data.activities || []).slice(0, 5).map((act, idx) => (
                                <div key={idx} className="flex gap-6 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-primary/5 hover:border-primary/20 transition-all group cursor-default">
                                    <div className="w-12 h-12 shrink-0 bg-primary/10 text-primary flex items-center justify-center border border-primary/20 rounded-xl group-hover:bg-primary group-hover:text-black transition-all">
                                        <Icon name={act.action === 'Delete' ? "Trash2" : act.action === 'Update' ? "RefreshCw" : "PlusCircle"} size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded uppercase tracking-tighter italic">
                                                {act.module}
                                            </span>
                                            <span className="text-[8px] text-muted-foreground/70 font-bold uppercase tracking-widest">
                                                {new Date(act.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="font-bold text-xs uppercase tracking-widest truncate group-hover:text-primary transition-colors text-foreground">
                                            {act.action} - {act.details || 'System event triggered'}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                                            OPERATOR: {act.performed_by}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {(!data.activities || data.activities.length === 0) && (
                                <div className="flex flex-col items-center justify-center h-64 opacity-40 border-2 border-dashed border-gray-200 rounded-3xl">
                                    <Icon name="WifiOff" size={48} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">No activity streams detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    const ExpenseModule = () => {
        const { data, updateData, deleteItem, user, logActivity } = useContext(AppContext);
        const [isAdding, setIsAdding] = useState(false);
        const [newExp, setNewExp] = useState({ date: new Date().toISOString().split('T')[0], amount: '', category: 'Raw Materials', notes: '' });

        const addExpense = async (e) => {
            e.preventDefault();
            const expense = {
                ...newExp,
                id: Date.now(),
                amount: parseFloat(newExp.amount) || 0,
                created_at: new Date().toISOString(),
                performed_by: user?.display_name || user?.username || 'Operator'
            };

            const success = await updateData('expenses', expense);
            if (success) {
                logActivity({
                    module: 'Expenses',
                    action: 'Create',
                    details: `Expense logged: ${expense.category} - KSh ${expense.amount.toLocaleString()}`,
                    performed_by: expense.performed_by
                });
                setIsAdding(false);
                setNewExp({ date: new Date().toISOString().split('T')[0], amount: '', category: 'Raw Materials', notes: '' });
            }
        };

        useEffect(() => {
            const chartDom = document.getElementById('expenseAnalyticsChart');
            if (!chartDom) return;

            const ctx = chartDom.getContext('2d');
            const existingChart = Chart.getChart('expenseAnalyticsChart');
            if (existingChart) existingChart.destroy();

            const catMap = data.expenses.reduce((acc, exp) => {
                acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount || 0);
                return acc;
            }, {});

            const isDark = document.documentElement.classList.contains('dark');

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(catMap),
                    datasets: [{
                        label: 'Allocation',
                        data: Object.values(catMap),
                        backgroundColor: 'hsl(221.2, 83.2%, 53.3%)',
                        borderRadius: 6,
                        barThickness: 16
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                            ticks: {
                                color: isDark ? '#64748b' : '#94a3b8',
                                font: { size: 9, weight: 'bold' }
                            }
                        },
                        y: {
                            grid: { display: false },
                            ticks: {
                                color: isDark ? '#f8fafc' : '#1e293b',
                                font: { size: 10, weight: 'black' }
                            }
                        }
                    }
                }
            });
        }, [data.expenses]);

        const totalBurn = data.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        return (
            <div className="space-y-8 pb-12 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Operational Ledger</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1 italic">Capital Outflow Monitoring Sequence</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ExportDropdown data={data.expenses} filename="IGH_Expense_Ledger" />
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="brand-button-yellow h-10 px-6"
                        >
                            <Icon name={isAdding ? 'X' : 'Plus'} size={18} />
                            {isAdding ? 'DISMISS' : 'LOG EXPENSE'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 brand-card p-8 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-8 italic relative z-10 text-center md:text-left">Allocation Matrix // Category Distribution</h2>
                        <div className="h-56 relative z-10 w-full">
                            <canvas id="expenseAnalyticsChart"></canvas>
                        </div>
                    </div>
                    <div className="brand-card p-8 bg-white relative overflow-hidden flex flex-col justify-center border border-gray-200 shadow-2xl">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none"></div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-4 relative z-10">Total Burn Rate</p>
                        <h2 className="text-5xl font-black italic tracking-tighter relative z-10 tabular-nums text-foreground">
                            KSh {totalBurn.toLocaleString()}
                        </h2>
                        <div className="mt-8 flex items-center gap-3 relative z-10 pt-8 border-t border-gray-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">System Audit: {new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>
                </div>

                {isAdding && (
                    <div className="brand-card p-10 bg-white border-l-4 border-black animate-slide relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none text-primary"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-2xl font-black italic tracking-tight uppercase text-primary">Log Capital Outflow</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Transaction Provisioning Sequence</p>
                                </div>
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                                    <Icon name="Receipt" size={24} />
                                </div>
                            </div>

                            <form onSubmit={addExpense} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-3">
                                        <label className="brand-label">Chronology</label>
                                        <input
                                            type="date"
                                            className="brand-input !h-12"
                                            required
                                            value={newExp.date}
                                            onChange={e => setNewExp({ ...newExp, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="brand-label">Quantum (KES)</label>
                                        <input
                                            type="number"
                                            className="brand-input !h-12 font-mono"
                                            placeholder="0.00"
                                            required
                                            value={newExp.amount}
                                            onChange={e => setNewExp({ ...newExp, amount: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="brand-label">Classification</label>
                                        <select
                                            className="brand-input !h-12"
                                            value={newExp.category}
                                            onChange={e => setNewExp({ ...newExp, category: e.target.value })}
                                        >
                                            <option className="bg-white">Raw Materials</option>
                                            <option className="bg-white">Human Resource</option>
                                            <option className="bg-white">Office Supplies</option>
                                            <option className="bg-white">Marketing</option>
                                            <option className="bg-white">Software</option>
                                            <option className="bg-white">Logistics</option>
                                            <option className="bg-white">Utilities</option>
                                            <option className="bg-white">Miscellaneous</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="brand-label">Operational Descriptor</label>
                                    <input
                                        type="text"
                                        className="brand-input !h-12"
                                        placeholder="Specify purpose of expenditure..."
                                        value={newExp.notes}
                                        onChange={e => setNewExp({ ...newExp, notes: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end pt-8 border-t border-white/10">
                                    <button type="submit" className="brand-button-yellow h-12 px-12 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">
                                        Execute Ledger Command
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="brand-card overflow-hidden border-none shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-accent/50 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Timeline</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Classification</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operational Notes</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right border-l border-border/10">Quantum</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {data.expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(exp => (
                                    <tr key={exp.id} className="hover:bg-accent/30 transition-all group/row cursor-default">
                                        <td className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-[0.2em] rounded-md border border-primary/20">
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-bold text-foreground">{exp.notes || 'No descriptor provided'}</p>
                                            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1">OP: {exp.performed_by || 'SYSTEM'}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-foreground tabular-nums border-l border-border/10">KSh {parseFloat(exp.amount).toLocaleString()}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-end transition-all">
                                                <button
                                                    onClick={() => { if (confirm('Purge this record from ledger?')) deleteItem('expenses', exp.id); }}
                                                    title="Delete Record"
                                                    className="w-10 h-10 flex items-center justify-center bg-card border border-border rounded-xl text-muted-foreground hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:scale-105 transition-all shadow-sm"
                                                >
                                                    <Icon name="Trash2" size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data.expenses.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center opacity-20">
                                            <Icon name="Activity" size={48} className="mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Ledger currently void</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const SalesModule = () => {
        const { data, updateData, getNextInvoiceNumber, logActivity, invoiceDraft, setInvoiceDraft, seedInvoice, user, deleteItem } = useContext(AppContext);

        const unbilledProjects = useMemo(() => {
            return data.projects.filter(p => (p.stage === 'Delivered' || p.status === 'Completed') && !(p.invoices && p.invoices.length > 0));
        }, [data.projects]);
        const [isAdding, setIsAdding] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const [selectedInvoice, setSelectedInvoice] = useState(null);
        const [newSale, setNewSale] = useState({
            client: '',
            projectId: '',
            date: new Date().toISOString().split('T')[0],
            items: [{ desc: '', qty: 1, price: 0 }],
            status: 'Pending',
            taxRate: data.config?.tax_rate || data.config?.taxRate || 16
        });

        useEffect(() => {
            if (invoiceDraft) {
                setNewSale({
                    client: invoiceDraft.client,
                    projectId: invoiceDraft.projectId,
                    date: new Date().toISOString().split('T')[0],
                    items: [{ desc: invoiceDraft.itemName, qty: 1, price: invoiceDraft.amount || 0 }],
                    status: 'Pending',
                    taxRate: data.config?.taxRate || 16
                });
                setIsAdding(true);
                setInvoiceDraft(null);
            }
        }, [invoiceDraft]);

        const [settlingInvoice, setSettlingInvoice] = useState(null);
        const [payments, setPayments] = useState([{ mode: 'Mpesa', amount: 0, ref: '' }]);

        const addPaymentEntry = () => setPayments([...payments, { mode: 'Mpesa', amount: 0, ref: '' }]);
        const removePaymentEntry = (index) => setPayments(payments.filter((_, i) => i !== index));
        const updatePaymentEntry = (index, field, value) => {
            const updated = [...payments];
            updated[index][field] = value;
            setPayments(updated);
        };

        const addItem = () => setNewSale(prev => ({ ...prev, items: [...prev.items, { desc: '', qty: 1, price: 0 }] }));
        const updateItem = (index, field, value) => {
            const items = [...newSale.items];
            items[index][field] = value;
            setNewSale({ ...newSale, items });
        };
        const removeItem = (index) => {
            if (newSale.items.length > 1) {
                setNewSale({ ...newSale, items: newSale.items.filter((_, i) => i !== index) });
            }
        };

        const totals = useMemo(() => {
            const subtotal = newSale.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
            const tax = (subtotal * newSale.taxRate) / 100;
            return { subtotal, tax, total: subtotal + tax };
        }, [newSale]);

        const handleSubmit = async (e, isQuote = false) => {
            if (e) e.preventDefault();
            const sale = {
                ...newSale,
                id: Date.now(),
                invoiceNo: isQuote ? `QUO-${Date.now()}` : getNextInvoiceNumber(),
                isQuote,
                amount: totals.total,
                subtotal: totals.subtotal,
                tax: totals.tax,
                status: isQuote ? 'Draft' : 'Pending',
                created_at: new Date().toISOString(),
                performed_by: user?.display_name || user?.username || 'Operator'
            };

            const success = await updateData('sales', sale);
            if (success) {
                if (newSale.projectId) {
                    const proj = data.projects.find(p => p.id === parseInt(newSale.projectId));
                    if (proj) {
                        const updatedProjects = data.projects.map(p =>
                            p.id === proj.id ? { ...p, invoices: [...(p.invoices || []), sale.invoiceNo] } : p
                        );
                        await updateData('projects_bulk', updatedProjects);
                    }
                }

                logActivity({
                    module: 'Sales',
                    action: isQuote ? 'Quote' : 'Invoice',
                    details: `${isQuote ? 'Quote' : 'Invoice'} ${sale.invoiceNo} issued to ${sale.client} - KSh ${sale.amount.toLocaleString()}`,
                    performed_by: sale.performed_by
                });

                setIsAdding(false);
                setNewSale({
                    client: '',
                    projectId: '',
                    date: new Date().toISOString().split('T')[0],
                    items: [{ desc: '', qty: 1, price: 0 }],
                    status: 'Pending',
                    taxRate: data.config?.taxRate || 16
                });
            }
        };

        const handleSettle = async (e) => {
            e.preventDefault();
            const currentPayment = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            const totalPaidSoFar = (settlingInvoice.amount_paid || settlingInvoice.amountPaid || 0) + currentPayment;
            const isFullyPaid = totalPaidSoFar >= parseFloat(settlingInvoice.amount);

            const updatedSales = data.sales.map(s =>
                s.id === settlingInvoice.id ? {
                    ...s,
                    status: isFullyPaid ? 'Paid' : 'Partial',
                    paymentHistory: [...(s.paymentHistory || []), ...payments.map(p => ({ ...p, date: new Date().toISOString() }))],
                    amountPaid: (s.amount_paid || s.amountPaid || 0) + currentPayment
                } : s
            );
            const success = await updateData('sales_bulk', updatedSales);

            if (success) {
                if (isFullyPaid && settlingInvoice.projectId) {
                    const updatedProjects = data.projects.map(p =>
                        p.id === parseInt(settlingInvoice.projectId) ? { ...p, status: 'Done & Paid', stage: 'Archived' } : p
                    );
                    await updateData('projects_bulk', updatedProjects);
                }

                logActivity({
                    module: 'Sales',
                    action: 'Settlement',
                    details: `Invoice ${settlingInvoice.invoiceNo} settled with KSh ${currentPayment.toLocaleString()}`,
                    performed_by: user?.display_name || user?.username || 'Operator'
                });

                setSettlingInvoice(null);
                setPayments([{ mode: 'Mpesa', amount: 0, ref: '' }]);
            }
        };

        const statusCounts = useMemo(() => {
            const pending = data.sales.filter(s => s.status === 'Pending' || s.status === 'Partial').length;
            const overdue = data.sales.filter(s => s.status === 'Overdue').length;
            const totalValue = data.sales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
            const received = data.sales.reduce((sum, s) => sum + parseFloat(s.amount_paid || s.amountPaid || 0), 0);
            return { total: data.sales.length, pending, overdue, value: totalValue, received };
        }, [data.sales]);

        return (
            <div className="space-y-8 pb-12 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Sales & Invoicing</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1 italic">Revenue Management & Transaction Lifecycle</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group/search">
                            <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH LEDGER..."
                                className="brand-input !bg-muted/30 border-muted !h-11 !pl-11 !pr-4 w-64 text-[10px] font-bold focus:w-80 transition-all uppercase tracking-widest"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <ExportDropdown data={data.sales} filename="IGH_Sales_Ledger" />
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="brand-button-yellow h-11 px-8"
                        >
                            <Icon name={isAdding ? 'X' : 'Plus'} size={18} />
                            {isAdding ? 'DISMISS' : 'ISSUE INVOICE'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Total Invoices" value={statusCounts.total} icon="FileText" />
                    <StatCard label="Live Receivables" value={statusCounts.pending} trend={`${((statusCounts.pending / statusCounts.total) * 100 || 0).toFixed(0)}%`} trendType="up" icon="Clock" />
                    <StatCard label="Pipeline Value" value={`KSh ${(statusCounts.value / 1000000).toFixed(1)}M`} icon="Banknote" />
                    <StatCard label="Collection Rate" value={`${((statusCounts.received / statusCounts.value) * 100 || 0).toFixed(0)}%`} trendType="up" icon="TrendingUp" />
                </div>

                {unbilledProjects.length > 0 && (
                    <div className="brand-card p-6 bg-primary/5 border-primary/20 animate-slide flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/5">
                                <Icon name="AlertCircle" size={28} />
                            </div>
                            <div>
                                <h4 className="text-base font-black tracking-tight uppercase">Unbilled Deliverables Detected</h4>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{unbilledProjects.length} PROJECTS AWAITING FINAL COMMERCIAL CLOSURE</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 relative z-10">
                            {unbilledProjects.slice(0, 3).map(up => (
                                <button
                                    key={up.id}
                                    onClick={() => seedInvoice({ client: up.client, projectId: up.id, itemName: up.name })}
                                    className="px-5 py-2.5 bg-background border border-border text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-primary/10"
                                >
                                    BILL {up.client}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {isAdding && (
                    <div className="brand-card p-10 bg-white border-l-4 border-black animate-slide relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none text-primary"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <h3 className="text-3xl font-black italic tracking-tighter uppercase text-primary">Issue New Document</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">Transaction Provisioning Sequence</p>
                                </div>
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-2xl">
                                    <Icon name="FilePlus" size={28} />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    <div className="space-y-3">
                                        <label className="brand-label">Client Identity</label>
                                        <div className="relative group/input">
                                            <Icon name="User" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" />
                                            <input
                                                list="clients-list"
                                                className="brand-input !h-14 !pl-12 w-full"
                                                placeholder="ENTER OR SELECT CLIENT..."
                                                required
                                                value={newSale.client}
                                                onChange={e => setNewSale({ ...newSale, client: e.target.value })}
                                            />
                                        </div>
                                        <datalist id="clients-list">
                                            {data.clients.map(c => <option key={c.id} value={c.name} />)}
                                        </datalist>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="brand-label">Project Node</label>
                                        <select
                                            className="brand-input !h-14 w-full"
                                            value={newSale.projectId}
                                            onChange={e => setNewSale({ ...newSale, projectId: e.target.value })}
                                        >
                                            <option value="" className="bg-white">INDEPENDENT TRANSACTION</option>
                                            {data.projects.map(p => <option key={p.id} value={p.id} className="bg-white">{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="brand-label">Chronology</label>
                                        <input
                                            type="date"
                                            className="brand-input !h-14 w-full"
                                            value={newSale.date}
                                            onChange={e => setNewSale({ ...newSale, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">Line Itemization // Billables</h4>
                                        <button type="button" onClick={addItem} className="text-[10px] font-black text-white/40 hover:text-primary transition-all flex items-center gap-2 uppercase tracking-widest">
                                            <Icon name="PlusCircle" size={16} /> ADD VECTOR
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {newSale.items.map((item, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-5 items-end animate-slide group/row">
                                                <div className="col-span-12 md:col-span-6 space-y-2">
                                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Operational Descriptor</label>
                                                    <input
                                                        className="brand-input !h-12 text-sm !px-5"
                                                        placeholder="Specify output unit..."
                                                        value={item.desc}
                                                        onChange={e => updateItem(idx, 'desc', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-4 md:col-span-2 space-y-2">
                                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">QTY</label>
                                                    <input
                                                        type="number"
                                                        className="brand-input !h-12 text-sm font-mono text-center"
                                                        placeholder="0"
                                                        value={item.qty}
                                                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-3 space-y-2">
                                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Unit Value (KSh)</label>
                                                    <input
                                                        type="number"
                                                        className="brand-input !h-12 text-sm font-mono"
                                                        placeholder="0.00"
                                                        value={item.price}
                                                        onChange={e => updateItem(idx, 'price', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2 md:col-span-1 flex justify-end">
                                                    <button type="button" onClick={() => removeItem(idx)} className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-xl">
                                                        <Icon name="Trash2" size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-end gap-10 pt-10 border-t border-white/10">
                                    <div className="flex flex-wrap gap-12 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                                        <div>
                                            <p className="mb-2 italic">Subtotal</p>
                                            <p className="text-xl text-white font-mono">KSh {totals.subtotal.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="mb-2 italic">Tax Load ({newSale.taxRate}%)</p>
                                            <p className="text-xl text-white font-mono">KSh {totals.tax.toLocaleString()}</p>
                                        </div>
                                        <div className="md:border-l md:border-white/10 md:pl-12">
                                            <p className="text-primary mb-2 italic">Aggregate Total</p>
                                            <p className="text-4xl text-primary font-black tracking-tighter tabular-nums italic">KSh {totals.total.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 w-full md:w-auto">
                                        <button type="button" onClick={(e) => handleSubmit(null, true)} className="flex-1 md:flex-none px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all italic text-white/60 hover:text-white">
                                            Cache as Quote
                                        </button>
                                        <button type="submit" className="flex-1 md:flex-none brand-button-yellow !h-14 !px-12 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20">
                                            Execute Financial Bond
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="brand-card overflow-hidden border-none shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-accent/50 border-b border-border">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Reference</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Client Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right border-l border-border/10">Magnitude</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {data.sales.filter(s =>
                                    s.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
                                ).sort((a, b) => b.id - a.id).map(sale => (
                                    <tr key={sale.id} className="hover:bg-accent/30 transition-all group/row cursor-default">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-foreground tracking-tighter">#{sale.invoiceNo}</span>
                                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 italic">{new Date(sale.date).toLocaleDateString('en-GB')}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-black text-foreground">{sale.client}</p>
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">AUTH: {sale.performed_by || 'SYSTEM'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${sale.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                    sale.status === 'Partial' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                        sale.status === 'Draft' ? 'bg-slate-500/10 text-slate-600 border-slate-500/20' :
                                                            'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                    }`}>
                                                    <Icon name={sale.status === 'Paid' ? 'CheckCircle' : sale.status === 'Partial' ? 'Clock' : sale.status === 'Draft' ? 'FileText' : 'AlertCircle'} size={11} />
                                                    {sale.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right border-l border-border/10">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-foreground font-mono tabular-nums">KSh {parseFloat(sale.amount).toLocaleString()}</span>
                                                {sale.amountPaid > 0 && (
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 transition-all duration-1000"
                                                                style={{ width: `${Math.min(100, (sale.amountPaid / sale.amount) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">{Math.round((sale.amountPaid / sale.amount) * 100)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-end gap-2 transition-all">
                                                <button
                                                    onClick={() => setSelectedInvoice(sale)}
                                                    className="w-10 h-10 flex items-center justify-center bg-card border border-border rounded-xl text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105 transition-all shadow-sm"
                                                    title="View Document"
                                                >
                                                    <Icon name="FileText" size={18} />
                                                </button>
                                                {sale.status !== 'Paid' && (
                                                    <button
                                                        onClick={() => setSettlingInvoice(sale)}
                                                        className="w-10 h-10 flex items-center justify-center bg-primary/10 border border-primary/20 rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                                        title="Authorize Settlement"
                                                    >
                                                        <Icon name="CreditCard" size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { if (confirm('Purge this record from ledger?')) deleteItem('sales', sale.id); }}
                                                    className="w-10 h-10 flex items-center justify-center bg-card border border-border rounded-xl text-muted-foreground hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:scale-105 transition-all shadow-sm"
                                                    title="Delete Record"
                                                >
                                                    <Icon name="Trash2" size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {data.sales.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center opacity-20">
                                            <Icon name="Search" size={48} className="mx-auto mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">No transaction records found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Settle Invoice Modal */}
                {/* Settle Invoice Modal */}
                {settlingInvoice && (
                    <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="brand-card w-full max-w-2xl p-0 animate-slide overflow-hidden border-none shadow-2xl">
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <h3 className="text-3xl font-black italic tracking-tighter uppercase text-primary underline decoration-primary/20 underline-offset-8">Authorize Settlement</h3>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-1 italic">Voucher Node: #{settlingInvoice.invoiceNo}</p>
                                    </div>
                                    <button
                                        onClick={() => setSettlingInvoice(null)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                    >
                                        <Icon name="X" size={24} />
                                    </button>
                                </div>

                                <div className="bg-accent/30 p-8 rounded-3xl mb-10 border border-border/50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                                    <div className="flex justify-between text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-6 italic">
                                        <span>Financial Analysis</span>
                                        <span className={`px-3 py-1 rounded-lg ${settlingInvoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                            }`}>STATUS: {settlingInvoice.status}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-8 relative z-10">
                                        <div>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Original Debt</p>
                                            <p className="text-xl font-black font-mono tracking-tighter italic">KSh {parseFloat(settlingInvoice.amount).toLocaleString()}</p>
                                        </div>
                                        <div className="border-l border-border/10 pl-8">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Current Credit</p>
                                            <p className="text-xl font-black font-mono tracking-tighter text-emerald-600 italic">KSh {(settlingInvoice.amountPaid || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="border-l border-border/10 pl-8">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Residue Debt</p>
                                            <p className="text-xl font-black font-mono tracking-tighter text-rose-500 italic">KSh {(settlingInvoice.amount - (settlingInvoice.amountPaid || 0)).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) > 0 && (
                                        <div className="mt-8 pt-8 border-t border-border/20 animate-slide">
                                            <div className="flex justify-between items-center bg-primary/10 p-5 rounded-2xl border border-primary/20">
                                                <div>
                                                    <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-1">PROJECTION // INPUT</p>
                                                    <p className="text-2xl font-black text-foreground tracking-tighter italic">KSh {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-1">FINAL DEBT RESIDUE</p>
                                                    <p className={`text-2xl font-black tracking-tighter italic ${settlingInvoice.amount - (settlingInvoice.amountPaid || 0) - payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        KSh {Math.max(0, settlingInvoice.amount - (settlingInvoice.amountPaid || 0) - payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSettle} className="space-y-8">
                                    <div className="flex items-center justify-between border-b border-border/10 pb-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">Settlement Log // Vectors</h4>
                                        <button type="button" onClick={addPaymentEntry} className="text-[10px] font-black text-white/40 hover:text-primary transition-all flex items-center gap-2 uppercase tracking-widest bg-muted/30 px-4 py-2 rounded-xl">
                                            <Icon name="PlusCircle" size={14} /> ADD VECTOR
                                        </button>
                                    </div>

                                    <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {payments.map((p, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-5 items-end animate-slide p-4 bg-muted/20 rounded-2xl border border-transparent hover:border-border/50 transition-all group/p">
                                                <div className="col-span-4 space-y-2">
                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Mode</label>
                                                    <select
                                                        className="brand-input !h-11 w-full text-xs font-black uppercase tracking-widest"
                                                        value={p.mode}
                                                        onChange={e => updatePaymentEntry(i, 'mode', e.target.value)}
                                                    >
                                                        <option>Mpesa</option>
                                                        <option>Bank Transfer</option>
                                                        <option>Cash</option>
                                                        <option>Cheque</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-4 space-y-2">
                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Quantum (KSh)</label>
                                                    <input
                                                        type="number"
                                                        className="brand-input !h-11 w-full text-xs font-mono font-black italic"
                                                        placeholder="0.00"
                                                        value={p.amount}
                                                        onChange={e => updatePaymentEntry(i, 'amount', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-3 space-y-2">
                                                    <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest ml-1">Reference ID</label>
                                                    <input
                                                        type="text"
                                                        className="brand-input !h-11 w-full text-[10px] font-mono font-black uppercase tracking-tighter"
                                                        placeholder="REF-HASH..."
                                                        value={p.ref}
                                                        onChange={e => updatePaymentEntry(i, 'ref', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePaymentEntry(i)}
                                                        disabled={payments.length === 1}
                                                        className="w-11 h-11 flex items-center justify-center text-muted-foreground/30 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-xl disabled:opacity-0"
                                                    >
                                                        <Icon name="Trash2" size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setSettlingInvoice(null)}
                                            className="flex-1 px-8 h-14 bg-muted/50 border border-border text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-muted transition-all italic"
                                        >
                                            Abort Transaction
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) <= 0}
                                            className="flex-2 brand-button-yellow !h-14 !px-12 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Commit Settlement Node
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice Review Modal */}
                {selectedInvoice && (
                    <div className="fixed inset-0 bg-background/95 backdrop-blur-2xl z-[100] overflow-y-auto p-4 md:p-12 animate-in fade-in duration-500">
                        <div className="max-w-5xl mx-auto mb-12 flex justify-between items-center bg-background/50 backdrop-blur-xl p-6 rounded-3xl border border-border/50 shadow-2xl animate-slide sticky top-0 z-10">
                            <div className="flex items-center gap-6">
                                <div className="flex gap-3">
                                    <button onClick={() => window.print()} className="brand-button-yellow !h-12 !px-8 shadow-lg shadow-primary/20">
                                        <Icon name="Printer" size={18} /> PRINT PHYSICAL
                                    </button>
                                    <button onClick={() => { }} className="px-8 h-12 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-2 text-white/60 hover:text-white">
                                        <Icon name="Download" size={18} /> PDF ARCHIVE
                                    </button>
                                </div>
                                <div className="h-8 w-px bg-border/20 hidden md:block"></div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] hidden md:block">Active Review Mode // #{selectedInvoice.invoiceNo}</p>
                            </div>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="w-12 h-12 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5 group"
                            >
                                <Icon name="X" size={24} className="group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                        <div className="max-w-5xl mx-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden mb-20 animate-in zoom-in-95 duration-500">
                            <InvoicePreview invoice={selectedInvoice} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const InvoicePreview = ({ invoice }) => {
        const { data } = useContext(AppContext);
        if (!invoice) return null;

        const unpaidBalance = Math.max(0, invoice.amount - (invoice.amountPaid || 0));

        return (
            <div className="bg-white text-slate-900 p-12 sm:p-24 relative overflow-hidden font-sans min-h-[1414px] flex flex-col" id="invoice-content">
                {/* Master Watermark Background */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -mr-96 -mt-96 pointer-events-none opacity-50"></div>

                {/* Header Section */}
                <div className="relative z-10 mb-20">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 border-b-2 border-slate-900/10 pb-16">
                        <div className="space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-black flex items-center justify-center rounded-2xl text-primary font-black text-2xl italic shadow-2xl skew-x-[-12deg]">
                                    IG
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Identity Graphics</h1>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-1 italic">Intelligence in Visual Communication</p>
                                </div>
                            </div>
                            <div className="text-[11px] text-slate-500 space-y-1.5 font-bold uppercase tracking-widest leading-relaxed">
                                <p className="text-slate-900 font-black italic">Identity Graphics Houzz // Operational Node</p>
                                <p>Pekars Building // 4th Floor Suite</p>
                                <p>Mburu Gichua Rd // Nakuru, KE</p>
                                <div className="pt-4 flex flex-col gap-1.5">
                                    <p className="flex items-center gap-3 text-slate-900"><Icon name="Phone" size={12} className="text-primary" /> +254 714 561 533</p>
                                    <p className="flex items-center gap-3 text-primary lowercase tracking-normal"><Icon name="Mail" size={12} className="text-primary" /> identitygraphics@gmail.com</p>
                                </div>
                            </div>
                        </div>

                        <div className="md:text-right flex flex-col gap-8 md:items-end">
                            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl italic skew-x-[-12deg]">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${invoice.status === 'Paid' ? 'bg-emerald-400' : 'bg-primary'}`}></span>
                                {invoice.isQuote ? 'System Quotation' : 'Official Revenue Invoice'}
                            </div>
                            <div className="grid grid-cols-2 md:block gap-12 md:space-y-6">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-1 italic">Voucher Node</p>
                                    <p className="text-3xl font-black font-mono tracking-tighter text-slate-900 italic">#{invoice.invoiceNo}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-1 italic">Temporal Stamp</p>
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Parties Intersection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Receiver Identity</h4>
                                <div className="h-px flex-1 bg-slate-900/5"></div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{invoice.client}</p>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{data.clients.find(c => c.name === invoice.client)?.company || 'Independent Principal'}</p>
                                    <p className="text-xs font-black text-primary italic lowercase tracking-tight">{data.clients.find(c => c.name === invoice.client)?.email}</p>
                                </div>
                                <div className={`mt-4 inline-flex items-center gap-3 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic border ${invoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                    invoice.status === 'Partial' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                        'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                    }`}>
                                    Status Vector: {invoice.status}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Regulatory Framework</h4>
                                <div className="h-px flex-1 bg-slate-900/5"></div>
                            </div>
                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 italic text-[12px] text-slate-500 leading-relaxed font-medium relative overflow-hidden group">
                                <Icon name="ShieldCheck" size={64} className="absolute -right-4 -bottom-4 text-slate-200/50 -rotate-12 group-hover:text-primary/10 transition-colors" />
                                <p className="relative z-10">Commercial covenants apply. All deliverables remain intellectual property of <span className="text-slate-900 font-bold not-italic underline decoration-primary/30">Identity Graphics</span> until full settlement of node <span className="text-slate-900 font-black not-italic font-mono underline">#{invoice.invoiceNo}</span> is verified.</p>
                                <div className="mt-6 flex flex-wrap gap-5 text-[9px] font-black uppercase not-italic tracking-widest relative z-10">
                                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> M-PESA</span>
                                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> BANK SWIFT</span>
                                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> ESCROW</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ledger Itemization Table */}
                <div className="flex-grow">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-[3px] border-slate-900">
                                <th className="py-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 italic">Deliverable Specification</th>
                                <th className="py-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 text-center italic">Qty</th>
                                <th className="py-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 text-right italic">Unit Weight</th>
                                <th className="py-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 text-right italic">Vector Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100">
                            {(invoice.items || []).map((item, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-8 pr-12">
                                        <p className="text-base font-black text-slate-900 tracking-tight uppercase italic mb-1">{item.desc}</p>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                            <Icon name="Cpu" size={10} className="text-primary/40" /> Product Logic Architecture
                                        </p>
                                    </td>
                                    <td className="py-8 text-center text-sm font-black text-slate-900 font-mono italic">×{item.qty}</td>
                                    <td className="py-8 text-right text-sm font-black text-slate-500 font-mono italic">KSh {parseFloat(item.price).toLocaleString()}</td>
                                    <td className="py-8 text-right text-lg font-black text-slate-900 font-mono tracking-tighter italic">KSh {(item.qty * item.price).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Document Footer: Totals & Authentication */}
                <div className="mt-20 pt-16 border-t-[3px] border-slate-900 flex flex-col md:flex-row justify-between items-start gap-16 relative">
                    <div className="flex-1 space-y-12">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Branding Philosophy</p>
                            <p className="text-xl font-black text-slate-900 uppercase tracking-tighter italic max-w-sm leading-tight border-l-4 border-primary pl-6">
                                "Identity Graphics: where creativity meets excellence."
                            </p>
                        </div>
                        <div className="flex items-center gap-12 group">
                            <div className="relative">
                                <div className="w-24 h-24 border-[3px] border-slate-900/10 rounded-full flex items-center justify-center font-black text-slate-900/20 text-xs rotate-[-15deg] group-hover:rotate-0 transition-all duration-700">
                                    SYSTEM SEAL
                                </div>
                                <Icon name="CheckCircle" size={40} className="absolute inset-0 m-auto text-emerald-500/20 transform group-hover:scale-125 transition-all" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 italic">Authorized Intelligence</p>
                                <div className="h-0.5 w-32 bg-slate-900 mb-2"></div>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{invoice.performed_by || 'CENTRAL OPERATOR'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-96 space-y-5 bg-slate-900 text-white p-10 rounded-3xl shadow-2xl skew-x-[-2deg] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all"></div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic relative z-10">
                            <span>Net Magnitude</span>
                            <span className="text-white">KSh {(invoice.subtotal || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic border-b border-white/10 pb-5 relative z-10">
                            <span>Tax Load ({invoice.taxRate}%)</span>
                            <span className="text-white">KSh {(invoice.tax || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 relative z-10">
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary italic">Aggregate Sum</span>
                            <span className="text-2xl font-black tracking-tighter text-white font-mono italic">KSh {parseFloat(invoice.amount).toLocaleString()}</span>
                        </div>

                        {(invoice.amountPaid || 0) > 0 && (
                            <>
                                <div className="flex justify-between items-center py-2 text-emerald-400 relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Digital Credit</span>
                                    <span className="text-sm font-black font-mono tracking-widest italic">- KSh {(invoice.amountPaid || 0).toLocaleString()}</span>
                                </div>
                                <div className="mt-4 pt-5 border-t border-white/20 flex justify-between items-center relative z-10">
                                    <span className="text-xs font-black uppercase tracking-[0.4em] text-primary underline italic decoration-white/20">Residue Debt</span>
                                    <span className="text-4xl font-black tracking-tighter text-white font-mono italic decoration-rose-500/50 underline-offset-8">KSh {unpaidBalance.toLocaleString()}</span>
                                </div>
                            </>
                        )}

                        {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 italic">Settlement Log Matrix</p>
                                <div className="space-y-3">
                                    {invoice.paymentHistory.map((p, idx) => (
                                        <div key={idx} className="flex justify-between text-[10px] font-black italic">
                                            <span className="text-white/40 uppercase tracking-widest truncate max-w-[150px]">{p.mode} // {p.ref || 'INTERNAL'}</span>
                                            <span className="text-emerald-400 font-mono tracking-tighter">KSh {parseFloat(p.amount).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-[9px] text-white/20 font-black uppercase tracking-[0.4em] italic text-right mt-10 relative z-10">
                            AUTH_NODE_{btoa(invoice.invoiceNo || '').substring(0, 12).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const InventoryModule = () => {
        const { data, updateData, deleteItem, logActivity } = useContext(AppContext);
        const [isAddingItem, setIsAddingItem] = useState(false);
        const [isAdjustingStock, setIsAdjustingStock] = useState(null);
        const [editingItem, setEditingItem] = useState(null);
        const [isSuccess, setIsSuccess] = useState(false);

        const [newItem, setNewItem] = useState({ sku: '', name: '', category: 'Raw Materials', stock: 0, unit: 'pcs', minStock: 5, price: 0 });
        const [adjustment, setAdjustment] = useState({ type: 'In', qty: 0, reference: '', notes: '' });

        const handleAddItem = (e) => {
            e.preventDefault();
            if (editingItem) {
                const updated = data.inventory.map(i => i.id === editingItem.id ? { ...newItem, id: i.id } : i);
                updateData('inventory_bulk', updated);
                logActivity(`SKU updated: ${newItem.sku}`, 'Update');
            } else {
                const item = { ...newItem, id: Date.now() };
                updateData('inventory', item);
                logActivity(`New SKU registered: ${newItem.sku}`, 'Success');
            }

            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setIsAddingItem(false);
                setEditingItem(null);
                setNewItem({ sku: '', name: '', category: 'Raw Materials', stock: 0, unit: 'pcs', minStock: 5, price: 0 });
            }, 1500);
        };

        const handleAdjustStock = async (e) => {
            e.preventDefault();
            const item = data.inventory.find(i => i.id === isAdjustingStock);
            if (!item) return;

            const newStock = adjustment.type === 'In' ? item.stock + adjustment.qty : item.stock - adjustment.qty;

            // Update inventory item
            const updatedInventory = data.inventory.map(i =>
                i.id === isAdjustingStock ? { ...i, stock: Math.max(0, newStock) } : i
            );

            // Push record to movements
            const movement = {
                itemId: isAdjustingStock,
                itemName: item.name,
                sku: item.sku,
                type: adjustment.type,
                qty: adjustment.qty,
                date: new Date().toISOString().split('T')[0],
                reference: adjustment.reference,
                notes: adjustment.notes
            };

            // B1 Fix: Sequential awaits to avoid race condition
            await updateData('inventory_bulk', updatedInventory);
            await updateData('stockMovements', movement);

            setIsAdjustingStock(null);
            setAdjustment({ type: 'In', qty: 0, reference: '', notes: '' });
        };

        const stats = useMemo(() => {
            const totalItems = data.inventory.length;
            const lowStock = data.inventory.filter(i => i.stock <= (i.minStock || 5)).length;
            const totalValue = data.inventory.reduce((sum, i) => sum + (i.stock * (i.price || 0)), 0);
            return { totalItems, lowStock, totalValue };
        }, [data.inventory]);

        useEffect(() => {
            const ctx = document.getElementById('inventoryChart')?.getContext('2d');
            if (ctx) {
                const existingChart = Chart.getChart('inventoryChart');
                if (existingChart) existingChart.destroy();

                const categories = data.inventory.reduce((acc, item) => {
                    acc[item.category] = (acc[item.category] || 0) + 1;
                    return acc;
                }, {});

                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(categories),
                        datasets: [{
                            data: Object.values(categories),
                            backgroundColor: ['#0f172a', '#facc15', '#fbbf24', '#eab308', '#d97706'],
                            borderWidth: 0,
                            hoverOffset: 15
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '75%',
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20,
                                    font: { size: 10, weight: 'bold' }
                                }
                            }
                        }
                    }
                });
            }
        }, [data.inventory]);

        return (
            <div className="space-y-10 pb-20 animate-in fade-in duration-700">
                {/* Header: Operational Logistics */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-foreground decoration-primary underline-offset-[12px] underline">Inventory & Logistics</h1>
                        <p className="text-[10px] text-muted-foreground mt-4 font-black uppercase tracking-[0.4em] italic flex items-center gap-2">
                            <Icon name="Database" size={14} className="text-primary" /> Asset Management // SKU Tracking // Resource Flow
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group/search">
                            <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-all" />
                            <input
                                type="text"
                                placeholder="IDENTIFY SKU..."
                                className="brand-input !bg-card border-border/50 !py-3 !pl-12 !pr-6 w-64 text-[10px] font-black tracking-widest focus:w-80 transition-all uppercase"
                            />
                        </div>
                        <ExportDropdown data={data.inventory} filename="inventory_ledger_node" />
                        <button
                            onClick={() => setIsAddingItem(!isAddingItem)}
                            className="brand-button-yellow !h-[52px] !px-8 shadow-xl shadow-primary/20"
                        >
                            <Icon name={isAddingItem ? 'X' : 'PlusCircle'} size={18} />
                            {isAddingItem ? 'ABORT REG' : 'REGISTER SKU'}
                        </button>
                    </div>
                </div>

                {/* Dashboard Intelligence Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <window.StatCard label="Total Asset Nodes" value={stats.totalItems} icon="Package" />
                        <window.StatCard
                            label="Critical Threshold"
                            value={stats.lowStock}
                            trend={stats.lowStock > 0 ? "ACTION REQUIRED" : "STABLE RESERVE"}
                            trendType={stats.lowStock > 0 ? "down" : "up"}
                            icon="AlertTriangle"
                        />
                        <window.StatCard label="Net Asset Valuation" value={`KSh ${stats.totalValue.toLocaleString()}`} icon="Banknote" />
                    </div>
                    <div className="lg:col-span-4 brand-card p-8 flex flex-col items-center border-none shadow-xl bg-card/30 backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 w-full italic border-b border-border/10 pb-4">SKU Segmentation Matrix</h4>
                        <div className="h-44 w-full relative z-10 transition-transform group-hover:scale-105 duration-500">
                            <canvas id="inventoryChart"></canvas>
                        </div>
                    </div>
                </div>

                {/* Asset Registration Form */}
                {isAddingItem && (
                    <div className="brand-card p-12 animate-slide relative overflow-hidden group border-none shadow-2xl bg-card/50 backdrop-blur-xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -mr-48 -mt-48"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <h3 className="text-3xl font-black italic tracking-tighter uppercase text-primary underline decoration-primary/20 underline-offset-8">
                                        {editingItem ? 'Refine Asset Protocol' : 'Register New Asset'}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em] mt-4 italic">Resource Provisioning Sequence // Operational Load</p>
                                </div>
                                <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                                    <Icon name="Box" size={28} />
                                </div>
                            </div>

                            <form onSubmit={handleAddItem} className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                    <div className="col-span-1 space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">SKU Identifier</label>
                                        <input
                                            className="brand-input !h-12 w-full text-xs font-black tracking-widest uppercase"
                                            placeholder="SKU-AUTO..."
                                            required
                                            value={newItem.sku}
                                            onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Asset Nomenclature</label>
                                        <input
                                            className="brand-input !h-12 w-full text-xs font-bold"
                                            placeholder="HIGH-GLOSS VINYL MEDIA..."
                                            required
                                            value={newItem.name}
                                            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Classification</label>
                                        <select
                                            className="brand-input !h-12 w-full text-xs font-black uppercase tracking-widest"
                                            value={newItem.category}
                                            onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                        >
                                            <option>Raw Materials</option>
                                            <option>Media</option>
                                            <option>Ink/Chemicals</option>
                                            <option>Finished Goods</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Initial Reserve</label>
                                        <input
                                            type="number"
                                            className="brand-input !h-12 w-full font-mono font-black italic"
                                            value={newItem.stock}
                                            onChange={e => setNewItem({ ...newItem, stock: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Metric Unit</label>
                                        <input
                                            className="brand-input !h-12 w-full text-[10px] font-black uppercase tracking-widest"
                                            placeholder="METERS / PCS / ROLLS..."
                                            value={newItem.unit}
                                            onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Critical Level</label>
                                        <input
                                            type="number"
                                            className="brand-input !h-12 w-full font-mono font-black text-rose-500 italic"
                                            value={newItem.minStock}
                                            onChange={e => setNewItem({ ...newItem, minStock: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Unit Value (KSh)</label>
                                        <input
                                            type="number"
                                            className="brand-input !h-12 w-full font-mono font-black italic"
                                            value={newItem.price}
                                            onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-10 border-t border-border/10">
                                    <div className={`flex items-center gap-3 text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic transition-all duration-500 ${isSuccess ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
                                        <Icon name="CheckCircle" size={16} /> Syncing Protocol Successful
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingItem(false)}
                                            className="px-8 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all"
                                        >
                                            Discard Node
                                        </button>
                                        <button type="submit" className="brand-button-yellow !h-12 !px-12 shadow-xl shadow-primary/20">
                                            Commit Asset to Ledger
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Inventory Ledger Table */}
                <div className="brand-card overflow-hidden border-none shadow-2xl bg-card/30 backdrop-blur-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/10 bg-muted/20">
                                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Resource Identifier</th>
                                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Classification</th>
                                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground text-center italic">Magnitude // Reserve</th>
                                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground text-right italic">Action Vectors</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                                {data.inventory.map(item => (
                                    <tr key={item.id} className="group hover:bg-primary/5 transition-all duration-300">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-1.5 h-12 rounded-full shadow-lg transition-all duration-500 group-hover:scale-y-110 ${item.stock <= item.minStock ? 'bg-rose-500 shadow-rose-500/20' : 'bg-primary shadow-primary/20'}`}></div>
                                                <div>
                                                    <div className="font-black text-foreground font-mono tracking-tighter text-xl italic group-hover:text-primary transition-colors">#{item.sku}</div>
                                                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1 group-hover:translate-x-1 transition-transform">{item.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="px-4 py-1.5 bg-muted/50 border border-border/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className={`text-2xl font-black font-mono tracking-tighter italic ${item.stock <= item.minStock ? 'text-rose-500' : 'text-foreground'}`}>
                                                    {item.stock} <span className="text-[10px] text-muted-foreground/40 uppercase font-black not-italic ml-1">{item.unit}</span>
                                                </div>
                                                <div className="w-40 bg-muted/50 h-1.5 rounded-full overflow-hidden border border-border/5 p-[1px]">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-[1500ms] cubic-bezier(0.4, 0, 0.2, 1) ${item.stock <= item.minStock ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(250,204,21,0.5)]'}`}
                                                        style={{ width: `${Math.min(100, (item.stock / (item.minStock * 4)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => setIsAdjustingStock(item.id)}
                                                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-muted text-muted-foreground hover:bg-primary hover:text-black hover:scale-110 active:scale-95 transition-all shadow-xl hover:shadow-primary/20"
                                                    title="Adjust Magnitude"
                                                >
                                                    <Icon name="RefreshCw" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingItem(item); setNewItem({ ...item }); setIsAddingItem(true); }}
                                                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-muted text-muted-foreground hover:bg-foreground hover:text-background hover:scale-110 active:scale-95 transition-all shadow-xl"
                                                    title="Refine Protocol"
                                                >
                                                    <Icon name="Edit3" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm(`Purge ${item.sku} from registry?`)) { deleteItem('inventory', item.id); logActivity(`Inventory SKU ${item.sku} purged`, 'Archive'); } }}
                                                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-muted text-muted-foreground hover:bg-rose-500 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-xl hover:shadow-rose-500/20"
                                                    title="Purge Record"
                                                >
                                                    <Icon name="Trash2" size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <window.Modal isOpen={!!isAdjustingStock} onClose={() => setIsAdjustingStock(null)} title="Operational Stock Adjustment">
                    {isAdjustingStock && (() => {
                        const item = data.inventory.find(i => i.id === isAdjustingStock);
                        return (
                            <form onSubmit={handleAdjustStock} className="space-y-10 p-2">
                                <div className="flex items-center gap-8 p-10 bg-card/50 rounded-[32px] border border-border/10 relative overflow-hidden group shadow-inner">
                                    <div className="absolute -right-8 -top-8 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700"></div>
                                    <div className="w-20 h-20 bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-4xl font-black rounded-[24px] shadow-2xl shadow-primary/10 z-10 animate-pulse">
                                        {item?.sku.charAt(0)}
                                    </div>
                                    <div className="z-10">
                                        <h4 className="text-3xl font-black tracking-tighter italic uppercase text-foreground">{item?.name}</h4>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] mt-3 italic flex items-center gap-2">
                                            Current Magnitude: <span className="text-primary underline decoration-primary/20 underline-offset-4">{item?.stock} {item?.unit}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Flow Vector</label>
                                        <div className="flex gap-3 p-2 bg-muted/30 rounded-[20px] border border-border/10">
                                            <button
                                                type="button"
                                                onClick={() => setAdjustment({ ...adjustment, type: 'In' })}
                                                className={`flex-1 py-4 rounded-[14px] font-black text-[10px] uppercase tracking-[0.2em] italic transition-all duration-300 ${adjustment.type === 'In' ? 'bg-primary text-black shadow-xl scale-105' : 'text-muted-foreground hover:bg-background'}`}
                                            >
                                                Inflow (+)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAdjustment({ ...adjustment, type: 'Out' })}
                                                className={`flex-1 py-4 rounded-[14px] font-black text-[10px] uppercase tracking-[0.2em] italic transition-all duration-300 ${adjustment.type === 'Out' ? 'bg-rose-500 text-white shadow-xl scale-105' : 'text-muted-foreground hover:bg-background'}`}
                                            >
                                                Outflow (-)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic text-right block">Magnitude ({item?.unit})</label>
                                        <input
                                            type="number"
                                            className="brand-input w-full text-center text-5xl font-black font-mono !h-20 bg-background/50 border-primary/20 focus:border-primary text-primary italic"
                                            required
                                            value={adjustment.qty}
                                            onChange={e => setAdjustment({ ...adjustment, qty: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Context Reference</label>
                                        <input
                                            className="brand-input w-full !h-12 text-xs font-black tracking-widest uppercase"
                                            placeholder="PRJ-NODE-77..."
                                            value={adjustment.reference}
                                            onChange={e => setAdjustment({ ...adjustment, reference: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Operational Log (Optional)</label>
                                        <input
                                            className="brand-input w-full !h-12 text-xs font-bold"
                                            placeholder="REASON FOR ADJUSTMENT..."
                                            value={adjustment.notes}
                                            onChange={e => setAdjustment({ ...adjustment, notes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className={`w-full py-6 rounded-[24px] font-black uppercase tracking-[0.4em] text-xs transition-all shadow-2xl active:scale-[0.98] italic ${adjustment.type === 'In'
                                        ? 'bg-primary text-black shadow-primary/20 hover:shadow-primary/40'
                                        : 'bg-rose-500 text-white shadow-rose-500/20 hover:shadow-rose-500/40'
                                        }`}
                                >
                                    Commit Registry Modification
                                </button>
                            </form>
                        );
                    })()}
                </window.Modal>

                <div className="brand-card overflow-hidden border-none shadow-2xl bg-card/30 backdrop-blur-md relative">
                    <div className="p-8 border-b border-border/10 flex justify-between items-center bg-muted/20">
                        <div className="flex items-center gap-4">
                            <div className="w-2.5 h-2.5 bg-primary animate-ping rounded-full absolute ml-0.5"></div>
                            <div className="w-2.5 h-2.5 bg-primary rounded-full relative"></div>
                            <h5 className="text-[11px] font-black text-foreground uppercase tracking-[0.4em] italic">Operational Telemetry: Stock Dynamics</h5>
                        </div>
                        <Icon name="Activity" size={18} className="text-primary animate-pulse" />
                    </div>
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-border/5">
                        {(data.stockMovements || []).length > 0 ? [...data.stockMovements].reverse().map(m => (
                            <div key={m.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 hover:bg-primary/5 transition-all duration-300 group">
                                <div className="flex items-center gap-8 mb-4 sm:mb-0">
                                    <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center shadow-xl transition-transform group-hover:scale-110 duration-500 ${m.type === 'In'
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/10'
                                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-rose-500/10'
                                        }`}>
                                        <Icon name={m.type === 'In' ? 'ArrowUpRight' : 'ArrowDownRight'} size={28} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <p className="font-black text-xl italic tracking-tight text-foreground group-hover:text-primary transition-colors">{m.itemName}</p>
                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] font-mono bg-primary/5 px-2 py-0.5 rounded-md">#{m.sku}</span>
                                            <span className="w-1.5 h-1.5 bg-border/20 rounded-full"></span>
                                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest italic flex items-center gap-2">
                                                <Icon name="Clock" size={12} /> {m.date}
                                            </span>
                                            {m.notes && (
                                                <>
                                                    <span className="w-1.5 h-1.5 bg-border/20 rounded-full"></span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[200px] italic">
                                                        "{m.notes}"
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right w-full sm:w-auto">
                                    <p className={`text-4xl font-black font-mono tracking-tighter italic ${m.type === 'In' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {m.type === 'In' ? '+' : '-'}{m.qty}
                                    </p>
                                    <div className="flex items-center justify-end gap-2 mt-2">
                                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] italic">Reference:</span>
                                        <span className="text-[10px] text-foreground font-black uppercase tracking-[0.2em] border border-border/10 px-3 py-1 rounded-full bg-card/50">
                                            {m.reference || 'SYS_AUTO'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/20">
                                <div className="w-24 h-24 rounded-[32px] bg-muted/20 flex items-center justify-center mb-8 border border-border/5">
                                    <Icon name="Database" size={48} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">No Movement Sequences Recorded</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ClientModule = () => {
        const { data, updateData, deleteItem, logActivity } = useContext(AppContext);
        const [selectedClient, setSelectedClient] = useState(null);
        const [isEditing, setIsEditing] = useState(false);
        const [editData, setEditData] = useState({ name: '', company: '', email: '', phone: '', kraPin: '', location: '' });
        const [isAddingInteraction, setIsAddingInteraction] = useState(false);
        const [newInteraction, setNewInteraction] = useState({ type: 'Call', notes: '' });
        const [isAddingClient, setIsAddingClient] = useState(false);
        const [newClient, setNewClient] = useState({ name: '', company: '', email: '', phone: '', kraPin: '', location: '' });

        const handleRegisterClient = (e) => {
            e.preventDefault();
            const client = { ...newClient, id: Date.now() };
            updateData('clients', client);
            logActivity(`New client registered: ${client.name}`, 'Success');
            setIsAddingClient(false);
            setNewClient({ name: '', company: '', email: '', phone: '', kraPin: '', location: '' });
        };

        const handleOpenEdit = () => {
            setEditData({ ...selectedClient });
            setIsEditing(true);
        };

        const handleSaveEdit = (e) => {
            e.preventDefault();
            const updated = data.clients.map(c => c.id === selectedClient.id ? { ...editData, id: c.id } : c);
            updateData('clients_bulk', updated);
            logActivity(`Updated client: ${editData.name}`, 'Update');
            setSelectedClient({ ...editData, id: selectedClient.id });
            setIsEditing(false);
        };

        const handleDelete = () => {
            if (confirm(`Archive ${selectedClient.name}? This will remove them from the active list.`)) {
                deleteItem('clients', selectedClient.id);
                logActivity(`Archived client: ${selectedClient.name}`, 'Archive');
                setSelectedClient(null);
            }
        };

        const handleAddInteraction = (e) => {
            e.preventDefault();
            const interaction = {
                id: Date.now(),
                clientId: selectedClient.id,
                type: newInteraction.type,
                notes: newInteraction.notes,
                date: new Date().toISOString().split('T')[0],
                user: 'admin'
            };
            updateData('interactions', interaction);
            logActivity(`Engagement logged for ${selectedClient.name}`, 'Sync');
            setIsAddingInteraction(false);
            setNewInteraction({ type: 'Call', notes: '' });
        };

        const clientInteractions = useMemo(() =>
            selectedClient ? data.interactions.filter(i => i.clientId === selectedClient.id) : []
            , [selectedClient, data.interactions]);

        const clientSales = useMemo(() =>
            selectedClient ? data.sales.filter(s => s.client === selectedClient.name) : []
            , [selectedClient, data.sales]);

        const clientProjects = useMemo(() =>
            selectedClient ? data.projects.filter(p => p.client === selectedClient.name) : []
            , [selectedClient, data.projects]);

        const totalRevenue = clientSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);

        return (
            <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-primary rounded-full hidden md:block"></div>
                        <h1 className="text-4xl font-black text-foreground tracking-tighter italic uppercase leading-none">Stakeholder Ecosystem</h1>
                        <p className="text-muted-foreground mt-3 text-[10px] font-black uppercase tracking-[0.5em] italic flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-primary/30"></span> Partners & Strategic Alliances
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group/search">
                            <window.Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within/search:text-primary transition-all duration-300" />
                            <input
                                type="text"
                                placeholder="IDENTIFY PARTNER..."
                                className="brand-input !bg-card/30 border-border/10 !py-3 !pl-12 !pr-6 w-56 text-[10px] font-black uppercase tracking-widest focus:w-80 transition-all duration-500 rounded-full focus:shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]"
                            />
                        </div>
                        <ExportDropdown data={data.clients} filename="stakeholder_intelligence" />
                        <button
                            onClick={() => setIsAddingClient(true)}
                            className="bg-primary text-black px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-3 italic border border-primary/20"
                        >
                            <window.Icon name="Plus" size={16} strokeWidth={3} />
                            Register Stakeholder
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="brand-card relative overflow-hidden group p-8 bg-card/30 hover:bg-card/50 transition-all duration-500 border border-border/5">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 italic">Portfolio Valuation</p>
                                <h3 className="text-4xl font-black font-mono tracking-tighter text-foreground italic">
                                    KSh {(data.sales.reduce((sum, s) => sum + parseFloat(s.amount), 0) / 1000).toFixed(1)}K
                                </h3>
                            </div>
                            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                <window.Icon name="TrendingUp" size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="brand-card relative overflow-hidden group p-8 bg-card/30 hover:bg-card/50 transition-all duration-500 border border-border/5">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 italic">Active Initiatives</p>
                                <h3 className="text-4xl font-black font-mono tracking-tighter text-foreground italic">
                                    {data.projects.filter(p => p.status === 'Active' || p.status === 'In-progress').length} <span className="text-sm font-black uppercase text-muted-foreground ml-1">Nodes</span>
                                </h3>
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                <window.Icon name="Zap" size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="brand-card relative overflow-hidden group p-8 bg-card/30 hover:bg-card/50 transition-all duration-500 border border-border/5">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 italic">Engagement Velocity</p>
                                <h3 className="text-4xl font-black font-mono tracking-tighter text-foreground italic text-primary">
                                    {data.interactions.length} <span className="text-sm font-black uppercase text-muted-foreground ml-1">Cycles</span>
                                </h3>
                            </div>
                            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                <window.Icon name="MessageSquare" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {data.clients.map((c, index) => {
                        const clientRevenue = data.sales.filter(s => s.client === c.name).reduce((sum, s) => sum + parseFloat(s.amount), 0);
                        const activeOps = data.projects.filter(p => p.client === c.name && (p.status === 'Active' || p.status === 'In-progress')).length;

                        return (
                            <div
                                key={c.id}
                                onClick={() => setSelectedClient(c)}
                                className="brand-card group cursor-pointer relative overflow-hidden flex flex-col border-none shadow-2xl bg-card/30 backdrop-blur-md hover:bg-card/50 transition-all duration-700 animate-in fade-in zoom-in-95"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-1000"></div>

                                <div className="p-10 space-y-8 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className="w-20 h-20 bg-black text-primary rounded-[24px] flex items-center justify-center text-4xl font-black shadow-2xl group-hover:bg-primary group-hover:text-black transition-all duration-700 border border-black/10 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
                                            <span className="relative z-10 italic uppercase">{c.name.charAt(0)}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-3 mt-1">
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase tracking-[0.3em] italic">Active Tier</span>
                                            {activeOps > 0 && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></span>
                                                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em] italic">{activeOps} Live Ops</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors italic uppercase leading-none">{c.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] italic">{c.company}</span>
                                            <span className="w-1 h-1 bg-primary/30 rounded-full"></span>
                                            <span className="text-[9px] font-medium text-muted-foreground/50 italic">EST. COLLAB</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border/10">
                                        <div>
                                            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-3 italic">Portfolio Yield</p>
                                            <p className="text-xl font-black text-foreground font-mono italic tracking-tighter group-hover:text-primary transition-colors">KSh {clientRevenue.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-3 italic">Velocity</p>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <div className="w-1 h-4 bg-primary/20 rounded-full overflow-hidden flex flex-col justify-end">
                                                    <div className="w-full h-[80%] bg-primary"></div>
                                                </div>
                                                <div className="w-1 h-4 bg-primary/20 rounded-full overflow-hidden flex flex-col justify-end">
                                                    <div className="w-full h-[60%] bg-primary"></div>
                                                </div>
                                                <div className="w-1 h-4 bg-primary/20 rounded-full overflow-hidden flex flex-col justify-end">
                                                    <div className="w-full h-[90%] bg-primary"></div>
                                                </div>
                                                <span className="text-[10px] font-black text-foreground uppercase tracking-widest italic ml-2">High</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 p-5 flex justify-between items-center group-hover:bg-primary/5 transition-all duration-500 border-t border-border/5">
                                    <div className="flex items-center gap-3">
                                        <window.Icon name="MapPin" size={12} className="text-primary/50" />
                                        <span className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] italic">{c.location || 'Global Reach'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[8px] font-black text-primary uppercase tracking-[0.2em] italic opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                                        Open Dossier <window.Icon name="ArrowRight" size={12} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <window.Modal
                    isOpen={!!selectedClient}
                    onClose={() => setSelectedClient(null)}
                    title="Stakeholder Intelligence Profile"
                >
                    {selectedClient && (
                        <div className="space-y-12">
                            {/* Intelligence Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 p-10 bg-card/50 rounded-[32px] border border-border/10 relative overflow-hidden group shadow-inner">
                                <div className="absolute -right-8 -top-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700"></div>
                                <div className="flex items-center gap-8 z-10">
                                    <div className="w-24 h-24 bg-primary/10 border border-primary/20 text-primary rounded-[28px] flex items-center justify-center text-4xl font-black shadow-2xl shadow-primary/10 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30"></div>
                                        <span className="relative z-10 italic">{selectedClient.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-black tracking-tighter text-foreground italic uppercase leading-none">{selectedClient.name}</h3>
                                        <div className="flex items-center gap-4 mt-4">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">{selectedClient.company}</span>
                                            <span className="w-1.5 h-1.5 bg-border/20 rounded-full"></span>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                <span className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">Active Tier Partner</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 z-10 w-full md:w-auto">
                                    <button onClick={handleOpenEdit} className="flex-1 md:flex-none h-14 px-8 bg-card border border-border/10 text-foreground rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary hover:text-black hover:border-primary transition-all duration-300 italic shadow-xl">
                                        <window.Icon name="Edit3" size={16} className="inline mr-3" />
                                        Refine Profile
                                    </button>
                                    <button onClick={handleDelete} title="Delete Client" className="w-14 h-14 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all duration-300 shadow-xl group/trash">
                                        <window.Icon name="Trash2" size={20} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="brand-card p-10 bg-card/30 border-none shadow-2xl relative overflow-hidden group">
                                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-primary/10 text-primary rounded-xl"><window.Icon name="TrendingUp" size={18} /></div>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">Portfolio Revenue</span>
                                    </div>
                                    <p className="text-3xl font-black text-foreground font-mono tracking-tighter italic">KSh {totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="brand-card p-10 bg-card/30 border-none shadow-2xl relative overflow-hidden group">
                                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><window.Icon name="Layers" size={18} /></div>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">Active Deployments</span>
                                    </div>
                                    <p className="text-3xl font-black text-emerald-500 font-mono tracking-tighter italic">{clientProjects.filter(p => p.status === 'Active' || p.status === 'In-progress').length} <span className="text-xs font-black uppercase text-muted-foreground ml-1">Live Ops</span></p>
                                </div>
                                <div className="brand-card p-10 bg-card/30 border-none shadow-2xl relative overflow-hidden group">
                                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-primary/10 text-primary rounded-xl"><window.Icon name="Zap" size={18} /></div>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">Engagement Cycles</span>
                                    </div>
                                    <p className="text-3xl font-black text-foreground font-mono tracking-tighter italic">{clientInteractions.length} <span className="text-xs font-black uppercase text-muted-foreground ml-1">Sessions</span></p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="flex justify-between items-end border-b border-border/10 pb-6">
                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground italic">Engagement Protocol History</h5>
                                        <button onClick={() => setIsAddingInteraction(true)} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary hover:text-black transition-all duration-300 shadow-lg shadow-primary/5">
                                            <window.Icon name="Plus" size={14} strokeWidth={3} />
                                            <span className="text-[9px] font-black uppercase tracking-widest italic">Log Sequence</span>
                                        </button>
                                    </div>
                                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                        {clientInteractions.length > 0 ? [...clientInteractions].reverse().map(i => (
                                            <div key={i.id} className="p-8 bg-card/30 border border-border/5 rounded-[24px] hover:border-primary/20 transition-all duration-500 group relative overflow-hidden">
                                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
                                                <div className="flex justify-between items-center mb-6 relative z-10">
                                                    <span className="px-4 py-1.5 bg-muted/50 border border-border/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-primary italic">
                                                        {i.type} Vector
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest italic">
                                                        <window.Icon name="Calendar" size={12} className="text-primary/40" />
                                                        {i.date}
                                                    </div>
                                                </div>
                                                <div className="relative z-10 flex gap-4">
                                                    <div className="w-1 h-auto bg-primary/20 rounded-full shrink-0"></div>
                                                    <p className="text-sm text-foreground/80 font-medium leading-relaxed italic py-1">"{i.notes}"</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center py-24 bg-card/10 border border-dashed border-border/10 rounded-[32px]">
                                                <window.Icon name="MessageSquare" size={48} className="text-muted-foreground/10 mb-6" />
                                                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 italic text-center">Zero Engagement Vectors Detected<br /><span className="text-[9px] opacity-50">Initiate first contact sequence</span></p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="border-b border-border/10 pb-6">
                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground italic">Commercial Flow Telemetry</h5>
                                    </div>
                                    <div className="space-y-4">
                                        {clientSales.length > 0 ? clientSales.slice(0, 8).map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-7 bg-card/20 border border-border/5 rounded-[24px] hover:bg-card/40 transition-all duration-300 group shadow-sm">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-muted/50 text-primary flex items-center justify-center rounded-[18px] border border-border/10 group-hover:scale-105 transition-transform duration-500">
                                                        <window.Icon name="FileText" size={24} strokeWidth={1.5} />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{s.invoiceNo}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest italic">{s.date}</span>
                                                            <span className="w-1 h-1 bg-border/20 rounded-full"></span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'Paid' ? 'text-emerald-500' : 'text-primary'}`}>{s.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mb-1 italic text-right">Value Node</p>
                                                    <span className="text-xl font-black text-foreground font-mono italic tracking-tighter">KSh {parseFloat(s.amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center py-24 bg-card/10 border border-dashed border-border/10 rounded-[32px]">
                                                <window.Icon name="TrendingUp" size={48} className="text-muted-foreground/10 mb-6" />
                                                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 italic text-center">No Commercial Records Found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </window.Modal>

                <window.Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Stakeholder Profile Configuration">
                    <form onSubmit={handleSaveEdit} className="p-2 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                                { label: 'Stakeholder Alias', key: 'name', type: 'text', placeholder: 'ENTITY NAME...' },
                                { label: 'Corporate Identity', key: 'company', type: 'text', placeholder: 'LEGAL ENTITY...' },
                                { label: 'Communication Node (Email)', key: 'email', type: 'email', placeholder: 'OPERATIONAL EMAIL...' },
                                { label: 'Voice Vector (Phone)', key: 'phone', type: 'text', placeholder: 'CONTACT VECTOR...' },
                                { label: 'Fiscal Protocol (KRA PIN)', key: 'kraPin', type: 'text', placeholder: 'P05...' },
                                { label: 'Geospatial Operations', key: 'location', type: 'text', placeholder: 'GEOGRAPHIC RADIUS...' },
                            ].map((field) => (
                                <div key={field.key} className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">{field.label}</label>
                                    <input
                                        className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30"
                                        placeholder={field.placeholder}
                                        required={field.key !== 'kraPin' && field.key !== 'location'}
                                        type={field.type}
                                        value={editData[field.key]}
                                        onChange={e => setEditData({ ...editData, [field.key]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="w-full py-6 bg-primary text-black rounded-[24px] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 italic active:scale-[0.98]">
                            Commit Profile Authorization
                        </button>
                    </form>
                </window.Modal>

                <window.Modal isOpen={isAddingInteraction} onClose={() => setIsAddingInteraction(false)} title="Engagement Protocol Authorization">
                    <form onSubmit={handleAddInteraction} className="p-2 space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Engagement Topology</label>
                            <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-[24px] border border-border/10">
                                {['Voice Audit (Call)', 'Synchronous Meeting', 'Digital Dispatch (Email)', 'On-Site Intelligence'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setNewInteraction({ ...newInteraction, type: t.split(' (')[0].split(' ').pop() === 'Intelligence' ? 'Site Visit' : t.split(' (')[0].split(' ').pop() })}
                                        className={`flex-1 py-4 rounded-[18px] font-black text-[9px] uppercase tracking-[0.2em] italic transition-all duration-500 min-w-[140px] ${(newInteraction.type === 'Call' && t.includes('Call')) ||
                                            (newInteraction.type === 'Meeting' && t.includes('Meeting')) ||
                                            (newInteraction.type === 'Email' && t.includes('Email')) ||
                                            (newInteraction.type === 'Site Visit' && t.includes('Site'))
                                            ? 'bg-primary text-black shadow-xl scale-105' : 'text-muted-foreground hover:bg-background'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Intelligence Summary</label>
                            <textarea
                                className="brand-input w-full h-48 resize-none text-sm font-bold border-border/10 focus:border-primary/50 !bg-card/30 p-6 leading-relaxed"
                                placeholder="Detail the strategic outcome of this engagement cycle..."
                                required
                                value={newInteraction.notes}
                                onChange={e => setNewInteraction({ ...newInteraction, notes: e.target.value })}
                            ></textarea>
                        </div>
                        <button type="submit" className="w-full py-6 bg-primary text-black rounded-[24px] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 italic">
                            Commit Engagement Log
                        </button>
                    </form>
                </window.Modal>

                <window.Modal isOpen={isAddingClient} onClose={() => setIsAddingClient(false)} title="Stakeholder Onboarding Protocol">
                    <form onSubmit={handleRegisterClient} className="p-2 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                                { label: 'Primary Nomenclature', key: 'name', type: 'text', placeholder: 'FULL NAME...' },
                                { label: 'Corporate Entity', key: 'company', type: 'text', placeholder: 'COMPANY IDENTITY...' },
                                { label: 'Primary Email Node', key: 'email', type: 'email', placeholder: 'CLIENT@DOMAIN.COM...' },
                                { label: 'Communication Channel', key: 'phone', type: 'text', placeholder: '+254...' },
                                { label: 'KRA Fiscal Identity', key: 'kraPin', type: 'text', placeholder: 'PIN AUTHORIZATION...' },
                                { label: 'Base Operations', key: 'location', type: 'text', placeholder: 'PHYSICAL LOCALE...' },
                            ].map((field) => (
                                <div key={field.key} className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">{field.label}</label>
                                    <input
                                        className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30"
                                        placeholder={field.placeholder}
                                        required={field.key !== 'kraPin' && field.key !== 'location'}
                                        type={field.type}
                                        value={newClient[field.key]}
                                        onChange={e => setNewClient({ ...newClient, [field.key]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="w-full py-6 bg-primary text-black rounded-[24px] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 italic">
                            Authorize Protocol & Register
                        </button>
                    </form>
                </window.Modal>
            </div >
        );
    };


    const SupplierModule = () => {
        const { data, updateData, deleteItem, logActivity } = useContext(AppContext);
        const [isAdding, setIsAdding] = useState(false);
        const [editingSupplier, setEditingSupplier] = useState(null);
        const [formData, setFormData] = useState({ name: '', contact: '', email: '', category: 'Material', kraPin: '', address: '', contactPerson: '' });

        const handleOpenAdd = () => {
            setFormData({ name: '', contact: '', email: '', category: 'Material', kraPin: '', address: '', contactPerson: '' });
            setEditingSupplier(null);
            setIsAdding(true);
        };

        const handleOpenEdit = (s) => {
            setFormData({ ...s });
            setEditingSupplier(s);
            setIsAdding(true);
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            if (editingSupplier) {
                const updated = data.suppliers.map(s => s.id === editingSupplier.id ? { ...formData, id: s.id } : s);
                updateData('suppliers_bulk', updated);
                logActivity(`Updated vendor: ${formData.name}`, 'Update');
            } else {
                const vendor = { ...formData, id: Date.now() };
                updateData('suppliers', vendor);
                logActivity(`Added new vendor: ${formData.name}`, 'Success');
            }
            setIsAdding(false);
        };

        return (
            <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-primary rounded-full hidden md:block"></div>
                        <h1 className="text-4xl font-black text-foreground tracking-tighter italic uppercase leading-none">Supply Chain Ecosystem</h1>
                        <p className="text-muted-foreground mt-3 text-[10px] font-black uppercase tracking-[0.5em] italic flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-primary/30"></span> Strategic Resource Alliances
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group/search">
                            <window.Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within/search:text-primary transition-all duration-300" />
                            <input
                                type="text"
                                placeholder="IDENTIFY VENDOR..."
                                className="brand-input !bg-card/30 border-border/10 !py-3 !pl-12 !pr-6 w-56 text-[10px] font-black uppercase tracking-widest focus:w-80 transition-all duration-500 rounded-full focus:shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]"
                            />
                        </div>
                        <ExportDropdown data={data.suppliers} filename="supplier_intelligence" />
                        <button
                            onClick={handleOpenAdd}
                            className="bg-primary text-black px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-3 italic border border-primary/20"
                        >
                            <window.Icon name="Plus" size={16} strokeWidth={3} />
                            Onboard Partner
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="brand-card relative overflow-hidden group p-8 bg-card/30 hover:bg-card/50 transition-all duration-500 border border-border/5">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 italic">Total Network</p>
                                <h3 className="text-4xl font-black font-mono tracking-tighter text-foreground italic">
                                    {data.suppliers.length} <span className="text-sm font-black uppercase text-muted-foreground ml-1">Nodes</span>
                                </h3>
                            </div>
                            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                <window.Icon name="Share2" size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="brand-card relative overflow-hidden group p-8 bg-card/30 hover:bg-card/50 transition-all duration-500 border border-border/5">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 italic">Supply Verticals</p>
                                <h3 className="text-4xl font-black font-mono tracking-tighter text-foreground italic">
                                    {new Set(data.suppliers.map(s => s.category)).size} <span className="text-sm font-black uppercase text-muted-foreground ml-1">Sectors</span>
                                </h3>
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                <window.Icon name="Layers" size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="brand-card relative overflow-hidden group p-8 bg-card/30 hover:bg-card/50 transition-all duration-500 border border-border/5">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-4 italic">Operational Reach</p>
                                <h3 className="text-4xl font-black font-mono tracking-tighter text-foreground italic text-primary">
                                    {new Set(data.suppliers.map(s => s.address)).size} <span className="text-sm font-black uppercase text-muted-foreground ml-1">Hubs</span>
                                </h3>
                            </div>
                            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                <window.Icon name="MapPin" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {data.suppliers.map((s, index) => (
                        <div
                            key={s.id}
                            className="brand-card group relative overflow-hidden flex flex-col border-none shadow-2xl bg-card/30 backdrop-blur-md hover:bg-card/50 transition-all duration-700 animate-in fade-in zoom-in-95"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-1000"></div>

                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="w-20 h-20 bg-black text-primary rounded-[24px] flex items-center justify-center text-4xl font-black shadow-2xl group-hover:bg-primary group-hover:text-black transition-all duration-700 border border-black/10 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
                                        <span className="relative z-10 italic uppercase">{s.name.charAt(0)}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-3 mt-1">
                                        <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[8px] font-black uppercase tracking-[0.3em] italic">{s.category} Unit</span>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em] italic">Active Flow</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors italic uppercase leading-none">{s.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] italic">{s.contactPerson || 'STRATEGIC LIAISON'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border/10">
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-3 italic">Communication</p>
                                        <p className="text-[11px] font-black text-foreground tracking-tight uppercase truncate italic">{s.email}</p>
                                        <p className="text-[10px] font-black text-muted-foreground italic mt-1">{s.contact}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-3 italic">Fiscal ID</p>
                                        <span className="text-[11px] font-black text-foreground font-mono italic tracking-tighter bg-muted/50 px-2 py-1 rounded-md">{s.kraPin || 'UNSPECIFIED'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 p-5 flex justify-between items-center group-hover:bg-primary/5 transition-all duration-500 border-t border-border/5">
                                <div className="flex items-center gap-3">
                                    <window.Icon name="MapPin" size={12} className="text-primary/50" />
                                    <span className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] italic truncate max-w-[120px]">{s.address || 'Global Supply'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenEdit(s)} title="Edit Supplier" className="w-10 h-10 flex items-center justify-center bg-card border border-border/10 text-muted-foreground hover:bg-primary hover:text-black hover:scale-105 rounded-xl transition-all">
                                        <window.Icon name="Edit3" size={14} />
                                    </button>
                                    <button onClick={() => { if (confirm('Archive Partner?')) { deleteItem('suppliers', s.id); logActivity(`Archived vendor: ${s.name}`, 'Archive'); } }} title="Delete Supplier" className="w-10 h-10 flex items-center justify-center bg-card border border-border/10 text-muted-foreground hover:bg-rose-500 hover:text-white hover:scale-105 rounded-xl transition-all">
                                        <window.Icon name="Trash2" size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stakeholder Registration Protocol */}
                <window.Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title={editingSupplier ? "Partner Resource Configuration" : "Stakeholder Registry Initiation"}>
                    <form onSubmit={handleSubmit} className="p-2 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Entity Nomenclature</label>
                                <input className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30" placeholder="LEGAL PARTNER NAME..." required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Liaison Contact Vector</label>
                                <input className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30" placeholder="+254..." required value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Primary Email Channel</label>
                                <input type="email" className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30" placeholder="LIAISON@DOMAIN.COM..." required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Resource Classification</label>
                                <select className="brand-input w-full !h-14 text-[10px] font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30 px-6 appearance-none cursor-pointer" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option>Material</option><option>Software</option><option>Infrastructure</option><option>Logistics</option><option>Marketing</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Fiscal Matrix (KRA PIN)</label>
                                <input className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30" placeholder="P05..." value={formData.kraPin} onChange={e => setFormData({ ...formData, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Key Strategic Liaison</label>
                                <input className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30" placeholder="MANAGER NAME..." value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Geospatial Operations Hub</label>
                                <input className="brand-input w-full !h-14 text-xs font-black tracking-widest uppercase border-border/10 focus:border-primary/50 !bg-card/30" placeholder="PHYSICAL LOCALE..." value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="w-full py-6 bg-primary text-black rounded-[24px] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 italic active:scale-[0.98]">
                            {editingSupplier ? "Authorize Config Authorization" : "Synchronize Partner Sequence"}
                        </button>
                    </form>
                </window.Modal>
            </div>
        );
    };

    const ProjectModule = () => {
        const { data, updateData, updateItem, deleteItem, logActivity, seedInvoice, user } = useContext(AppContext);
        const [selectedProject, setSelectedProject] = useState(null);
        const [isAdding, setIsAdding] = useState(false);
        const [isAddingBOM, setIsAddingBOM] = useState(false);
        const [viewProject, setViewProject] = useState(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [exportOpen, setExportOpen] = useState(false);
        const [extendId, setExtendId] = useState(null);
        const [extendDate, setExtendDate] = useState('');

        const isAdmin = user?.role === 'admin';

        const [formData, setFormData] = useState({ name: '', client: '', deadline: '', designer: '', status: 'In-progress', stage: 'Brief', budget: '' });
        const [newBOMItem, setNewBOMItem] = useState({ itemId: '', qty: 1 });

        const stages = ['Brief', 'Design', 'Production', 'Logistics', 'Delivered'];
        const statuses = ['Active', 'Awaiting Payment', 'Completed', 'Cancelled', 'Outsourced'];

        const handleOpenAdd = () => {
            setFormData({ name: '', client: '', deadline: '', designer: '', status: 'In-progress', stage: 'Brief', budget: '' });
            setSelectedProject(null);
            setIsAdding(true);
        };

        const handleOpenEdit = (p) => {
            if (p.status === 'Completed' && !isAdmin) return;
            setFormData({ name: p.name, client: p.client, deadline: p.deadline, designer: p.designer || '', status: p.status, stage: p.stage || 'Brief', budget: p.budget || '' });
            setSelectedProject(p.id);
            setIsAdding(true);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (selectedProject) {
                const updated = data.projects.map(p => p.id === selectedProject ? { ...p, ...formData } : p);
                await updateData('projects_bulk', updated);
                logActivity(`Updated project: ${formData.name}`, 'Update');
            } else {
                const project = { ...formData, id: Date.now(), bom: [] };
                await updateData('projects', project);
                logActivity(`New design project created: ${formData.name}`, 'Success');
            }
            setIsAdding(false);
            setSelectedProject(null);
        };

        const handleStageChange = async (p, stage) => {
            if (p.status === 'Completed' && !isAdmin) return;
            const updated = data.projects.map(proj => proj.id === p.id ? { ...proj, stage } : proj);
            await updateData('projects_bulk', updated);
            logActivity(`${p.name} stage → ${stage}`, 'Update');
            // Auto-seed to sales when Delivered
            if (stage === 'Delivered' && p.status !== 'Awaiting Payment' && p.status !== 'Completed') {
                await updateData('projects_bulk', data.projects.map(proj => proj.id === p.id ? { ...proj, stage, status: 'Awaiting Payment' } : proj));
                seedInvoice({ client: p.client, projectId: p.id, itemName: `Design Project: ${p.name}`, amount: p.budget || 0 });
                logActivity(`Project "${p.name}" delivered — seeded to Sales as "Awaiting Payment"`, 'Invoice');
            }
        };

        const handleMarkCompleted = async (p) => {
            if (!isAdmin) return;
            await updateData('projects_bulk', data.projects.map(proj => proj.id === p.id ? { ...proj, status: 'Completed' } : proj));
            logActivity(`Project "${p.name}" marked as Completed (Paid)`, 'Success');
        };

        const handleExtend = async (e) => {
            e.preventDefault();
            const p = data.projects.find(proj => proj.id === extendId);
            if (!p || !extendDate) return;
            await updateData('projects_bulk', data.projects.map(proj => proj.id === extendId ? { ...proj, deadline: extendDate } : proj));
            logActivity(`Deadline extended for "${p.name}" to ${extendDate}`, 'Update');
            setExtendId(null); setExtendDate('');
        };

        const handleAddBOM = (e) => {
            e.preventDefault();
            const project = data.projects.find(p => p.id === selectedProject);
            if (!project) return;
            const inventoryItem = data.inventory.find(i => i.id === parseInt(newBOMItem.itemId));
            const bomItem = { id: Date.now(), itemId: parseInt(newBOMItem.itemId), sku: inventoryItem?.sku, name: inventoryItem?.name, qty: parseFloat(newBOMItem.qty), status: 'Reserved' };
            updateData('projects_bulk', data.projects.map(p => p.id === selectedProject ? { ...p, bom: [...(p.bom || []), bomItem] } : p));
            logActivity(`Material added to ${project.name}`, 'Sync');
            setIsAddingBOM(false);
        };

        // Export helpers
        const exportCSV = () => {
            const rows = ['"Project","Client","Designer","Stage","Status","Deadline","Budget"'];
            data.projects.forEach(p => rows.push(`"${p.name}","${p.client}","${p.designer || ''}","${p.stage}","${p.status}","${p.deadline}","${p.budget || ''}"`));
            const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'IGH-Projects.csv'; a.click();
        };
        const exportEmail = () => {
            const subj = encodeURIComponent('IGH Design Projects Report');
            const body = encodeURIComponent(`Projects Summary:\nTotal: ${data.projects.length}\nActive: ${data.projects.filter(p=>p.status==='In-progress').length}\nDelivered: ${data.projects.filter(p=>p.status==='Awaiting Payment').length}\nCompleted: ${data.projects.filter(p=>p.status==='Completed').length}`);
            window.location.href = `mailto:?subject=${subj}&body=${body}`;
        };

        const filtered = data.projects.filter(p => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            return (p.name||'').toLowerCase().includes(q) || (p.client||'').toLowerCase().includes(q) ||
                (p.designer||'').toLowerCase().includes(q) || (p.stage||'').toLowerCase().includes(q) ||
                (p.status||'').toLowerCase().includes(q);
        });

        const statusColor = (s) => {
            if (s === 'Completed') return 'bg-emerald-100 text-emerald-700';
            if (s === 'Awaiting Payment') return 'bg-blue-100 text-blue-700';
            if (s === 'Cancelled') return 'bg-red-100 text-red-700';
            if (s === 'Outsourced') return 'bg-purple-100 text-purple-700';
            return 'bg-yellow-100 text-yellow-700';
        };


        return (
            <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-widest uppercase leading-none">Design Base</h1>
                        <p className="text-muted-foreground mt-1 text-[10px] font-bold uppercase tracking-[0.35em]">Innovation | Excellency | Professionalism</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Always-visible search */}
                        <div className="relative">
                            <window.Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="brand-input pl-9 pr-4 py-2 w-52 text-xs"
                            />
                        </div>
                        {/* Generate Report dropdown */}
                        <div className="relative">
                            <button onClick={() => setExportOpen(!exportOpen)} className="brand-button-black text-xs px-4 py-2 gap-2">
                                <window.Icon name="bar-chart-2" size={14} /> Generate Report <window.Icon name="chevron-down" size={12} />
                            </button>
                            {exportOpen && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-2xl z-50 min-w-[140px] overflow-hidden">
                                    <button onClick={() => { exportCSV(); setExportOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-muted text-left">
                                        <window.Icon name="table" size={13} className="text-green-600" /> CSV
                                    </button>
                                    <button onClick={() => { window.print(); setExportOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-muted text-left">
                                        <window.Icon name="printer" size={13} className="text-blue-600" /> PDF / Print
                                    </button>
                                    <button onClick={() => { exportEmail(); setExportOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-muted text-left">
                                        <window.Icon name="mail" size={13} className="text-purple-600" /> Email
                                    </button>
                                </div>
                            )}
                        </div>
                        {isAdmin && (
                            <button onClick={handleOpenAdd} className="brand-button-yellow text-xs px-4 py-2 gap-2">
                                <window.Icon name="plus" size={14} strokeWidth={3} /> New Design Project
                            </button>
                        )}
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Active', sub: 'In-progress status', value: data.projects.filter(p => p.status === 'In-progress').length, color: '#facc15', border: 'border-b-4 border-yellow-400', icon: 'activity' },
                        { label: 'Pending', sub: 'Awaiting payment', value: data.projects.filter(p => p.status === 'Awaiting Payment').length, color: '#3b82f6', border: 'border-b-4 border-blue-500', icon: 'clock' },
                        { label: 'In Queue', sub: 'Brief stage', value: data.projects.filter(p => p.stage === 'Brief').length, color: '#f97316', border: 'border-b-4 border-orange-500', icon: 'list' },
                        { label: 'In Progress', sub: 'Design / Production', value: data.projects.filter(p => p.stage === 'Design' || p.stage === 'Production').length, color: '#8b5cf6', border: 'border-b-4 border-violet-500', icon: 'pen-tool' },
                        { label: 'Total Projects', sub: 'All time', value: data.projects.length, color: '#10b981', border: 'border-b-4 border-emerald-500', icon: 'briefcase' },
                    ].map(card => (
                        <div key={card.label} className={`brand-card p-5 flex items-center justify-between ${card.border}`}>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">{card.label}</p>
                                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wide mb-1">{card.sub}</p>
                                <h3 className="text-3xl font-black text-foreground">{card.value}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.color + '18' }}>
                                <window.Icon name={card.icon} size={20} style={{ color: card.color }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Project List — Linear Row Format */}
                <div className="brand-card overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-black text-white text-[10px] font-black uppercase tracking-wider">
                        <span>Project</span><span>Client</span><span>Designer</span><span>Stage</span><span>Deadline</span><span className="text-right pr-2">Actions</span>
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-border">
                        {filtered.length === 0 && (
                            <div className="py-16 text-center text-sm text-muted-foreground font-bold uppercase tracking-widest">No projects found</div>
                        )}
                        {filtered.map((p, idx) => {
                            const isLocked = p.status === 'Completed' && !isAdmin;
                            const currentStageIdx = stages.indexOf(p.stage || 'Brief');
                            return (
                                <div key={p.id} className={`grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-4 items-center text-xs hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'} ${isLocked ? 'opacity-80' : ''}`}>
                                    {/* Project name + status */}
                                    <div className="min-w-0">
                                        <p className="font-black text-foreground truncate">{p.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusColor(p.status)}`}>{p.status}</span>
                                            {isLocked && <window.Icon name="lock" size={10} className="text-muted-foreground" />}
                                        </div>
                                    </div>
                                    {/* Client */}
                                    <span className="text-muted-foreground font-bold truncate">{p.client || '—'}</span>
                                    {/* Designer */}
                                    <span className="text-muted-foreground font-bold truncate">@{p.designer || 'unassigned'}</span>
                                    {/* Stage bar */}
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-wider">{p.stage || 'Brief'}</span>
                                        <div className="flex gap-0.5 h-1.5">
                                            {stages.map((stage, si) => (
                                                <div key={stage}
                                                    onClick={() => !isLocked && handleStageChange(p, stage)}
                                                    title={stage}
                                                    className={`flex-1 rounded-full transition-all ${si < currentStageIdx ? 'bg-emerald-500' : si === currentStageIdx ? 'bg-primary' : 'bg-gray-200'} ${!isLocked ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {/* Deadline */}
                                    <div className="flex items-center gap-1.5">
                                        <window.Icon name="calendar" size={12} className={p.deadline && p.deadline < new Date().toISOString().slice(0,10) && p.status === 'In-progress' ? 'text-rose-500' : 'text-muted-foreground'} />
                                        <span className={`font-bold ${p.deadline && p.deadline < new Date().toISOString().slice(0,10) && p.status === 'In-progress' ? 'text-rose-500' : 'text-muted-foreground'}`}>{p.deadline || '—'}</span>
                                    </div>
                                    {/* Action badges */}
                                    <div className="flex items-center gap-1 justify-end flex-wrap">
                                        {/* VD — View Details (all users) */}
                                        <button onClick={() => setViewProject(p)} title="View Details" className="h-7 px-2 rounded-md text-[10px] font-black tracking-wider bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition-all border border-blue-200 hover:border-blue-600">VD</button>
                                        {/* EP — Edit Project (all non-locked) */}
                                        {!isLocked && (
                                            <button onClick={() => handleOpenEdit(p)} title="Edit Project" className="h-7 px-2 rounded-md text-[10px] font-black tracking-wider bg-yellow-100 text-yellow-700 hover:bg-yellow-500 hover:text-white transition-all border border-yellow-300 hover:border-yellow-500">EP</button>
                                        )}
                                        {/* UP — Update Progress (all non-locked) */}
                                        {!isLocked && (
                                            <button onClick={() => handleOpenEdit(p)} title="Update Progress" className="h-7 px-2 rounded-md text-[10px] font-black tracking-wider bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white transition-all border border-amber-300 hover:border-amber-500">UP</button>
                                        )}
                                        {/* ED — Extend Deadline (all non-locked) */}
                                        {!isLocked && (
                                            <button onClick={() => { setExtendId(p.id); setExtendDate(p.deadline || ''); }} title="Extend Deadline" className="h-7 px-2 rounded-md text-[10px] font-black tracking-wider bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 hover:border-purple-600">ED</button>
                                        )}
                                        {/* Admin-only */}
                                        {isAdmin && (
                                            <>
                                                {/* AM — Assign Materials */}
                                                <button onClick={() => { setSelectedProject(p.id); setIsAddingBOM(true); }} title="Assign Materials" className="h-7 px-2 rounded-md text-[10px] font-black tracking-wider bg-cyan-100 text-cyan-700 hover:bg-cyan-600 hover:text-white transition-all border border-cyan-200 hover:border-cyan-600">AM</button>
                                                {/* MC — Mark Completed (only when Awaiting Payment) */}
                                                {p.status === 'Awaiting Payment' && (
                                                    <button onClick={() => handleMarkCompleted(p)} title="Mark as Completed" className="h-7 px-2 rounded-md text-[10px] font-black tracking-wider bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200 hover:border-emerald-600">MC</button>
                                                )}
                                                {/* DP — Delete Project */}
                                                <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) { deleteItem('projects', p.id); logActivity(`Deleted project: ${p.name}`, 'Delete'); } }} title="Delete Project" className="h-7 px-2 rounded-md text-[10px] font-black tracking-wider bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-all border border-red-200 hover:border-red-600">DP</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* View Project Modal */}
                <window.Modal isOpen={!!viewProject} onClose={() => setViewProject(null)} title="Project Details">
                    {viewProject && (
                        <div className="p-2 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Project Name', value: viewProject.name },
                                    { label: 'Client', value: viewProject.client },
                                    { label: 'Designer', value: '@' + (viewProject.designer || 'Unassigned') },
                                    { label: 'Deadline', value: viewProject.deadline },
                                    { label: 'Status', value: viewProject.status },
                                    { label: 'Stage', value: viewProject.stage },
                                    { label: 'Budget', value: viewProject.budget ? `KSh ${parseFloat(viewProject.budget).toLocaleString()}` : '—' },
                                ].map(f => (
                                    <div key={f.label} className="bg-muted/30 rounded-xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{f.label}</p>
                                        <p className="text-sm font-bold text-foreground">{f.value}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setViewProject(null)} className="w-full brand-button-black h-11 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                <window.Icon name="x" size={14} /> Close
                            </button>
                        </div>
                    )}
                </window.Modal>

                {/* Add / Edit Project Modal */}
                <window.Modal isOpen={isAdding} onClose={() => { setIsAdding(false); setSelectedProject(null); }} title={selectedProject ? "Edit Design Project" : "New Design Project"}>
                    <form onSubmit={handleSubmit} className="p-2 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="brand-label">Project Name</label>
                                <input className="brand-input" placeholder="e.g. Brand Identity for Acme Co." required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="brand-label">Client</label>
                                <select className="brand-input cursor-pointer" required value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })}>
                                    <option value="">Select client...</option>
                                    {data.clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="brand-label">Deadline</label>
                                <input type="date" className="brand-input" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="brand-label">Assigned Designer</label>
                                <select className="brand-input cursor-pointer" value={formData.designer} onChange={e => setFormData({ ...formData, designer: e.target.value })}>
                                    <option value="">Unassigned</option>
                                    {data.users.filter(u => u.role === 'designer' || u.role === 'admin').map(u => (
                                        <option key={u.id} value={u.username}>{u.name || u.username} (@{u.username})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="brand-label">Project Status</label>
                                <select className="brand-input cursor-pointer" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                    {statuses.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="brand-label">Current Stage</label>
                                <select className="brand-input cursor-pointer" value={formData.stage} onChange={e => setFormData({ ...formData, stage: e.target.value })}>
                                    {stages.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="brand-label">Project Budget (KSh)</label>
                                <input type="number" className="brand-input" placeholder="e.g. 50000" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => { setIsAdding(false); setSelectedProject(null); }} className="flex-1 brand-button-black h-11 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <window.Icon name="x" size={14} /> Cancel
                            </button>
                            <button type="submit" className="flex-1 brand-button-yellow h-11 text-xs font-black uppercase tracking-widest">
                                <window.Icon name="check" size={14} /> {selectedProject ? "Save Changes" : "Create Project"}
                            </button>
                        </div>
                    </form>
                </window.Modal>

                {/* Extend Deadline Modal */}
                <window.Modal isOpen={!!extendId} onClose={() => { setExtendId(null); setExtendDate(''); }} title="Extend Project Deadline">
                    <form onSubmit={handleExtend} className="p-2 space-y-5">
                        <div className="space-y-1.5">
                            <label className="brand-label">New Deadline Date</label>
                            <input type="date" className="brand-input" required value={extendDate} onChange={e => setExtendDate(e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setExtendId(null); setExtendDate(''); }} className="flex-1 brand-button-black h-11 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <window.Icon name="x" size={14} /> Cancel
                            </button>
                            <button type="submit" className="flex-1 brand-button-yellow h-11 text-xs font-black uppercase tracking-widest">
                                <window.Icon name="calendar-plus" size={14} /> Confirm Extension
                            </button>
                        </div>
                    </form>
                </window.Modal>

                {/* Add Materials (BOM) Modal */}
                <window.Modal isOpen={isAddingBOM} onClose={() => { setIsAddingBOM(false); setSelectedProject(null); }} title="Assign Materials to Project">
                    <form onSubmit={handleAddBOM} className="p-2 space-y-5">
                        <div className="space-y-1.5">
                            <label className="brand-label">Select Inventory Item</label>
                            <select className="brand-input cursor-pointer" required value={newBOMItem.itemId} onChange={e => setNewBOMItem({ ...newBOMItem, itemId: e.target.value })}>
                                <option value="">Choose item...</option>
                                {data.inventory.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.name} (Stock: {i.stock})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="brand-label">Quantity</label>
                            <input type="number" step="any" className="brand-input" placeholder="e.g. 10" required value={newBOMItem.qty} onChange={e => setNewBOMItem({ ...newBOMItem, qty: parseFloat(e.target.value) })} />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setIsAddingBOM(false); setSelectedProject(null); }} className="flex-1 brand-button-black h-11 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <window.Icon name="x" size={14} /> Cancel
                            </button>
                            <button type="submit" className="flex-1 brand-button-yellow h-11 text-xs font-black uppercase tracking-widest">
                                <window.Icon name="package" size={14} /> Add Materials
                            </button>
                        </div>
                    </form>
                </window.Modal>
            </div>
        );
    };

    const ReportModule = () => {
        const { data, user } = useContext(AppContext);
        const [reportType, setReportType] = useState(null);
        const [dateFrom, setDateFrom] = useState('');
        const [dateTo, setDateTo] = useState('');
        const [generated, setGenerated] = useState(null);
        const [isSaving, setIsSaving] = useState(false);

        // Admin-only guard
        if (user?.role !== 'admin') {
            return (
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center">
                        <window.Icon name="ShieldOff" size={36} className="text-rose-400" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-black uppercase tracking-widest text-foreground">Access Restricted</h2>
                        <p className="text-sm text-muted-foreground mt-2">This section is only accessible to system administrators.</p>
                    </div>
                </div>
            );
        }

        const reportTypes = [
            { id: 'sales',     label: 'Sales Report',      icon: 'ShoppingCart',   color: '#16a34a', bg: '#f0fdf4', desc: 'Invoice & revenue summary' },
            { id: 'expenses',  label: 'Expenses Report',   icon: 'Receipt',        color: '#dc2626', bg: '#fef2f2', desc: 'Cost & expenditure breakdown' },
            { id: 'inventory', label: 'Inventory Report',  icon: 'Package',        color: '#2563eb', bg: '#eff6ff', desc: 'Stock levels & valuation' },
            { id: 'clients',   label: 'Clients Report',    icon: 'Users',          color: '#7c3aed', bg: '#f5f3ff', desc: 'Client list & revenue per client' },
            { id: 'projects',  label: 'Projects Report',   icon: 'FolderOpen',     color: '#d97706', bg: '#fffbeb', desc: 'Project status & budget tracking' },
            { id: 'suppliers', label: 'Suppliers Report',  icon: 'Truck',          color: '#0891b2', bg: '#ecfeff', desc: 'Supplier directory & contacts' },
            { id: 'audit',     label: 'System Audit',      icon: 'ClipboardList',  color: '#475569', bg: '#f8fafc', desc: 'User activity & system log' },
        ];

        const currency = (v) => `KSh ${parseFloat(v || 0).toLocaleString()}`;

        const generateReport = async () => {
            if (!reportType) return;
            setIsSaving(true);
            const from = dateFrom || '2000-01-01';
            const to = dateTo || new Date().toISOString().slice(0, 10);
            const inRange = (d) => !d || (d >= from && d <= to);

            let records = [], totalValue = 0, summary = {};
            switch (reportType) {
                case 'sales':
                    records = data.sales.filter(s => inRange(s.date));
                    totalValue = records.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                    summary = { count: records.length, total: totalValue };
                    break;
                case 'expenses':
                    records = data.expenses.filter(e => inRange(e.date));
                    totalValue = records.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    summary = { count: records.length, total: totalValue };
                    break;
                case 'inventory':
                    records = data.inventory;
                    totalValue = records.reduce((sum, i) => sum + ((i.stock || 0) * (i.price || 0)), 0);
                    summary = { count: records.length, totalValue };
                    break;
                case 'clients':
                    records = data.clients;
                    summary = { count: records.length };
                    break;
                case 'projects':
                    records = data.projects;
                    summary = { count: records.length, active: records.filter(p => p.status !== 'Done & Paid').length };
                    break;
                case 'suppliers':
                    records = data.suppliers;
                    summary = { count: records.length };
                    break;
                case 'audit':
                    records = data.activities;
                    summary = { count: records.length };
                    break;
            }

            // Save to Supabase with deduplication on type + date_from + date_to
            try {
                const { data: existing } = await window.supabaseClient
                    .from('reports').select('id').eq('type', reportType).eq('date_from', from).eq('date_to', to);
                const payload = {
                    type: reportType, date_from: from, date_to: to,
                    generated_by: user?.username || 'admin',
                    generated_at: new Date().toISOString(),
                    record_count: records.length,
                    total_value: totalValue,
                    summary_json: JSON.stringify(summary)
                };
                if (existing && existing.length > 0) {
                    await window.supabaseClient.from('reports').update(payload).eq('id', existing[0].id);
                } else {
                    await window.supabaseClient.from('reports').insert([{ id: Math.floor(Math.random() * 900000) + 10000, ...payload }]);
                }
            } catch (err) {
                console.warn('Report cloud save skipped (table may not exist):', err.message);
            }

            setGenerated({ type: reportType, from, to, records, summary, totalValue, generatedAt: new Date() });
            setIsSaving(false);
        };

        const handlePrint = () => window.print();

        const handleDownload = () => {
            if (!generated) return;
            const typeInfo = reportTypes.find(r => r.id === generated.type);
            const rows = [`"${typeInfo?.label} — Period: ${generated.from} to ${generated.to}"`, ''];
            if (generated.records.length > 0) {
                const keys = Object.keys(generated.records[0]);
                rows.push(keys.map(k => `"${k}"`).join(','));
                generated.records.forEach(rec => rows.push(keys.map(k => `"${String(rec[k] ?? '').replace(/"/g, '""')}"`).join(',')));
            } else { rows.push('"No records found."'); }
            const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `IGH-${generated.type}-${generated.from}-${generated.to}.csv`; a.click();
            URL.revokeObjectURL(url);
        };

        const handleEmail = () => {
            if (!generated) return;
            const typeInfo = reportTypes.find(r => r.id === generated.type);
            const subj = encodeURIComponent(`IGH ${typeInfo?.label} — ${generated.from} to ${generated.to}`);
            const body = encodeURIComponent(
                `Hi,\n\n${typeInfo?.label} Summary:\n` +
                `Period: ${generated.from} to ${generated.to}\n` +
                `Records: ${generated.records.length}\n` +
                (generated.totalValue ? `Total Value: KSh ${generated.totalValue.toLocaleString()}\n` : '') +
                `\nGenerated by: ${user?.name || user?.username} on ${generated.generatedAt.toLocaleString()}\n\n— Identity Graphics Houzz System`
            );
            window.location.href = `mailto:?subject=${subj}&body=${body}`;
        };

        const renderTable = () => {
            const { type, records } = generated;
            const thCls = 'px-4 py-3 font-black uppercase tracking-wider text-xs';
            const tdCls = 'px-4 py-3 text-xs';
            const rowCls = (i) => i % 2 === 0 ? 'bg-white' : 'bg-gray-50';

            if (type === 'sales') return (
                <table className="w-full text-left">
                    <thead><tr className="bg-black text-white">
                        <th className={thCls}>Invoice #</th><th className={thCls}>Client</th>
                        <th className={thCls}>Date</th><th className={thCls}>Status</th>
                        <th className={thCls + ' text-right'}>Amount</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {records.map((s, i) => (<tr key={s.id} className={rowCls(i)}>
                            <td className={tdCls + ' font-bold text-primary'}>{s.invoice_number || `INV-${s.id}`}</td>
                            <td className={tdCls}>{s.client}</td><td className={tdCls + ' text-muted-foreground'}>{s.date}</td>
                            <td className={tdCls}><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${s.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span></td>
                            <td className={tdCls + ' text-right font-bold'}>{currency(s.amount)}</td>
                        </tr>))}
                    </tbody>
                    <tfoot><tr className="bg-primary/10 border-t-2 border-black">
                        <td colSpan={4} className="px-4 py-3 font-black uppercase tracking-widest text-sm">Total Revenue</td>
                        <td className="px-4 py-3 text-right font-black text-base">{currency(generated.totalValue)}</td>
                    </tr></tfoot>
                </table>
            );
            if (type === 'expenses') return (
                <table className="w-full text-left">
                    <thead><tr className="bg-black text-white">
                        <th className={thCls}>Category</th><th className={thCls}>Description</th>
                        <th className={thCls}>Date</th><th className={thCls + ' text-right'}>Amount</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {records.map((e, i) => (<tr key={e.id} className={rowCls(i)}>
                            <td className={tdCls}><span className="px-2 py-0.5 bg-primary/10 rounded text-[9px] font-bold uppercase">{e.category}</span></td>
                            <td className={tdCls}>{e.notes || e.description || '—'}</td>
                            <td className={tdCls + ' text-muted-foreground'}>{e.date}</td>
                            <td className={tdCls + ' text-right font-bold text-rose-600'}>{currency(e.amount)}</td>
                        </tr>))}
                    </tbody>
                    <tfoot><tr className="bg-rose-50 border-t-2 border-black">
                        <td colSpan={3} className="px-4 py-3 font-black uppercase tracking-widest text-sm">Total Expenses</td>
                        <td className="px-4 py-3 text-right font-black text-base text-rose-600">{currency(generated.totalValue)}</td>
                    </tr></tfoot>
                </table>
            );
            if (type === 'inventory') return (
                <table className="w-full text-left">
                    <thead><tr className="bg-black text-white">
                        <th className={thCls}>Item</th><th className={thCls}>Category</th>
                        <th className={thCls + ' text-right'}>Stock</th><th className={thCls + ' text-right'}>Unit Price</th>
                        <th className={thCls + ' text-right'}>Total Value</th><th className={thCls + ' text-center'}>Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {records.map((item, i) => {
                            const val = (item.stock || 0) * (item.price || 0);
                            const isLow = item.stock <= (item.reorder_level || 5);
                            return (<tr key={item.id} className={rowCls(i)}>
                                <td className={tdCls + ' font-bold'}>{item.name}</td>
                                <td className={tdCls + ' text-muted-foreground'}>{item.category || '—'}</td>
                                <td className={tdCls + ' text-right font-bold'}>{item.stock}</td>
                                <td className={tdCls + ' text-right'}>{currency(item.price)}</td>
                                <td className={tdCls + ' text-right font-bold'}>{currency(val)}</td>
                                <td className={tdCls + ' text-center'}><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isLow ? 'Low Stock' : 'OK'}</span></td>
                            </tr>);
                        })}
                    </tbody>
                    <tfoot><tr className="bg-primary/10 border-t-2 border-black">
                        <td colSpan={4} className="px-4 py-3 font-black uppercase tracking-widest text-sm">Total Inventory Value</td>
                        <td colSpan={2} className="px-4 py-3 text-right font-black text-base">{currency(generated.totalValue)}</td>
                    </tr></tfoot>
                </table>
            );
            if (type === 'clients') return (
                <table className="w-full text-left">
                    <thead><tr className="bg-black text-white">
                        <th className={thCls}>Client Name</th><th className={thCls}>Email</th>
                        <th className={thCls}>Phone</th><th className={thCls + ' text-right'}>Total Revenue</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {records.map((c, i) => {
                            const rev = data.sales.filter(s => s.client === c.name).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                            return (<tr key={c.id} className={rowCls(i)}>
                                <td className={tdCls + ' font-bold'}>{c.name}</td>
                                <td className={tdCls + ' text-muted-foreground'}>{c.email || '—'}</td>
                                <td className={tdCls + ' text-muted-foreground'}>{c.phone || '—'}</td>
                                <td className={tdCls + ' text-right font-bold text-primary'}>{currency(rev)}</td>
                            </tr>);
                        })}
                    </tbody>
                </table>
            );
            if (type === 'projects') return (
                <table className="w-full text-left">
                    <thead><tr className="bg-black text-white">
                        <th className={thCls}>Project</th><th className={thCls}>Client</th>
                        <th className={thCls}>Designer</th><th className={thCls}>Deadline</th>
                        <th className={thCls + ' text-right'}>Budget</th><th className={thCls + ' text-center'}>Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {records.map((p, i) => (<tr key={p.id} className={rowCls(i)}>
                            <td className={tdCls + ' font-bold'}>{p.name}</td>
                            <td className={tdCls + ' text-muted-foreground'}>{p.client}</td>
                            <td className={tdCls + ' text-muted-foreground'}>@{p.designer}</td>
                            <td className={tdCls + ' text-muted-foreground'}>{p.deadline}</td>
                            <td className={tdCls + ' text-right font-bold'}>{currency(p.budget)}</td>
                            <td className={tdCls + ' text-center'}><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.status === 'Done & Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span></td>
                        </tr>))}
                    </tbody>
                </table>
            );
            if (type === 'suppliers') return (
                <table className="w-full text-left">
                    <thead><tr className="bg-black text-white">
                        <th className={thCls}>Supplier</th><th className={thCls}>Contact</th>
                        <th className={thCls}>Email</th><th className={thCls}>Category</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {records.map((s, i) => (<tr key={s.id} className={rowCls(i)}>
                            <td className={tdCls + ' font-bold'}>{s.name}</td>
                            <td className={tdCls + ' text-muted-foreground'}>{s.phone || '—'}</td>
                            <td className={tdCls + ' text-muted-foreground'}>{s.email || '—'}</td>
                            <td className={tdCls + ' text-muted-foreground'}>{s.category || '—'}</td>
                        </tr>))}
                    </tbody>
                </table>
            );
            if (type === 'audit') return (
                <table className="w-full text-left">
                    <thead><tr className="bg-black text-white">
                        <th className={thCls}>Time</th><th className={thCls}>User</th>
                        <th className={thCls}>Type</th><th className={thCls}>Action</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {records.map((a, i) => (<tr key={a.id || i} className={rowCls(i)}>
                            <td className={tdCls + ' text-muted-foreground font-mono'}>{a.time}</td>
                            <td className={tdCls + ' font-bold text-primary'}>@{a.user}</td>
                            <td className={tdCls}><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">{a.type}</span></td>
                            <td className={tdCls}>{a.msg}</td>
                        </tr>))}
                    </tbody>
                </table>
            );
            return null;
        };

        const typeInfo = reportTypes.find(r => r.id === reportType);
        const genTypeInfo = generated ? reportTypes.find(r => r.id === generated.type) : null;

        return (
            <div className="space-y-8 pb-12">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-widest text-foreground">Reports Center</h1>
                        <p className="text-sm text-muted-foreground mt-1">Generate, save and distribute business intelligence reports.</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl shrink-0">
                        <window.Icon name="ShieldCheck" size={16} className="text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest text-primary">Admin Access Only</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* LEFT PANEL */}
                    <div className="xl:col-span-1 space-y-6">
                        {/* Step 1: Report Type */}
                        <div className="brand-card p-6 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">1. Select Report Type</p>
                            {reportTypes.map(rt => (
                                <button
                                    key={rt.id}
                                    onClick={() => { setReportType(rt.id); setGenerated(null); }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${reportType === rt.id ? 'border-black bg-black text-white' : 'border-border bg-white hover:border-gray-400'}`}
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: reportType === rt.id ? 'rgba(255,255,255,0.12)' : rt.bg }}>
                                        <window.Icon name={rt.icon} size={15} style={{ color: reportType === rt.id ? '#facc15' : rt.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] font-black uppercase tracking-wider ${reportType === rt.id ? 'text-white' : 'text-foreground'}`}>{rt.label}</p>
                                        <p className={`text-[9px] font-bold mt-0.5 truncate ${reportType === rt.id ? 'text-white/50' : 'text-muted-foreground'}`}>{rt.desc}</p>
                                    </div>
                                    {reportType === rt.id && <window.Icon name="ChevronRight" size={14} className="text-primary shrink-0" />}
                                </button>
                            ))}
                        </div>

                        {/* Step 2: Date Range */}
                        <div className="brand-card p-6 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">2. Date Range</p>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">From</label>
                                <input type="date" className="brand-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">To</label>
                                <input type="date" className="brand-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            </div>
                            <p className="text-[9px] text-muted-foreground font-bold italic">Leave blank to include all records</p>
                        </div>

                        {/* Step 3: Generate */}
                        <button
                            onClick={generateReport}
                            disabled={!reportType || isSaving}
                            className="w-full brand-button-yellow h-12 font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSaving
                                ? <><window.Icon name="Loader" size={16} className="animate-spin" /> Generating...</>
                                : <><window.Icon name="FileText" size={16} /> Generate Report</>}
                        </button>

                        {generated && (
                            <p className="text-center text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <window.Icon name="CheckCircle" size={12} /> Saved to cloud — no duplicates
                            </p>
                        )}
                    </div>

                    {/* RIGHT PANEL — Preview */}
                    <div className="xl:col-span-2 space-y-4">
                        {!generated ? (
                            <div className="brand-card min-h-[480px] flex flex-col items-center justify-center gap-6 p-12">
                                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                                    <window.Icon name="FileBarChart" size={36} className="text-primary" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-base font-black uppercase tracking-widest text-foreground">No Report Generated Yet</p>
                                    <p className="text-xs text-muted-foreground">Select a report type and date range, then click Generate.</p>
                                </div>
                                {reportType && typeInfo && (
                                    <div className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: typeInfo.bg }}>
                                            <window.Icon name={typeInfo.icon} size={16} style={{ color: typeInfo.color }} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-wider text-foreground">{typeInfo.label} — ready to generate</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Report Header Bar */}
                                <div className="brand-card p-5 border-l-4 border-black bg-white">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <div className="w-5 h-5 rounded" style={{ background: genTypeInfo?.color }}></div>
                                                <h3 className="text-base font-black uppercase tracking-widest">{genTypeInfo?.label}</h3>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                {generated.from} — {generated.to} &nbsp;·&nbsp; {generated.records.length} records &nbsp;·&nbsp; {generated.generatedAt.toLocaleString()}
                                            </p>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex items-center gap-2 no-print shrink-0">
                                            <button onClick={handlePrint} title="Print Report" className="flex items-center gap-1.5 px-3 py-2 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-zinc-800 transition-all">
                                                <window.Icon name="Printer" size={13} /> Print
                                            </button>
                                            <button onClick={handleDownload} title="Download as CSV" className="flex items-center gap-1.5 px-3 py-2 bg-primary text-black text-[10px] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition-all">
                                                <window.Icon name="Download" size={13} /> Save CSV
                                            </button>
                                            <button onClick={handleEmail} title="Send via Email" className="flex items-center gap-1.5 px-3 py-2 border-2 border-black text-black text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-black hover:text-white transition-all">
                                                <window.Icon name="Mail" size={13} /> Email
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="brand-card overflow-hidden">
                                    {generated.records.length === 0 ? (
                                        <div className="p-16 text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                                                <window.Icon name="FileX" size={24} className="text-muted-foreground" />
                                            </div>
                                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No records found for this period.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">{renderTable()}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );


    };


    const SettingsModule = () => {
        const { data, user, updateData, updateItem, deleteItem, logActivity, changePassword, fetchAllData } = useContext(AppContext);
        const [isSyncing, setIsSyncing] = useState(false);
        const [syncLog, setSyncLog] = useState([]);
        const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'profile', 'security', 'integration', 'users'

        const [isAddingUser, setIsAddingUser] = useState(false);
        const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user' });
        const [editingUser, setEditingUser] = useState(null);
        const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });

        // Database Sync state
        const [lastSyncTime, setLastSyncTime] = useState(null);
        const [syncStats, setSyncStats] = useState([]);

        const handleSync = async () => {
            setIsSyncing(true);
            setSyncLog([{ time: new Date().toLocaleTimeString(), msg: 'Connecting to Supabase...', ok: true }]);
            try {
                const tables = [
                    { key: 'sales', label: 'Sales' },
                    { key: 'expenses', label: 'Expenses' },
                    { key: 'projects', label: 'Projects' },
                    { key: 'clients', label: 'Clients' },
                    { key: 'suppliers', label: 'Suppliers' },
                    { key: 'inventory', label: 'Inventory' },
                    { key: 'users', label: 'Users' },
                ];
                const stats = [];
                for (const t of tables) {
                    const { count, error } = await window.supabaseClient.from(t.key).select('*', { count: 'exact', head: true });
                    const n = error ? '?' : (count ?? 0);
                    stats.push({ label: t.label, count: n });
                    setSyncLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `${t.label}: ${n} record${n === 1 ? '' : 's'} confirmed`, ok: !error }]);
                }
                setSyncStats(stats);
                await fetchAllData();
                const now = new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
                setLastSyncTime(now);
                setSyncLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'All data verified and refreshed successfully.', ok: true }]);
                logActivity('Database sync completed', 'Sync');
            } catch (err) {
                setSyncLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Sync failed: ' + err.message, ok: false }]);
            } finally {
                setIsSyncing(false);
            }
        };

        // Auto-sync every 15 minutes
        useEffect(() => {
            if (!user) return;
            const interval = setInterval(() => {
                fetchAllData().then(() => {
                    setLastSyncTime(new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }));
                });
            }, 15 * 60 * 1000);
            return () => clearInterval(interval);
        }, [user]);

        const handleEditClick = (u) => {
            setEditingUser(u);
            setNewUser({ name: u.name || u.display_name || '', username: u.username, password: u.password || '', role: u.role || 'user' });
            setIsAddingUser(true);
        };

        const handleProvisionUser = async (e) => {
            e.preventDefault();
            if (!editingUser && newUser.password.length < 5) {
                return alert('Password must be at least 5 characters.');
            }
            if (!newUser.name.trim() || !newUser.username.trim()) {
                return alert('Full name and username are required.');
            }
            try {
                let dbError;
                if (editingUser) {
                    const payload = { name: newUser.name, username: newUser.username, role: newUser.role };
                    if (newUser.password) payload.password = newUser.password;
                    const { error } = await window.supabaseClient.from('users').update(payload).eq('id', editingUser.id);
                    dbError = error;
                    if (!error) logActivity(`User updated: ${newUser.username}`, 'Update');
                } else {
                    const { error } = await window.supabaseClient.from('users').insert([{
                        id: Math.floor(Math.random() * 900000) + 10000,
                        name: newUser.name,
                        username: newUser.username,
                        password: newUser.password,
                        role: newUser.role
                    }]);
                    dbError = error;
                    if (!error) logActivity(`New user added: ${newUser.username}`, 'Access');
                }
                if (dbError) {
                    alert('Could not save user: ' + (dbError.message || 'Unknown error. Check Supabase permissions.'));
                    return;
                }
                await fetchAllData();
                setIsAddingUser(false);
                setEditingUser(null);
                setNewUser({ name: '', username: '', password: '', role: 'user' });
            } catch (err) {
                alert('Unexpected error: ' + err.message);
                console.error('Provision Error:', err);
            }
        };

        const renderIntegration = () => (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
                {/* Header card */}
                <div className="brand-card p-8 flex flex-col md:flex-row items-center md:items-start gap-6 bg-white border-l-4 border-emerald-500">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-2xl border-2" style={{background:'#D1FAE5', borderColor:'#6EE7B7', color:'#065f46'}}>
                        <window.Icon name="Database" size={28} strokeWidth={2} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black uppercase tracking-widest text-foreground">Database Sync</h3>
                        <p className="text-sm text-muted-foreground mt-1">Connected to Supabase — all data is stored and synced in real time. Use this panel to verify record counts and force a full refresh.</p>
                        {lastSyncTime && (
                            <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-2 justify-center md:justify-start">
                                <window.Icon name="CheckCircle" size={12} />
                                Last synced: {lastSyncTime}
                            </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Auto-sync runs every 15 minutes in the background.</p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="shrink-0 flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <window.Icon name="RefreshCw" size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync Data'}
                    </button>
                </div>

                {/* Stats grid */}
                {syncStats.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {syncStats.map((s, i) => (
                            <div key={i} className="brand-card p-5 flex flex-col gap-1 bg-white border border-gray-200">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                <p className="text-3xl font-black text-foreground">{s.count}</p>
                                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><window.Icon name="CheckCircle" size={10} /> Verified</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sync log */}
                {syncLog.length > 0 && (
                    <div className="brand-card bg-white border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sync Log</span>
                        </div>
                        <div className="p-6 space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                            {syncLog.map((log, i) => (
                                <div key={i} className="flex items-start gap-4 py-1 border-b border-gray-50 last:border-0">
                                    <span className="text-muted-foreground/50 shrink-0">{log.time}</span>
                                    <span className={log.ok ? 'text-emerald-700' : 'text-rose-600'}>{log.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );


        const renderSecurity = () => (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
                <div className="brand-card p-12 bg-rose-500/5 backdrop-blur-md border border-rose-500/10 space-y-12 shadow-2xl">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-[24px] border border-rose-500/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-rose-500/5 blur-xl"></div>
                            <window.Icon name="ShieldAlert" size={32} className="relative z-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-4xl font-black text-foreground italic tracking-tighter uppercase leading-none">Credential Rotation</h3>
                            <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.3em] italic">Active Sentinel Protocol // SHA-256 Alignment</p>
                        </div>
                    </div>

                    <form className="space-y-10" onSubmit={e => {
                        e.preventDefault();
                        if (pwData.new.length < 5) return alert('New password must be at least 5 characters.');
                        if (pwData.new !== pwData.confirm) return alert('Cipher mismatch. Verification failed.');
                        changePassword(pwData.current, pwData.new).then(res => {
                            if (res) { alert('Security sequence updated.'); setPwData({ current: '', new: '', confirm: '' }); }
                            else alert('Authentication invalid. Check your current password.');
                        });
                    }}>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Current Authentication Cipher</label>
                                <input type="password" required className="brand-input !h-14 border-border focus:border-rose-500" value={pwData.current} onChange={e => setPwData({ ...pwData, current: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">New Sequence Designation <span className="text-rose-400 normal-case not-italic">(min 5 chars)</span></label>
                                    <input type="password" required minLength={5} className="brand-input !h-14 border-border focus:border-rose-500" value={pwData.new} onChange={e => setPwData({ ...pwData, new: e.target.value })} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1 italic">Sequence Confirmation</label>
                                    <input type="password" required minLength={5} className="brand-input !h-14 border-border focus:border-rose-500" value={pwData.confirm} onChange={e => setPwData({ ...pwData, confirm: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full py-6 bg-rose-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-rose-600/20 hover:shadow-rose-600/40 transition-all duration-300 italic active:scale-[0.98] border border-rose-500/20">
                            Execute Rotation Protocol
                        </button>
                    </form>
                </div>
            </div>
        );



        const renderOverview = () => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {[
                    { id: 'profile', label: 'My Profile', sub: 'View and edit your account details', icon: 'User', bg: '#FEF9C3', iconColor: '#854d0e', border: '#FDE047' },
                    { id: 'security', label: 'Change Password', sub: 'Update your login password', icon: 'ShieldCheck', bg: '#FEE2E2', iconColor: '#b91c1c', border: '#FCA5A5' },
                    { id: 'integration', label: 'Data Sync', sub: 'Sync and verify data with Supabase', icon: 'RefreshCw', bg: '#D1FAE5', iconColor: '#065f46', border: '#6EE7B7' },
                    { id: 'users', label: 'Manage Users', sub: 'Add, edit and remove system users', icon: 'Users', bg: '#EDE9FE', iconColor: '#5b21b6', border: '#C4B5FD' },
                ].map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className="brand-card group p-8 cursor-pointer relative overflow-hidden flex flex-col gap-5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                        <div
                            className="w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-transform duration-200 group-hover:scale-110 shrink-0"
                            style={{ background: item.bg, borderColor: item.border, color: item.iconColor }}
                        >
                            <window.Icon name={item.icon} size={26} strokeWidth={2} />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <window.Icon name={item.icon} size={14} strokeWidth={2.5} style={{color: item.iconColor}} />
                                <h4 className="text-base font-black uppercase tracking-widest transition-colors" style={{color: item.iconColor}}>{item.label}</h4>
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground leading-snug normal-case tracking-normal">{item.sub}</p>
                        </div>
                        <div className="absolute bottom-0 left-0 w-0 h-[3px] bg-primary group-hover:w-full transition-all duration-300 rounded-b-xl"></div>
                    </div>
                ))}
            </div>
        );


        const getRoleLabel = (role) => {
            if (role === 'admin') return 'System Administrator';
            if (role === 'designer') return 'Designer — Project Handler';
            return 'Staff — General User';
        };
        const getRoleHandle = (role) => {
            if (role === 'admin') return 'admin@igh';
            if (role === 'designer') return 'designer@igh';
            return 'staff@igh';
        };

        const renderProfile = () => (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="brand-card p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden bg-white border border-gray-200 shadow-2xl">
                    <div className="absolute right-0 top-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full translate-x-24 -translate-y-24"></div>
                    <div className="w-24 h-24 bg-primary text-black flex items-center justify-center text-4xl font-black shadow-xl uppercase italic tracking-tighter border border-primary/20 rounded-3xl relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                        <span className="relative z-10">{(user?.name || user?.display_name || '?').charAt(0)}</span>
                    </div>
                    <div className="z-10 text-center md:text-left space-y-2">
                        <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">{user?.display_name || user?.name}</h3>
                        <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                            <span className="w-3 h-[2px] bg-primary"></span>
                            <p className="text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] tracking-[0.3em] leading-none">{getRoleLabel(user?.role)}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="brand-card p-8 bg-card/30 backdrop-blur-md border border-border/5 space-y-3 hover:bg-card/50 transition-all duration-700">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3">Personnel ID</p>
                        <div className="flex items-center gap-4">
                            <window.Icon name="Fingerprint" size={20} className="text-primary" />
                            <span className="text-xl font-black text-foreground tracking-tight uppercase">{getRoleHandle(user?.role)}</span>
                        </div>
                    </div>
                    <div className="brand-card p-8 bg-card/30 backdrop-blur-md border border-border/5 space-y-3 hover:bg-card/50 transition-all duration-700">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3">System Username</p>
                        <div className="flex items-center gap-4">
                            <window.Icon name="AtSign" size={20} className="text-primary" />
                            <span className="text-xl font-black text-primary tracking-tight uppercase">@{user?.username}</span>
                        </div>
                    </div>
                </div>
            </div>
        );

        const renderUsers = () => (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 px-2">
                    <div className="text-center md:text-left space-y-3">
                        <h3 className="text-4xl font-black uppercase italic tracking-tighter text-foreground leading-none">Access Control Matrix</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] italic flex items-center gap-3">
                            <span className="w-8 h-[1px] bg-primary/30"></span> {data.users.length} Identified Entities // Active Privileges
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddingUser(true)}
                        className="bg-primary text-black px-10 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-3 italic border border-primary/20"
                    >
                        <window.Icon name="Plus" size={18} strokeWidth={3} />
                        Provision New Entity
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-8 px-2">
                    {data.users.map((u, index) => (
                        <div
                            key={u.id}
                            className="brand-card group relative overflow-hidden flex flex-col sm:flex-row items-center justify-between p-8 bg-card/30 backdrop-blur-md border border-border/5 hover:bg-card/50 transition-all duration-700 animate-in fade-in slide-in-from-left-4"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="absolute -left-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-1000"></div>

                            <div className="flex flex-col sm:flex-row items-center gap-10 relative z-10 w-full sm:w-auto">
                                <div className="w-24 h-24 bg-black text-primary rounded-[28px] flex items-center justify-center font-black text-4xl shadow-2xl group-hover:bg-primary group-hover:text-black transition-all duration-700 border border-black/10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
                                    <span className="relative z-10 italic">{(u.display_name || u.name || '').charAt(0)}</span>
                                </div>
                                <div className="text-center sm:text-left space-y-2">
                                    <h4 className="text-2xl font-black text-foreground uppercase italic leading-none tracking-tighter group-hover:text-primary transition-colors">{u.display_name || u.name}</h4>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] italic">@{u.username}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 border border-border/10 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">{u.role}</span>
                                        </div>
                                        <div className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">
                                            UID: 0x{u.id.toString(16).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-6 sm:mt-0 relative z-10 flex-wrap justify-center sm:justify-end">
                                <button
                                    onClick={() => handleEditClick(u)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-primary hover:text-black hover:border-primary rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-200 shadow-sm"
                                >
                                    <window.Icon name="Pencil" size={14} />
                                    Edit
                                </button>
                                {user && u.id !== user.id && (
                                    <button
                                        onClick={() => { if (confirm(`Remove user "${u.display_name || u.username}"? This cannot be undone.`)) { deleteItem('users', u.id); logActivity(`User removed: ${u.username}`, 'Archive'); } }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-200 shadow-sm"
                                    >
                                        <window.Icon name="Trash2" size={14} />
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );


        return (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border">
                    <div className="relative pl-5 border-l-4 border-primary">
                        <h2 className="text-3xl font-black text-foreground tracking-tight uppercase leading-none">Admin Control Center</h2>
                        <p className="text-muted-foreground mt-2 text-[11px] font-bold uppercase tracking-widest">
                            Manage users, security and system settings
                        </p>
                    </div>
                    {activeSection !== 'overview' && (
                        <button
                            onClick={() => setActiveSection('overview')}
                            className="flex items-center gap-2 bg-white border border-gray-200 text-foreground px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-md hover:bg-primary hover:text-black hover:border-primary transition-all active:scale-95"
                        >
                            <window.Icon name="ArrowLeft" size={14} />
                            Back to Overview
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-200 rounded-xl w-full md:w-fit" style={{boxShadow:'0 4px 20px rgba(0,0,0,0.10)'}}>
                    {[
                        { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
                        { id: 'profile', label: 'My Profile', icon: 'User' },
                        { id: 'users', label: 'Manage Users', icon: 'Users' },
                        { id: 'security', label: 'Change Password', icon: 'ShieldCheck' },
                        { id: 'integration', label: 'Data Sync', icon: 'RefreshCw' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveSection(tab.id); logActivity(`Accessed ${tab.label}`, 'Navigation'); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${activeSection === tab.id
                                ? 'bg-black text-primary shadow-lg'
                                : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
                                }`}
                        >
                            <window.Icon name={tab.icon} size={13} strokeWidth={activeSection === tab.id ? 2.5 : 2} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-12 group/content">
                    {activeSection === 'overview' && renderOverview()}
                    {activeSection === 'profile' && renderProfile()}
                    {activeSection === 'users' && renderUsers()}
                    {activeSection === 'security' && renderSecurity()}
                    {activeSection === 'integration' && renderIntegration()}
                </div>

                <window.Modal isOpen={isAddingUser} onClose={() => { setIsAddingUser(false); setEditingUser(null); setNewUser({ name: '', username: '', password: '', role: 'user' }); }} title={editingUser ? "Edit User" : "Add New User"}>
                    <form onSubmit={handleProvisionUser} className="p-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="brand-label">Full Name</label>
                                <input className="brand-input" placeholder="e.g. Jane Doe" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label">Username</label>
                                <input className="brand-input" placeholder="e.g. janedoe" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/\s/g,'') })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label">Password {!editingUser && <span className="text-rose-400 normal-case">(min 5 chars)</span>}</label>
                                <input className="brand-input" type="password" placeholder={editingUser ? "Leave blank to keep current" : "Min. 5 characters"} minLength={editingUser ? 0 : 5} required={!editingUser} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label">Role</label>
                                <select className="brand-input cursor-pointer" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="user">Staff (User)</option>
                                    <option value="designer">Designer</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full brand-button-yellow h-12 text-sm font-black uppercase tracking-widest">
                            {editingUser ? "Save Changes" : "Add User"}
                        </button>
                    </form>
                </window.Modal>

            </div>
        );
    };


    // Attach to window for global scoping
    window.Dashboard = Dashboard;
    window.SalesModule = SalesModule;
    window.ExpenseModule = ExpenseModule;
    window.InventoryModule = InventoryModule;
    window.ClientModule = ClientModule;
    window.SupplierModule = SupplierModule;
    window.ProjectModule = ProjectModule;
    window.ReportModule = ReportModule;
    window.SettingsModule = SettingsModule;
}
