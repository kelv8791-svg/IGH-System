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
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Command Dashboard</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Operational Intelligence Vector // {new Date().toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
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
                            className="px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all flex items-center gap-3 uppercase tracking-widest shadow-premium"
                        >
                            <Icon name="download" size={16} /> Data Export
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon="zap" label="Aggregate Revenue" value={`KSh ${stats.revenue.toLocaleString()}`} color="brand" trend="+12.5%" />
                    <StatCard icon="pie-chart" label="Total Burn Rate" value={`KSh ${stats.expenses.toLocaleString()}`} color="red" trend="-2.4%" />
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
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Expenditure Hub</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Capital Outflow Management // {data.expenses.length} Records Detected</p>
                    </div>
                    <button onClick={() => setIsAdding(!isAdding)} className="btn-primary">
                        <Icon name={isAdding ? 'x' : 'plus'} size={18} /> {isAdding ? 'Dismiss' : 'Log Expenditure'}
                    </button>
                </div>

                {isAdding && (
                    <div className="card border-none bg-white dark:bg-white/5 shadow-2xl animate-slide p-8">
                        <form onSubmit={addExpense} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Temporal Stamp</label>
                                    <input type="date" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" required value={newExp.date} onChange={e => setNewExp({ ...newExp, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Magnitude (KSh)</label>
                                    <input type="number" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" placeholder="0.00" required value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category Vector</label>
                                    <select className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })}>
                                        <option>Office Supplies</option><option>Software</option><option>Marketing</option><option>Travel</option><option>Raw Materials</option><option>Human Resource</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Description / Operational Notes</label>
                                <input type="text" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" placeholder="Specify expenditure intent..." value={newExp.notes} onChange={e => setNewExp({ ...newExp, notes: e.target.value })} />
                            </div>
                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <button type="submit" className="btn-primary py-4 px-10 uppercase tracking-widest text-[10px] font-black italic">Commit to Ledger</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="card !p-0 overflow-hidden border-none bg-white dark:bg-white/5 shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans">
                            <thead className="bg-[#0f172a] text-white">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Date</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Classification</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Operational Notes</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Magnitude</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {data.expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                        <td className="px-8 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">{exp.date}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                                <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-tighter">{exp.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-400 italic text-sm">{exp.notes}</td>
                                        <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white font-sans tracking-tight">KSh {parseFloat(exp.amount).toLocaleString()}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { if (confirm('Delete expense entry?')) deleteItem('expenses', exp.id); }} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-rose-500">
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
                // Link to project if selected
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
                    alert(`Quote ${sale.invoiceNo} successfully recorded. Preview is available in the ledger.`);
                } else {
                    logActivity(`Invoice ${sale.invoiceNo} issued to ${sale.client}`, 'Sync');
                }
            } else {
                alert('Submission failed. Please check your connection and try again.');
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
                // Link back to project if linked and fully paid
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
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Revenue Ledger</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Financial Vector Management // {statusCounts.pending} Awaiting Settlement</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none">
                                <Icon name="search" size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Locate Transaction..."
                                className="input-field !pl-10 !py-3 !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500 w-48 sm:w-64 text-[10px] font-black uppercase tracking-widest"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary">
                            <Icon name={isAdding ? 'x' : 'plus'} size={18} /> {isAdding ? 'Dismiss' : 'Generate Invoice'}
                        </button>
                    </div>
                </div>

                {unbilledProjects.length > 0 && (
                    <div className="card bg-brand-50 border-brand-100 border-2 shadow-inner p-6 animate-pulse-slow no-print">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-brand-500 rounded-lg text-black">
                                <Icon name="alert-circle" size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Unbilled Deliverables</h4>
                                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Awaiting Invoice Generation</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {unbilledProjects.map(up => (
                                <div key={up.id} className="bg-white p-4 rounded-2xl border border-brand-200 shadow-sm flex justify-between items-center group">
                                    <div>
                                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{up.client}</p>
                                        <h5 className="text-sm font-black text-slate-900 italic">{up.name}</h5>
                                    </div>
                                    <button onClick={() => seedInvoice({ client: up.client, projectId: up.id, itemName: up.name })} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-all group-hover:scale-110">
                                        <Icon name="file-plus" size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card p-8 bg-white dark:bg-white/5 border-none group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-slate-500/10 text-slate-500 rounded-xl"><Icon name="file-text" size={16} /></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aggregate Records</span>
                        </div>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{statusCounts.total}</span>
                    </div>
                    <div className="card p-8 bg-white dark:bg-white/5 border-none group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Icon name="clock" size={16} /></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Awaiting Settlement</span>
                        </div>
                        <span className="text-3xl font-black text-amber-500 tracking-tighter">{statusCounts.pending}</span>
                    </div>
                    <div className="card p-8 bg-white dark:bg-white/5 border-none group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><Icon name="dollar-sign" size={16} /></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pipeline Valuation</span>
                        </div>
                        <span className="text-3xl font-black text-emerald-500 tracking-tighter font-sans">KSh {statusCounts.value.toLocaleString()}</span>
                    </div>
                    <div className="card p-8 bg-white dark:bg-white/5 border-none group hover:scale-[1.02] transition-all border-l-4 border-rose-500/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl"><Icon name="alert-triangle" size={16} /></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Overdue Threshold</span>
                        </div>
                        <span className="text-3xl font-black text-rose-600 tracking-tighter">{statusCounts.overdue}</span>
                    </div>
                </div>

                {isAdding && (
                    <div className="card shadow-2xl border-brand-200 animate-slide">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Client Name</label>
                                    <select className="input-field" required value={newSale.client} onChange={e => setNewSale({ ...newSale, client: e.target.value })}>
                                        <option value="">Select Client</option>
                                        {data.clients.map(c => <option key={c.id} value={c.name}>{c.name} ({c.company})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Link Project</label>
                                    <select className="input-field" value={newSale.projectId} onChange={e => setNewSale({ ...newSale, projectId: e.target.value })}>
                                        <option value="">N/A (General Sale)</option>
                                        {data.projects.filter(p => p.client === newSale.client).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Invoice Date</label>
                                    <input type="date" className="input-field" required value={newSale.date} onChange={e => setNewSale({ ...newSale, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Invoice ID</label>
                                    <div className="input-field bg-slate-50 font-black text-brand-600">{getNextInvoiceNumber()}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 italic">Billable items</h4>
                                    <button type="button" onClick={addItem} className="text-xs font-black text-brand-600 hover:text-brand-700 flex items-center gap-1">
                                        <Icon name="plus-circle" size={14} /> append row
                                    </button>
                                </div>
                                {newSale.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-end animate-slide">
                                        <div className="flex-1 space-y-1"><input className="input-field" placeholder="Graphic Package etc." value={item.desc} onChange={e => updateItem(idx, 'desc', e.target.value)} required /></div>
                                        <div className="w-24 space-y-1"><input type="number" className="input-field text-center" value={item.qty} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value))} required /></div>
                                        <div className="w-40 space-y-1"><input type="number" className="input-field text-right" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value))} required /></div>
                                        <button type="button" onClick={() => removeItem(idx)} className="p-3 text-slate-300 hover:text-rose-500"><Icon name="trash-2" size={18} /></button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-6 border-t border-slate-100">
                                <div className="w-80 space-y-3 text-right">
                                    <div className="flex justify-between text-sm font-medium text-slate-500"><span>Subtotal (Net)</span><span className="font-sans">KSh {totals.subtotal.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-sm font-medium text-slate-400 italic"><span>VAT ({newSale.taxRate}%)</span><span className="font-sans">KSh {totals.tax.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-xl font-black text-slate-900 border-t border-slate-100 pt-3"><span>Grand Total</span><span className="text-brand-600 font-sans">KSh {totals.total.toLocaleString()}</span></div>
                                    <div className="flex gap-3">
                                        <button type="submit" className="flex-1 btn-primary py-4 uppercase tracking-widest text-xs">Authorize & Issue</button>
                                        <button
                                            type="button"
                                            onClick={() => handleSubmit(null, true)}
                                            className="btn-primary bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        >
                                            <Icon name="file-text" size={16} /> Save as Quote
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                <div className="card !p-0 overflow-hidden border-none bg-white dark:bg-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans">
                            <thead className="bg-slate-900 text-white">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Invoice Identifier</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Recipient Subject</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Temporal Stamp</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Magnitude</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status Vector</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {data.sales
                                    .filter(s =>
                                        s.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.status.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map(sale => (
                                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                            <td className="px-8 py-6">
                                                <span className="font-black text-slate-900 dark:text-white uppercase italic">{sale.invoiceNo}</span>
                                                {sale.isQuote && <span className="ml-2 px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-black rounded-full uppercase tracking-widest">Quote</span>}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                                        {sale.client.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 italic">{sale.client}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 font-black text-slate-400 text-[10px] uppercase font-sans tracking-widest">{sale.date}</td>
                                            <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white font-sans tracking-tight">KSh {parseFloat(sale.amount).toLocaleString()}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${sale.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    sale.status === 'Partial' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                    }`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => { setSelectedInvoice(sale); }}
                                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-brand-500 hover:text-white rounded-xl transition-all text-slate-400"
                                                        title="View Specifications"
                                                    >
                                                        <Icon name="eye" size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSettlingInvoice(sale)}
                                                        className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-xl transition-all text-emerald-500"
                                                        title="Authorize Settlement"
                                                    >
                                                        <Icon name="wallet" size={16} />
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button
                                                            onClick={() => { if (confirm('Purge ledger entry?')) deleteItem('sales', sale.id); }}
                                                            className="w-10 h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-rose-500"
                                                            title="Purge Record"
                                                        >
                                                            <Icon name="trash-2" size={16} />
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
                    <form onSubmit={handleSettle} className="space-y-6">
                        <div className="p-6 bg-slate-900 text-white rounded-[2rem] flex justify-between items-center shadow-xl">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Net Remaining Due</p>
                                <h4 className="text-3xl font-black text-brand-500 font-sans tracking-tighter">KSh {(parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0)).toLocaleString()}</h4>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Total Invoice: KSh {parseFloat(settlingInvoice?.amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Due From</p>
                                <h4 className="text-lg font-black text-white px-4 py-1 bg-white/10 rounded-xl inline-block italic leading-none">{settlingInvoice?.client}</h4>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[40vh] overflow-y-auto px-1">
                            {payments.map((p, idx) => (
                                <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative animate-slide space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Entry #{idx + 1}</h5>
                                        {payments.length > 1 && (
                                            <button type="button" onClick={() => removePaymentEntry(idx)} className="text-rose-500 hover:text-rose-700 transition-colors">
                                                <Icon name="x-circle" size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mode</label>
                                            <select className="input-field py-2" value={p.mode} onChange={e => updatePaymentEntry(idx, 'mode', e.target.value)}>
                                                <option>Mpesa</option><option>Cash</option><option>Cheque</option><option>Bank Transfer</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount (KSh)</label>
                                            <input type="number" className="input-field py-2" required value={p.amount} onChange={e => updatePaymentEntry(idx, 'amount', e.target.value)} />
                                        </div>
                                    </div>
                                    {(p.mode === 'Mpesa' || p.mode === 'Cheque') && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.mode} Reference Code</label>
                                            <input className="input-field py-2 uppercase font-black" placeholder="Code/Ref#" required value={p.ref} onChange={e => updatePaymentEntry(idx, 'ref', e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button type="button" onClick={addPaymentEntry} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-brand-500 hover:text-brand-600 transition-all flex items-center justify-center gap-2">
                            <Icon name="plus" size={12} /> Add Partial Mode
                        </button>

                        <div className="pt-4 border-t border-slate-100">
                            <div className="space-y-3 mb-6 px-2">
                                <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-widest">
                                    <span>Subtotal Entry</span>
                                    <span className="text-slate-900 font-sans">KSh {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Remaining Balance</span>
                                    <span className={`text-xl font-sans ${payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) >= (parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0)) ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        KSh {Math.max(0, parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0) - payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)).toLocaleString()}
                                    </span>
                                </div>
                                {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) >= (parseFloat(settlingInvoice?.amount || 0) - (settlingInvoice?.amountPaid || 0)) && (
                                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 justify-center animate-pulse">
                                        <Icon name="check-circle" size={12} /> Full Settlement Reached
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest italic shadow-2xl">
                                Authorize & Confirm Transaction
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
            <div className="space-y-12 py-8 px-4 sm:px-12 bg-white text-slate-900 rounded-[2rem] shadow-2xl border border-slate-100" id="invoice-content">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-emerald-500"></div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-12">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/30">
                            <span className="text-2xl font-black text-white italic">IG</span>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Identity Graphics</h2>
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] mt-2">where creativity meets excellence</p>
                        </div>
                    </div>
                    <div className="text-right space-y-2">
                        <h1 className="text-6xl font-black text-slate-100 uppercase tracking-tighter leading-none select-none">INVOICE</h1>
                        <div className="space-y-1 relative -mt-8">
                            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{invoice.invoiceNo}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{invoice.date}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-24">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-50 pb-3">Corporate Identity</h4>
                        <div className="text-[13px] space-y-2 font-medium leading-relaxed">
                            <p className="font-black text-slate-900 uppercase">Identity Graphics Houzz</p>
                            <p className="text-slate-500">Pekars Building, 4th Floor</p>
                            <p className="text-slate-500">Mburu Gichua Rd, Nakuru-KENYA</p>
                            <div className="pt-2">
                                <p className="text-slate-500 flex items-center gap-2"><Icon name="phone" size={12} className="text-brand-500" /> +254 714 561 533</p>
                                <p className="text-brand-600 font-bold underline flex items-center gap-2 mt-1"><Icon name="mail" size={12} /> identitygraphics@gmail.com</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-50 pb-3">Bill Recipient</h4>
                        <div className="text-[13px] space-y-2 font-medium leading-relaxed">
                            <p className="font-black text-slate-900 uppercase text-lg italic">{invoice.client}</p>
                            <p className="text-slate-500 font-bold">{data.clients.find(c => c.name === invoice.client)?.company}</p>
                            <p className="text-slate-500">{data.clients.find(c => c.name === invoice.client)?.email}</p>
                            <div className={`mt-4 inline-block px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${invoice.status === 'Paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}>
                                Account Status: {invoice.status}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-premium bg-slate-50/50">
                    <table className="w-full text-left font-sans">
                        <thead className="bg-slate-900 text-white">
                            <tr>
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Service/Asset Specification</th>
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Qty</th>
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Unit Rate</th>
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {(invoice.items || []).map((item, i) => (
                                <tr key={i} className="text-[13px] font-medium transition-colors hover:bg-white/80">
                                    <td className="px-10 py-6 font-black text-slate-900 uppercase tracking-tight">{item.desc}</td>
                                    <td className="px-10 py-6 text-center font-bold text-slate-500">{item.qty}</td>
                                    <td className="px-10 py-6 text-right font-medium text-slate-500">KSh {parseFloat(item.price).toLocaleString()}</td>
                                    <td className="px-10 py-6 text-right font-black text-slate-900">KSh {(item.qty * item.price).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-end gap-12 pt-8">
                    <div className="flex-1 space-y-4 max-w-sm">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Settlement Information</h4>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                Please settle this invoice within 7 operational days. Use invoice reference <span className="text-brand-600 font-black">{invoice.invoiceNo}</span> for all transactions.
                            </p>
                            <div className="pt-2 flex items-center gap-4 border-t border-slate-200 mt-4 pt-4">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Accepted:</div>
                                <div className="flex gap-2">
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black uppercase">M-Pesa</span>
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black uppercase">Bank</span>
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black uppercase">Cash</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-80 space-y-4">
                        <div className="space-y-3 px-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <span>Aggregate Net</span>
                                <span className="font-sans">KSh {(invoice.subtotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest italic">
                                <span>Tax Load ({invoice.taxRate}%)</span>
                                <span className="font-sans">KSh {(invoice.tax || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-3xl font-black text-slate-900 pt-6 border-t-4 border-slate-900 italic tracking-tighter">
                                <span>Total Due</span>
                                <span className="text-brand-600">KSh {parseFloat(invoice.amount).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-10 flex justify-center no-print">
                            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-4 transform hover:-translate-y-1 active:scale-95">
                                <Icon name="printer" size={18} /> Commit to Paper
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-24 text-center space-y-4">
                    <div className="flex items-center justify-center gap-4 opacity-10">
                        <div className="h-px w-24 bg-slate-900"></div>
                        <Icon name="shield-check" size={24} />
                        <div className="h-px w-24 bg-slate-900"></div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Identity Graphics Houzz Enclave</p>
                    <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Digital Authentication: {btoa(invoice.invoiceNo).substring(0, 16)}</p>
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
            <div className="space-y-8 animate-slide">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Stock Registry</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Operational Resource Management // {stats.totalItems} Active SKUs</p>
                    </div>
                    <button onClick={() => { if (isAddingItem) { setEditingItem(null); setNewItem({ sku: '', name: '', category: 'Raw Materials', stock: 0, unit: 'pcs', minStock: 5, price: 0 }); } setIsAddingItem(!isAddingItem); }} className="btn-primary">
                        <Icon name={isAddingItem ? 'x' : 'plus'} size={18} /> {isAddingItem ? 'Dismiss' : 'Register SKU'}
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card p-8 bg-white dark:bg-white/5 border-none group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl"><Icon name="pie-chart" size={16} /></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Valuation</span>
                        </div>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter font-sans">KSh {stats.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="card p-8 bg-white dark:bg-white/5 border-none group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><Icon name="box" size={16} /></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unique SKUs Contact</span>
                        </div>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter font-sans">{stats.totalItems}</span>
                    </div>
                    <div className={`card p-8 bg-white dark:bg-white/5 border-none group hover:scale-[1.02] transition-all border-l-4 ${stats.lowStock > 0 ? 'border-rose-500/50 animate-pulse-slow' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl"><Icon name="alert-circle" size={16} /></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Critical Shortage</span>
                        </div>
                        <span className={`text-3xl font-black tracking-tighter font-sans ${stats.lowStock > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{stats.lowStock}</span>
                    </div>
                </div>

                {isAddingItem && (
                    <div className="card border-none bg-white dark:bg-white/5 shadow-2xl animate-slide p-8">
                        <form onSubmit={handleAddItem} className="space-y-8">
                            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic border-b border-white/5 pb-4">
                                {editingItem ? `Refining SKU Specification: ${editingItem.sku}` : 'Register Fresh Asset SKU'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">SKU Identifier</label>
                                    <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" placeholder="e.g. VIN-RD-01" required value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Asset Nomenclature</label>
                                    <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" placeholder="Glossy Red Vinyl" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category Vector</label>
                                    <select className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                        <option>Raw Materials</option><option>Media</option><option>Ink/Chemicals</option><option>Finished Goods</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Initial Reserve</label>
                                    <input type="number" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Unit Metric</label>
                                    <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" placeholder="m, L, pcs" required value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Critical Threshold</label>
                                    <input type="number" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Asset Valuation (KSh)</label>
                                    <input type="number" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white focus:!border-brand-500" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-white/5">
                                <div className={`text-[10px] font-black text-emerald-500 uppercase tracking-widest transition-opacity duration-300 ${isSuccess ? 'opacity-100' : 'opacity-0'}`}>
                                    <Icon name="check-circle" size={12} className="inline mr-2" />
                                    Synchronized Successfully
                                </div>
                                <button type="submit" className="btn-primary py-4 px-10 font-black uppercase tracking-widest text-[10px] italic">Commit to Registry</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Inventory Table */}
                <div className="card !p-0 overflow-hidden border-none bg-white dark:bg-white/5 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans">
                            <thead className="bg-[#0f172a] text-white">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Asset Identity</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Classification</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Reserve Status</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {data.inventory.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{item.sku}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.name}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-tighter">{item.category}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col items-center">
                                                <div className={`text-2xl font-black font-sans tracking-tighter ${item.stock <= item.minStock ? 'text-rose-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                                                    {item.stock} <small className="text-[9px] uppercase text-slate-400 tracking-widest">{item.unit}</small>
                                                </div>
                                                <div className="w-24 bg-slate-100 dark:bg-white/10 h-1 rounded-full mt-2 overflow-hidden shadow-inner">
                                                    <div className={`h-full transition-all duration-1000 ${item.stock <= item.minStock ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (item.stock / (item.minStock * 4)) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setIsAdjustingStock(item.id)} className="w-10 h-10 flex items-center justify-center bg-brand-500/10 hover:bg-brand-500 hover:text-white rounded-xl transition-all text-brand-500" title="Adjust Assets">
                                                    <Icon name="refresh-cw" size={16} />
                                                </button>
                                                <button onClick={() => { setEditingItem(item); setNewItem({ ...item }); setIsAddingItem(true); }} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-900 dark:hover:bg-white rounded-xl transition-all text-slate-400" title="Modify Context">
                                                    <Icon name="edit-3" size={16} />
                                                </button>
                                                <button onClick={() => { if (confirm(`Purge ${item.sku} from registry?`)) { deleteItem('inventory', item.id); logActivity(`Inventory purged: ${item.sku}`, 'Archive'); } }} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-rose-500" title="Purge SKU">
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

                {/* Adjustment Modal */}
                <Modal isOpen={!!isAdjustingStock} onClose={() => setIsAdjustingStock(null)} title="Operational Stock Adjustment">
                    {isAdjustingStock && (() => {
                        const item = data.inventory.find(i => i.id === isAdjustingStock);
                        return (
                            <form onSubmit={handleAdjustStock} className="space-y-8 p-2">
                                <div className="flex items-center gap-6 p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/10 blur-3xl rounded-full"></div>
                                    <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center text-3xl font-black italic shadow-2xl shadow-brand-500/20 z-10">{item?.sku.charAt(0)}</div>
                                    <div className="z-10">
                                        <h4 className="text-2xl font-black tracking-tighter uppercase italic">{item?.name}</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Current Reserve: <span className="text-brand-500">{item?.stock} {item?.unit}</span></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Movement Direction</label>
                                        <div className="flex gap-4 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                                            <button type="button" onClick={() => setAdjustment({ ...adjustment, type: 'In' })} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adjustment.type === 'In' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>Increment (+)</button>
                                            <button type="button" onClick={() => setAdjustment({ ...adjustment, type: 'Out' })} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adjustment.type === 'Out' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>Decrement (-)</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Magnitude ({item?.unit})</label>
                                        <input type="number" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white !py-4 focus:!border-brand-500 text-center text-3xl font-black italic tracking-tighter" required value={adjustment.qty} onChange={e => setAdjustment({ ...adjustment, qty: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Context Reference (Project / Order ID)</label>
                                        <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" placeholder="e.g. PRJ-204" value={adjustment.reference} onChange={e => setAdjustment({ ...adjustment, reference: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Internal Justification</label>
                                        <textarea className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white h-28 resize-none" placeholder="Specify technical reason for stock deviation..." value={adjustment.notes} onChange={e => setAdjustment({ ...adjustment, notes: e.target.value })}></textarea>
                                    </div>
                                </div>

                                <button type="submit" className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl transition-all italic transform hover:-translate-y-1 active:scale-95 ${adjustment.type === 'In' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                    Authorize Flow Modification
                                </button>
                            </form>
                        );
                    })()}
                </Modal>

                {/* Recent Movements */}
                <div className="card !p-0 border-none bg-white dark:bg-white/5 shadow-2xl overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-ping"></div>
                            <h5 className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic">Telemetry: Stock Dynamics</h5>
                        </div>
                        <Icon name="activity" size={16} className="text-brand-500 opacity-50" />
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar p-6 space-y-4">
                        {(data.stockMovements || []).length > 0 ? [...data.stockMovements].reverse().map(m => (
                            <div key={m.id} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-brand-500/30 transition-all group">
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${m.type === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {m.type === 'In' ? <Icon name="arrow-up-right" size={20} /> : <Icon name="arrow-down-right" size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none uppercase italic group-hover:text-brand-500 transition-colors">{m.itemName}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.sku}</span>
                                            <span className="w-1 h-1 bg-slate-300 dark:bg-white/10 rounded-full"></span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{m.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-900 dark:text-white font-sans tracking-tighter">{m.type === 'In' ? '+' : '-'}{m.qty}</p>
                                    <p className="text-[10px] font-black text-brand-600 uppercase italic tracking-widest mt-1 opacity-70">{m.reference || 'Static Adj'}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-white/10">
                                <Icon name="box" size={48} className="opacity-10 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Silence: No recent fluctuations detected</p>
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
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Client Relations</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Relationship Ecosystem Management // {data.clients.length} Active Entities</p>
                    </div>
                    <button onClick={() => setIsAddingClient(true)} className="btn-primary">
                        <Icon name="plus-circle" size={18} /> Register Stakeholder
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.clients.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedClient(c)}
                            className="card !p-8 bg-white dark:bg-white/5 border-none shadow-xl hover:shadow-2xl transition-all group cursor-pointer relative overflow-hidden flex flex-col items-center text-center space-y-6"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 blur-3xl rounded-full group-hover:bg-brand-500/10 transition-colors"></div>

                            <div className="w-24 h-24 bg-slate-900 dark:bg-white/10 text-brand-500 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-2xl group-hover:scale-110 transition-transform duration-500 italic">
                                {c.name.charAt(0)}
                            </div>

                            <div className="space-y-2 relative z-10">
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{c.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{c.company}</p>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-white/5 w-full justify-center">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
                                    <p className="text-xs font-black text-slate-900 dark:text-white font-sans">KSh {(data.sales.filter(s => s.client === c.name).reduce((sum, s) => sum + parseFloat(s.amount), 0) / 1000).toFixed(1)}K</p>
                                </div>
                                <div className="w-px h-8 bg-slate-100 dark:bg-white/5"></div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ops</p>
                                    <p className="text-xs font-black text-slate-900 dark:text-white font-sans">{data.projects.filter(p => p.client === c.name).length}</p>
                                </div>
                            </div>

                            <div className="absolute bottom-4 right-8 opacity-0 group-hover:opacity-100 group-hover:right-4 transition-all duration-300">
                                <Icon name="chevron-right" size={20} className="text-brand-500" />
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
                        <div className="space-y-12 py-2">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-500/5 blur-[100px] rounded-full"></div>
                                <div className="flex items-center gap-8 z-10">
                                    <div className="w-24 h-24 bg-brand-600 rounded-[2.5rem] flex items-center justify-center text-4xl font-black italic shadow-2xl shadow-brand-500/20 text-white">
                                        {selectedClient.name.charAt(0)}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{selectedClient.name}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em]">{selectedClient.company}</span>
                                            <span className="w-1.5 h-1.5 bg-white/20 rounded-full"></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Active Entity</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 z-10 w-full md:w-auto">
                                    <button onClick={handleOpenEdit} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-4 px-8 bg-white/10 hover:bg-white hover:text-black rounded-2xl border border-white/10 transition-all text-white font-black uppercase text-[10px] tracking-widest italic">
                                        <Icon name="edit-3" size={16} />
                                        <span>Update Profile</span>
                                    </button>
                                    <button onClick={handleDelete} className="w-12 h-12 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl border border-rose-500/20 transition-all">
                                        <Icon name="archive-restore" size={20} />
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
                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white italic">Engagement Chronology</h5>
                                        <button onClick={() => setIsAddingInteraction(true)} className="w-10 h-10 flex items-center justify-center bg-brand-500/10 text-brand-500 rounded-xl hover:bg-brand-500 hover:text-white transition-all shadow-lg shadow-brand-500/10">
                                            <Icon name="plus" size={20} />
                                        </button>
                                    </div>
                                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                        {clientInteractions.length > 0 ? [...clientInteractions].reverse().map(i => (
                                            <div key={i.id} className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-transparent hover:border-brand-500/30 transition-all relative group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${i.type === 'Meeting' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : i.type === 'Call' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-white'}`}>
                                                        {i.type}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase italic">
                                                        <Icon name="calendar" size={10} />
                                                        {i.date}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic border-l-2 border-brand-500/30 pl-4">"{i.notes}"</p>
                                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Icon name="check-check" size={14} className="text-brand-500" />
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
                                                <Icon name="message-square" size={32} className="text-slate-300 dark:text-white/10 mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Archival Silence: No recorded interactions</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="px-2">
                                        <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white italic">Commercial Velocity</h5>
                                    </div>
                                    <div className="space-y-4">
                                        {clientSales.slice(0, 5).map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-6 bg-white dark:bg-white/5 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all border border-transparent hover:border-emerald-500/30 group">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                                                        <Icon name="file-text" size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{s.invoiceNo}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{s.date}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xl font-black text-slate-900 dark:text-white font-sans tracking-tighter">KSh {parseFloat(s.amount).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Operational Profile Refinement">
                    <form onSubmit={handleSaveEdit} className="space-y-8 p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Entity Nomenclature</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Corporate Alias</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Communication Vector (Phone)</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">KRA Fiscal Identity</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" value={editData.kraPin} onChange={e => setEditData({ ...editData, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Geospatial Coordinates</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-[11px] uppercase font-black tracking-[0.3em] italic shadow-2xl">Authorize Profile Synchronization</button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingInteraction} onClose={() => setIsAddingInteraction(false)} title="Log Engagement Protocol">
                    <form onSubmit={handleAddInteraction} className="space-y-8 p-2">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Engagement Vector</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['Call', 'Meeting', 'Email', 'Proposal'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setNewInteraction({ ...newInteraction, type })}
                                        className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newInteraction.type === type ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20' : 'bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1 italic">Interaction Intelligence</label>
                            <textarea className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white min-h-[160px] py-6 leading-relaxed" placeholder="Document strategic outcomes..." required value={newInteraction.notes} onChange={e => setNewInteraction({ ...newInteraction, notes: e.target.value })} />
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-[11px] uppercase font-black tracking-[0.3em] shadow-xl italic">Commit to Historical Matrix</button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingClient} onClose={() => setIsAddingClient(false)} title="Stakeholder Registry Initiation">
                    <form onSubmit={handleRegisterClient} className="space-y-8 p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Entity Nomenclature</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required placeholder="Full Name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Corporate Alias</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required placeholder="Company" value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">KRA Fiscal Identity</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" placeholder="KRA PIN" value={newClient.kraPin} onChange={e => setNewClient({ ...newClient, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Geospatial Coordinates</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" placeholder="Physical Location" value={newClient.location} onChange={e => setNewClient({ ...newClient, location: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Communication Vector (Phone)</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required placeholder="+254..." value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-[11px] uppercase font-black tracking-[0.3em] italic shadow-2xl">Synchronize New Stakeholder</button>
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
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Vendor Network</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Supply Chain Ecosystem // {data.suppliers.length} Active Partners</p>
                    </div>
                    <button onClick={handleOpenAdd} className="btn-primary">
                        <Icon name="plus-circle" size={18} /> Register Partner Entity
                    </button>
                </div>

                <div className="card !p-0 overflow-hidden border-none bg-white dark:bg-white/5 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans">
                            <thead className="bg-[#0f172a] text-white">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Partner Identity</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Primary Liaison</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vertical Vertical</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {data.suppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{s.name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{s.email}</div>
                                        </td>
                                        <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-400 italic text-sm">{s.contact}</td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-brand-500/10 text-brand-500 rounded-lg text-[10px] font-black uppercase tracking-tighter">{s.category}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenEdit(s)} className="w-10 h-10 flex items-center justify-center bg-brand-500/10 hover:bg-brand-500 hover:text-white rounded-xl transition-all text-brand-500">
                                                    <Icon name="edit-3" size={16} />
                                                </button>
                                                <button onClick={() => { if (confirm('Archive Partner Entity?')) { deleteItem('suppliers', s.id); logActivity(`Archived vendor: ${s.name}`, 'Archive'); } }} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-rose-500">
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

                <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title={editingSupplier ? "Partner Entity Configuration" : "Stakeholder Registry Initiation"}>
                    <form onSubmit={handleSubmit} className="space-y-8 p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Entity Nomenclature</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Liaison Identity</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" required value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Communication Protocol (Email)</label>
                                <input type="email" className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white font-sans" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Operation Classification</label>
                                <select className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option>Material</option><option>Software</option><option>Infrastructure</option><option>Logistics</option><option>Marketing</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Fiscal Identity (KRA PIN)</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" value={formData.kraPin} onChange={e => setFormData({ ...formData, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Key Personnel</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Geospatial Logistics Center</label>
                                <input className="input-field !bg-slate-50 dark:!bg-white/5 !border-slate-200 dark:!border-white/10 !text-slate-900 dark:!text-white" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-[11px] uppercase font-black tracking-[0.3em] italic shadow-2xl">{editingSupplier ? "Authorize Config Update" : "Synchronize New Partner"}</button>
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
        const { data, user, updateData, deleteItem, logActivity, changePassword } = useContext(AppContext);
        const [isSyncing, setIsSyncing] = useState(false);
        const [syncLog, setSyncLog] = useState([]);
        const [activeSection, setActiveSection] = useState('profile'); // 'profile', 'security', 'integration', 'users'

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

        const handleProvisionUser = (e) => {
            e.preventDefault();
            if (editingUser) {
                const updated = data.users.map(u => u.id === editingUser.id ? { ...newUser, id: u.id } : u);
                updateData('users_bulk', updated);
                logActivity(`Provisioning updated for ${newUser.username}`, 'Update');
            } else {
                const userObj = { ...newUser, id: Date.now() };
                updateData('users', userObj);
                logActivity(`Provisioned new user: ${newUser.username}`, 'Access');
            }
            setIsAddingUser(false);
            setEditingUser(null);
            setNewUser({ name: '', username: '', password: '', role: 'reception' });
        };

        const handleEditClick = (u) => {
            setNewUser({ ...u });
            setEditingUser(u);
            setIsAddingUser(true);
        };

        const handlePwChange = async (e) => {
            e.preventDefault();
            if (pwData.new !== pwData.confirm) return alert('Passwords do not match');
            const success = await changePassword(pwData.current, pwData.new);
            if (success) {
                logActivity('Password changed successfully', 'Security');
                setPwData({ current: '', new: '', confirm: '' });
                alert('Security coordinates updated.');
            } else {
                alert('Verification failed. Invalid current credentials.');
            }
        };

        const renderProfile = () => (
            <div className="space-y-12 animate-slide">
                <div className="bg-[#0f172a] p-16 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden rounded-[3rem] ring-1 ring-white/10 shadow-2xl">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full translate-x-24 -translate-y-24"></div>
                    <div className="w-32 h-32 bg-brand-500 text-[#0f172a] rounded-[2.5rem] flex items-center justify-center text-5xl font-black shadow-[0_0_50px_rgba(250,204,21,0.3)] z-10 uppercase italic tracking-tighter ring-4 ring-white/10">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="z-10 text-center md:text-left space-y-2">
                        <h3 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">{user?.name}</h3>
                        <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <p className="text-brand-500 font-black uppercase text-[11px] tracking-[0.4em] leading-none">Executive Command Level</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                    <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-2">
                        <span className="font-black uppercase text-[10px] text-slate-400 tracking-[0.4em] italic mb-2 block">Personnel Identifier</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">admin@ighouzz.com</span>
                    </div>
                    <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-2">
                        <span className="font-black uppercase text-[10px] text-slate-400 tracking-[0.4em] italic mb-2 block">Auth Matrix Handle</span>
                        <span className="text-xl font-black text-brand-600 dark:text-brand-500 italic tracking-tighter uppercase">@{user?.username}</span>
                    </div>
                </div>
            </div>
        );

        const renderIntegration = () => (
            <div className="space-y-10 animate-slide">
                <div className="bg-slate-950 p-12 rounded-[3rem] relative overflow-hidden ring-1 ring-white/10 shadow-2xl">
                    <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full"></div>
                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center p-5 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" alt="Sheets" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-center md:text-left">
                            <h4 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none mb-3">Distributed Data Vault</h4>
                            <div className="flex items-center justify-center md:justify-start gap-3">
                                <span className="px-5 py-2 bg-emerald-500 text-black rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-emerald-500/20">Sync Operational</span>
                                <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] italic">G-Cloud Engine v4.0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic leading-none">Reconciliation Matrix Control</h5>
                        <button
                            onClick={handleFullSync}
                            disabled={isSyncing}
                            className={`flex items-center gap-4 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl ${isSyncing ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-brand-500 text-black hover:scale-[1.02] active:scale-95 shadow-brand-500/30'}`}
                        >
                            <Icon name={isSyncing ? 'refresh-cw' : 'rotate-cw'} size={18} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Synchronizing Intelligence...' : 'Initiate Full Handshake'}
                        </button>
                    </div>

                    <div className="bg-slate-950 p-10 rounded-[2.5rem] font-mono text-[11px] space-y-3 h-52 overflow-y-auto custom-scrollbar border border-white/5 shadow-2xl ring-1 ring-white/10">
                        {syncLog.map((log, i) => (
                            <div key={i} className="flex gap-6 border-b border-white/5 pb-3 last:border-none group">
                                <span className="text-slate-500 font-bold tracking-tighter">[{log.time}]</span>
                                <span className="text-brand-500 font-black tracking-tight group-last:text-emerald-400 italic">{log.msg}</span>
                            </div>
                        ))}
                        {syncLog.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <Icon name="database" size={32} className="text-white/5" />
                                <p className="text-white/10 italic text-center uppercase tracking-[0.5em] font-black">Ready for data reconciliation.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );

        const renderSecurity = () => (
            <div className="space-y-12 animate-slide">
                <div className="bg-rose-600 p-12 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-rose-600/30 ring-1 ring-white/10">
                    <h4 className="text-4xl font-black tracking-tighter uppercase italic mb-2 leading-none">Security Sentinel</h4>
                    <p className="text-white/60 font-black text-[11px] uppercase tracking-[0.4em] italic">Defense Matrix & Credential Rotation Protocols</p>
                    <div className="absolute right-0 bottom-0 p-12 opacity-10 rotate-12 scale-150">
                        <Icon name="shield-check" size={120} />
                    </div>
                </div>

                <div className="max-w-xl mx-auto space-y-10 px-4">
                    <div className="text-center space-y-2 mb-4">
                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Credential Rotation Matrix</h5>
                        <p className="text-slate-500 text-[10px] font-medium italic">Update your primary authentication vector below.</p>
                    </div>
                    <form onSubmit={handlePwChange} className="space-y-8">
                        <div className="space-y-6">
                            <input type="password" placeholder="Root Credentials (Current)" className="input-field !bg-white/5 !border-slate-200 dark:!border-white/10 !py-5 !px-8 !rounded-2xl" required value={pwData.current} onChange={e => setPwData({ ...pwData, current: e.target.value })} />
                            <input type="password" placeholder="New Auth Sequence" className="input-field !bg-white/5 !border-slate-200 dark:!border-white/10 !py-5 !px-8 !rounded-2xl" required value={pwData.new} onChange={e => setPwData({ ...pwData, new: e.target.value })} />
                            <input type="password" placeholder="Confirm New Matrix" className="input-field !bg-white/5 !border-slate-200 dark:!border-white/10 !py-5 !px-8 !rounded-2xl" required value={pwData.confirm} onChange={e => setPwData({ ...pwData, confirm: e.target.value })} />
                        </div>
                        <button type="submit" className="w-full btn-primary py-6 text-[11px] font-black uppercase tracking-[0.4em] italic shadow-2xl shadow-brand-500/30 hover:scale-[1.02] active:scale-95 transition-all">Authorize Sequence Update</button>
                    </form>
                </div>
            </div>
        );

        const renderUsers = () => (
            <div className="space-y-12 animate-slide">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 px-4">
                    <div className="text-center md:text-left space-y-2">
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Access Control Matrix</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">{data.users.length} Identified Entities // Active Privileges</p>
                    </div>
                    <button onClick={() => setIsAddingUser(true)} className="btn-primary py-5 px-10 text-[11px] font-black uppercase tracking-[0.3em] italic shadow-2xl flex items-center gap-3">
                        <Icon name="plus-circle" size={20} /> Provision New Entity
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-6 px-4">
                    {data.users.map(u => (
                        <div key={u.id} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between group hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-2xl">
                            <div className="flex flex-col sm:flex-row items-center gap-8 mb-6 sm:mb-0">
                                <div className="w-20 h-20 bg-slate-950 text-brand-500 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-2xl group-hover:bg-brand-500 group-hover:text-black transition-all perspective-1000 group-hover:rotate-y-12">
                                    {u.name.charAt(0)}
                                </div>
                                <div className="text-center sm:text-left space-y-1">
                                    <p className="text-2xl font-black text-slate-900 dark:text-white uppercase italic leading-none tracking-tighter">{u.name}</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                                        <p className="text-[10px] font-black text-brand-600 dark:text-brand-500 uppercase tracking-[0.3em] font-sans">@{u.username}</p>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">{u.role}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleEditClick(u)} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-white/5 text-slate-400 hover:text-brand-500 hover:shadow-xl hover:shadow-brand-500/20 rounded-2xl transition-all border border-slate-100 dark:border-white/5" title="Modify Privileges">
                                    <Icon name="edit-3" size={18} />
                                </button>
                                {u.id !== user.id && (
                                    <button onClick={() => { if (confirm(`Decommission access for ${u.username}?`)) { deleteItem('users', u.id); logActivity(`Access revoked for ${u.username}`, 'Archive'); } }} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:shadow-xl hover:shadow-rose-500/20 rounded-2xl transition-all border border-slate-100 dark:border-white/5" title="Revoke Permissions">
                                        <Icon name="shield-off" size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <Modal isOpen={isAddingUser} onClose={() => { setIsAddingUser(false); setEditingUser(null); }} title={editingUser ? "Update Access Privileges" : "Provision Fresh Access"}>
                    <form onSubmit={handleProvisionUser} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Full Name</label>
                                <input className="input-field" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Access Username</label>
                                <input className="input-field" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Primary Credentials (Password)</label>
                                <input type="password" className="input-field" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Permission Role</label>
                                <select className="input-field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option>admin</option><option>designer</option><option>reception</option><option>marketer</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest italic shadow-2xl">Execute Provisioning</button>
                    </form>
                </Modal>
            </div>
        );

        return (
            <div className="max-w-6xl mx-auto space-y-16 pb-32">
                <div className="flex flex-wrap justify-center lg:justify-start gap-6 p-4 bg-slate-100 dark:bg-white/5 rounded-[3.5rem] w-fit mx-auto lg:mx-0 shadow-inner ring-1 ring-slate-200 dark:ring-white/5">
                    {[
                        { id: 'profile', label: 'Identity Matrix', icon: 'user' },
                        { id: 'integration', label: 'G-Cloud Recon', icon: 'cloud-lightning' },
                        { id: 'security', label: 'Defense Sentinel', icon: 'shield-alert' },
                        { id: 'users', label: 'Access Protocol', icon: 'users' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id)}
                            className={`flex items-center gap-4 px-12 py-5 rounded-[3rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${activeSection === tab.id ? 'bg-slate-950 text-brand-500 shadow-2xl scale-105 ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            <Icon name={tab.icon} size={18} className={`${activeSection === tab.id ? 'animate-pulse' : 'text-slate-400'}`} />
                            {tab.label}
                            {activeSection === tab.id && <span className="absolute bottom-0 left-0 w-full h-1 bg-brand-500"></span>}
                        </button>
                    ))}
                </div>

                <div className="card !p-12 md:!p-20 shadow-[-50px_50px_100px_rgba(0,0,0,0.1)] border-none bg-white dark:bg-[#0f172a]/50 backdrop-blur-3xl rounded-[4rem] ring-1 ring-white/5">
                    {activeSection === 'profile' && renderProfile()}
                    {activeSection === 'integration' && renderIntegration()}
                    {activeSection === 'security' && renderSecurity()}
                    {activeSection === 'users' && renderUsers()}
                </div>
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
