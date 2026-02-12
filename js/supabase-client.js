const SUPABASE_URL = 'https://rblgnalkjuxtxofchncy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8nwCLgs8JmKnile2SbZoJg_lvIMjR3i';

if (window.supabase) {
    if (!SUPABASE_KEY.startsWith('eyJ')) {
        console.error('Critical: Invalid Supabase Anon Key detected. Keys should normally start with "eyJ". Please check your Supabase dashboard.');
    }
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = supabaseClient;
} else {
    console.error('Supabase SDK failed to initialize from CDN');
}
