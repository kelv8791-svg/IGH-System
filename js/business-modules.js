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
                <button onClick={() => setIsOpen(!isOpen)} className="btn-primary">
                    <Icon name="download" size={16} /> Export Data
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-slide">
                        <button onClick={() => { downloadCSV(data, filename); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"><Icon name="file-text" size={14} /> CSV Spreadsheet</button>
                        <button onClick={() => { downloadCSV(data, filename); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"><Icon name="table" size={14} /> CSV (Excel Compatible)</button>
                        <button onClick={() => { window.print(); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"><Icon name="file-type-pdf" size={14} /> PDF Document</button>
                    </div>
                )}
            </div>
        );
    };

    const Dashboard = () => {
        const { data, updateData, setActiveTab, clearTable, isDarkMode } = useContext(AppContext);
        const [chartRange, setChartRange] = useState('1M');

        const stats = useMemo(() => {
            const totalSales = data.sales.reduce((sum, s) => {
                const val = parseFloat(s.amount?.toString().replace(/[^\d.]/g, '') || 0);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
            const totalExpenses = data.expenses.reduce((sum, e) => {
                const val = parseFloat(e.amount?.toString().replace(/[^\d.]/g, '') || 0);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
            const pendingSales = data.sales.filter(s => s.status === 'Pending').length;
            const activeProjects = data.projects.length;

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
                revenue: totalSales,
                expenses: totalExpenses,
                projects: activeProjects,
                pending: pendingSales,
                topExpenses: topExpensesWithPct
            };
        }, [data]);

        const lowStockItems = useMemo(() => {
            return data.inventory
                .filter(i => i.stock <= (i.minStock || 5))
                .sort((a, b) => a.stock - b.stock)
                .slice(0, 5);
        }, [data.inventory]);

        useEffect(() => {
            const ctx = document.getElementById('dashboardChart')?.getContext('2d');
            if (ctx) {
                const existingChart = Chart.getChart('dashboardChart');
                if (existingChart) existingChart.destroy();

                const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
                const accentColor = '#6366f1';

                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [
                            {
                                label: 'Revenue Stream',
                                data: [stats.revenue * 0.7, stats.revenue * 0.85, stats.revenue * 0.9, stats.revenue * 0.8, stats.revenue * 0.95, stats.revenue],
                                borderColor: accentColor,
                                backgroundColor: 'transparent',
                                borderWidth: 4,
                                tension: 0.4,
                                pointRadius: 0,
                                fill: true,
                            },
                            {
                                label: 'Expense Flow',
                                data: [stats.expenses * 0.6, stats.expenses * 0.75, stats.expenses * 0.8, stats.expenses * 0.7, stats.expenses * 0.85, stats.expenses],
                                borderColor: '#f43f5e',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                tension: 0.4,
                                pointRadius: 0,
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#0f172a',
                                titleFont: { size: 10, weight: 'bold' },
                                bodyFont: { size: 12, weight: 'black' },
                                padding: 12,
                                displayColors: false,
                                callbacks: {
                                    label: (context) => `KSh ${context.raw.toLocaleString()}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: gridColor, drawBorder: false },
                                ticks: {
                                    color: '#94a3b8',
                                    font: { size: 10, weight: 'bold' },
                                    callback: (val) => `${(val / 1000).toFixed(0)}k`
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' } }
                            }
                        }
                    }
                });
            }
        }, [stats, isDarkMode]);

        return (
            <div className="space-y-12 animate-slide">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b-4 border-black">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-display uppercase italic tracking-[0.1em] text-black">Command Dashboard</h2>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <div className="w-12 h-1 bg-brand-500"></div>
                            Operational Intelligence Vector // {new Date().toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                const exportData = [
                                    ...data.sales.map(s => ({ Type: 'Sale', Date: s.date, Client: s.client, Amount: s.amount, Status: s.status, Invoice: s.invoiceNo })),
                                    ...data.expenses.map(e => ({ Type: 'Expense', Date: e.date, Category: e.category, Amount: e.amount, Notes: e.notes || '' }))
                                ].sort((a, b) => new Date(b.Date) - new Date(a.Date));
                                downloadCSV(exportData, `IGH_Master_Log_${new Date().toISOString().split('T')[0]}.csv`);
                            }}
                            className="brand-button-yellow !px-6 !py-4 flex items-center gap-3 italic"
                        >
                            <Icon name="download" size={18} /> Data Handshake (Export)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard icon="zap" label="Aggregate Revenue" value={`KSh ${stats.revenue.toLocaleString()}`} color="brand" trend="+12.5%" trendType="up" />
                    <StatCard icon="pie-chart" label="Total Burn Rate" value={`KSh ${stats.expenses.toLocaleString()}`} color="red" trend="-2.4%" trendType="down" />
                    <StatCard icon="activity" label="Active Projects" value={stats.projects} color="green" />
                    <StatCard icon="shield-alert" label="Pending Settlement" value={stats.pending} color="orange" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="card lg:col-span-2 h-[500px] flex flex-col p-10 bg-white dark:bg-white/5 border-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Performance Analytics</h3>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">Revenue vs Expenditure Stream</p>
                            </div>
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                                {['7D', '1M', '3M', '1Y'].map(t => (
                                    <button key={t} onClick={() => setChartRange(t)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${t === chartRange ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:text-brand-500'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 relative z-10">
                            <canvas id="dashboardChart"></canvas>
                        </div>
                    </div>

                    <div className="card h-[500px] flex flex-col p-10 border-none bg-white dark:bg-white/5">
                        <div className="mb-10">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Resource Allocation</h3>
                            <p className="text-[9px] text-brand-500 font-black uppercase tracking-widest mt-1">Expense Segmentation</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2">
                            {stats.topExpenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                    <Icon name="database-zap" size={48} className="mb-4 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Null Sector // No Data</p>
                                </div>
                            ) : (
                                stats.topExpenses.map((ex, i) => (
                                    <div key={i} className="group space-y-3">
                                        <div className="flex justify-between text-[11px] items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50"></div>
                                                <span className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{ex.name}</span>
                                            </div>
                                            <span className="text-slate-400 dark:text-slate-500 font-black font-sans text-[10px]">KSh {ex.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-brand-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                style={{ width: `${ex.pct}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                            <button onClick={() => setActiveTab('expenses')} className="w-full text-center text-[10px] font-black text-brand-500 hover:text-brand-600 transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-2 group">
                                Access Ledger <Icon name="chevron-right" size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="card lg:col-span-2 p-10 flex flex-col border-none bg-white dark:bg-white/5">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Asset Thresholds</h5>
                                <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest mt-1">Restock Priority Matrix</p>
                            </div>
                            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                                <Icon name="package-search" size={20} />
                            </div>
                        </div>
                        <div className="space-y-8 flex-1">
                            {lowStockItems.length > 0 ? lowStockItems.map((item, i) => (
                                <div key={i} className="group cursor-pointer space-y-3">
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                                        <span className="text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors italic">{item.name}</span>
                                        <span className="text-rose-600 font-sans">{item.stock} / {item.minStock || 5} {item.unit}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out shadow-lg ${item.stock <= (item.minStock || 5) * 0.2 ? 'bg-rose-600 shadow-rose-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}
                                            style={{ width: `${(item.stock / (item.minStock || 5)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                    <Icon name="shield-check" size={48} className="text-emerald-500/20 mb-4" />
                                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em] leading-relaxed italic">Inventory Matrix Optimal<br />No Sector Depletion Detected</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card lg:col-span-3 p-10 flex flex-col bg-[#0f172a] text-white border-none relative overflow-hidden group shadow-2xl">
                        <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-[2000ms] pointer-events-none"><Icon name="activity" size={300} /></div>

                        <div className="flex justify-between items-center mb-10 z-10 relative">
                            <div>
                                <h5 className="text-sm font-black text-brand-500 uppercase tracking-tighter italic">Operational Telemetry</h5>
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Live Transaction Stream</p>
                            </div>
                            <button
                                onClick={() => { if (confirm('Purge telemetry logs?')) clearTable('activities'); }}
                                className="px-4 py-2 border border-white/5 rounded-xl text-[9px] font-black text-slate-500 hover:text-white hover:bg-white/5 transition-all uppercase tracking-[0.3em]"
                            >
                                Purge Logs
                            </button>
                        </div>

                        <div className="space-y-4 z-10 relative overflow-y-auto max-h-[320px] custom-scrollbar pr-4">
                            {data.activities && data.activities.length > 0 ? data.activities.map((log, i) => (
                                <div key={i} className="flex gap-5 p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] hover:border-white/10 transition-all group/item">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${log.type === 'Success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-brand-500/10 border-brand-500/20 text-brand-500 shadow-lg shadow-brand-500/10'}`}>
                                        <Icon name={log.type === 'Success' ? 'shield-check' : log.type === 'Update' ? 'refresh-cw' : 'cpu'} size={18} />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <p className="text-[11px] font-black leading-snug text-slate-200 uppercase tracking-tight">{log.msg}</p>
                                        <div className="flex items-center gap-4 opacity-40">
                                            <span className="text-[9px] uppercase font-black tracking-widest italic">{log.time}</span>
                                            <span className="w-1.5 h-1.5 bg-white/20 rounded-full"></span>
                                            <span className={`text-[8px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-lg ${log.type === 'Success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-500/20 text-brand-400'}`}>{log.type}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-48 opacity-20">
                                    <Icon name="terminal" size={40} className="mb-4" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">Standby // Listening for Data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ExpenseModule = () => {
        const { data, updateData, deleteItem } = useContext(AppContext);
        const [isAdding, setIsAdding] = useState(false);
        const [newExp, setNewExp] = useState({ date: new Date().toISOString().split('T')[0], amount: '', category: 'Raw Materials', notes: '' });

        const addExpense = (e) => {
            e.preventDefault();
            const expense = { ...newExp, id: Date.now() };
            updateData('expenses', expense);
            setIsAdding(false);
            setNewExp({ date: new Date().toISOString().split('T')[0], amount: '', category: 'Raw Materials', notes: '' });
        };

        return (
            <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-4xl mb-2 italic uppercase font-display tracking-tight">Financial Ledger</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Capital Outflow Control & Monitoring</p>
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="brand-button-yellow !px-8 !py-4 flex items-center gap-3"
                    >
                        <Icon name={isAdding ? 'x' : 'plus'} size={18} />
                        {isAdding ? 'Dismiss Entry Form' : 'Log New Expenditure'}
                    </button>
                </div>

                {isAdding && (
                    <div className="bg-black text-white p-12 shadow-2xl animate-slide relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl mb-8 flex items-center gap-4">
                                <div className="w-1.5 h-8 bg-brand-500"></div>
                                Log Capital Outflow
                            </h3>
                            <form onSubmit={addExpense} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                    <div>
                                        <label className="brand-label !text-slate-500">Temporal Stamp</label>
                                        <input
                                            type="date"
                                            className="brand-input !bg-dark-surface !border-dark-border !text-white !py-4"
                                            required
                                            value={newExp.date}
                                            onChange={e => setNewExp({ ...newExp, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="brand-label !text-slate-500">Magnitude (KES)</label>
                                        <input
                                            type="number"
                                            className="brand-input !bg-dark-surface !border-dark-border !text-white !py-4"
                                            placeholder="0.00"
                                            required
                                            value={newExp.amount}
                                            onChange={e => setNewExp({ ...newExp, amount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="brand-label !text-slate-500">Classification</label>
                                        <select
                                            className="brand-input !bg-dark-surface !border-dark-border !text-white !py-4"
                                            value={newExp.category}
                                            onChange={e => setNewExp({ ...newExp, category: e.target.value })}
                                        >
                                            <option>Raw Materials</option>
                                            <option>Human Resource</option>
                                            <option>Office Supplies</option>
                                            <option>Marketing</option>
                                            <option>Software</option>
                                            <option>Logistics</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="brand-label !text-slate-500">Operational Description</label>
                                    <input
                                        type="text"
                                        className="brand-input !bg-dark-surface !border-dark-border !text-white !py-4"
                                        placeholder="Specify the purpose of this expenditure..."
                                        value={newExp.notes}
                                        onChange={e => setNewExp({ ...newExp, notes: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end pt-6 border-t border-dark-border">
                                    <button type="submit" className="brand-button-yellow !px-12 !py-5 uppercase text-[10px] font-black italic">
                                        Authorize & Commit to Ledger
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 opacity-5 translate-x-32 -translate-y-32 rotate-45"></div>
                    </div>
                )}

                <div className="brand-card !p-0 overflow-hidden border-2 bg-white">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f0f0] border-b-2 border-black">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-display uppercase tracking-widest text-black">Timeline</th>
                                <th className="px-8 py-6 text-[10px] font-display uppercase tracking-widest text-black">Category</th>
                                <th className="px-8 py-6 text-[10px] font-display uppercase tracking-widest text-black">Description</th>
                                <th className="px-8 py-6 text-[10px] font-display uppercase tracking-widest text-black text-right">Amount (KES)</th>
                                <th className="px-8 py-6 text-[10px] font-display uppercase tracking-widest text-black text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-50">
                            {data.expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-brand-500/5 transition-colors group">
                                    <td className="px-8 py-6 text-[10px] font-bold text-slate-400">{exp.date}</td>
                                    <td className="px-8 py-6">
                                        <span className="px-4 py-1 bg-black text-white text-[9px] font-black uppercase tracking-tighter">
                                            {exp.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-800">{exp.notes}</td>
                                    <td className="px-8 py-6 text-right font-display text-lg">KES {parseFloat(exp.amount).toLocaleString()}</td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => { if (confirm('Purge this record?')) deleteItem('expenses', exp.id); }}
                                            className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-100 hover:border-black text-slate-400 hover:text-black transition-all"
                                        >
                                            <Icon name="trash-2" size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
            taxRate: data.config?.taxRate || 16
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
                status: isQuote ? 'Draft' : 'Pending'
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
                setIsAdding(false);
                setNewSale({
                    client: '',
                    projectId: '',
                    date: new Date().toISOString().split('T')[0],
                    items: [{ desc: '', qty: 1, price: 0 }],
                    status: 'Pending',
                    taxRate: data.config?.taxRate || 16
                });
                if (isQuote) {
                    logActivity(`Quote generated for ${newSale.client}`, 'Sync');
                } else {
                    logActivity(`Invoice ${sale.invoiceNo} issued to ${sale.client}`, 'Sync');
                }
            }
        };

        const handleSettle = async (e) => {
            e.preventDefault();
            const currentPayment = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            const totalPaidSoFar = (settlingInvoice.amountPaid || 0) + currentPayment;
            const isFullyPaid = totalPaidSoFar >= parseFloat(settlingInvoice.amount);

            const updatedSales = data.sales.map(s =>
                s.id === settlingInvoice.id ? {
                    ...s,
                    status: isFullyPaid ? 'Paid' : 'Partial',
                    paymentHistory: [...(s.paymentHistory || []), ...payments],
                    amountPaid: (s.amountPaid || 0) + currentPayment
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
                logActivity(`Invoice ${settlingInvoice.invoiceNo} settled via ${payments.map(p => p.mode).join('+')}`, 'Sync');
                setSettlingInvoice(null);
                setPayments([{ mode: 'Mpesa', amount: 0, ref: '' }]);
            }
        };

        const statusCounts = useMemo(() => {
            const pending = data.sales.filter(s => s.status === 'Pending').length;
            const overdue = data.sales.filter(s => s.status === 'Overdue').length;
            const totalValue = data.sales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
            return { total: data.sales.length, pending, overdue, value: totalValue };
        }, [data.sales]);

        return (
            <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-4xl mb-2 italic uppercase font-display tracking-tight">Revenue Hub</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Invoicing, Quotes & Settlement Architecture</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Transactions..."
                                className="brand-input !bg-white border-2 !py-4 !pl-12 w-64"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icon name="search" size={16} />
                            </div>
                        </div>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="brand-button-yellow !px-8 !py-4 flex items-center gap-3"
                        >
                            <Icon name={isAdding ? 'x' : 'plus'} size={18} />
                            {isAdding ? 'Dismiss Panel' : 'Issue New Invoice'}
                        </button>
                    </div>
                </div>

                {unbilledProjects.length > 0 && (
                    <div className="bg-brand-500 p-8 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-black text-brand-500 rounded-full flex items-center justify-center">
                                <Icon name="alert-circle" size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest">Unbilled Deliverables Detected</h4>
                                <p className="text-[10px] font-bold uppercase mt-1 opacity-70">{unbilledProjects.length} Projects awaiting invoice issuance</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {unbilledProjects.slice(0, 3).map(up => (
                                <button
                                    key={up.id}
                                    onClick={() => seedInvoice({ client: up.client, projectId: up.id, itemName: up.name })}
                                    className="bg-black text-white px-4 py-2 text-[9px] font-black uppercase tracking-tighter hover:bg-slate-800 transition-colors"
                                >
                                    Bill {up.client.substring(0, 10)}...
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="brand-card bg-white border-2 border-black p-8 group hover:bg-black hover:text-white transition-all">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-brand-500 mb-4">Total Records</p>
                        <h3 className="text-4xl font-display">{statusCounts.total}</h3>
                    </div>
                    <div className="brand-card bg-white border-2 border-black p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Awaiting Settlement</p>
                        <h3 className="text-4xl font-display text-rose-600">{statusCounts.pending}</h3>
                    </div>
                    <div className="brand-card bg-black text-white p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-4">Pipeline Valuation</p>
                        <h3 className="text-4xl font-display">KES {statusCounts.value.toLocaleString()}</h3>
                    </div>
                    <div className="brand-card bg-brand-500 p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-4">Overdue Threshold</p>
                        <h3 className="text-4xl font-display text-black">{statusCounts.overdue}</h3>
                    </div>
                </div>

                {isAdding && (
                    <div className="bg-black text-white p-12 shadow-2xl animate-slide relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl mb-8 flex items-center gap-4 italic uppercase font-display">
                                <div className="w-1.5 h-8 bg-brand-500"></div>
                                Issue Document
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                    <div>
                                        <label className="brand-label !text-slate-500">Recipient Client</label>
                                        <select
                                            className="brand-input !bg-dark-surface !border-dark-border !text-white"
                                            required
                                            value={newSale.client}
                                            onChange={e => setNewSale({ ...newSale, client: e.target.value })}
                                        >
                                            <option value="">Select Client Entity</option>
                                            {data.clients.map(c => <option key={c.id} value={c.name} className="bg-dark-surface">{c.name} ({c.company})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="brand-label !text-slate-500">Linked Project</label>
                                        <select
                                            className="brand-input !bg-dark-surface !border-dark-border !text-white"
                                            value={newSale.projectId}
                                            onChange={e => setNewSale({ ...newSale, projectId: e.target.value })}
                                        >
                                            <option value="">N/A (General Transaction)</option>
                                            {data.projects.filter(p => p.client === newSale.client).map(p => <option key={p.id} value={p.id} className="bg-dark-surface">{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="brand-label !text-slate-500">Document Date</label>
                                        <input
                                            type="date"
                                            className="brand-input !bg-dark-surface !border-dark-border !text-white"
                                            required
                                            value={newSale.date}
                                            onChange={e => setNewSale({ ...newSale, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="brand-label !text-slate-500">Draft Sequence</label>
                                        <div className="brand-input !bg-dark-surface !border-brand-500/30 !text-brand-500 font-display flex items-center">
                                            {getNextInvoiceNumber()}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-dark-border pb-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Billable Assets & Services</h4>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="text-[9px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity"
                                        >
                                            <Icon name="plus-circle" size={14} /> Append Row
                                        </button>
                                    </div>
                                    {newSale.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-end animate-slide">
                                            <div className="flex-1">
                                                <input
                                                    className="brand-input !bg-dark-surface !border-dark-border !text-white"
                                                    placeholder="Asset/Service Specification..."
                                                    value={item.desc}
                                                    onChange={e => updateItem(idx, 'desc', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="w-24">
                                                <input
                                                    type="number"
                                                    className="brand-input !bg-dark-surface !border-dark-border !text-white text-center"
                                                    value={item.qty}
                                                    onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value))}
                                                    required
                                                />
                                            </div>
                                            <div className="w-40">
                                                <input
                                                    type="number"
                                                    className="brand-input !bg-dark-surface !border-dark-border !text-white text-right"
                                                    value={item.price}
                                                    onChange={e => updateItem(idx, 'price', parseFloat(e.target.value))}
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors"
                                            >
                                                <Icon name="trash-2" size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-end gap-12 pt-8 border-t border-dark-border">
                                    <div className="flex-1 text-slate-500 max-w-sm">
                                        <p className="text-[10px] leading-relaxed uppercase tracking-widest italic">
                                            Authorization generates a permanent record in the financial ledger and notifies the client repository.
                                        </p>
                                    </div>
                                    <div className="w-80 space-y-4">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                                            <span>Subtotal</span>
                                            <span className="font-display">KES {totals.subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500 italic opacity-50">
                                            <span>VAT ({newSale.taxRate}%)</span>
                                            <span className="font-display">KES {totals.tax.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-2xl font-display text-white border-t border-dark-border pt-4">
                                            <span className="italic">Aggregate</span>
                                            <span className="text-brand-500">KES {totals.total.toLocaleString()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-4">
                                            <button
                                                type="submit"
                                                className="brand-button-yellow !py-5 uppercase text-[10px] font-black italic shadow-2xl"
                                            >
                                                Authorize
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSubmit(null, true)}
                                                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-black uppercase text-[10px] tracking-widest italic"
                                            >
                                                Save Quote
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500 opacity-5 translate-x-48 -translate-y-48 rotate-45 pointer-events-none"></div>
                    </div>
                )}

                <div className="bg-white border-2 border-black overflow-hidden shadow-premium transition-all">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-display">
                            <thead className="bg-black text-white">
                                <tr>
                                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">ID / Sequence</th>
                                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Recipient Client</th>
                                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Date</th>
                                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Magnitude</th>
                                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Vector</th>
                                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black/5">
                                {data.sales
                                    .filter(s =>
                                        s.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.status.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map(sale => (
                                        <tr key={sale.id} className="hover:bg-brand-500/5 transition-all group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-black group-hover:bg-brand-500 transition-colors"></div>
                                                    <span className="font-black text-black uppercase italic text-lg tracking-tighter">{sale.invoiceNo}</span>
                                                    {sale.isQuote && <span className="px-2 py-0.5 bg-black text-brand-500 text-[8px] font-black uppercase tracking-widest">Quote</span>}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-black group-hover:text-brand-500 transition-all">
                                                        {sale.client.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-black uppercase text-xs tracking-tight">{sale.client}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{sale.date}</td>
                                            <td className="px-10 py-8 text-right font-display text-lg font-black text-black">KES {parseFloat(sale.amount).toLocaleString()}</td>
                                            <td className="px-10 py-8">
                                                <span className={`px-4 py-2 text-[8px] font-black uppercase tracking-[0.2em] border-2 ${sale.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500' :
                                                    sale.status === 'Partial' ? 'bg-amber-500/10 text-amber-600 border-amber-500' :
                                                        'bg-rose-500/10 text-rose-600 border-rose-500'
                                                    }`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        onClick={() => { setSelectedInvoice(sale); }}
                                                        className="w-12 h-12 flex items-center justify-center border-2 border-black hover:bg-black hover:text-brand-500 transition-all text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-[-2px] active:translate-y-0"
                                                        title="View Specification"
                                                    >
                                                        <Icon name="eye" size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSettlingInvoice(sale)}
                                                        className="w-12 h-12 flex items-center justify-center border-2 border-black bg-brand-500 hover:bg-black hover:text-brand-500 transition-all text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-[-2px] active:translate-y-0 font-black"
                                                        title="Settle Account"
                                                    >
                                                        <Icon name="wallet" size={18} />
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button
                                                            onClick={() => { if (confirm('Purge ledger entry?')) deleteItem('sales', sale.id); }}
                                                            className="w-12 h-12 flex items-center justify-center border-2 border-slate-200 hover:border-rose-500 hover:text-rose-500 transition-all text-slate-300"
                                                            title="Purge Record"
                                                        >
                                                            <Icon name="trash-2" size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="Invoice Specification">
                    <InvoicePreview invoice={selectedInvoice} />
                </Modal>

                <Modal isOpen={!!settlingInvoice} onClose={() => setSettlingInvoice(null)} title={`Flexible Settlement: ${settlingInvoice?.invoiceNo}`}>
                    <form onSubmit={handleSettle} className="space-y-8 p-2">
                        <div className="p-8 bg-black text-white border-2 border-black flex flex-col md:flex-row justify-between items-center gap-6 shadow-[8px_8px_0px_0px_rgba(255,193,7,1)]">
                            <div className="text-center md:text-left">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 italic">Net Remaining Due</p>
                                <h4 className="text-4xl font-display text-brand-500 tracking-tighter">KES {(parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0)).toLocaleString()}</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-3 tracking-widest border-t border-white/10 pt-3">Total Invoice: KES {parseFloat(settlingInvoice?.amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 italic">Due From Entity</p>
                                <h4 className="text-xl font-black text-white px-6 py-2 bg-white/10 italic leading-none inline-block">{settlingInvoice?.client}</h4>
                            </div>
                        </div>

                        <div className="space-y-6 max-h-[45vh] overflow-y-auto px-1 custom-scrollbar">
                            {payments.map((p, idx) => (
                                <div key={idx} className="p-6 bg-white border-2 border-black relative animate-slide space-y-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                    <div className="flex justify-between items-center border-b border-black/5 pb-4">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Payment Entry Vector #{idx + 1}</h5>
                                        {payments.length > 1 && (
                                            <button type="button" onClick={() => removePaymentEntry(idx)} className="w-8 h-8 flex items-center justify-center bg-rose-500 text-white hover:bg-black transition-colors">
                                                <Icon name="x" size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="brand-label">Mode of Transfer</label>
                                            <select className="brand-input" value={p.mode} onChange={e => updatePaymentEntry(idx, 'mode', e.target.value)}>
                                                <option>Mpesa</option><option>Cash</option><option>Cheque</option><option>Bank Transfer</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="brand-label">Amount (KES)</label>
                                            <input type="number" className="brand-input !font-display !text-lg" required value={p.amount} onChange={e => updatePaymentEntry(idx, 'amount', e.target.value)} />
                                        </div>
                                    </div>
                                    {(p.mode === 'Mpesa' || p.mode === 'Cheque') && (
                                        <div className="space-y-2 animate-slide">
                                            <label className="brand-label">{p.mode} Authorization Reference</label>
                                            <input className="brand-input uppercase font-black placeholder:opacity-30" placeholder="Alpha-Numeric Reference..." required value={p.ref} onChange={e => updatePaymentEntry(idx, 'ref', e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addPaymentEntry}
                            className="w-full py-4 border-2 border-dashed border-slate-300 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:border-black hover:text-black hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                        >
                            <Icon name="plus" size={12} /> Split Settlement
                        </button>

                        <div className="pt-8 border-t-2 border-black">
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                    <span>Subtotal of Entries</span>
                                    <span className="text-black font-display text-base">KES {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-[0.3em]">
                                    <span className="text-slate-500 italic">Residual Balance</span>
                                    <span className={`text-2xl font-display ${payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) >= (parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0)) ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        KES {Math.max(0, parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0) - payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)).toLocaleString()}
                                    </span>
                                </div>
                                {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) >= (parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0)) && (
                                    <div className="bg-emerald-500 text-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 justify-center animate-pulse border-2 border-black">
                                        <Icon name="check-circle" size={14} /> Full Settlement Achieved
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="brand-button-yellow w-full !py-6 text-sm uppercase font-black tracking-[0.2em] italic shadow-2xl">
                                Authorize & Finalize Transaction
                            </button>
                        </div>
                    </form>
                </Modal>
            </div >
        );
    };

    const InvoicePreview = ({ invoice }) => {
        const { data } = useContext(AppContext);
        if (!invoice) return null;

        return (
            <div className="space-y-16 py-12 px-8 sm:px-16 bg-white text-black relative border-2 border-black" id="invoice-content">
                {/* Brand Sidebar Accent */}
                <div className="absolute top-0 right-0 w-2 h-full bg-brand-500"></div>

                <div className="flex flex-col md:flex-row justify-between items-start gap-12 border-b-4 border-black pb-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-black flex items-center justify-center">
                                <span className="text-2xl font-black text-brand-500 italic">IG</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Identity Graphics</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2 italic">Creative Excellence Lab</p>
                            </div>
                        </div>
                        <div className="text-[11px] space-y-1 font-bold uppercase tracking-wider text-slate-500">
                            <p className="text-black font-black">Identity Graphics Houzz</p>
                            <p>Pekars Building, 4th Floor</p>
                            <p>Mburu Gichua Rd, Nakuru-KENYA</p>
                            <p className="flex items-center gap-2 pt-2"><Icon name="phone" size={10} className="text-brand-500" /> +254 714 561 533</p>
                            <p className="text-black underline">identitygraphics@gmail.com</p>
                        </div>
                    </div>
                    <div className="md:text-right space-y-4">
                        <div className="inline-block bg-black text-brand-500 px-8 py-3 text-sm font-black uppercase tracking-[0.4em] italic mb-6">
                            {invoice.isQuote ? 'Quotation' : 'Invoice'}
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Temporal Sequence</p>
                            <p className="text-lg font-black italic">{invoice.date}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Document Identifier</p>
                            <p className="text-lg font-black italic text-brand-600">{invoice.invoiceNo}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] border-b-2 border-black pb-4">Billed Recipient</h4>
                        <div className="space-y-2">
                            <p className="text-2xl font-black text-black uppercase italic tracking-tighter">{invoice.client}</p>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">{data.clients.find(c => c.name === invoice.client)?.company}</p>
                            <p className="text-xs font-medium text-slate-400 underline">{data.clients.find(c => c.name === invoice.client)?.email}</p>
                            <div className={`mt-6 inline-flex items-center gap-3 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] border-2 ${invoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500' : 'bg-rose-500/10 text-rose-600 border-rose-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${invoice.status === 'Paid' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                                Status: {invoice.status}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] border-b-2 border-black pb-4">Settlement Credentials</h4>
                        <div className="p-6 bg-slate-50 border-2 border-black italic">
                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase tracking-widest">
                                Standard business terms apply: 7 operational days. Use reference <span className="text-black font-black">{invoice.invoiceNo}</span> for automated recognition.
                            </p>
                            <div className="pt-6 grid grid-cols-3 gap-3">
                                <div className="text-center py-2 border border-black/10 text-[8px] font-black uppercase tracking-widest bg-white">M-Pesa</div>
                                <div className="text-center py-2 border border-black/10 text-[8px] font-black uppercase tracking-widest bg-white">Bank</div>
                                <div className="text-center py-2 border border-black/10 text-[8px] font-black uppercase tracking-widest bg-white">Cash</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-4 border-black overflow-hidden shadow-premium">
                    <table className="w-full text-left font-display">
                        <thead className="bg-black text-white">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em]">Asset Specification</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-center">Qty</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-right">Rate</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-right text-brand-500">Magnitude</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black/5">
                            {(invoice.items || []).map((item, i) => (
                                <tr key={i} className="text-sm transition-colors hover:bg-slate-50">
                                    <td className="px-8 py-6 font-black text-black uppercase italic tracking-tight">{item.desc}</td>
                                    <td className="px-8 py-6 text-center font-bold text-slate-400">{item.qty}</td>
                                    <td className="px-8 py-6 text-right font-medium text-slate-400">KES {parseFloat(item.price).toLocaleString()}</td>
                                    <td className="px-8 py-6 text-right font-black text-black">KES {(item.qty * item.price).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-end gap-12 pt-12">
                    <div className="flex-1 italic max-w-sm">
                        <div className="flex items-center gap-4 text-slate-300 mb-6">
                            <div className="h-px flex-1 bg-current"></div>
                            <Icon name="award" size={16} />
                            <div className="h-px flex-1 bg-current"></div>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-relaxed text-center">
                            Thank you for partnering with Identity Graphics. Your vision drives our pursuit of creative excellence.
                        </p>
                    </div>

                    <div className="w-full md:w-96 space-y-6">
                        <div className="space-y-4 bg-black p-8 text-white shadow-[8px_8px_0px_0px_rgba(255,193,7,1)]">
                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                <span>Aggregate Net</span>
                                <span className="font-display text-white">KES {(invoice.subtotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic opacity-50">
                                <span>Tax Load ({invoice.taxRate}%)</span>
                                <span className="font-display text-white">KES {(invoice.tax || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-4xl font-display text-brand-500 pt-6 border-t border-white/10 italic">
                                <span>TOTAL</span>
                                <span>KES {parseFloat(invoice.amount).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-6 no-print">
                            <button onClick={() => window.print()} className="brand-button-yellow w-full !py-6 text-xs uppercase font-black tracking-[0.3em] italic shadow-2xl flex items-center justify-center gap-4 transform active:scale-95 transition-all">
                                <Icon name="printer" size={18} /> Commit to Paper
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-24 text-center opacity-20">
                    <p className="text-[8px] font-black text-black uppercase tracking-[1em] mb-2">Identity Graphics Houzz Enclave</p>
                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Digital Auth Vector: {btoa(invoice.invoiceNo || '').substring(0, 24)}</p>
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
            const lowStock = data.inventory.filter(i => i.stock <= i.minStock).length;
            const totalValue = data.inventory.reduce((sum, i) => sum + (i.stock * i.price), 0);
            return { totalItems, lowStock, totalValue };
        }, [data.inventory]);

        return (
            <div className="space-y-12 animate-slide">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-display uppercase italic tracking-[0.1em] text-black">Asset Registry</h2>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <div className="w-12 h-1 bg-brand-500"></div>
                            {stats.totalItems} Active SKU Prototypes
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (isAddingItem) {
                                setEditingItem(null);
                                setNewItem({ sku: '', name: '', category: 'Raw Materials', stock: 0, unit: 'pcs', minStock: 5, price: 0 });
                            }
                            setIsAddingItem(!isAddingItem);
                        }}
                        className="brand-button-yellow !py-5 !px-10 flex items-center gap-4 italic"
                    >
                        <Icon name={isAddingItem ? 'x' : 'plus'} size={18} />
                        {isAddingItem ? 'Dismiss Specification' : 'Register New SKU'}
                    </button>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-black text-white p-10 border-2 border-black group hover:bg-white hover:text-black transition-all">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500 mb-6">Aggregate Valuation</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-4xl font-display tracking-tighter">KES {stats.totalValue.toLocaleString()}</h3>
                            <div className="w-12 h-12 bg-white/10 group-hover:bg-black/5 flex items-center justify-center transition-colors">
                                <Icon name="pie-chart" size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border-2 border-black p-10 group hover:bg-black hover:text-white transition-all">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-brand-500 mb-6">SKU Population</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-4xl font-display tracking-tighter">{stats.totalItems} Units</h3>
                            <div className="w-12 h-12 bg-slate-50 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                                <Icon name="box" size={20} />
                            </div>
                        </div>
                    </div>
                    <div className={`p-10 border-2 border-black transition-all ${stats.lowStock > 0 ? 'bg-rose-600 text-white shadow-xl animate-pulse' : 'bg-brand-500 text-black'}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 mb-6">Threshold Alerts</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-4xl font-display tracking-tighter">{stats.lowStock} Critical</h3>
                            <div className="w-12 h-12 bg-black/10 flex items-center justify-center">
                                <Icon name="alert-triangle" size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Asset Registration Form */}
                {isAddingItem && (
                    <div className="p-10 bg-black text-white border-2 border-black animate-slide relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(255,193,7,1)]">
                        {/* Background Visual Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rotate-45 translate-x-16 -translate-y-16"></div>

                        <form onSubmit={handleAddItem} className="space-y-10 relative">
                            <div className="flex items-center gap-6 border-b border-white/20 pb-6 mb-8">
                                <Icon name="box" size={24} className="text-brand-500" />
                                <h4 className="text-xl font-display uppercase italic tracking-[0.1em]">
                                    {editingItem ? `Vector Refinement: ${editingItem.sku}` : 'Asset Registration Protocol'}
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="space-y-2">
                                    <label className="brand-label !text-slate-500">SKU Identifier</label>
                                    <input className="brand-input !bg-dark-surface !border-dark-border !text-white" placeholder="VIN-EX-001" required value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="brand-label !text-slate-500">Asset Nomenclature</label>
                                    <input className="brand-input !bg-dark-surface !border-dark-border !text-white" placeholder="High-Gloss Polymetric Film" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="brand-label !text-slate-500">Categorization</label>
                                    <select className="brand-input !bg-dark-surface !border-dark-border !text-white" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                        <option>Raw Materials</option><option>Media</option><option>Ink/Chemicals</option><option>Finished Goods</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                <div className="space-y-2">
                                    <label className="brand-label !text-slate-500">Reserve Level</label>
                                    <input type="number" className="brand-input !bg-dark-surface !border-dark-border !text-white !font-display" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="brand-label !text-slate-500">Metric Unit</label>
                                    <input className="brand-input !bg-dark-surface !border-dark-border !text-white" placeholder="m, yd, pcs" required value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="brand-label !text-slate-500">Critical Threshold</label>
                                    <input type="number" className="brand-input !bg-dark-surface !border-dark-border !text-white !font-display" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="brand-label !text-slate-500">Valuation KES</label>
                                    <input type="number" className="brand-input !bg-dark-surface !border-dark-border !text-white !font-display" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-8 border-t border-white/20">
                                <div className={`flex items-center gap-3 text-[10px] font-black text-brand-500 uppercase tracking-widest transition-opacity ${isSuccess ? 'opacity-100' : 'opacity-0'}`}>
                                    <Icon name="check-circle" size={16} /> Registry Synchronized
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setIsAddingItem(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Abort</button>
                                    <button type="submit" className="brand-button-yellow !py-4 !px-12 flex items-center gap-3">
                                        <Icon name="server" size={16} />
                                        Commit Protocol
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* SKU Ledger Table */}
                <div className="border-4 border-black overflow-hidden shadow-premium bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-display">
                            <thead className="bg-black text-white">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">Vector ID / SKU</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em]">Classification</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-center">Magnitude</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-right">Registry Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black/5">
                                {data.inventory.map(item => (
                                    <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                                        <td className="px-10 py-8 relative">
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-black group-hover:bg-brand-500 transition-colors"></div>
                                            <div className="font-black text-lg uppercase italic tracking-tighter leading-none mb-1">{item.sku}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.name}</div>
                                        </td>
                                        <td className="px-10 py-8 text-center md:text-left">
                                            <span className="px-4 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest italic">{item.category}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col items-center">
                                                <div className={`text-3xl font-display tracking-tighter ${item.stock <= item.minStock ? 'text-rose-600 animate-pulse' : 'text-black'}`}>
                                                    {item.stock} <small className="text-[10px] uppercase text-slate-400 tracking-widest italic">{item.unit}</small>
                                                </div>
                                                <div className="w-32 bg-slate-100 h-2 mt-3 p-0.5 border border-black/5">
                                                    <div className={`h-full transition-all duration-1000 ${item.stock <= item.minStock ? 'bg-rose-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, (item.stock / (item.minStock * 4)) * 100)}%` }}></div>
                                                </div>
                                                {item.stock <= item.minStock && (
                                                    <div className="mt-2 text-[8px] font-black text-rose-600 uppercase tracking-widest">Depleted // Attention Required</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => setIsAdjustingStock(item.id)} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-black hover:bg-brand-500 transition-all group/btn shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none" title="Adjust Magnitude">
                                                    <Icon name="refresh-cw" size={16} />
                                                </button>
                                                <button onClick={() => { setEditingItem(item); setNewItem({ ...item }); setIsAddingItem(true); }} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none" title="Refine Specification">
                                                    <Icon name="edit-3" size={16} />
                                                </button>
                                                <button onClick={() => { if (confirm(`Purge ${item.sku} from registry?`)) { deleteItem('inventory', item.id); logActivity(`Inventory purged: ${item.sku}`, 'Archive'); } }} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-black hover:bg-rose-500 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none" title="Purge Record">
                                                    <Icon name="trash-2" size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Operational Adjustment Protocol */}
                <Modal isOpen={!!isAdjustingStock} onClose={() => setIsAdjustingStock(null)} title="Operational Stock Adjustment">
                    {isAdjustingStock && (() => {
                        const item = data.inventory.find(i => i.id === isAdjustingStock);
                        return (
                            <form onSubmit={handleAdjustStock} className="space-y-8 p-4">
                                <div className="flex items-center gap-6 p-10 bg-black text-white border-2 border-black relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(255,193,7,1)]">
                                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-brand-500/10 rotate-45"></div>
                                    <div className="w-24 h-24 bg-brand-500 text-black flex items-center justify-center text-4xl font-black italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10">
                                        {item?.sku.charAt(0)}
                                    </div>
                                    <div className="z-10">
                                        <h4 className="text-3xl font-display uppercase italic tracking-tighter">{item?.name}</h4>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">
                                            Active Reserve: <span className="text-brand-500">{item?.stock} {item?.unit}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="brand-label !text-slate-400">Flow Direction</label>
                                        <div className="flex gap-4 p-2 bg-slate-50 border-2 border-black">
                                            <button type="button" onClick={() => setAdjustment({ ...adjustment, type: 'In' })} className={`flex-1 py-4 font-black text-[10px] uppercase tracking-widest transition-all ${adjustment.type === 'In' ? 'bg-black text-white italic' : 'text-slate-400 hover:bg-slate-100'}`}>Increment (+)</button>
                                            <button type="button" onClick={() => setAdjustment({ ...adjustment, type: 'Out' })} className={`flex-1 py-4 font-black text-[10px] uppercase tracking-widest transition-all ${adjustment.type === 'Out' ? 'bg-rose-600 text-white italic' : 'text-slate-400 hover:bg-slate-100'}`}>Decrement (-)</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="brand-label !text-slate-400">Magnitude ({item?.unit})</label>
                                        <input type="number" className="brand-input !bg-white !border-black !text-black !py-6 text-center text-4xl font-display italic tracking-tighter" required value={adjustment.qty} onChange={e => setAdjustment({ ...adjustment, qty: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="brand-label !text-slate-400">Context Reference</label>
                                        <input className="brand-input !bg-white !border-black !text-black uppercase italic" placeholder="e.g. PRJ-SPEC-001" value={adjustment.reference} onChange={e => setAdjustment({ ...adjustment, reference: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="brand-label !text-slate-400">Operational Log</label>
                                        <textarea className="brand-input !bg-white !border-black !text-black h-24 resize-none" placeholder="Reason for inventory deviation..." value={adjustment.notes} onChange={e => setAdjustment({ ...adjustment, notes: e.target.value })}></textarea>
                                    </div>
                                </div>

                                <button type="submit" className={`w-full py-6 font-black uppercase tracking-[0.3em] text-[11px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all italic hover:translate-y-[-4px] active:translate-y-[4px] active:shadow-none ${adjustment.type === 'In' ? 'bg-brand-500 text-black border-2 border-black' : 'bg-rose-600 text-white border-2 border-black'}`}>
                                    Execute Flow Modification
                                </button>
                            </form>
                        );
                    })()}
                </Modal>

                {/* Telemetry: Stock Dynamics */}
                <div className="border-4 border-black bg-white shadow-premium overflow-hidden">
                    <div className="p-8 border-b-2 border-black flex justify-between items-center bg-black">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 bg-brand-500 animate-pulse"></div>
                            <h5 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic leading-none">Telemetry: Stock Dynamics</h5>
                        </div>
                        <Icon name="activity" size={18} className="text-brand-500" />
                    </div>
                    <div className="max-h-96 overflow-y-auto p-10 space-y-6">
                        {(data.stockMovements || []).length > 0 ? [...data.stockMovements].reverse().map(m => (
                            <div key={m.id} className="flex justify-between items-center p-8 bg-slate-50 border-2 border-transparent hover:border-black transition-all group relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center gap-8">
                                    <div className={`w-16 h-16 border-2 border-black flex items-center justify-center font-black text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${m.type === 'In' ? 'bg-brand-500 text-black' : 'bg-rose-600 text-white'}`}>
                                        {m.type === 'In' ? <Icon name="arrow-up-right" size={24} /> : <Icon name="arrow-down-right" size={24} />}
                                    </div>
                                    <div>
                                        <p className="text-xl font-display font-black uppercase italic italic leading-none mb-2">{m.itemName}</p>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.sku}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{m.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-display tracking-tighter text-black">{m.type === 'In' ? '+' : '-'}{m.qty}</p>
                                    <p className="text-[9px] font-black text-brand-600 uppercase italic tracking-widest mt-2">{m.reference || 'SYSTEM_ADJ'}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300 border-2 border-dashed border-slate-200">
                                <Icon name="box" size={48} className="opacity-20 mb-6" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Silence: No fluctuations detected</p>
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
            <div className="space-y-12 animate-slide">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-display uppercase italic tracking-[0.1em] text-black">Stakeholder Matrix</h2>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <div className="w-12 h-1 bg-brand-500"></div>
                            {data.clients.length} Registered Entities
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAddingClient(true)}
                        className="brand-button-yellow !py-5 !px-10 flex items-center gap-4 italic"
                    >
                        <Icon name="plus-circle" size={18} />
                        Register Stakeholder
                    </button>
                </div>

                {/* Relationship Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-black text-white p-10 border-2 border-black group hover:bg-white hover:text-black transition-all">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500 mb-6">Aggregate Revenue</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-4xl font-display tracking-tighter">KES {(data.sales.reduce((sum, s) => sum + parseFloat(s.amount), 0) / 1000).toFixed(1)}K</h3>
                            <div className="w-12 h-12 bg-white/10 group-hover:bg-black/5 flex items-center justify-center transition-colors">
                                <Icon name="trending-up" size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border-2 border-black p-10 group hover:bg-black hover:text-white transition-all">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-brand-500 mb-6">Active Operations</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-4xl font-display tracking-tighter">{data.projects.filter(p => p.status === 'Active').length} Units</h3>
                            <div className="w-12 h-12 bg-slate-50 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                                <Icon name="zap" size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-brand-500 text-black border-2 border-black p-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 mb-6">Engagement Velocity</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-4xl font-display tracking-tighter">{data.interactions.length} Logs</h3>
                            <div className="w-12 h-12 bg-black/10 flex items-center justify-center">
                                <Icon name="message-square" size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Client Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.clients.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedClient(c)}
                            className="bg-white border-4 border-black p-10 hover:shadow-premium transition-all group cursor-pointer relative overflow-hidden flex flex-col items-center text-center space-y-8"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rotate-45 translate-x-16 -translate-y-16 group-hover:bg-brand-500/10 transition-colors"></div>

                            <div className="w-28 h-28 bg-black text-brand-500 border-4 border-brand-500 flex items-center justify-center text-5xl font-display italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:translate-y-[-4px] group-hover:translate-x-[-4px] transition-transform duration-500">
                                {c.name.charAt(0)}
                            </div>

                            <div className="space-y-3 relative z-10 w-full">
                                <h4 className="text-2xl font-display font-black uppercase italic tracking-tighter leading-none group-hover:text-brand-600 transition-colors">{c.name}</h4>
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-8 h-0.5 bg-black/10"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{c.company}</p>
                                    <div className="w-8 h-0.5 bg-black/10"></div>
                                </div>
                            </div>

                            <div className="flex gap-8 pt-8 border-t-2 border-black/5 w-full justify-center relative z-10">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Commercials</p>
                                    <p className="text-sm font-display font-black text-black">KSh {(data.sales.filter(s => s.client === c.name).reduce((sum, s) => sum + parseFloat(s.amount), 0) / 1000).toFixed(1)}K</p>
                                </div>
                                <div className="w-0.5 h-10 bg-black/5"></div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Initiatives</p>
                                    <p className="text-sm font-display font-black text-black">{data.projects.filter(p => p.client === c.name).length} OPS</p>
                                </div>
                            </div>

                            <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 group-hover:right-6 transition-all duration-300">
                                <Icon name="arrow-right" size={24} className="text-brand-500" />
                            </div>
                        </div>
                    ))}
                </div>

                <Modal
                    isOpen={!!selectedClient}
                    onClose={() => setSelectedClient(null)}
                    title="Client Intelligence Matrix"
                >
                    {selectedClient && (
                        <div className="space-y-12 py-4">
                            {/* Intelligence Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 bg-black p-12 border-2 border-black relative overflow-hidden shadow-[12px_12px_0px_0px_rgba(250,204,21,1)]">
                                <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-brand-500/10 rotate-45"></div>
                                <div className="flex items-center gap-10 z-10">
                                    <div className="w-32 h-32 bg-brand-500 text-black border-4 border-black flex items-center justify-center text-5xl font-display italic shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
                                        {selectedClient.name.charAt(0)}
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-5xl font-display font-black text-white uppercase italic tracking-tighter leading-none">{selectedClient.name}</h3>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[11px] font-black text-brand-500 uppercase tracking-[0.4em]">{selectedClient.company}</span>
                                            <div className="w-2 h-2 bg-white/20 rotate-45"></div>
                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Active Entity Vector</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-6 z-10 w-full md:w-auto">
                                    <button onClick={handleOpenEdit} className="brand-button-yellow !py-5 !px-10 italic">
                                        <Icon name="edit-3" size={18} />
                                        <span>Update Profile</span>
                                    </button>
                                    <button onClick={handleDelete} className="w-16 h-16 flex items-center justify-center bg-white border-2 border-black hover:bg-rose-600 hover:text-white transition-all">
                                        <Icon name="archive-restore" size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="card p-8 bg-white dark:bg-white/5 border-none shadow-xl group hover:scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl"><Icon name="trending-up" size={16} /></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifetime Yield</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tighter italic">KSh {totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="card p-8 bg-white dark:bg-white/5 border-none shadow-xl group hover:scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><Icon name="layers" size={16} /></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Ops</span>
                                    </div>
                                    <p className="text-3xl font-black text-emerald-500 font-sans tracking-tighter italic">{clientProjects.filter(p => p.status === 'Active').length}</p>
                                </div>
                                <div className="card p-8 bg-white dark:bg-white/5 border-none shadow-xl group hover:scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 rounded-xl"><Icon name="zap" size={16} /></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Touchpoints</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tighter italic">{clientInteractions.length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="flex justify-between items-center px-2">
                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-black italic leading-none">Engagement Chronology</h5>
                                        <button onClick={() => setIsAddingInteraction(true)} className="w-12 h-12 flex items-center justify-center bg-black text-brand-500 border-2 border-black hover:bg-brand-500 hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                            <Icon name="plus" size={20} />
                                        </button>
                                    </div>
                                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                        {clientInteractions.length > 0 ? [...clientInteractions].reverse().map(i => (
                                            <div key={i.id} className="p-8 bg-slate-50 border-2 border-transparent hover:border-black transition-all relative group">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-black opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`px-4 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest italic`}>
                                                        {i.type}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase italic">
                                                        <Icon name="calendar" size={12} />
                                                        {i.date}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-black font-medium leading-relaxed italic border-l-4 border-brand-500 pl-6">"{i.notes}"</p>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border-2 border-dashed border-slate-200">
                                                <Icon name="message-square" size={48} className="opacity-20 mb-6" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Archival Silence: No recorded interactions</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="px-2">
                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-black italic leading-none">Commercial Velocity</h5>
                                    </div>
                                    <div className="space-y-6">
                                        {clientSales.slice(0, 5).map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-8 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all group">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-black text-brand-500 flex items-center justify-center border-2 border-black">
                                                        <Icon name="file-text" size={24} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-display font-black text-black uppercase tracking-tighter italic leading-none mb-2">{s.invoiceNo}</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{s.date}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-display font-black text-black tracking-tighter">KES {parseFloat(s.amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Operational Profile Refinement">
                    <form onSubmit={handleSaveEdit} className="space-y-10 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Entity Nomenclature</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Corporate Alias</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="brand-label !text-slate-400">Communication Vector (Phone)</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">KRA Fiscal Identity</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black uppercase" value={editData.kraPin} onChange={e => setEditData({ ...editData, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Geospatial Coordinates</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="brand-button-yellow w-full !py-6 !text-sm italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] active:translate-y-[4px] active:shadow-none border-2 border-black">
                            Authorize Profile Synchronization
                        </button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingInteraction} onClose={() => setIsAddingInteraction(false)} title="Log Engagement Protocol">
                    <form onSubmit={handleAddInteraction} className="space-y-10 p-4">
                        <div className="space-y-4">
                            <label className="brand-label !text-slate-400">Engagement Vector</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {['Call', 'Meeting', 'Email', 'Proposal'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setNewInteraction({ ...newInteraction, type })}
                                        className={`py-4 border-2 border-black font-black text-[10px] uppercase tracking-widest transition-all italic ${newInteraction.type === type ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(250,204,21,1)]' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="brand-label !text-slate-400">Interaction Intelligence</label>
                            <textarea className="brand-input !bg-white !border-black !text-black min-h-[160px] py-6 leading-relaxed" placeholder="Document strategic outcomes and operational decisions..." required value={newInteraction.notes} onChange={e => setNewInteraction({ ...newInteraction, notes: e.target.value })} />
                        </div>
                        <button type="submit" className="brand-button-yellow w-full !py-6 !text-sm italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] active:translate-y-[4px] active:shadow-none border-2 border-black">
                            Commit to Historical Matrix
                        </button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingClient} onClose={() => setIsAddingClient(false)} title="Stakeholder Registry Initiation">
                    <form onSubmit={handleRegisterClient} className="space-y-10 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Entity Nomenclature</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required placeholder="Full Name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Corporate Alias</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required placeholder="Company" value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">KRA Fiscal Identity</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black uppercase" placeholder="KRA PIN" value={newClient.kraPin} onChange={e => setNewClient({ ...newClient, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Geospatial Coordinates</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" placeholder="Physical Location" value={newClient.location} onChange={e => setNewClient({ ...newClient, location: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="brand-label !text-slate-400">Communication Vector (Phone)</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required placeholder="+254..." value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="brand-button-yellow w-full !py-6 !text-sm italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] active:translate-y-[4px] active:shadow-none border-2 border-black">
                            Synchronize New Stakeholder
                        </button>
                    </form>
                </Modal>
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
            <div className="space-y-12 animate-slide">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-display uppercase italic tracking-[0.1em] text-black">Stakeholder Registry</h2>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <div className="w-12 h-1 bg-brand-500"></div>
                            {data.suppliers.length} Active Partner Entities
                        </div>
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        className="brand-button-yellow !py-5 !px-10 flex items-center gap-4 italic"
                    >
                        <Icon name="plus-circle" size={18} />
                        Register Partner Entity
                    </button>
                </div>

                {/* Vendor Ledger Table */}
                <div className="border-4 border-black overflow-hidden shadow-premium bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-display">
                            <thead className="bg-black text-white">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">Partner Identity</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em]">Primary Liaison</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em]">Operation Classification</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-right">Registry Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black/5">
                                {data.suppliers.map(s => (
                                    <tr key={s.id} className="group hover:bg-slate-50 transition-all">
                                        <td className="px-10 py-8 relative">
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-black group-hover:bg-brand-500 transition-colors"></div>
                                            <div className="font-black text-lg uppercase italic tracking-tighter leading-none mb-1">{s.name}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.email}</div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="font-bold text-black italic text-sm">{s.contact}</div>
                                            <div className="text-[10px] uppercase text-slate-400 tracking-widest mt-1">{s.contactPerson}</div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="px-4 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest italic">{s.category}</span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button onClick={() => handleOpenEdit(s)} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none" title="Refine Configuration">
                                                    <Icon name="edit-3" size={16} />
                                                </button>
                                                <button onClick={() => { if (confirm('Archive Partner Entity?')) { deleteItem('suppliers', s.id); logActivity(`Archived vendor: ${s.name}`, 'Archive'); } }} className="w-12 h-12 flex items-center justify-center bg-white border-2 border-black hover:bg-rose-500 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none" title="Purge Record">
                                                    <Icon name="trash-2" size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Stakeholder Registration Protocol */}
                <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title={editingSupplier ? "Partner Entity Configuration" : "Stakeholder Registry Initiation"}>
                    <form onSubmit={handleSubmit} className="space-y-10 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Entity Nomenclature</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" placeholder="Identity Graphics Houzz" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Liaison Identity</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" placeholder="+254 700 000 000" required value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Communication Protocol (Email)</label>
                                <input type="email" className="brand-input !bg-slate-50 !border-slate-200 !text-black italic" placeholder="liaison@partner.com" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Operation Classification</label>
                                <select className="brand-input !bg-slate-50 !border-slate-200 !text-black" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option>Material</option><option>Software</option><option>Infrastructure</option><option>Logistics</option><option>Marketing</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Fiscal Identity (KRA PIN)</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black uppercase" placeholder="P051XXXXXXX" value={formData.kraPin} onChange={e => setFormData({ ...formData, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Key Personnel</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" placeholder="Head of Operations" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="brand-label !text-slate-400">Geospatial Logistics Center</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" placeholder="Industrial Area, Gate 4" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="brand-button-yellow w-full !py-6 !text-sm italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] active:translate-y-[4px] active:shadow-none border-2 border-black">
                            {editingSupplier ? "Authorize Config Update" : "Synchronize New Partner"}
                        </button>
                    </form>
                </Modal>
            </div>
        );
    };

    const ProjectModule = () => {
        const { data, updateData, deleteItem, logActivity, seedInvoice } = useContext(AppContext);
        const [selectedProject, setSelectedProject] = useState(null);
        const [isAdding, setIsAdding] = useState(false);
        const [isAddingBOM, setIsAddingBOM] = useState(false);
        const [isAddingAsset, setIsAddingAsset] = useState(false);

        const [formData, setFormData] = useState({ name: '', client: '', deadline: '', designer: '', status: 'Active', stage: 'Brief' });
        const [newBOMItem, setNewBOMItem] = useState({ itemId: '', qty: 1 });
        const [newAsset, setNewAsset] = useState({ name: '', url: '' });

        const stages = ['Brief', 'Design', 'Production', 'Logistics', 'Delivered'];
        const statuses = ['In-progress', 'Completed', 'Cancelled', 'Outsourced'];

        const handleOpenAdd = () => {
            setFormData({ name: '', client: '', deadline: '', designer: '', status: 'Active', stage: 'Brief' });
            setIsAdding(true);
        };

        const handleOpenEdit = (p) => {
            setFormData({ ...p, designer: p.designer || '' });
            setSelectedProject(p.id);
            setIsAdding(true);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (selectedProject && isAdding) {
                const updated = data.projects.map(p => p.id === selectedProject ? { ...formData, id: p.id } : p);
                await updateData('projects_bulk', updated);
                logActivity(`Updated project: ${formData.name}`, 'Update');
            } else {
                const project = { ...formData, id: Date.now(), team: [], bom: [], assets: [] };
                await updateData('projects', project);
                logActivity(`Launched new project: ${formData.name}`, 'Success');
            }
            setIsAdding(false);
            setSelectedProject(null);
        };

        const handleAddBOM = (e) => {
            e.preventDefault();
            const project = data.projects.find(p => p.id === selectedProject);
            if (!project) return;
            const inventoryItem = data.inventory.find(i => i.id === parseInt(newBOMItem.itemId));
            const bomItem = { id: Date.now(), itemId: parseInt(newBOMItem.itemId), sku: inventoryItem?.sku, name: inventoryItem?.name, qty: parseFloat(newBOMItem.qty), status: 'Reserved' };
            updateData('projects_bulk', data.projects.map(p => p.id === selectedProject ? { ...p, bom: [...(p.bom || []), bomItem] } : p));
            logActivity(`BOM item added to ${project.name}`, 'Sync');
            setIsAddingBOM(false);
        };

        const consumeBOM = async (projectId, bomId) => {
            const project = data.projects.find(p => p.id === projectId);
            const bomItem = project.bom.find(b => b.id === bomId);
            if (!bomItem || bomItem.status === 'Consumed') return;
            const inventoryItem = data.inventory.find(i => i.id === bomItem.itemId);
            if (inventoryItem) {
                // B2 Fix: Sequential awaits to avoid race condition
                await updateData('inventory_bulk', data.inventory.map(i => i.id === bomItem.itemId ? { ...i, stock: Math.max(0, i.stock - bomItem.qty) } : i));
                await updateData('stockMovements', { itemId: bomItem.itemId, sku: bomItem.sku, type: 'Out', qty: bomItem.qty, date: new Date().toISOString().split('T')[0], reference: `PRJ-${projectId}`, notes: `Consumed for project: ${project.name}` });
            }
            await updateData('projects_bulk', data.projects.map(p => p.id === projectId ? { ...p, bom: p.bom.map(b => b.id === bomId ? { ...b, status: 'Consumed' } : b) } : p));
            logActivity(`Material consumed for ${project.name}`, 'Action');
        };


        return (
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Project Hub</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Lifecycle Management Matrix // {data.projects.filter(p => p.status !== 'Done & Paid' && p.stage !== 'Archived').length} Active Ops</p>
                    </div>
                    <button onClick={handleOpenAdd} className="btn-primary">
                        <Icon name="plus-circle" size={18} /> Initiate Fresh OP
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.projects.filter(p => p.status !== 'Done & Paid' && p.stage !== 'Archived').map(p => (
                        <div key={p.id} className="card !p-8 bg-white dark:bg-white/5 border-none shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col gap-6">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 blur-3xl rounded-full"></div>

                            <div className="flex justify-between items-start z-10">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${p.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-black shadow-lg shadow-brand-500/20 animate-pulse'}`}>
                                    {p.status}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenEdit(p)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all">
                                        <Icon name="edit-3" size={14} />
                                    </button>
                                    <button onClick={() => { if (confirm('Archive Project?')) { deleteItem('projects', p.id); logActivity(`Archived project: ${p.name}`, 'Archive'); } }} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                                        <Icon name="archive" size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="z-10 space-y-1">
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none group-hover:text-brand-500 transition-colors">{p.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{p.client}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 z-10">
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-brand-500/20 transition-all">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Strategist</p>
                                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">@{p.designer || 'TBD'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-rose-500/20 transition-all">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Deadline</p>
                                    <p className="text-[10px] font-black text-rose-500 font-sans">{p.deadline}</p>
                                </div>
                            </div>

                            <div className="space-y-3 z-10">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-black text-slate-900 dark:text-brand-500 uppercase tracking-widest italic">{p.stage || 'Brief'}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">OP-{p.id.toString().slice(-4)}</span>
                                </div>
                                <div className="flex gap-1.5 h-1.5">
                                    {stages.map((stage, idx) => {
                                        const currentIdx = stages.indexOf(p.stage || 'Brief');
                                        const isCompleted = idx < currentIdx;
                                        const isActive = idx === currentIdx;
                                        return (
                                            <div
                                                key={stage}
                                                onClick={() => { updateData('projects_bulk', data.projects.map(proj => proj.id === p.id ? { ...proj, stage: stage } : proj)); logActivity(`${p.name} -> ${stage}`, 'Sync'); }}
                                                className={`flex-1 rounded-full cursor-pointer transition-all duration-500 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : isActive ? 'bg-brand-500 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-slate-100 dark:bg-white/10'}`}
                                                title={stage}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 mt-auto pt-2 z-10">
                                <button
                                    onClick={() => seedInvoice({ client: p.client, projectId: p.id, itemName: `Project Billing: ${p.name}`, amount: 0 })}
                                    className="w-full py-4 bg-brand-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3"
                                >
                                    <Icon name="file-text" size={16} /> Link Commercial Ops
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={() => { setSelectedProject(p.id); setIsAddingBOM(true); }} className="flex-1 py-3 bg-slate-900 dark:bg-white/10 text-brand-500 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-500 hover:text-black transition-all">
                                        <Icon name="package" size={12} /> BOM Registry
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <Modal isOpen={isAdding} onClose={() => { setIsAdding(false); setSelectedProject(null); }} title={selectedProject ? "OP-Blueprint Refinement" : "Operational Initiative Pipeline"}>
                    <form onSubmit={handleSubmit} className="space-y-8 p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Initiative Title</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Stakeholder Liaison</label>
                                <select className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })}>
                                    <option value="">Select Liaison...</option>
                                    {data.clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Temporal Deadline</label>
                                <input type="date" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white font-sans" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Lead Strategist</label>
                                <select className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" value={formData.designer} onChange={e => setFormData({ ...formData, designer: e.target.value })}>
                                    <option value="">Unassigned</option>
                                    {data.users.filter(u => u.role === 'designer' || u.role === 'admin').map(u => (
                                        <option key={u.id} value={u.username}>{u.name} (@{u.username})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-[11px] uppercase font-black tracking-[0.3em] italic shadow-2xl">{selectedProject ? "Authorize Blueprint Update" : "Launch Operational Sequence"}</button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingBOM} onClose={() => { setIsAddingBOM(false); setSelectedProject(null); }} title="Commercial Material Matrix">
                    <form onSubmit={handleAddBOM} className="space-y-8 p-2">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Asset SKU Selection</label>
                            <select className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={newBOMItem.itemId} onChange={e => setNewBOMItem({ ...newBOMItem, itemId: e.target.value })}>
                                <option value="">Identify Asset...</option>
                                {data.inventory.map(i => <option key={i.id} value={i.id}>{i.sku} - {i.name} (Stock: {i.stock})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Operational Magnitude (Qty)</label>
                            <input type="number" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white font-sans" required value={newBOMItem.qty} onChange={e => setNewBOMItem({ ...newBOMItem, qty: parseFloat(e.target.value) })} />
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-[11px] uppercase font-black tracking-[0.3em] shadow-xl italic">Authorize Material Allocation</button>
                    </form>
                </Modal>

            </div>
        );
    };

    const ReportModule = () => {
        const { data, deleteItem, logActivity } = useContext(AppContext);
        const [reportView, setReportView] = useState('overview'); // 'overview', 'pl', 'bs'
        const [selectedCategory, setSelectedCategory] = useState(null);

        const stats = useMemo(() => {
            const totalSales = data.sales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
            const totalExpenses = data.expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

            // Calculate COGS from Consumed BOM items
            let cogs = 0;
            data.projects.forEach(p => {
                (p.bom || []).forEach(b => {
                    if (b.status === 'Consumed') {
                        const item = data.inventory.find(i => i.id === b.itemId);
                        cogs += (item?.price || 0) * b.qty;
                    }
                });
            });

            // Inventory Value
            const inventoryValue = data.inventory.reduce((sum, i) => sum + (i.stock * i.price), 0);

            return {
                revenue: totalSales,
                cogs: cogs,
                grossProfit: totalSales - cogs,
                expenses: totalExpenses,
                netProfit: totalSales - cogs - totalExpenses,
                inventoryValue: inventoryValue,
                cash: Math.max(0, totalSales - totalExpenses)
            };
        }, [data]);

        useEffect(() => {
            if (reportView !== 'overview') return;

            const revCtx = document.getElementById('revenueFlowChart')?.getContext('2d');
            if (revCtx) {
                const existingChart = Chart.getChart('revenueFlowChart');
                if (existingChart) existingChart.destroy();
                new Chart(revCtx, {
                    type: 'line',
                    data: {
                        labels: ['W1', 'W2', 'W3', 'W4'],
                        datasets: [{
                            label: 'Revenue Trend',
                            data: [stats.revenue * 0.2, stats.revenue * 0.5, stats.revenue * 0.8, stats.revenue],
                            borderColor: '#facc15',
                            backgroundColor: 'rgba(250, 204, 21, 0.1)',
                            fill: true, tension: 0.4, borderWeight: 4,
                            pointBackgroundColor: '#0f172a',
                            pointBorderColor: '#facc15',
                            pointBorderWidth: 2,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#0f172a',
                                titleFont: { weight: 'bold' },
                                padding: 12,
                                cornerRadius: 12
                            }
                        },
                        scales: {
                            y: { display: false },
                            x: { display: true, grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 }, color: '#94a3b8' } }
                        }
                    }
                });
            }

            const expCtx = document.getElementById('expenseDistributionChart')?.getContext('2d');
            if (expCtx) {
                const existingChart = Chart.getChart('expenseDistributionChart');
                if (existingChart) existingChart.destroy();
                const catMap = data.expenses.reduce((acc, exp) => {
                    const cat = exp.category || 'Other';
                    acc[cat] = (acc[cat] || 0) + parseFloat(exp.amount || 0);
                    return acc;
                }, {});
                new Chart(expCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(catMap).length ? Object.keys(catMap) : ['No Data'],
                        datasets: [{
                            data: Object.values(catMap).length ? Object.values(catMap) : [1],
                            backgroundColor: ['#0f172a', '#facc15', '#fbbf24', '#eab308', '#475569'],
                            borderWidth: 0, hoverOffset: 20
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '80%',
                        onClick: (evt, item) => {
                            if (item.length > 0) {
                                const index = item[0].index;
                                const label = Object.keys(catMap)[index];
                                setSelectedCategory(label);
                            }
                        },
                        plugins: {
                            legend: { position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold', size: 10 }, padding: 20 } }
                        }
                    }
                });
            }
        }, [data, stats, reportView]);

        const renderOverview = () => (
            <div className="space-y-10 animate-slide">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-[#0f172a] text-white border-none relative overflow-hidden group p-10 ring-1 ring-white/10">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-150 transition-transform duration-1000"><Icon name="trending-up" size={140} /></div>
                        <h4 className="text-4xl font-black text-brand-500 font-sans tracking-tighter italic">KSh {stats.revenue.toLocaleString()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-2">Gross Commercial Velocity</p>
                    </div>
                    <div className="card bg-white dark:bg-white/5 border-none p-10 shadow-xl hover:shadow-2xl transition-all">
                        <h4 className="text-4xl font-black text-slate-900 dark:text-white font-sans tracking-tighter italic">KSh {stats.expenses.toLocaleString()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-2">Operational Friction</p>
                    </div>
                    <div className="card bg-white dark:bg-white/5 border-none p-10 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full"></div>
                        <h4 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 font-sans tracking-tighter italic">KSh {stats.netProfit.toLocaleString()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-2">Net Liquidity Pool</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="card lg:col-span-3 !p-0 overflow-hidden bg-white dark:bg-[#0f172a] border-none shadow-2xl min-h-[450px] flex flex-col">
                        <div className="bg-slate-900 p-8 flex justify-between items-center border-b border-white/5">
                            <div>
                                <h5 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] leading-none mb-2">Financial Trajectory Matrix</h5>
                                <p className="text-white/40 text-[9px] font-bold uppercase italic mt-1">Real-time Revenue Reconciliation</p>
                            </div>
                            <div className="p-3 bg-brand-500/10 rounded-xl"><Icon name="activity" size={20} className="text-brand-500" /></div>
                        </div>
                        <div className="flex-1 p-8 w-full"><canvas id="revenueFlowChart"></canvas></div>
                    </div>
                    <div className="card lg:col-span-2 !p-0 overflow-hidden bg-white dark:bg-white/5 border-none shadow-2xl min-h-[450px] flex flex-col">
                        <div className="bg-slate-50 dark:bg-white/10 p-8 flex justify-between items-center border-b border-slate-100 dark:border-white/5">
                            <h5 className="text-[10px] font-black text-slate-400 dark:text-white uppercase tracking-[0.3em] leading-none">Cost Allocation Dispersion</h5>
                            <Icon name="pie-chart" size={18} className="text-slate-400" />
                        </div>
                        <div className="flex-1 p-8 text-xs cursor-pointer"><canvas id="expenseDistributionChart"></canvas></div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase text-center py-4 italic border-t border-slate-50 dark:border-white/5">Tip: Click segments to drill into details</p>
                    </div>
                </div>

                <Modal isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)} title={`Expense intelligence: ${selectedCategory}`}>
                    <div className="space-y-6 py-6 p-2">
                        {data.expenses.filter(e => e.category === selectedCategory).map(e => (
                            <div key={e.id} className="flex justify-between items-center p-6 bg-white dark:bg-white/5 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-white/10 transition-all border border-transparent hover:border-brand-500/20 shadow-sm">
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{e.notes || 'Uncategorized Expense'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">{e.date}</p>
                                </div>
                                <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-sans italic tracking-tighter">KSh {parseFloat(e.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </Modal>
            </div>
        );

        const renderPL = () => (
            <div className="card p-0 overflow-hidden shadow-2xl animate-slide border-none bg-white dark:bg-white/5">
                <div className="bg-[#0f172a] p-16 flex flex-col md:flex-row justify-between items-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[120px] rounded-full"></div>
                    <div className="z-10">
                        <h3 className="text-5xl font-black tracking-tighter uppercase italic leading-none">P&L Statement</h3>
                        <p className="text-brand-500 font-black uppercase text-[12px] tracking-[0.4em] mt-3">Fiscal Performance Audit // {new Date().getFullYear()} Matrix</p>
                    </div>
                    <button onClick={() => window.print()} className="mt-8 md:mt-0 btn-primary py-4 px-10 text-[10px] uppercase font-black tracking-[0.3em] shadow-2xl z-10">Generate Intelligence PDF</button>
                </div>
                <div className="p-16">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans italic">
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {/* Revenue Section */}
                                <tr className="bg-slate-50 dark:bg-white/10"><td className="py-6 px-8 font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] text-[11px]">I. Total Operating Revenue</td><td className="py-6 px-8 text-right font-black text-slate-900 dark:text-white text-lg">KSh {stats.revenue.toLocaleString()}</td></tr>
                                <tr><td className="py-6 px-12 text-sm text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Gross Sales (Invoiced)</td><td className="py-6 px-8 text-right text-slate-900 dark:text-white font-bold italic">KSh {stats.revenue.toLocaleString()}</td></tr>

                                {/* COGS Section */}
                                <tr className="bg-slate-50 dark:bg-white/10 mt-8"><td className="py-6 px-8 font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] text-[11px]">II. Cost of Goods Sold (BOM)</td><td className="py-6 px-8 text-right font-black text-rose-600 dark:text-rose-400 italic">(KSh {stats.cogs.toLocaleString()})</td></tr>
                                <tr><td className="py-6 px-12 text-sm text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Material Consumption</td><td className="py-6 px-8 text-right text-slate-900 dark:text-white font-bold italic">KSh {stats.cogs.toLocaleString()}</td></tr>

                                {/* Gross Profit */}
                                <tr className="bg-brand-500/10 dark:bg-brand-500/20"><td className="py-10 px-8 font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] text-sm">Gross Profit Margin</td><td className="py-10 px-8 text-right font-black text-slate-900 dark:text-white text-3xl tracking-tighter italic">KSh {stats.grossProfit.toLocaleString()}</td></tr>

                                {/* Expenses Section */}
                                <tr className="bg-slate-50 dark:bg-white/10 mt-8"><td className="py-6 px-8 font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] text-[11px]">III. Operating Expenses</td><td className="py-6 px-8 text-right font-black text-rose-600 dark:text-rose-400 italic">(KSh {stats.expenses.toLocaleString()})</td></tr>
                                {Object.entries(data.expenses.reduce((acc, e) => {
                                    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
                                    return acc;
                                }, {})).map(([cat, amt]) => (
                                    <tr key={cat}><td className="py-6 px-12 text-sm text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{cat}</td><td className="py-6 px-8 text-right text-slate-900 dark:text-white font-bold italic">KSh {amt.toLocaleString()}</td></tr>
                                ))}

                                {/* Net Income */}
                                <tr className="bg-slate-900 dark:bg-brand-500 text-white dark:text-black"><td className="py-12 px-8 font-black uppercase tracking-[0.5em] text-brand-500 dark:text-black text-[12px]">Net Business Income</td><td className="py-12 px-8 text-right font-black text-5xl italic tracking-tighter">KSh {stats.netProfit.toLocaleString()}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-12 bg-slate-50 border-t border-slate-200">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 italic">Secondary Metrics Registry</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-500/10 text-brand-600 rounded-xl group-hover:bg-brand-500 group-hover:text-black transition-all">
                                    <Icon name="brush" size={20} />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Designs</span>
                            </div>
                            <span className="text-xl font-black text-slate-900">{data.projects.filter(p => ['Active', 'Review'].includes(p.status)).length}</span>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <Icon name="users" size={20} />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Client Entities</span>
                            </div>
                            <span className="text-xl font-black text-slate-900">{data.clients.length}</span>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                    <Icon name="truck" size={20} />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Vendors</span>
                            </div>
                            <span className="text-xl font-black text-slate-900">{data.suppliers.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        );

        const renderBS = () => (
            <div className="card p-0 overflow-hidden shadow-2xl animate-slide border-none bg-white dark:bg-white/5">
                <div className="bg-[#0f172a] p-16 flex flex-col md:flex-row justify-between items-center text-white relative overflow-hidden ring-1 ring-white/10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full"></div>
                    <div className="z-10">
                        <h3 className="text-5xl font-black tracking-tighter uppercase italic leading-none">Balance Sheet</h3>
                        <p className="text-brand-500 font-black uppercase text-[12px] tracking-[0.4em] mt-3">System Asset Evaluation // Real-time Audit</p>
                    </div>
                    <div className="mt-8 md:mt-0 text-right z-10">
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Snapshot Timestamp</p>
                        <p className="text-xl font-black italic text-white mt-1">{new Date().toLocaleDateString()} // {new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
                <div className="p-16 grid grid-cols-1 lg:grid-cols-2 gap-16 font-sans italic">
                    <div className="space-y-10">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.4em] border-b-2 border-slate-950 dark:border-white/20 pb-4">I. Assets Portfolio</h4>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center group">
                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Cash & Equivalents</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter">KSh {stats.cash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center group border-t border-slate-100 dark:border-white/5 pt-6">
                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Inventory Valuation</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter">KSh {stats.inventoryValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900 dark:bg-brand-500 p-8 rounded-[2rem] text-white dark:text-black mt-10 shadow-2xl">
                                <span className="text-[12px] font-black uppercase tracking-[0.4em]">Total Operational Assets</span>
                                <span className="text-3xl font-black italic tracking-tighter">KSh {(stats.cash + stats.inventoryValue).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-10">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.4em] border-b-2 border-slate-950 dark:border-white/20 pb-4">II. Equity & Retained Value</h4>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center group">
                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Accounts Payable</span>
                                <span className="text-lg font-black text-slate-300 dark:text-slate-600 italic tracking-tighter">KSh 0.00</span>
                            </div>
                            <div className="flex justify-between items-center group border-t border-slate-100 dark:border-white/5 pt-6">
                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Retained Intelligence (Earnings)</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter">KSh {stats.netProfit.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-brand-500/10 dark:bg-white/10 p-8 rounded-[2rem] border-2 border-slate-900 dark:border-white/20 mt-10">
                                <span className="text-[12px] font-black uppercase text-slate-900 dark:text-white tracking-[0.4em]">Total Shareholder Equity</span>
                                <span className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">KSh {stats.netProfit.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

        return (
            <div className="space-y-8 animate-slide">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                        {[
                            { id: 'overview', label: 'Executive Summary' },
                            { id: 'pl', label: 'P&L Statement' },
                            { id: 'bs', label: 'Balance Sheet' },
                            { id: 'projects', label: 'Archived Projects' }
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setReportView(v.id)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportView === v.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>

                {reportView === 'overview' && renderOverview()}
                {reportView === 'pl' && renderPL()}
                {reportView === 'bs' && renderBS()}
                {reportView === 'projects' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide">
                        {data.projects.filter(p => p.status === 'Done & Paid' || p.stage === 'Archived').map(p => (
                            <div key={p.id} className="card !p-8 bg-white dark:bg-white/5 border-none shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col gap-6">
                                <div className="absolute top-0 right-0 p-6">
                                    <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-lg shadow-emerald-500/20">ARCHIVED OPS</span>
                                </div>
                                <div className="space-y-1 mt-4">
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none group-hover:text-brand-500 transition-colors">{p.name}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{p.client}</p>
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] space-y-4 border border-transparent group-hover:border-brand-500/10 transition-all">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-slate-400 font-black uppercase tracking-widest italic">Liaison Designer</span>
                                        <span className="font-black text-slate-900 dark:text-white italic">@{p.designer}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] border-t border-slate-100 dark:border-white/5 pt-4">
                                        <span className="text-slate-400 font-black uppercase tracking-widest italic">Delivered Sequence</span>
                                        <span className="font-black text-slate-900 dark:text-white">{p.deadline}</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                    <button onClick={() => alert('Intelligence Dossier Retrieval: In Progress')} className="flex-1 py-4 bg-slate-900 dark:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl">View Dossier</button>
                                    <button onClick={() => { if (confirm('Permanently decommission project intelligence?')) deleteItem('projects', p.id); }} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Icon name="trash-2" size={18} /></button>
                                </div>
                            </div>
                        ))}
                        {data.projects.filter(p => p.status === 'Done & Paid' || p.stage === 'Archived').length === 0 && (
                            <div className="col-span-full py-32 text-center">
                                <Icon name="archive" size={64} className="text-slate-200 dark:text-white/5 mx-auto mb-6" />
                                <p className="text-slate-300 dark:text-white/10 font-black uppercase tracking-[0.5em] italic">No archived intelligence matrices found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const FieldOpsModule = () => {
        const { data, updateData } = useContext(AppContext);
        const [scanResult, setScanResult] = useState(null);
        const [isScanning, setIsScanning] = useState(false);
        const [receiptFile, setReceiptFile] = useState(null);
        const [ocrResult, setOcrResult] = useState(null);

        const simulateScan = () => {
            setIsScanning(true);
            setTimeout(() => {
                const randomItem = data.inventory[Math.floor(Math.random() * data.inventory.length)];
                setScanResult(randomItem);
                setIsScanning(false);
            }, 2000);
        };

        const handleReceiptUpload = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setReceiptFile(file);
            setOcrResult('Analyzing receipt structure...');

            setTimeout(() => {
                setOcrResult({
                    vendor: 'Total Energies',
                    amount: 4500,
                    date: new Date().toISOString().split('T')[0],
                    category: 'Logistics'
                });
            }, 2500);
        };

        return (
            <div className="space-y-10 animate-slide max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Barcode Scanner Simulation */}
                    <div className="card !p-0 overflow-hidden shadow-2xl border-none bg-white dark:bg-white/5">
                        <div className="bg-[#0f172a] p-10 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full"></div>
                            <h4 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-4 z-10 relative">
                                <Icon name="scan-barcode" size={28} className="text-brand-500" />
                                Inventory Scanner
                                <span className="text-[8px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full ml-2 not-italic tracking-widest">DEMO</span>
                            </h4>
                        </div>
                        <div className="p-10 space-y-10">
                            <div className="relative aspect-video bg-slate-950 rounded-[2.5rem] overflow-hidden border-4 border-slate-900 flex flex-col items-center justify-center group shadow-2xl shadow-black/50">
                                {isScanning ? (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                                        <div className="w-48 h-48 border-2 border-brand-500/30 rounded-3xl relative">
                                            <div className="absolute top-1/2 left-0 w-full h-1 bg-brand-500 shadow-[0_0_30px_rgba(250,204,21,1)] animate-[scan_2s_infinite]"></div>
                                            <div className="absolute inset-0 border-2 border-brand-500 animate-pulse rounded-3xl"></div>
                                        </div>
                                        <p className="text-brand-500 text-[10px] font-black uppercase tracking-[0.5em] mt-10 italic">Searching optics...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center mt-4">
                                        <Icon name="camera" size={64} className="text-slate-800 group-hover:text-brand-500/20 transition-all duration-700" />
                                        <div className="mt-6 flex items-center gap-3">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">Optical Engine: Online</p>
                                        </div>
                                    </div>
                                )}
                                {scanResult && !isScanning && (
                                    <div className="absolute inset-0 bg-emerald-500 flex flex-col items-center justify-center p-10 text-center animate-slide">
                                        <div className="p-4 bg-white/20 rounded-[2rem] mb-6"><Icon name="check-circle" size={48} className="text-white" /></div>
                                        <h5 className="text-white font-black uppercase text-3xl italic tracking-tighter leading-none">{scanResult.name}</h5>
                                        <p className="text-white/70 font-black text-sm mt-3 uppercase tracking-[0.3em] font-sans">{scanResult.sku}</p>
                                        <div className="bg-white/20 backdrop-blur-md px-10 py-5 rounded-[2rem] mt-8 text-white font-black text-2xl tracking-tighter border border-white/20 shadow-2xl">
                                            Stock Level: {scanResult.stock} {scanResult.unit}
                                        </div>
                                        <button onClick={() => setScanResult(null)} className="mt-10 text-white/60 text-[11px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors underline-offset-4 underline">Flush Optical Cache</button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={simulateScan}
                                disabled={isScanning}
                                className="btn-primary w-full py-6 text-xs uppercase tracking-[0.3em] font-black flex items-center justify-center gap-4 group"
                            >
                                <Icon name="maximize" size={20} className="group-hover:scale-125 transition-transform" />
                                Engage Optical Engine
                            </button>
                        </div>
                    </div>

                    {/* Receipt OCR Simulation */}
                    <div className="card !p-0 overflow-hidden shadow-2xl border-none bg-white dark:bg-white/5">
                        <div className="bg-[#0f172a] p-10 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
                            <h4 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-4 z-10 relative">
                                <Icon name="receipt" size={28} className="text-brand-500" />
                                Receipt Intelligence
                                <span className="text-[8px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full ml-2 not-italic tracking-widest">DEMO</span>
                            </h4>
                        </div>
                        <div className="p-10 space-y-10">
                            <label className="block relative aspect-video bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-all flex flex-col items-center justify-center p-10 group shadow-inner">
                                <input type="file" className="hidden" accept="image/*" onChange={handleReceiptUpload} />
                                {receiptFile ? (
                                    <div className="text-center animate-slide">
                                        <div className="p-6 bg-brand-500/10 rounded-[2rem] inline-block mb-6"><Icon name="file-text" size={64} className="text-brand-500 mx-auto" /></div>
                                        <p className="text-slate-900 dark:text-white font-black text-lg uppercase italic tracking-tighter">{receiptFile.name}</p>
                                        <p className="text-slate-400 text-[10px] font-black uppercase mt-3 tracking-[0.3em]">Payload Size: {(receiptFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="p-6 bg-slate-100 dark:bg-white/5 rounded-[2rem] mb-6 group-hover:bg-brand-500/20 group-hover:text-brand-500 transition-all duration-700">
                                            <Icon name="upload-cloud" size={64} className="text-slate-300 dark:text-white/20 group-hover:text-brand-500" />
                                        </div>
                                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] italic">Ingest Physical Evidence</p>
                                    </div>
                                )}
                            </label>

                            {ocrResult && (
                                <div className="p-8 bg-slate-950 rounded-[2.5rem] animate-slide relative overflow-hidden ring-1 ring-white/10 shadow-2xl">
                                    <div className="absolute right-0 top-0 p-8 opacity-10"><Icon name="cpu" size={80} className="text-brand-500" /></div>
                                    {typeof ocrResult === 'string' ? (
                                        <div className="flex items-center gap-4 text-brand-500 font-black text-[11px] uppercase tracking-[0.3em] py-4">
                                            <Icon name="loader" size={20} className="animate-spin" />
                                            {ocrResult}
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-2 gap-8">
                                                <div>
                                                    <h6 className="text-brand-500 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Entity Detected</h6>
                                                    <p className="text-white font-black text-2xl uppercase italic tracking-tighter">{ocrResult.vendor}</p>
                                                </div>
                                                <div className="text-right">
                                                    <h6 className="text-brand-500 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Fiscal Magnitude</h6>
                                                    <p className="text-white font-black text-2xl italic tracking-tighter">KSh {ocrResult.amount.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    updateData('expenses', { id: Date.now(), ...ocrResult, notes: `Scanned from mobile at ${new Date().toLocaleTimeString()}` });
                                                    setOcrResult(null);
                                                    setReceiptFile(null);
                                                }}
                                                className="w-full bg-white text-black hover:bg-brand-500 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] italic transition-all shadow-xl hover:-translate-y-1"
                                            >
                                                Commit to Distributed Ledger
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* PWA / Connectivity Status */}
                <div className="bg-[#0f172a] p-8 rounded-3xl flex items-center justify-between shadow-2xl shadow-slate-900/40 border border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center p-3">
                            <Icon name="wifi" size={32} className="text-brand-500" />
                        </div>
                        <div>
                            <h5 className="text-white font-black uppercase italic tracking-tight">Offline Persistence Engine</h5>
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1 italic">Service Worker v2.4 Active | IndexedDB: 12MB Cache</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Linked</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const SettingsModule = () => {
        const { data, user, updateData, updateItem, deleteItem, logActivity, changePassword } = useContext(AppContext);
        const [isSyncing, setIsSyncing] = useState(false);
        const [syncLog, setSyncLog] = useState([]);
        const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'profile', 'security', 'integration', 'users'

        const [isAddingUser, setIsAddingUser] = useState(false);
        const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'reception' });
        const [editingUser, setEditingUser] = useState(null);
        const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });

        // Google Sheets Integration — E3: Lazy-load scripts only when needed
        const GOOGLE_CONFIG = {
            CLIENT_ID: '30962656774-3dgcq5q2rk340o71p358i2fd6h53jc3n.apps.googleusercontent.com',
            SPREADSHEET_ID: '1jZTc8sJJ6dZSLkTwgr9Z6r6YBGi8qnZtiHNSBLQUmdA',
            SCOPES: 'https://www.googleapis.com/auth/spreadsheets'
        };

        const [tokenResponse, setTokenResponse] = useState(null);
        const [googleLoaded, setGoogleLoaded] = useState(typeof google !== 'undefined');

        const loadGoogleScripts = () => {
            return new Promise((resolve) => {
                if (typeof google !== 'undefined' && window.gapi) {
                    setGoogleLoaded(true);
                    return resolve();
                }
                let loaded = 0;
                const checkDone = () => { if (++loaded === 2) { setGoogleLoaded(true); resolve(); } };
                if (!document.querySelector('script[src*="apis.google.com"]')) {
                    const s1 = document.createElement('script');
                    s1.src = 'https://apis.google.com/js/api.js';
                    s1.onload = checkDone;
                    document.head.appendChild(s1);
                } else { checkDone(); }
                if (!document.querySelector('script[src*="accounts.google.com"]')) {
                    const s2 = document.createElement('script');
                    s2.src = 'https://accounts.google.com/gsi/client';
                    s2.onload = checkDone;
                    document.head.appendChild(s2);
                } else { checkDone(); }
            });
        };

        const handleFullSync = async () => {
            setIsSyncing(true);
            setSyncLog([{ time: new Date().toLocaleTimeString(), msg: 'Loading Google APIs...' }]);

            try {
                // E3: Lazy-load Google scripts if not loaded yet
                await loadGoogleScripts();
                setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), msg: 'Starting secure reconciliation...' }, ...prev]);

                // 1. Authenticate via GIS
                const client = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CONFIG.CLIENT_ID,
                    scope: GOOGLE_CONFIG.SCOPES,
                    callback: async (response) => {
                        if (response.error) {
                            setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `Auth Error: ${response.error}` }, ...prev]);
                            setIsSyncing(false);
                            return;
                        }
                        setTokenResponse(response);
                        await performDataPush(response.access_token);
                    },
                });
                client.requestAccessToken();
            } catch (err) {
                setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `Init Error: ${err.message}` }, ...prev]);
                setIsSyncing(false);
            }
        };

        const performDataPush = async (accessToken) => {
            setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), msg: 'Handshake complete. Preparing datasets...' }, ...prev]);

            // Helper to format data for sheets
            const formatData = (items, headers) => {
                return [headers, ...items.map(item => headers.map(h => {
                    const val = item[h.toLowerCase()] || item[h] || '';
                    return typeof val === 'object' ? JSON.stringify(val) : val;
                }))];
            };

            const sheetsToSync = [
                { name: 'Sales', data: data.sales, headers: ['InvoiceNo', 'Date', 'Client', 'Amount', 'Status'] },
                { name: 'Expenses', data: data.expenses, headers: ['Date', 'Category', 'Amount', 'Notes'] },
                { name: 'Projects', data: data.projects, headers: ['Name', 'Client', 'Deadline', 'Stage', 'Status'] },
                { name: 'Inventory', data: data.inventory, headers: ['SKU', 'Name', 'Category', 'Stock', 'Price'] },
                { name: 'Clients', data: data.clients, headers: ['Name', 'Company', 'Email', 'Phone'] }
            ];

            try {
                for (const sheet of sheetsToSync) {
                    setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `Pushing ${sheet.name} matrix...` }, ...prev]);

                    const gridData = formatData(sheet.data, sheet.headers);

                    // Clear and Write (Simplest approach for sync in this context)
                    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_CONFIG.SPREADSHEET_ID}/values/${sheet.name}!A1:Z1000?valueInputOption=RAW`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ values: gridData })
                    });
                }

                setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), msg: 'SUCCESS: Data vault updated on Google Cloud.' }, ...prev]);
                logActivity('Google Sheets Sync: Complete', 'Sync');
            } catch (err) {
                setSyncLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `Sync Critical Failure: ${err.message}` }, ...prev]);
            } finally {
                setIsSyncing(false);
            }
        };
        const handleEditClick = (u) => {
            setEditingUser(u);
            setNewUser({ name: u.name, username: u.username, password: u.password, role: u.role });
            setIsAddingUser(true);
        };

        const handleProvisionUser = async (e) => {
            e.preventDefault();
            try {
                if (editingUser) {
                    await updateItem('users', editingUser.id, newUser);
                    logActivity(`User privileges updated: ${newUser.username}`, 'Update');
                } else {
                    await updateData('users', newUser);
                    logActivity(`New user provisioned: ${newUser.username}`, 'Access');
                }
                setIsAddingUser(false);
                setEditingUser(null);
                setNewUser({ name: '', username: '', password: '', role: 'reception' });
            } catch (err) {
                console.error('Provision Error:', err);
            }
        };

        const renderIntegration = () => (
            <div className="space-y-12 animate-slide">
                <div className="bg-[#0f172a] p-16 flex flex-col items-center justify-center text-center space-y-8 border-4 border-black relative overflow-hidden group shadow-premium">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 transition-all pointer-events-none"><Icon name="cloud-lightning" size={200} /></div>
                    <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 flex items-center justify-center border-2 border-emerald-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Icon name="database" size={40} />
                    </div>
                    <div>
                        <h3 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase">G-Cloud Reconciliation</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic mt-4">Active Sync Protocol: Google Sheets API v4</p>
                    </div>
                    <button
                        onClick={handleFullSync}
                        disabled={isSyncing}
                        className="brand-button-yellow !py-5 !px-12 flex items-center gap-4 italic group disabled:opacity-50"
                    >
                        {isSyncing ? <Icon name="refresh-cw" className="animate-spin" /> : <Icon name="zap" />}
                        {isSyncing ? "Executing Reconciliation..." : "initiate master sync"}
                    </button>
                </div>

                {syncLog.length > 0 && (
                    <div className="bg-black border-4 border-black p-10 space-y-6 shadow-premium">
                        <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                            <div className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Live Telemetry Feed</span>
                        </div>
                        <div className="space-y-4 font-mono text-[10px] max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                            {syncLog.map((log, i) => (
                                <div key={i} className="flex gap-6 opacity-60 hover:opacity-100 transition-opacity">
                                    <span className="text-emerald-500 font-black shrink-0">[{log.time}]</span>
                                    <span className="text-white tracking-tight uppercase">{log.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );

        const renderSecurity = () => (
            <div className="space-y-12 animate-slide max-w-4xl mx-auto">
                <div className="bg-rose-600/5 border-4 border-black p-12 space-y-10 shadow-premium">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-black text-rose-500 flex items-center justify-center border-2 border-rose-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Icon name="shield-alert" size={28} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-display font-black text-black italic tracking-tighter uppercase leading-none">Credential Rotation</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-2">Active Sentinel Protocol // SHA-256 Encryption</p>
                        </div>
                    </div>

                    <form className="space-y-8" onSubmit={e => {
                        e.preventDefault();
                        if (pwData.new !== pwData.confirm) return alert('Cipher mismatch. Verification failed.');
                        changePassword(pwData.current, pwData.new).then(res => {
                            if (res) alert('Security sequence updated.');
                            else alert('Authentication invalid.');
                        });
                    }}>
                        <div className="space-y-6">
                            <div>
                                <label className="brand-label">Current Authentication Cipher</label>
                                <input type="password" required className="brand-input" value={pwData.current} onChange={e => setPwData({ ...pwData, current: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="brand-label">New Sequence Designation</label>
                                    <input type="password" required className="brand-input" value={pwData.new} onChange={e => setPwData({ ...pwData, new: e.target.value })} />
                                </div>
                                <div>
                                    <label className="brand-label">Sequence Confirmation</label>
                                    <input type="password" required className="brand-input" value={pwData.confirm} onChange={e => setPwData({ ...pwData, confirm: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="brand-button-black w-full !py-5 italic border-2 border-black">
                            Execute Rotation Protocol
                        </button>
                    </form>
                </div>
            </div>
        );


        const renderOverview = () => (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-slide">
                <div onClick={() => setActiveSection('profile')} className="bg-white border-4 border-black p-10 hover:shadow-premium transition-all group cursor-pointer relative overflow-hidden flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-black text-brand-500 flex items-center justify-center border-2 border-brand-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform">
                        <Icon name="user" size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-display font-black uppercase italic tracking-tighter">Command Profile</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Identity & Authority Matrix</p>
                    </div>
                </div>
                <div onClick={() => setActiveSection('security')} className="bg-white border-4 border-black p-10 hover:shadow-premium transition-all group cursor-pointer relative overflow-hidden flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-black text-rose-500 flex items-center justify-center border-2 border-rose-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform">
                        <Icon name="shield-check" size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-display font-black uppercase italic tracking-tighter">Security Sentinel</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Credential Rotation Protocols</p>
                    </div>
                </div>
                <div onClick={() => setActiveSection('integration')} className="bg-white border-4 border-black p-10 hover:shadow-premium transition-all group cursor-pointer relative overflow-hidden flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-black text-emerald-500 flex items-center justify-center border-2 border-emerald-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform">
                        <Icon name="database" size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-display font-black uppercase italic tracking-tighter">Data Handshake</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">G-Sheets & Cloud Reconciliation</p>
                    </div>
                </div>
                <div onClick={() => setActiveSection('users')} className="bg-white border-4 border-black p-10 hover:shadow-premium transition-all group cursor-pointer relative overflow-hidden flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-black text-indigo-500 flex items-center justify-center border-2 border-indigo-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform">
                        <Icon name="users" size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-display font-black uppercase italic tracking-tighter">Access Matrix</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Personnel Privilege Provisions</p>
                    </div>
                </div>
            </div>
        );

        const renderProfile = () => (
            <div className="space-y-12 animate-slide">
                <div className="bg-black p-16 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden ring-4 ring-black shadow-premium">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full translate-x-24 -translate-y-24"></div>
                    <div className="w-32 h-32 bg-brand-500 text-black flex items-center justify-center text-5xl font-display font-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] uppercase italic tracking-tighter border-4 border-black">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="z-10 text-center md:text-left space-y-4">
                        <h3 className="text-5xl font-display font-black text-white tracking-tighter uppercase italic leading-none">{user?.name}</h3>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <span className="w-3 h-3 bg-brand-500 rounded-none animate-pulse"></span>
                            <p className="text-brand-500 font-black uppercase text-[12px] tracking-[0.4em] leading-none italic">Executive Command Level</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-10 bg-white border-4 border-black space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <span className="font-black uppercase text-[10px] text-slate-400 tracking-[0.4em] italic block">Personnel Identifier</span>
                        <span className="text-2xl font-display font-black text-black italic tracking-tighter uppercase">admin@ighouzz.com</span>
                    </div>
                    <div className="p-10 bg-white border-4 border-black space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <span className="font-black uppercase text-[10px] text-slate-400 tracking-[0.4em] italic block">Auth Matrix Handle</span>
                        <span className="text-2xl font-display font-black text-brand-600 italic tracking-tighter uppercase">@{user?.username}</span>
                    </div>
                </div>
            </div>
        );
        const renderUsers = () => (
            <div className="space-y-12 animate-slide">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 px-4">
                    <div className="text-center md:text-left space-y-2">
                        <h3 className="text-4xl font-display font-black uppercase italic tracking-tighter text-black">Access Control Matrix</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">{data.users.length} Identified Entities // Active Privileges</p>
                    </div>
                    <button onClick={() => setIsAddingUser(true)} className="brand-button-yellow !py-5 !px-10 flex items-center gap-3">
                        <Icon name="plus-circle" size={20} /> Provision New Entity
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-6 px-4">
                    {data.users.map(u => (
                        <div key={u.id} className="p-8 bg-white border-4 border-black flex flex-col sm:flex-row items-center justify-between group hover:shadow-premium transition-all">
                            <div className="flex flex-col sm:flex-row items-center gap-8 mb-6 sm:mb-0">
                                <div className="w-20 h-20 bg-black text-brand-500 flex items-center justify-center font-display font-black text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-brand-500">
                                    {u.name.charAt(0)}
                                </div>
                                <div className="text-center sm:text-left space-y-1">
                                    <p className="text-2xl font-black text-black uppercase italic leading-none tracking-tighter">{u.name}</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] font-sans">@{u.username}</p>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">{u.role}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleEditClick(u)} className="w-12 h-12 flex items-center justify-center bg-black text-white hover:text-brand-500 transition-all border-2 border-black" title="Modify Privileges">
                                    <Icon name="edit-3" size={18} />
                                </button>
                                {u.id !== user.id && (
                                    <button onClick={() => { if (confirm(`Decommission access for ${u.username}?`)) { deleteItem('users', u.id); logActivity(`Access revoked for ${u.username}`, 'Archive'); } }} className="w-12 h-12 flex items-center justify-center bg-black text-white hover:text-rose-500 transition-all border-2 border-black" title="Revoke Permissions">
                                        <Icon name="shield-off" size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );

        return (
            <div className="space-y-12 animate-slide">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b-4 border-black">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-display uppercase italic tracking-[0.1em] text-black">Administrative Command</h2>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <div className="w-12 h-1 bg-brand-500"></div>
                            System Configuration & Security Protocols
                        </div>
                    </div>
                    {activeSection !== 'overview' && (
                        <button
                            onClick={() => setActiveSection('overview')}
                            className="brand-button-yellow !py-4 !px-8 flex items-center gap-4 italic"
                        >
                            <Icon name="arrow-left" size={18} />
                            Return to Matrix
                        </button>
                    )}
                </div>

                <div className="p-4">
                    {activeSection === 'overview' && renderOverview()}
                    {activeSection === 'profile' && renderProfile()}
                    {activeSection === 'integration' && renderIntegration()}
                    {activeSection === 'security' && renderSecurity()}
                    {activeSection === 'users' && renderUsers()}
                </div>

                <Modal isOpen={isAddingUser} onClose={() => { setIsAddingUser(false); setEditingUser(null); }} title={editingUser ? "Update Access Privileges" : "Provision Fresh Access"}>
                    <form onSubmit={handleProvisionUser} className="space-y-10 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Full Name Identification</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required placeholder="Personnel Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Access Handle (Username)</label>
                                <input className="brand-input !bg-slate-50 !border-slate-200 !text-black" required placeholder="username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Security Sequence (Password)</label>
                                <input type="password" className="brand-input !bg-slate-50 !border-slate-200 !text-black" required placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="brand-label !text-slate-400">Authority Classification</label>
                                <select className="brand-input !bg-slate-50 !border-slate-200 !text-black" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="reception">Reception Level</option>
                                    <option value="designer">Designer Level</option>
                                    <option value="admin">Executive Command</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="brand-button-yellow w-full !py-6 !text-sm italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] active:translate-y-[4px] active:shadow-none border-2 border-black">
                            {editingUser ? "Authorize Privilege Shift" : "provision fresh access"}
                        </button>
                    </form>
                </Modal>
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
    window.FieldOpsModule = FieldOpsModule;
    window.SettingsModule = SettingsModule;
}
