{
    const { useState, useEffect, useMemo, createContext, useContext } = React;

    const AppContext = createContext();

    const AppProvider = ({ children }) => {
        const [user, setUser] = useState(null);
        const [isDarkModeState, setIsDarkModeState] = useState(false);
        const [activeTab, setActiveTab] = useState('dashboard');
        const [isLoading, setIsLoading] = useState(true);

        const [data, setData] = useState({
            config: { nextInvoiceId: 1001, taxRate: 16, currency: 'KSh' },
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

        const updateData = async (key, newItem) => {
            setIsLoading(true);
            try {
                // Map table names to snake_case (e.g., stockMovements -> stock_movements)
                const dataKey = key.replace('_bulk', '');
                const tableName = dataKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

                // Schema Awareness: Get sample of current data to identify valid columns
                const sample = data[dataKey]?.[0];
                const validColumns = sample ? Object.keys(sample) : null;

                if (key === 'sales') {
                    const nextId = (data.config.next_invoice_id || 1001) + 1;
                    await window.supabaseClient.from('config').update({ next_invoice_id: nextId }).eq('id', 1);
                    await window.supabaseClient.from('sales').insert([toSnakeCase(newItem, validColumns)]);
                }
                else if (key.endsWith('_bulk')) {
                    const formattedItems = Array.isArray(newItem) ?
                        newItem.map(item => toSnakeCase(item, validColumns)) :
                        [toSnakeCase(newItem, validColumns)];
                    await window.supabaseClient.from(tableName).upsert(formattedItems);
                }
                else {
                    await window.supabaseClient.from(tableName).insert([toSnakeCase(newItem, validColumns)]);
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
                id: Date.now(),
                user: user?.username || 'system',
                type,
                msg
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

        const changePassword = async (newPassword) => {
            // Simple update for now, in production use Supabase Auth's updateUser
            const { error } = await window.supabaseClient.from('users').update({ password: newPassword }).eq('id', user.id);
            if (!error) {
                const updatedUser = { ...user, password: newPassword };
                setUser(updatedUser);
                localStorage.setItem('expense_system_user', JSON.stringify(updatedUser));
                return true;
            }
            return false;
        };

        const login = async (username, password) => {
            // For simplicity during migration, we use the table
            const { data: foundUsers } = await window.supabaseClient.from('users').select('*').eq('username', username).eq('password', password);
            if (foundUsers && foundUsers.length > 0) {
                const foundUser = foundUsers[0];
                setUser(foundUser);
                localStorage.setItem('expense_system_user', JSON.stringify(foundUser));
                return true;
            }
            return false;
        };

        const logout = () => {
            setUser(null);
            localStorage.removeItem('expense_system_user');
        };

        const [invoiceDraft, setInvoiceDraft] = useState(null);

        const seedInvoice = (draft) => {
            setInvoiceDraft(draft);
            setActiveTab('sales');
        };

        useEffect(() => {
            const savedUser = localStorage.getItem('expense_system_user');
            if (savedUser) setUser(JSON.parse(savedUser));

            const savedDarkMode = localStorage.getItem('igh_dark_mode');
            if (savedDarkMode) {
                const isDark = JSON.parse(savedDarkMode);
                setIsDarkModeState(isDark);
                if (isDark) document.documentElement.classList.add('dark');
            }
        }, []);

        useEffect(() => {
            if (user) {
                fetchAllData();
            }
        }, [user]);

        const contextValue = useMemo(() => ({
            user, setUser, login, logout, changePassword,
            data, setData, updateData, deleteItem, getNextInvoiceNumber,
            logActivity,
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
