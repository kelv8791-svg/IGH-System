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
                        <button onClick={() => { downloadCSV(data, filename); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"><Icon name="table" size={14} /> Excel Matrix</button>
                        <button onClick={() => { window.print(); setIsOpen(false); }} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"><Icon name="file-type-pdf" size={14} /> PDF Document</button>
                    </div>
                )}
            </div>
        );
    };

    const Dashboard = () => {
        const { data, updateData, setActiveTab } = useContext(AppContext);

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

                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Total Revenue', 'Total Expenses'],
                        datasets: [{
                            label: 'Kenya Shillings (KSh)',
                            data: [stats.revenue, stats.expenses],
                            backgroundColor: ['#facc15', '#18181b'],
                            borderRadius: 12,
                            barThickness: 40
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#18181b',
                                callbacks: {
                                    label: (context) => `KSh ${context.raw.toLocaleString()}`
                                }
                            }
                        },
                        scales: {
                            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }
        }, [stats]);

        return (
            <div className="space-y-10 animate-slide">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Executive Summary</h2>
                        <p className="text-slate-500 font-medium">Business performance and financial insights as of {new Date().toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                const exportData = [
                                    ...data.sales.map(s => ({ Type: 'Sale', Date: s.date, Client: s.client, Amount: s.amount, Status: s.status, Invoice: s.invoiceNo })),
                                    ...data.expenses.map(e => ({ Type: 'Expense', Date: e.date, Category: e.category, Amount: e.amount, Notes: e.notes || '' }))
                                ].sort((a, b) => new Date(b.Date) - new Date(a.Date));
                                downloadCSV(exportData, `IGH_Master_Log_${new Date().toISOString().split('T')[0]}.csv`);
                            }}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <Icon name="download" size={16} /> Export Data
                        </button>
                        {/* Transaction entry removed per user request */}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon="trending-up" label="Gross Revenue" value={`KSh ${stats.revenue.toLocaleString()}`} color="brand" trend="+12.5%" />
                    <StatCard icon="receipt" label="Total Expenses" value={`KSh ${stats.expenses.toLocaleString()}`} color="red" trend="-2.4%" />
                    <StatCard icon="briefcase" label="Active Projects" value={stats.projects} color="green" />
                    <StatCard icon="alert-circle" label="Direct Invoices" value={stats.pending} color="orange" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="card lg:col-span-2 h-[450px]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-slate-900">Revenue Analytics</h3>
                            <div className="flex gap-2">
                                {['7D', '1M', '3M', '1Y'].map(t => (
                                    <button key={t} className={`px-3 py-1 rounded-lg text-xs font-black ${t === '1M' ? 'bg-brand-500 text-black' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[320px]">
                            <canvas id="dashboardChart"></canvas>
                        </div>
                    </div>
                    <div className="card h-[450px] flex flex-col">
                        <h3 className="text-xl font-bold text-slate-900 mb-8">Category Allocation</h3>
                        <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                            {stats.topExpenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                    <Icon name="inbox" size={48} className="mb-2 opacity-20" />
                                    <p className="italic text-sm font-medium">No record yet</p>
                                </div>
                            ) : (
                                stats.topExpenses.map((ex, i) => (
                                    <div key={i} className="space-y-2 group">
                                        <div className="flex justify-between text-sm items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                                <span className="font-bold text-slate-700">{ex.name}</span>
                                            </div>
                                            <span className="text-slate-400 font-black text-xs">KSh {ex.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="bg-brand-500 h-full rounded-full transition-all duration-1000 ease-out group-hover:bg-slate-900"
                                                style={{ width: `${ex.pct}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-50">
                            <button className="w-full text-center text-sm font-bold text-brand-600 hover:text-brand-700 hover:underline">View All Expenses</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="card lg:col-span-2 p-10 flex flex-col">
                        <div className="flex justify-between items-center mb-10">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Restock Priority Matrix</h5>
                            <Icon name="package-search" size={16} className="text-rose-500" />
                        </div>
                        <div className="space-y-6 flex-1">
                            {lowStockItems.length > 0 ? lowStockItems.map((item, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider mb-2">
                                        <span className="text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors uppercase italic">{item.name}</span>
                                        <span className="text-rose-600 font-sans">{item.stock} / {item.minStock || 5} {item.unit}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out ${item.stock <= (item.minStock || 5) * 0.2 ? 'bg-rose-600' : 'bg-amber-500'}`}
                                            style={{ width: `${(item.stock / (item.minStock || 5)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                                    <Icon name="check-circle" size={40} className="text-emerald-500/20 mb-4" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Inventory levels optimal.<br />No priority restocks detected.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="card lg:col-span-3 p-10 flex flex-col bg-[#0f172a] text-white border-none relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000"><Icon name="activity" size={200} /></div>
                        <div className="flex justify-between items-center mb-10 z-10">
                            <h5 className="text-[10px] font-black text-brand-500 uppercase tracking-widest leading-none">Operational Logs</h5>
                            <button
                                onClick={() => { if (confirm('Wipe system logs?')) updateData('activities_bulk', []); }}
                                className="text-[9px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
                            >
                                [ Clear Logs ]
                            </button>
                        </div>
                        <div className="space-y-4 z-10 overflow-y-auto max-h-[300px] custom-scrollbar pr-4">
                            {(data.activities || []).map((log, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-white/0 hover:border-white/5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                        <Icon name={log.type === 'Success' ? 'check-circle' : log.type === 'Update' ? 'refresh-cw' : 'activity'} size={14} className={log.type === 'Success' ? 'text-emerald-500' : 'text-brand-500'} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold leading-snug">{log.msg}</p>
                                        <div className="flex items-center gap-3 mt-1.5 opacity-40">
                                            <span className="text-[10px] uppercase font-black tracking-widest font-sans italic">{log.time}</span>
                                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                                            <span className="text-[9px] uppercase font-black tracking-widest">{log.type}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ExpenseModule = () => {
        const { data, updateData } = useContext(AppContext);
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
            <div className="space-y-6 animate-slide">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20 text-white">
                            <Icon name="receipt" size={24} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Expenditure Tracking</h3>
                    </div>
                    <button onClick={() => setIsAdding(!isAdding)} className="btn-primary">
                        <Icon name={isAdding ? 'x' : 'plus'} size={18} /> {isAdding ? 'Cancel' : 'Add Expense'}
                    </button>
                </div>
                {isAdding && (
                    <div className="card border-brand-200 animate-slide">
                        <form onSubmit={addExpense} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Date</label>
                                <input type="date" className="input-field" required value={newExp.date} onChange={e => setNewExp({ ...newExp, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Amount (KSh)</label>
                                <input type="number" className="input-field" placeholder="0.00" required value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Category</label>
                                <select className="input-field" value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })}>
                                    <option>Office Supplies</option><option>Software</option><option>Marketing</option><option>Travel</option><option>Raw Materials</option><option>Human Resource</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Description / Notes</label>
                                <input type="text" className="input-field" placeholder="What was this for?" value={newExp.notes} onChange={e => setNewExp({ ...newExp, notes: e.target.value })} />
                            </div>
                            <div className="pt-6">
                                <button type="submit" className="btn-primary w-full py-4 uppercase tracking-widest text-xs">Save Expense</button>
                            </div>
                        </form>
                    </div>
                )}
                <div className="card p-0 overflow-hidden shadow-xl">
                    <table className="w-full text-left font-sans">
                        <thead className="bg-[#0f172a] text-white">
                            <tr>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Notes</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-8 py-5 font-bold text-slate-400">{exp.date}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">{exp.category}</span>
                                    </td>
                                    <td className="px-8 py-5 font-medium text-slate-600 dark:text-slate-400">{exp.notes}</td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white font-sans">KSh {parseFloat(exp.amount).toLocaleString()}</td>
                                    <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => { if (confirm('Delete expense entry?')) deleteItem('expenses', exp.id); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
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
        );
    };

    const SalesModule = () => {
        const { data, updateData, getNextInvoiceNumber, logActivity, invoiceDraft, setInvoiceDraft, seedInvoice } = useContext(AppContext);
        const [isAdding, setIsAdding] = useState(false);
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

        const handleSubmit = (e, isQuote = false) => {
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
            updateData('sales', sale);

            // Link to project if selected
            if (newSale.projectId) {
                const proj = data.projects.find(p => p.id === parseInt(newSale.projectId));
                if (proj) {
                    const updatedProjects = data.projects.map(p =>
                        p.id === proj.id ? { ...p, invoices: [...(p.invoices || []), sale.invoiceNo] } : p
                    );
                    updateData('projects_bulk', updatedProjects);
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
            }
        };

        const unbilledProjects = useMemo(() => {
            return data.projects.filter(p => p.stage === 'Delivered' && (!p.invoices || p.invoices.length === 0));
        }, [data.projects]);

        const handleSettle = (e) => {
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
            updateData('sales_bulk', updatedSales);

            // Link back to project if linked and fully paid
            if (isFullyPaid && settlingInvoice.projectId) {
                const updatedProjects = data.projects.map(p =>
                    p.id === parseInt(settlingInvoice.projectId) ? { ...p, status: 'Done & Paid', stage: 'Archived' } : p
                );
                updateData('projects_bulk', updatedProjects);
            }

            logActivity(`Invoice ${settlingInvoice.invoiceNo} settled via ${payments.map(p => p.mode).join('+')}`, 'Sync');
            setSettlingInvoice(null);
            setPayments([{ mode: 'Mpesa', amount: 0, ref: '' }]);
        };

        const statusCounts = useMemo(() => {
            const pending = data.sales.filter(s => s.status === 'Pending').length;
            const overdue = data.sales.filter(s => s.status === 'Overdue').length;
            const totalValue = data.sales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
            return { total: data.sales.length, pending, overdue, value: totalValue };
        }, [data.sales]);

        return (
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/20">
                            <Icon name="shopping-cart" size={24} className="text-black" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sales & Revenue</h3>
                            <p className="text-slate-500 font-medium italic">Pipeline: {statusCounts.pending} Pending Invoices</p>
                        </div>
                    </div>
                    <button onClick={() => setIsAdding(!isAdding)} className="btn-primary">
                        <Icon name={isAdding ? 'x' : 'plus'} size={18} /> {isAdding ? 'Cancel' : 'New Invoice'}
                    </button>
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-4 flex flex-col items-center justify-center text-center bg-slate-50 border-none">
                        <span className="text-2xl font-black">{statusCounts.total}</span>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Created</span>
                    </div>
                    <div className="card p-4 flex flex-col items-center justify-center text-center bg-amber-50 border-none">
                        <span className="text-2xl font-black text-amber-600">{statusCounts.pending}</span>
                        <span className="text-[10px] uppercase font-black text-amber-500/60 tracking-widest">Awaiting Pay</span>
                    </div>
                    <div className="card p-4 flex flex-col items-center justify-center text-center bg-emerald-50 border-none">
                        <span className="text-2xl font-black text-emerald-600 font-sans">KSh {statusCounts.value.toLocaleString()}</span>
                        <span className="text-[10px] uppercase font-black text-emerald-500/60 tracking-widest">Pipeline Value</span>
                    </div>
                    <div className="card p-4 flex flex-col items-center justify-center text-center bg-rose-50 border-none">
                        <span className="text-2xl font-black text-rose-600">{statusCounts.overdue}</span>
                        <span className="text-[10px] uppercase font-black text-rose-500/60 tracking-widest">Overdue</span>
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

                <div className="card p-0 overflow-hidden shadow-xl">
                    <table className="w-full text-left font-sans">
                        <thead className="bg-[#0f172a] text-white">
                            <tr>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Invoice ID</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Magnitude</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.sales.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-8 py-5 font-black text-slate-900">{sale.invoiceNo}</td>
                                    <td className="px-8 py-5 font-bold text-slate-500 italic shrink-0">{sale.client}</td>
                                    <td className="px-8 py-5 font-black text-slate-400 text-xs font-sans italic">{sale.date}</td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 font-sans tracking-tight">KSh {parseFloat(sale.amount).toLocaleString()}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${sale.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
                                            sale.status === 'Partial' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                            }`}>
                                            {sale.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setNewSale({
                                                        ...sale,
                                                        items: sale.items || [{ desc: '', qty: 1, price: 0 }]
                                                    });
                                                    setIsAdding(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-brand-600 transition-colors"
                                                title="Edit Blueprint"
                                            >
                                                <Icon name="edit-3" size={16} />
                                            </button>
                                            <button onClick={() => setSelectedInvoice(sale)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Print/PDF spec">
                                                <Icon name="printer" size={16} />
                                            </button>
                                            <button onClick={() => setSettlingInvoice(sale)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Record Payment">
                                                <Icon name="wallet" size={16} />
                                            </button>
                                            <button onClick={() => { if (confirm('Delete ledger entry?')) deleteItem('sales', sale.id); }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Delete">
                                                <Icon name="trash-2" size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody >
                    </table >
                </div >

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
        if (!invoice) return null;
        const { data } = useContext(AppContext);

        const handlePrint = () => {
            window.print();
        };

        return (
            <div className="space-y-12 py-4" id="invoice-content">
                <div className="flex justify-between items-start border-b border-slate-100 pb-8 no-print">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-brand-500 rounded-3xl flex items-center justify-center text-4xl font-black italic shadow-2xl shadow-brand-500/20">
                            IG
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Invoice</h3>
                            <p className="text-sm font-black text-brand-600 italic mt-1 tracking-widest">{invoice.invoiceNo}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 shadow-xl">
                            <Icon name="printer" size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Print Paper</span>
                        </button>
                        <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {invoice.status}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-start hidden print-only">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm"><img src="logo.jpg" alt="Logo" className="w-12 h-12 object-contain" /></div>
                        <div><h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Identity Graphics Houzz</h2><p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-none mt-1">Nakuru, Kenya</p></div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-5xl font-black text-slate-100 uppercase tracking-tighter mb-2">INVOICE</h1>
                        <div className="text-sm font-black text-slate-900 uppercase">Ref: {invoice.invoiceNo}</div>
                        <div className="text-xs font-bold text-slate-400 italic">Issued: {invoice.date}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-20">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Business Data</h4>
                        <div className="text-sm space-y-1 font-medium">
                            <p className="font-black text-slate-900">Identity Graphics Houzz</p>
                            <p>Pekars Building, 4th Floor</p>
                            <p>Mburu Gichua Rd, Nakuru-KENYA</p>
                            <p>Tel: +254714-561-533</p>
                            <p className="italic underline text-brand-600">identitygraphics@gmail.com</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Billed Subject</h4>
                        <div className="text-sm space-y-1 font-medium"><p className="font-black uppercase">{invoice.client}</p><p>{data.clients.find(c => c.name === invoice.client)?.company}</p><p>{data.clients.find(c => c.name === invoice.client)?.email}</p></div>
                    </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Item Detail</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Qty</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Rate</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Total</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(invoice.items || []).map((item, i) => (
                                <tr key={i} className="text-sm font-medium">
                                    <td className="px-6 py-4 font-bold text-slate-900">{item.desc}</td>
                                    <td className="px-6 py-4 text-center">{item.qty}</td>
                                    <td className="px-6 py-4 text-right">KSh {parseFloat(item.price).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-black">KSh {(item.qty * item.price).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end pt-8">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm font-medium text-slate-500"><span>Subtotal</span><span>KSh {(invoice.subtotal || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm font-medium text-slate-400 italic"><span>VAT ({invoice.taxRate}%)</span><span>KSh {(invoice.tax || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between text-xl font-black text-slate-900 pt-4 border-t"><span>Payable</span><span className="text-brand-600">KSh {parseFloat(invoice.amount).toLocaleString()}</span></div>
                        <div className="pt-8 flex justify-center no-print">
                            <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2 italic">
                                <Icon name="printer" size={14} /> Commit to Paper
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-20 border-t text-center space-y-2">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">Identity Graphics Houzz</p>
                    <p className="text-[9px] text-brand-600 font-black uppercase tracking-[0.3em]">where creativity meets excellence</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest pt-2">Digital Copy • Authorized for Release</p>
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

        const handleAdjustStock = (e) => {
            e.preventDefault();
            const item = data.inventory.find(i => i.id === isAdjustingStock);
            if (!item) return;

            const newStock = adjustment.type === 'In' ? item.stock + adjustment.qty : item.stock - adjustment.qty;

            // Update inventory item
            const updatedInventory = data.inventory.map(i =>
                i.id === isAdjustingStock ? { ...i, stock: Math.max(0, newStock) } : i
            );

            // Push record to movements (using direct setState since we don't have a specific movement helper yet)
            const movement = {
                id: Date.now(),
                itemId: isAdjustingStock,
                itemName: item.name,
                sku: item.sku,
                type: adjustment.type,
                qty: adjustment.qty,
                date: new Date().toISOString().split('T')[0],
                reference: adjustment.reference,
                notes: adjustment.notes
            };

            // Batch update
            updateData('inventory_bulk', updatedInventory); // I need to add support for bulk or direct setData
            updateData('stockMovements', movement);

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/20 text-[#0f172a]">
                            <Icon name="package" size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Stock & Inventory</h3>
                            <p className="text-slate-500 font-medium italic">Warehouse: {stats.totalItems} SKUs • {stats.lowStock} Low Stock Alerts</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { if (isAddingItem) { setEditingItem(null); setNewItem({ sku: '', name: '', category: 'Raw Materials', stock: 0, unit: 'pcs', minStock: 5, price: 0 }); } setIsAddingItem(!isAddingItem); }} className="btn-primary">
                            <Icon name={isAddingItem ? 'x' : 'plus'} size={18} /> {isAddingItem ? 'Dismiss' : 'Register SKU'}
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-white border-slate-100 border-l-8 border-brand-500">
                        <h4 className="text-3xl font-black text-slate-900 font-sans tracking-tighter">KSh {stats.totalValue.toLocaleString()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Asset Valuation</p>
                    </div>
                    <div className="card bg-white border-slate-100 border-l-8 border-emerald-500">
                        <h4 className="text-3xl font-black text-slate-900 font-sans tracking-tighter">{stats.totalItems}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Unique SKUs</p>
                    </div>
                    <div className={`card border-slate-100 border-l-8 ${stats.lowStock > 0 ? 'border-rose-500 animate-pulse' : 'border-slate-200'}`}>
                        <h4 className={`text-3xl font-black font-sans tracking-tighter ${stats.lowStock > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.lowStock}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Critically Low</p>
                    </div>
                </div>

                {isAddingItem && (
                    <div className="card shadow-2xl border-brand-200 animate-slide">
                        <form onSubmit={handleAddItem} className="space-y-6">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 italic border-b pb-3">
                                {editingItem ? `Refining SKU: ${editingItem.sku}` : 'Register Fresh SKU'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">SKU Code</label>
                                    <input className="input-field" placeholder="e.g. VIN-RD-01" required value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Item Name</label>
                                    <input className="input-field" placeholder="Glossy Red Vinyl" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Category</label>
                                    <select className="input-field" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                        <option>Raw Materials</option><option>Media</option><option>Ink/Chemicals</option><option>Finished Goods</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initial Stock</label>
                                    <input type="number" className="input-field" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Unit</label>
                                    <input className="input-field" placeholder="m, L, pcs" required value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Min. Warning Level</label>
                                    <input type="number" className="input-field" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Unit Price (KSh)</label>
                                    <input type="number" className="input-field" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                <div className={`text-sm font-black text-emerald-600 transition-opacity duration-300 ${isSuccess ? 'opacity-100' : 'opacity-0'}`}>
                                    <Icon name="check-circle" size={16} className="inline mr-2" />
                                    Committed Successfully!
                                </div>
                                <button type="submit" className="btn-primary py-4 px-10">Commit SKU</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Inventory Table */}
                <div className="card p-0 overflow-hidden shadow-2xl">
                    <table className="w-full text-left font-sans italic">
                        <thead className="bg-[#0f172a] text-white">
                            <tr>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">SKU / Item</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Availability</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.inventory.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="font-black text-slate-900 uppercase">{item.sku}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.name}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-tighter">{item.category}</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className={`text-xl font-black ${item.stock <= item.minStock ? 'text-rose-500' : 'text-slate-900'}`}>
                                            {item.stock} <small className="text-[10px] text-slate-400">{item.unit}</small>
                                        </div>
                                        <div className="w-20 bg-slate-100 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                                            <div className={`h-full ${item.stock <= item.minStock ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (item.stock / (item.minStock * 4)) * 100)}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-3 transition-all duration-300">
                                            <button onClick={() => setIsAdjustingStock(item.id)} className="p-2.5 bg-brand-50 hover:bg-brand-500 hover:text-white hover:scale-110 rounded-xl transition-all text-brand-600 shadow-sm border border-brand-100" title="Adjust Stock">
                                                <Icon name="refresh-cw" size={14} />
                                            </button>
                                            <button onClick={() => { setEditingItem(item); setNewItem({ ...item }); setIsAddingItem(true); }} className="p-2.5 bg-slate-50 hover:bg-slate-900 hover:text-white hover:scale-110 rounded-xl transition-all text-slate-400 shadow-sm border border-slate-100" title="Modify Details">
                                                <Icon name="edit-3" size={14} />
                                            </button>
                                            <button onClick={() => { if (confirm(`Purge ${item.sku} from registry?`)) { deleteItem('inventory', item.id); logActivity(`Inventory purged: ${item.sku}`, 'Archive'); } }} className="p-2.5 bg-rose-50 hover:bg-rose-500 hover:text-white hover:scale-110 rounded-xl transition-all text-rose-400 shadow-sm border border-rose-100" title="Delete Item">
                                                <Icon name="trash-2" size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Adjustment Modal */}
                <Modal isOpen={!!isAdjustingStock} onClose={() => setIsAdjustingStock(null)} title="Stock Adjustment Flow">
                    {isAdjustingStock && (() => {
                        const item = data.inventory.find(i => i.id === isAdjustingStock);
                        return (
                            <form onSubmit={handleAdjustStock} className="space-y-8">
                                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl">
                                    <div className="w-16 h-16 bg-[#0f172a] text-brand-500 rounded-2xl flex items-center justify-center text-xl font-black">{item?.sku.charAt(0)}</div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{item?.name}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Inventory: {item?.stock} {item?.unit}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Movement Type</label>
                                        <div className="flex gap-4">
                                            <button type="button" onClick={() => setAdjustment({ ...adjustment, type: 'In' })} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adjustment.type === 'In' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}>Input (+)</button>
                                            <button type="button" onClick={() => setAdjustment({ ...adjustment, type: 'Out' })} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adjustment.type === 'Out' ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-100 text-slate-400'}`}>Output (-)</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Quantity ({item?.unit})</label>
                                        <input type="number" className="input-field py-4 text-center text-2xl font-black" required value={adjustment.qty} onChange={e => setAdjustment({ ...adjustment, qty: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Reference (Project / Order ID)</label>
                                        <input className="input-field" placeholder="e.g. PRJ-204" value={adjustment.reference} onChange={e => setAdjustment({ ...adjustment, reference: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Internal Notes</label>
                                        <textarea className="input-field h-24" placeholder="Reason for adjustment..." value={adjustment.notes} onChange={e => setAdjustment({ ...adjustment, notes: e.target.value })}></textarea>
                                    </div>
                                </div>

                                <button type="submit" className={`w-full py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all ${adjustment.type === 'In' ? 'bg-black text-brand-500' : 'bg-black text-rose-500'}`}>
                                    Commit Movement Record
                                </button>
                            </form>
                        );
                    })()}
                </Modal>

                {/* Recent Movements */}
                <div className="card lg:col-span-3 h-80 flex flex-col p-10">
                    <div className="flex justify-between items-center mb-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none italic">Movement Forensics</h5>
                        <Icon name="history" size={16} className="text-brand-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
                        {(data.stockMovements || []).length > 0 ? data.stockMovements.map(m => (
                            <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-brand-500 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${m.type === 'In' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {m.type === 'In' ? '+' : '-'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white leading-none uppercase italic">{m.itemName}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{m.sku} • {m.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 dark:text-white font-sans">{m.qty} Units</p>
                                    <p className="text-[9px] font-black text-brand-600 uppercase italic mt-1">{m.reference || 'Manual Adj'}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <Icon name="drafts" size={32} className="opacity-20 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Awaiting stock signals...</p>
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
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-brand-500">
                            <Icon name="users" size={24} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Client Portals</h3>
                    </div>
                    <button onClick={() => setIsAddingClient(true)} className="btn-primary">
                        <Icon name="plus" size={18} /> Add New Client
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {
                        data.clients.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedClient(c)}
                                className="card flex items-center gap-5 hover:border-brand-500 transition-all group cursor-pointer"
                            >
                                <div className="w-14 h-14 bg-slate-900 text-brand-500 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg group-hover:bg-brand-500 group-hover:text-black transition-all">
                                    {c.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 italic tracking-tight uppercase leading-none">{c.name}</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{c.company}</p>
                                </div>
                            </div>
                        ))
                    }
                </div >

                <Modal
                    isOpen={!!selectedClient}
                    onClose={() => setSelectedClient(null)}
                    title={`360° Client Profile: ${selectedClient?.name}`}
                >
                    {selectedClient && (
                        <div className="space-y-10 py-4">
                            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 bg-[#0f172a] text-brand-500 rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl">
                                        {selectedClient.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedClient.name}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedClient.company}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={handleOpenEdit} className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-white hover:bg-slate-900 hover:text-white rounded-2xl border border-slate-200 transition-all shadow-sm text-slate-700 font-black uppercase text-[10px] tracking-widest group">
                                        <Icon name="edit-3" size={18} className="group-hover:scale-110 transition-transform" />
                                        <span>Configure Profile</span>
                                    </button>
                                    <button onClick={handleDelete} className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-white hover:bg-rose-500 hover:text-white rounded-2xl border border-slate-200 transition-all shadow-sm text-slate-700 font-black uppercase text-[10px] tracking-widest group">
                                        <Icon name="trash-2" size={18} className="group-hover:scale-110 transition-transform" />
                                        <span>Archive Entity</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-slate-50 p-6 rounded-3xl border-b-8 border-brand-500">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Lifetime Value</p>
                                    <p className="text-2xl font-black text-slate-900 font-sans tracking-tight">KSh {totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border-b-8 border-emerald-500">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Active Projects</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight text-emerald-600">{clientProjects.filter(p => p.status === 'Active').length}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border-b-8 border-slate-900">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Interactions</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">{clientInteractions.length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 italic">History Timeline</h5>
                                        <button onClick={() => setIsAddingInteraction(true)} className="text-[10px] font-black text-brand-600 uppercase hover:underline">+ Log Interaction</button>
                                    </div>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {clientInteractions.map(i => (
                                            <div key={i.id} className="p-5 bg-white border border-slate-100 rounded-3xl relative group hover:shadow-xl transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${i.type === 'Meeting' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {i.type}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-300 italic">{i.date}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{i.notes}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h5 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 italic">Recent Sales</h5>
                                        <div className="space-y-2">
                                            {clientSales.slice(0, 3).map(s => (
                                                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{s.invoiceNo}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">{s.date}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900 font-sans">KSh {parseFloat(s.amount).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Update Client Entity">
                    <form onSubmit={handleSaveEdit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Full Name</label>
                                <input className="input-field" required value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Company Name</label>
                                <input className="input-field" required value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Phone Contact</label>
                                <input className="input-field" required value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">KRA Pin</label>
                                <input className="input-field" value={editData.kraPin} onChange={e => setEditData({ ...editData, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Location</label>
                                <input className="input-field" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest italic tracking-tighter shadow-2xl">Commit Profile Changes</button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingInteraction} onClose={() => setIsAddingInteraction(false)} title="Success Log: Fresh Engagement">
                    <form onSubmit={handleAddInteraction} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Engagement Type</label>
                            <select className="input-field" value={newInteraction.type} onChange={e => setNewInteraction({ ...newInteraction, type: e.target.value })}>
                                <option>Call</option><option>Meeting</option><option>Email</option><option>Proposal</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Interaction Summary</label>
                            <textarea className="input-field min-h-[120px] py-4" placeholder="Summary of discussion..." required value={newInteraction.notes} onChange={e => setNewInteraction({ ...newInteraction, notes: e.target.value })} />
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest shadow-xl italic">Commit to History</button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingClient} onClose={() => setIsAddingClient(false)} title="Register Fresh Client Entity">
                    <form onSubmit={handleRegisterClient} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Full Name</label>
                                <input className="input-field" required value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Company Name</label>
                                <input className="input-field" required value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">KRA Pin</label>
                                <input className="input-field" value={newClient.kraPin} onChange={e => setNewClient({ ...newClient, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Location</label>
                                <input className="input-field" value={newClient.location} onChange={e => setNewClient({ ...newClient, location: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Phone Contact</label>
                                <input className="input-field" required value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest italic shadow-2xl">Commit New Client</button>
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
            <div className="space-y-6 animate-slide">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 text-white font-black">
                            <Icon name="truck" size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Vendor Network</h3>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">{data.suppliers.length} Active Partners</p>
                        </div>
                    </div>
                    <button onClick={handleOpenAdd} className="btn-primary py-3 px-8">
                        <Icon name="plus" size={18} /> Add Vendor Entity
                    </button>
                </div>

                <div className="card p-0 overflow-hidden shadow-2xl border-none">
                    <table className="w-full text-left font-sans italic">
                        <thead className="bg-[#0f172a] text-white">
                            <tr>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Vendor Entity</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Primary Liaison</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Vertical</th>
                                <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.suppliers.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="font-black text-slate-900 uppercase tracking-tight">{s.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 italic">{s.email}</div>
                                    </td>
                                    <td className="px-8 py-5 font-bold text-slate-500">{s.contact}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-brand-100 text-brand-900 rounded-lg font-black uppercase text-[10px]">{s.category}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenEdit(s)} className="p-2 hover:bg-brand-500 hover:text-white rounded-xl transition-all text-slate-400">
                                                <Icon name="edit-3" size={16} />
                                            </button>
                                            <button onClick={() => { deleteItem('suppliers', s.id); logActivity(`Deleted vendor: ${s.name}`, 'Archive'); }} className="p-2 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-slate-400">
                                                <Icon name="trash-2" size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title={editingSupplier ? "Configure Vendor Entity" : "Register Fresh Vendor"}>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Entity Name</label>
                                <input className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Liaison Name</label>
                                <input className="input-field" required value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Email Protocol</label>
                                <input type="email" className="input-field" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Vertical Category</label>
                                <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option>Material</option><option>Software</option><option>Infrastructure</option><option>Logistics</option><option>Marketing</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">KRA Pin (Tax Identity)</label>
                                <input className="input-field" value={formData.kraPin} onChange={e => setFormData({ ...formData, kraPin: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Contact Person</label>
                                <input className="input-field" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Operational Address</label>
                                <input className="input-field" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest italic">{editingSupplier ? "Commit Updates" : "Register Vendor Entity"}</button>
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

        const handleSubmit = (e) => {
            e.preventDefault();
            if (selectedProject && isAdding) {
                const updated = data.projects.map(p => p.id === selectedProject ? { ...formData, id: p.id } : p);
                updateData('projects_bulk', updated);
                logActivity(`Updated project: ${formData.name}`, 'Update');
            } else {
                const project = { ...formData, id: Date.now(), team: [], bom: [], assets: [] };
                updateData('projects', project);
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

        const consumeBOM = (projectId, bomId) => {
            const project = data.projects.find(p => p.id === projectId);
            const bomItem = project.bom.find(b => b.id === bomId);
            if (!bomItem || bomItem.status === 'Consumed') return;
            const inventoryItem = data.inventory.find(i => i.id === bomItem.itemId);
            if (inventoryItem) {
                updateData('inventory_bulk', data.inventory.map(i => i.id === bomItem.itemId ? { ...i, stock: Math.max(0, i.stock - bomItem.qty) } : i));
                updateData('stockMovements', { id: Date.now(), itemId: bomItem.itemId, sku: bomItem.sku, type: 'Out', qty: bomItem.qty, date: new Date().toISOString().split('T')[0], reference: `PRJ-${projectId}`, notes: `Consumed for project: ${project.name}` });
            }
            updateData('projects_bulk', data.projects.map(p => p.id === projectId ? { ...p, bom: p.bom.map(b => b.id === bomId ? { ...b, status: 'Consumed' } : b) } : p));
            logActivity(`Material consumed for ${project.name}`, 'Action');
        };

        const handleAddAsset = (e) => {
            e.preventDefault();
            const project = data.projects.find(p => p.id === selectedProject);
            const asset = { id: Date.now(), name: newAsset.name, url: newAsset.url, status: 'Pending Approval' };
            updateData('projects_bulk', data.projects.map(p => p.id === selectedProject ? { ...p, assets: [...(p.assets || []), asset] } : p));
            logActivity(`New asset uploaded for ${project.name}`, 'Upload');
            setIsAddingAsset(false);
        };

        return (
            <div className="space-y-8 animate-slide">
                <div className="flex justify-between items-center bg-slate-900 p-8 rounded-3xl shadow-2xl border-none text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                        <Icon name="briefcase" size={150} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black italic tracking-tighter uppercase">Project Hub</h3>
                        <p className="text-brand-500 font-black uppercase text-[10px] tracking-widest mt-1 opacity-70">Enterprise Lifecycle Management</p>
                    </div>
                    <button onClick={handleOpenAdd} className="btn-primary py-4 px-10 relative z-10 shadow-xl shadow-brand-500/20">
                        <Icon name="plus" size={18} /> Initiate Fresh Project
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.projects.map(p => (
                        <div key={p.id} className="bg-white rounded-[2rem] border border-slate-100 p-5 group hover:shadow-2xl transition-all duration-500 flex flex-col gap-4 relative overflow-hidden">
                            {/* Status & Actions Bar */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${p.status === 'Completed' ? 'bg-emerald-500' : 'bg-brand-500 animate-pulse'}`}></span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{p.status}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleOpenEdit(p)} className="p-2 hover:bg-slate-900 hover:text-white rounded-xl transition-all text-slate-300">
                                        <Icon name="edit-3" size={14} />
                                    </button>
                                    <button onClick={() => { if (confirm('Archive Project?')) { deleteItem('projects', p.id); logActivity(`Archived project: ${p.name}`, 'Archive'); } }} className="p-2 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-slate-300">
                                        <Icon name="trash-2" size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Title & Client */}
                            <div>
                                <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-tight truncate group-hover:text-brand-600 transition-colors">{p.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Client: <span className="text-slate-900">{p.client}</span></p>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Lead Designer</span>
                                    <span className="text-[10px] font-black text-slate-700 italic truncate">@{p.designer || 'pending'}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Deadline</span>
                                    <span className="text-[10px] font-black text-rose-500 font-sans">{p.deadline}</span>
                                </div>
                            </div>

                            {/* Stage Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{p.stage || 'Brief'}</span>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">PRJ-{p.id.toString().slice(-4)}</span>
                                </div>
                                <div className="flex gap-1 h-1.5">
                                    {stages.map((stage, idx) => {
                                        const currentIdx = stages.indexOf(p.stage || 'Brief');
                                        const isCompleted = idx < currentIdx;
                                        const isActive = idx === currentIdx;
                                        return (
                                            <div
                                                key={stage}
                                                onClick={() => { updateData('projects_bulk', data.projects.map(proj => proj.id === p.id ? { ...proj, stage: stage } : proj)); logActivity(`${p.name} -> ${stage}`, 'Sync'); }}
                                                className={`flex-1 rounded-full cursor-pointer transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : isActive ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-slate-100'}`}
                                                title={stage}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action Buttons Hub */}
                            <div className="flex flex-col gap-2 mt-auto pt-2">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => seedInvoice({ client: p.client, projectId: p.id, itemName: `Project Billing: ${p.name}`, amount: 0 })}
                                        className="flex-1 px-4 py-3 bg-brand-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Icon name="file-plus" size={14} /> Link to Billing
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedProject(p.id); setIsAddingBOM(true); }} className="flex-1 py-2 bg-slate-900 text-brand-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-lg">
                                        <Icon name="package" size={10} /> Materials
                                    </button>
                                </div>
                                {p.stage === 'Delivered' && (
                                    <button
                                        onClick={() => seedInvoice({ client: p.client, projectId: p.id, itemName: p.name, amount: 0 })}
                                        className="w-full py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-md animate-pulse"
                                    >
                                        <Icon name="receipt" size={10} /> Billing Required
                                    </button>
                                )}
                                {p.invoices && p.invoices.length > 0 && (
                                    <div className="mt-1 pt-2 border-t border-slate-50">
                                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest block mb-1">Linked Records</span>
                                        <div className="flex flex-wrap gap-1">
                                            {p.invoices.map(inv => (
                                                <span key={inv} className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md text-[8px] font-black italic border border-brand-100">{inv}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <Modal isOpen={isAdding} onClose={() => { setIsAdding(false); setSelectedProject(null); }} title={selectedProject ? "Edit Project Blueprint" : "Initiate fresh project"}>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Project Name</label>
                                <input className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Client Entity</label>
                                <select className="input-field" required value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })}>
                                    <option value="">Select Liaison...</option>
                                    {data.clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Target Delivery Date</label>
                                <input type="date" className="input-field font-sans" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Lead Creative (Designer)</label>
                                <select className="input-field" value={formData.designer} onChange={e => setFormData({ ...formData, designer: e.target.value })}>
                                    <option value="">Unassigned</option>
                                    {data.users.filter(u => u.role === 'designer' || u.role === 'admin').map(u => (
                                        <option key={u.id} value={u.username}>{u.name} (@{u.username})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest italic shadow-2xl">{selectedProject ? "Commit Blueprint Updates" : "Initiate Execution Pipeline"}</button>
                    </form>
                </Modal>

                <Modal isOpen={isAddingBOM} onClose={() => { setIsAddingBOM(false); setSelectedProject(null); }} title="Project Bill of Materials">
                    <form onSubmit={handleAddBOM} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Select Material SKU</label>
                            <select className="input-field" required value={newBOMItem.itemId} onChange={e => setNewBOMItem({ ...newBOMItem, itemId: e.target.value })}>
                                <option value="">Choose an item...</option>
                                {data.inventory.map(i => <option key={i.id} value={i.id}>{i.sku} - {i.name} (Stock: {i.stock})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Quantity Required</label>
                            <input type="number" className="input-field" required value={newBOMItem.qty} onChange={e => setNewBOMItem({ ...newBOMItem, qty: parseFloat(e.target.value) })} />
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest shadow-xl">Commit Materials to Project</button>

                        {/* Inline list of existing BOM if needed, but for now we keep it simple as requested */}
                    </form>
                </Modal>

                <Modal isOpen={isAddingAsset} onClose={() => { setIsAddingAsset(false); setSelectedProject(null); }} title="Register Design Asset">
                    <form onSubmit={handleAddAsset} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Asset Name</label>
                            <input className="input-field" placeholder="e.g. Logo Concept V1" required value={newAsset.name} onChange={e => setNewAsset({ ...newAsset, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Asset URL / Reference</label>
                            <input className="input-field" placeholder="e.g. https://figma.com/..." required value={newAsset.url} onChange={e => setNewAsset({ ...newAsset, url: e.target.value })} />
                        </div>
                        <button type="submit" className="btn-primary w-full py-5 text-sm uppercase font-black tracking-widest shadow-xl">Commit Asset to Pipeline</button>
                    </form>
                </Modal>
            </div>
        );
    };

    const ReportModule = () => {
        const { data } = useContext(AppContext);
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
            <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-[#0f172a] text-white border-none relative overflow-hidden group p-8">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-150 transition-transform duration-1000"><Icon name="trending-up" size={120} /></div>
                        <h4 className="text-3xl font-black text-brand-500 font-sans tracking-tighter italic">KSh {stats.revenue.toLocaleString()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Gross Revenue</p>
                    </div>
                    <div className="card bg-white border-slate-100 border-b-4 border-b-rose-500 p-8">
                        <h4 className="text-3xl font-black text-slate-900 font-sans tracking-tighter italic">KSh {stats.expenses.toLocaleString()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Operating Cost</p>
                    </div>
                    <div className="card bg-white border-slate-100 border-b-4 border-b-emerald-500 p-8">
                        <h4 className="text-3xl font-black text-emerald-600 font-sans tracking-tighter italic">KSh {stats.netProfit.toLocaleString()}</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Net Liquidity</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="card lg:col-span-3 h-96 flex flex-col p-10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-brand-500/5"></div>
                        <div className="z-10 mb-6 flex justify-between items-center">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Financial Trajectory</h5>
                            <Icon name="activity" size={16} className="text-brand-500" />
                        </div>
                        <div className="flex-1 w-full z-10"><canvas id="revenueFlowChart"></canvas></div>
                    </div>
                    <div className="card lg:col-span-2 h-96 flex flex-col p-10">
                        <div className="mb-6"><h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cost Allocation Distribution</h5></div>
                        <div className="flex-1 text-xs cursor-pointer"><canvas id="expenseDistributionChart"></canvas></div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase text-center mt-4 italic italic">Tip: Click segments to drill into details</p>
                    </div>
                </div>

                <Modal isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)} title={`Expense Drill-down: ${selectedCategory}`}>
                    <div className="space-y-4 py-4">
                        {data.expenses.filter(e => e.category === selectedCategory).map(e => (
                            <div key={e.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                <div>
                                    <p className="text-sm font-black text-slate-900">{e.notes || 'Uncategorized Expense'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">{e.date}</p>
                                </div>
                                <span className="text-sm font-black text-rose-600 font-sans">KSh {parseFloat(e.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </Modal>
            </div>
        );

        const renderPL = () => (
            <div className="card p-0 overflow-hidden shadow-2xl animate-slide border-none">
                <div className="bg-[#0f172a] p-12 flex justify-between items-center text-white">
                    <div>
                        <h3 className="text-4xl font-black tracking-tighter uppercase italic">P&L Statement</h3>
                        <p className="text-brand-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">Fiscal Performance Audit</p>
                    </div>
                    <button onClick={() => window.print()} className="btn-primary py-3 px-6 text-xs uppercase tracking-widest">Generate Report PDF</button>
                </div>
                <div className="p-12 bg-white">
                    <table className="w-full text-left font-sans italic">
                        <tbody className="divide-y divide-slate-100">
                            {/* Revenue Section */}
                            <tr className="bg-slate-50"><td className="py-4 px-6 font-black text-slate-900 uppercase tracking-widest text-xs">I. Total Operating Revenue</td><td className="py-4 px-6 text-right font-black text-slate-900">KSh {stats.revenue.toLocaleString()}</td></tr>
                            <tr><td className="py-4 px-8 text-sm text-slate-500 font-bold">Gross Sales (Invoiced)</td><td className="py-4 px-6 text-right text-slate-900 font-bold">KSh {stats.revenue.toLocaleString()}</td></tr>

                            {/* COGS Section */}
                            <tr className="bg-slate-50 mt-8"><td className="py-4 px-6 font-black text-slate-900 uppercase tracking-widest text-xs">II. Cost of Goods Sold (BOM)</td><td className="py-4 px-6 text-right font-black text-rose-600">(KSh {stats.cogs.toLocaleString()})</td></tr>
                            <tr><td className="py-4 px-8 text-sm text-slate-500 font-bold">Material Consumption</td><td className="py-4 px-6 text-right text-slate-900 font-bold">KSh {stats.cogs.toLocaleString()}</td></tr>

                            {/* Gross Profit */}
                            <tr className="bg-brand-500/10"><td className="py-6 px-6 font-black text-slate-900 uppercase tracking-widest text-sm">Gross Profit Margin</td><td className="py-6 px-6 text-right font-black text-slate-900 text-lg">KSh {stats.grossProfit.toLocaleString()}</td></tr>

                            {/* Expenses Section */}
                            <tr className="bg-slate-50 mt-8"><td className="py-4 px-6 font-black text-slate-900 uppercase tracking-widest text-xs">III. Operating Expenses</td><td className="py-4 px-6 text-right font-black text-rose-600">(KSh {stats.expenses.toLocaleString()})</td></tr>
                            {Object.entries(data.expenses.reduce((acc, e) => {
                                acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
                                return acc;
                            }, {})).map(([cat, amt]) => (
                                <tr key={cat}><td className="py-4 px-8 text-sm text-slate-500 font-bold">{cat}</td><td className="py-4 px-6 text-right text-slate-900 font-bold">KSh {amt.toLocaleString()}</td></tr>
                            ))}

                            {/* Net Income */}
                            <tr className="bg-slate-900 text-white"><td className="py-8 px-6 font-black uppercase tracking-[0.3em] text-brand-500">Net Business Income</td><td className="py-8 px-6 text-right font-black text-3xl italic tracking-tighter">KSh {stats.netProfit.toLocaleString()}</td></tr>
                        </tbody>
                    </table>
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
            <div className="card p-0 overflow-hidden shadow-2xl animate-slide border-none">
                <div className="bg-[#0f172a] p-12 flex justify-between items-center text-white">
                    <div>
                        <h3 className="text-4xl font-black tracking-tighter uppercase italic">Balance Sheet</h3>
                        <p className="text-brand-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">System Asset Evaluation</p>
                    </div>
                    <div className="text-right text-slate-400 text-[10px] font-black uppercase tracking-widest">As of: {new Date().toLocaleDateString()}</div>
                </div>
                <div className="p-12 bg-white grid grid-cols-2 gap-12 font-sans italic">
                    <div className="space-y-6">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Assets</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-500">Cash & Equivalents</span><span className="font-black text-slate-900">KSh {stats.cash.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-500">Inventory Valuation</span><span className="font-black text-slate-900">KSh {stats.inventoryValue.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center border-t pt-4"><span className="text-sm font-black text-slate-900 uppercase">Total Assets</span><span className="text-xl font-black text-brand-600">KSh {(stats.cash + stats.inventoryValue).toLocaleString()}</span></div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-2">Liabilities & Equity</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-500">Accounts Payable</span><span className="font-black text-slate-900 text-slate-300 italic">KSh 0</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-500">Retained Earnings</span><span className="font-black text-slate-900">KSh {stats.netProfit.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center border-t pt-4"><span className="text-sm font-black text-slate-900 uppercase">Total Equity</span><span className="text-xl font-black text-slate-900">KSh {stats.netProfit.toLocaleString()}</span></div>
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
                            { id: 'bs', label: 'Balance Sheet' }
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

                {reportView === 'overview' ? renderOverview() : reportView === 'pl' ? renderPL() : renderBS()}
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
                    <div className="card p-0 overflow-hidden shadow-2xl border-none">
                        <div className="bg-[#0f172a] p-8 text-white">
                            <h4 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                                <Icon name="scan-barcode" size={24} className="text-brand-500" />
                                Inventory Scanner
                            </h4>
                        </div>
                        <div className="p-8 space-y-8 bg-white">
                            <div className="relative aspect-video bg-slate-100 rounded-3xl overflow-hidden border-4 border-slate-50 flex flex-col items-center justify-center group">
                                {isScanning ? (
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10">
                                        <div className="w-40 h-40 border-2 border-brand-500 rounded-2xl relative animate-pulse">
                                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-brand-500 shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-bounce"></div>
                                        </div>
                                        <p className="text-white text-[10px] font-black uppercase tracking-widest mt-6">Searching optics...</p>
                                    </div>
                                ) : (
                                    <Icon name="camera" size={48} className="text-slate-200 group-hover:text-slate-300 transition-colors" />
                                )}
                                {!isScanning && !scanResult && <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4">Optical input ready</p>}
                                {scanResult && !isScanning && (
                                    <div className="absolute inset-0 bg-emerald-500/90 flex flex-col items-center justify-center p-8 text-center animate-slide">
                                        <Icon name="check-circle" size={48} className="text-white mb-4" />
                                        <h5 className="text-white font-black uppercase text-xl italic leading-none">{scanResult.name}</h5>
                                        <p className="text-white/80 font-bold text-xs mt-2 uppercase tracking-widest">{scanResult.sku}</p>
                                        <div className="bg-white/20 px-4 py-2 rounded-xl mt-6 text-white font-black text-sm">Stock: {scanResult.stock} {scanResult.unit}</div>
                                        <button onClick={() => setScanResult(null)} className="mt-6 text-white text-[10px] font-black uppercase tracking-widest hover:underline">Dismiss Profile</button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={simulateScan}
                                disabled={isScanning}
                                className="btn-primary w-full py-5 text-sm uppercase tracking-widest font-black flex items-center justify-center gap-3"
                            >
                                <Icon name="maximize" size={18} />
                                Engage Optical Engine
                            </button>
                        </div>
                    </div>

                    {/* Receipt OCR Simulation */}
                    <div className="card p-0 overflow-hidden shadow-2xl border-none">
                        <div className="bg-[#0f172a] p-8 text-white">
                            <h4 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                                <Icon name="receipt" size={24} className="text-brand-500" />
                                Receipt Intelligence
                            </h4>
                        </div>
                        <div className="p-8 space-y-8 bg-white">
                            <label className="block relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-all flex flex-col items-center justify-center p-8 group">
                                <input type="file" className="hidden" accept="image/*" onChange={handleReceiptUpload} />
                                {receiptFile ? (
                                    <div className="text-center">
                                        <Icon name="file-text" size={48} className="text-brand-500 mx-auto mb-4" />
                                        <p className="text-slate-900 font-black text-xs uppercase italic">{receiptFile.name}</p>
                                        <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">Filesize: {(receiptFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <>
                                        <Icon name="upload-cloud" size={48} className="text-slate-200 group-hover:text-brand-500 transition-colors" />
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4">Drop physical evidence</p>
                                    </>
                                )}
                            </label>

                            {ocrResult && (
                                <div className="p-6 bg-slate-900 rounded-2xl animate-slide relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-4 opacity-10"><Icon name="cpu" size={60} className="text-brand-500" /></div>
                                    {typeof ocrResult === 'string' ? (
                                        <div className="flex items-center gap-3 text-brand-500 font-black text-[10px] uppercase tracking-widest">
                                            <Icon name="loader" size={14} className="animate-spin" />
                                            {ocrResult}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h6 className="text-brand-500 text-[10px] font-black uppercase tracking-widest">Entity Detected</h6>
                                                    <p className="text-white font-black text-lg uppercase italic">{ocrResult.vendor}</p>
                                                </div>
                                                <div className="text-right">
                                                    <h6 className="text-brand-500 text-[10px] font-black uppercase tracking-widest">Amount</h6>
                                                    <p className="text-white font-black text-lg italic">KSh {ocrResult.amount.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    updateData('expenses', { id: Date.now(), ...ocrResult, notes: `Scanned from mobile at ${new Date().toLocaleTimeString()}` });
                                                    setOcrResult(null);
                                                    setReceiptFile(null);
                                                }}
                                                className="w-full bg-white/10 hover:bg-white text-white hover:text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                                            >
                                                Commit to Ledger
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
        const { data, user, updateData, logActivity, changePassword } = useContext(AppContext);
        const [isSyncing, setIsSyncing] = useState(false);
        const [syncLog, setSyncLog] = useState([]);
        const [activeSection, setActiveSection] = useState('profile'); // 'profile', 'security', 'integration', 'users'

        const [isAddingUser, setIsAddingUser] = useState(false);
        const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'reception' });
        const [editingUser, setEditingUser] = useState(null);
        const [pwData, setPwData] = useState({ current: '', new: '', confirm: '' });

        // Google Sheets Integration
        const CLIENT_ID = '30962656774-3dgcq5q2rk340o71p358i2fd6h53jc3n.apps.googleusercontent.com';
        const SPREADSHEET_ID = '1jZTc8sJJ6dZSLkTwgr9Z6r6YBGi8qnZtiHNSBLQUmdA';
        const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

        const [tokenResponse, setTokenResponse] = useState(null);

        const handleFullSync = async () => {
            setIsSyncing(true);
            setSyncLog([{ time: new Date().toLocaleTimeString(), msg: 'Starting secure reconciliation...' }]);

            try {
                // 1. Authenticate via GIS
                const client = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
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
                    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheet.name}!A1:Z1000?valueInputOption=RAW`, {
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

        const handlePwChange = (e) => {
            e.preventDefault();
            if (pwData.new !== pwData.confirm) return alert('Passwords do not match');
            if (changePassword(pwData.current, pwData.new)) {
                logActivity('Password changed successfully', 'Security');
                setPwData({ current: '', new: '', confirm: '' });
                alert('Security coordinates updated.');
            } else {
                alert('Verification failed. Invalid current credentials.');
            }
        };

        const renderProfile = () => (
            <div className="space-y-8 animate-slide">
                <div className="bg-[#0f172a] p-10 flex items-center gap-8 relative overflow-hidden rounded-3xl">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-brand-500 opacity-10 rounded-full translate-x-16 -translate-y-16"></div>
                    <div className="w-24 h-24 bg-brand-500 text-[#0f172a] rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl shadow-brand-500/20 z-10 uppercase italic">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="z-10">
                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">{user?.name}</h3>
                        <p className="text-brand-500 font-black uppercase text-[10px] tracking-widest leading-none mt-2">Executive Access Level</p>
                    </div>
                </div>
                <div className="p-2 space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-4">
                        <span className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em]">Email Address</span>
                        <span className="font-bold text-slate-600 italic">admin@ighouzz.com</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-4">
                        <span className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em]">Auth Handle</span>
                        <span className="font-black text-slate-900 italic tracking-tight uppercase">@{user?.username}</span>
                    </div>
                </div>
            </div>
        );

        const renderIntegration = () => (
            <div className="space-y-8 animate-slide">
                <div className="bg-slate-900 p-8 rounded-3xl relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500 opacity-20 blur-3xl"></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-3 shadow-xl">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" alt="Sheets" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white tracking-tight uppercase italic leading-none mb-2">Google Cloud Sync</h4>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Operational</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Synchronization Control</h5>
                        <button
                            onClick={handleFullSync}
                            disabled={isSyncing}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-brand-500 text-black shadow-lg shadow-brand-500/30'}`}
                        >
                            <Icon name={isSyncing ? 'refresh-cw' : 'rotate-cw'} size={14} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Synchronizing Intelligence...' : 'Initiate Full Sync'}
                        </button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl font-mono text-[10px] space-y-2 h-40 overflow-y-auto custom-scrollbar border border-slate-100">
                        {syncLog.map((log, i) => (
                            <div key={i} className="flex gap-4 border-b border-slate-200 pb-2 last:border-none">
                                <span className="text-slate-400 font-bold">[{log.time}]</span>
                                <span className="text-slate-900 font-bold">{log.msg}</span>
                            </div>
                        ))}
                        {syncLog.length === 0 && <p className="text-slate-300 italic">Ready for data reconciliation.</p>}
                    </div>
                </div>
            </div>
        );

        const renderSecurity = () => (
            <div className="space-y-10 animate-slide">
                <div className="bg-rose-500 p-8 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-rose-500/20">
                    <h4 className="text-2xl font-black tracking-tighter uppercase italic mb-1">Defense Matrix</h4>
                    <p className="text-white/60 font-black text-[10px] uppercase tracking-widest">Credentials & Security Protocols</p>
                    <div className="absolute right-0 bottom-0 p-8 opacity-10 rotate-12 scale-150">
                        <Icon name="shield-check" size={100} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Rotate Credentials</h5>
                        <form onSubmit={handlePwChange} className="space-y-6">
                            <input type="password" placeholder="Current Password" className="input-field" required value={pwData.current} onChange={e => setPwData({ ...pwData, current: e.target.value })} />
                            <input type="password" placeholder="New Password" className="input-field" required value={pwData.new} onChange={e => setPwData({ ...pwData, new: e.target.value })} />
                            <input type="password" placeholder="Confirm New Password" className="input-field" required value={pwData.confirm} onChange={e => setPwData({ ...pwData, confirm: e.target.value })} />
                            <button type="submit" className="w-full btn-primary py-4 text-[10px] font-black uppercase tracking-widest">Update Security Credentials</button>
                        </form>
                    </div>

                </div>
            </div>
        );

        const renderUsers = () => (
            <div className="space-y-8 animate-slide">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Control Room</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Executive Overview & Command Panel</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsAddingUser(true)} className="btn-primary bg-brand-500 text-black border-none"><Icon name="plus" size={16} /> New User</button>
                        {/* <ExportDropdown data={data.sales} filename="igh-executive-summary" /> */}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {data.users.map(u => (
                        <div key={u.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white transition-all shadow-sm hover:shadow-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-slate-900 text-brand-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg group-hover:bg-brand-500 group-hover:text-black transition-all">
                                    {u.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-900 uppercase italic leading-none">{u.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">@{u.username} • {u.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleEditClick(u)} className="p-3 text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl transition-all" title="Edit User">
                                    <Icon name="edit-3" size={18} />
                                </button>
                                {u.id !== user.id && (
                                    <button onClick={() => { if (confirm(`Revoke access for ${u.username}?`)) { updateData('users_bulk', data.users.filter(usr => usr.id !== u.id)); logActivity(`Access revoked for ${u.username}`, 'Archive'); } }} className="p-3 text-slate-300 hover:text-white hover:bg-rose-500 rounded-xl transition-all" title="Delete User">
                                        <Icon name="trash-2" size={18} />
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
            <div className="max-w-5xl mx-auto space-y-12 pb-20">
                <div className="flex gap-4 p-3 bg-slate-100 rounded-[2.5rem] w-fit mx-auto lg:mx-0 shadow-inner">
                    {[
                        { id: 'profile', label: 'Identity', icon: 'user' },
                        { id: 'integration', label: 'Cloud Sync', icon: 'cloud-lightning' },
                        { id: 'security', label: 'Sentinel', icon: 'shield-alert' },
                        { id: 'users', label: 'Access Control', icon: 'users' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id)}
                            className={`flex items-center gap-3 px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === tab.id ? 'bg-slate-900 text-brand-500 shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon name={tab.icon} size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="card p-12 shadow-2xl border-none bg-white rounded-[3rem]">
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
