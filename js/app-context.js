{
    const { useState, useEffect, useMemo, createContext, useContext } = React;

    const AppContext = createContext();

    const AppProvider = ({ children }) => {
        const [user, setUser] = useState(null);
        const [isDarkModeState, setIsDarkModeState] = useState(false);
        const [activeTab, setActiveTab] = useState('dashboard');
        const [isLoading, setIsLoading] = useState(true);
        const [invoiceDraft, setInvoiceDraft] = useState(null);

        const seedInvoice = (draftData) => {
            setInvoiceDraft(draftData);
            setActiveTab('sales');
        };

        const [data, setData] = useState({
            config: { next_invoice_id: 1001, tax_rate: 16, currency: 'KSh' },
            sales: [], expenses: [], projects: [], clients: [], suppliers: [],
            inventory: [], stockMovements: [], interactions: [], activities: [], users: []
        });

        // Helper to fetch all data from Supabase
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const { data: config } = await window.supabaseClient.from('config').select('*').single();
                const { data: sales } = await window.supabaseClient.from('sales').select('*').order('id', { ascending: false });
                const { data: expenses } = await window.supabaseClient.from('expenses').select('*').order('id', { ascending: false });
                const { data: projects } = await window.supabaseClient.from('projects').select('*').order('id', { ascending: false });
                const { data: clients } = await window.supabaseClient.from('clients').select('*');
                const { data: suppliers } = await window.supabaseClient.from('suppliers').select('*');
                const { data: inventory } = await window.supabaseClient.from('inventory').select('*');
                const { data: stockMovements } = await window.supabaseClient.from('stock_movements').select('*').order('id', { ascending: false });
                const { data: interactions } = await window.supabaseClient.from('interactions').select('*').order('id', { ascending: false });
                const { data: activities } = await window.supabaseClient.from('activities').select('*').order('id', { ascending: false }).limit(50);

                const { data: dbUsers } = await window.supabaseClient.from('users').select('*');

                setData(prev => ({
                    ...prev,
                    config: config || prev.config,
                    sales: sales || [],
                    expenses: expenses || [],
                    projects: projects || [],
                    clients: clients || [],
                    suppliers: suppliers || [],
                    inventory: inventory || [],
                    stockMovements: stockMovements || [],
                    interactions: interactions || [],
                    activities: activities || [],
                    users: dbUsers || prev.users
                }));
            } catch (err) {
                console.error('Supabase fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Helper to map JS CamelCase to Supabase snake_case with optional column filtering
        const toSnakeCase = (obj, filterKeys = null) => {
            const snakeObj = {};
            for (let key in obj) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                // Only include key if no filter list exists OR if it exists in the database sample
                if (!filterKeys || filterKeys.includes(snakeKey) || snakeKey === 'id') {
                    snakeObj[snakeKey] = obj[key];
                }
            }
            return snakeObj;
        };

        const getNextInvoiceNumber = () => {
            const num = data.config?.next_invoice_id || 1001;
            return `INV-${num}`;
        };

        const updateItem = async (tableName, id, item) => {
            setIsLoading(true);
            try {
                const { error } = await window.supabaseClient.from(tableName).update(toSnakeCase(item)).eq('id', id);
                if (error) throw error;
                await fetchAllData();
                return true;
            } catch (err) {
                console.error(`Update Error (${tableName}):`, err);
                return false;
            } finally {
                setIsLoading(false);
            }
        };
        const updateData = async (key, newItem) => {
            setIsLoading(true);
            try {
                // Map table names to snake_case (e.g., stockMovements -> stock_movements)
                const dataKey = key.replace('_bulk', '');
                const tableName = dataKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

                // Schema Awareness: Get sample of current data to identify valid columns
                // B6 Fix: fallback to null (allow all) if table is empty — Supabase will reject unknown cols
                const sample = data[dataKey]?.[0];
                const validColumns = sample ? Object.keys(sample) : null;

                // B5 Fix: Strip client-generated id from inserts — let DB auto-generate
                const prepareInsert = (item) => {
                    const snaked = toSnakeCase(item, validColumns);
                    delete snaked.id;
                    return snaked;
                };

                if (key === 'sales') {
                    const nextId = (data.config.next_invoice_id || 1001) + 1;
                    await window.supabaseClient.from('config').update({ next_invoice_id: nextId }).eq('id', 1);
                    await window.supabaseClient.from('sales').insert([prepareInsert(newItem)]);
                }
                else if (key.endsWith('_bulk')) {
                    const formattedItems = Array.isArray(newItem) ?
                        newItem.map(item => toSnakeCase(item, validColumns)) :
                        [toSnakeCase(newItem, validColumns)];
                    await window.supabaseClient.from(tableName).upsert(formattedItems);
                }
                else {
                    await window.supabaseClient.from(tableName).insert([prepareInsert(newItem)]);
                }

                await fetchAllData();
                return true;
            } catch (err) {
                console.error(`Update Error (${key}):`, err);
                return false;
            } finally {
                setIsLoading(false);
            }
        };

        const logActivity = async (msg, type = 'Action') => {
            const activity = {
                user: user?.username || 'system',
                type,
                msg,
                time: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
            };
            await window.supabaseClient.from('activities').insert([toSnakeCase(activity)]);
        };

        const deleteItem = async (key, id) => {
            setIsLoading(true);
            try {
                const tableName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                const { error } = await window.supabaseClient.from(tableName).delete().eq('id', id);
                if (error) throw error;
                await fetchAllData();
                return true;
            } catch (err) {
                console.error(`Delete Error (${key}):`, err);
                return false;
            } finally {
                setIsLoading(false);
            }
        };

        const clearTable = async (tableName) => {
            setIsLoading(true);
            try {
                const { error } = await window.supabaseClient.from(tableName).delete().neq('id', 0);
                if (error) throw error;
                await fetchAllData();
                return true;
            } catch (err) {
                console.error(`Clear Table Error (${tableName}):`, err);
                return false;
            } finally {
                setIsLoading(false);
            }
        };

        const changePassword = async (currentPassword, newPassword) => {
            if (!user || !user.id) return false;
            // Verify current password first
            const { data: check } = await window.supabaseClient
                .from('users').select('id').eq('id', user.id).eq('password', currentPassword);
            if (!check || check.length === 0) return false;

            const { error } = await window.supabaseClient.from('users').update({ password: newPassword }).eq('id', user.id);
            if (!error) {
                const { password: _, ...safeUser } = { ...user, password: newPassword };
                setUser({ ...user, password: newPassword });
                localStorage.setItem('expense_system_user', JSON.stringify(safeUser));
                return true;
            }
            return false;
        };

        const login = async (handle, password) => {
            console.log('IGH Auth: Handshake sequence initiated for handle:', handle);
            try {
                if (!window.supabaseClient) {
                    console.error('IGH Auth: Engine offline. Supabase client missing.');
                    return false;
                }

                // Username-only lookup
                const { data: foundUsers, error } = await window.supabaseClient
                    .from('users')
                    .select('*')
                    .eq('username', handle)
                    .eq('password', password);

                if (error) {
                    console.error('IGH Auth: Matrix rejection:', error);
                }

                // Emergency Fallback for System Initialization
                let userToSet = null;
                if ((!foundUsers || foundUsers.length === 0) && handle === 'admin' && password === 'admin') {
                    console.warn('IGH Auth: Emergency protocol engaged. Overriding with development handle.');
                    userToSet = { id: 0, display_name: 'System Admin', username: 'admin', role: 'admin', email: 'admin@ighouzz.com' };
                } else if (foundUsers && foundUsers.length > 0) {
                    const foundUser = foundUsers[0];
                    console.log('IGH Auth: Credentials verified. Access granted to:', foundUser.display_name);
                    userToSet = foundUser;
                }

                if (userToSet) {
                    const { password: _, ...safeUser } = userToSet;
                    const sessionData = {
                        user: safeUser,
                        timestamp: Date.now()
                    };
                    setUser(safeUser);
                    localStorage.setItem('igh_session', JSON.stringify(sessionData));
                    return true;
                }

                console.warn('IGH Auth: Credentials invalid or entity not found in matrix.');
                return false;
            } catch (err) {
                console.error('IGH Auth: Critical system fracture:', err);
                return false;
            }
        };

        const logout = () => {
            setUser(null);
            localStorage.removeItem('igh_session');
        };

        useEffect(() => {
            try {
                const sessionStr = localStorage.getItem('igh_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    const eightHours = 8 * 60 * 60 * 1000;

                    if (Date.now() - session.timestamp > eightHours) {
                        console.warn('IGH Auth: Session expired. Revoking access.');
                        logout();
                    } else if (session && session.user && (session.user.id !== undefined || session.user.username)) {
                        setUser(session.user);
                    }
                }
            } catch (e) {
                console.error('Core Engine: Restore failure, clearing corrupted node:', e);
                localStorage.removeItem('igh_session');
            }

            try {
                const savedDarkMode = localStorage.getItem('igh_dark_mode');
                if (savedDarkMode) {
                    const isDark = JSON.parse(savedDarkMode);
                    setIsDarkModeState(isDark);
                    if (isDark) document.documentElement.classList.add('dark');
                }
            } catch (e) { console.warn('UI Protocol: Mode restore failure:', e); }
        }, []);

        useEffect(() => {
            if (!user) return;

            // Initial load
            fetchAllData();

            // Real-time subscription — listens to ALL table changes and re-fetches
            let realtimeChannel = null;
            let debounceTimer = null;

            const triggerRefresh = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    fetchAllData();
                }, 800); // debounce rapid bursts into a single refresh
            };

            try {
                realtimeChannel = window.supabaseClient
                    .channel('igh-realtime-sync')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' },       triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' },    triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' },    triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' },     triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' },   triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' },   triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' }, triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' },  triggerRefresh)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' },       triggerRefresh)
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            console.log('IGH Realtime: Live sync active — all tables monitored.');
                        } else if (status === 'CHANNEL_ERROR') {
                            console.warn('IGH Realtime: Channel error, falling back to 60s polling.');
                        }
                    });
            } catch (err) {
                console.warn('IGH Realtime: Subscription failed, falling back to 60s polling.', err);
            }

            // Fallback polling every 60 seconds (covers cases where realtime is unavailable)
            const pollingInterval = setInterval(() => {
                fetchAllData();
            }, 60 * 1000);

            return () => {
                clearTimeout(debounceTimer);
                clearInterval(pollingInterval);
                if (realtimeChannel) {
                    window.supabaseClient.removeChannel(realtimeChannel);
                    console.log('IGH Realtime: Channel closed.');
                }
            };
        }, [user]);

        const contextValue = useMemo(() => ({
            user, setUser, login, logout, changePassword,
            data, setData, updateData, updateItem, deleteItem, clearTable, getNextInvoiceNumber,
            logActivity, fetchAllData,
            isDarkMode: isDarkModeState,
            setIsDarkMode: (val) => {
                setIsDarkModeState(val);
                localStorage.setItem('igh_dark_mode', JSON.stringify(val));
                if (val) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
            },
            activeTab, setActiveTab,
            invoiceDraft, setInvoiceDraft, seedInvoice,
            isLoading
        }), [user, data, isDarkModeState, activeTab, invoiceDraft, isLoading]);

        return (
            <AppContext.Provider value={contextValue}>
                {children}
                {isLoading && (
                    <div className="fixed bottom-8 right-8 z-[100] animate-bounce">
                        <div className="bg-brand-500 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                            <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                            Syncing with Cloud...
                        </div>
                    </div>
                )}
            </AppContext.Provider>
        );
    };

    // Attach to window for global scoping across Babel script blocks
    window.AppContext = AppContext;
    window.AppProvider = AppProvider;
}
