const { useState, useEffect, useMemo, createContext, useContext } = React;

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
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
            const { data: inventory } = await window.supabaseClient.from('inventory').select('*');
            const { data: activities } = await window.supabaseClient.from('activities').select('*').order('id', { ascending: false }).limit(50);

            // For now, we keep users in local state or Supabase Auth, but let's fetch from table if it exists
            const { data: dbUsers } = await window.supabaseClient.from('users').select('*');

            setData(prev => ({
                ...prev,
                config: config || prev.config,
                sales: sales || [],
                expenses: expenses || [],
                projects: projects || [],
                clients: clients || [],
                inventory: inventory || [],
                activities: activities || [],
                users: dbUsers || prev.users
            }));
        } catch (err) {
            console.error('Supabase fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Migration logic
    const migrateLegacyData = async (localData) => {
        setIsLoading(true);
        try {
            const tables = ['sales', 'expenses', 'projects', 'clients', 'inventory', 'activities', 'users'];
            for (const table of tables) {
                if (localData[table] && localData[table].length > 0) {
                    await window.supabaseClient.from(table).upsert(localData[table]);
                }
            }
            if (localData.config) {
                await window.supabaseClient.from('config').upsert({ id: 1, ...localData.config });
            }
            await fetchAllData();
        } catch (err) {
            console.error('Migration Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Load & Migration
    useEffect(() => {
        const init = async () => {
            await fetchAllData();

            // Migration check: If no sales found, try migrating from localStorage
            const { count } = await window.supabaseClient.from('sales').select('*', { count: 'exact', head: true });
            if (!count || count === 0) {
                const saved = localStorage.getItem('expense_system_data');
                if (saved) {
                    const localData = JSON.parse(saved);
                    await migrateLegacyData(localData);
                }
            }
        };
        init();
    }, []);

    const getNextInvoiceNumber = () => {
        const num = data.config?.nextInvoiceId || 1001;
        return `INV-${num}`;
    };

    const updateData = async (key, newItem) => {
        setIsLoading(true);
        try {
            if (key === 'sales') {
                // Cloud Update: Sale + Config Increment
                const nextId = (data.config.nextInvoiceId || 1001) + 1;
                await window.supabaseClient.from('config').update({ next_invoice_id: nextId }).eq('id', 1);
                await window.supabaseClient.from('sales').insert([newItem]);
            }
            else if (key.endsWith('_bulk')) {
                const table = key.replace('_bulk', '');
                // Standard Supabase pattern for bulk: delete all and insert or upsert
                // For safety in this demo, we'll do upserts if possible or just handle specific ones
                await window.supabaseClient.from(table).upsert(newItem);
            }
            else {
                // Generic single insert
                await window.supabaseClient.from(key).insert([newItem]);
            }

            // Refresh local state after cloud update
            await fetchAllData();
        } catch (err) {
            console.error(`Update Error (${key}):`, err);
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
        await window.supabaseClient.from('activities').insert([activity]);
        // No need to refresh immediately for logs, or fetchAllData
    };

    const deleteItem = async (key, id) => {
        setIsLoading(true);
        try {
            await window.supabaseClient.from(key).delete().eq('id', id);
            await fetchAllData();
        } catch (err) {
            console.error(`Delete Error (${key}):`, err);
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
    }, []);

    return (
        <AppContext.Provider value={{
            user, setUser, login, logout, changePassword,
            data, setData, updateData, deleteItem, getNextInvoiceNumber,
            logActivity,
            isDarkMode, setIsDarkMode,
            activeTab, setActiveTab,
            invoiceDraft, setInvoiceDraft, seedInvoice,
            isLoading
        }}>
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
