const SUPABASE_URL = 'https://rblgnalkjuxtxofchncy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8nwCLgs8JmKnile2SbZoJg_lvIMjR3i';

(function initSupabase(retries) {
    if (window.supabase) {
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('IGH System: Supabase client initialized.');
        } catch (err) {
            console.error('Supabase client creation failed:', err);
        }
    } else if (retries > 0) {
        console.warn('Supabase SDK not ready, retrying... (' + retries + ' left)');
        setTimeout(function () { initSupabase(retries - 1); }, 200);
    } else {
        console.error('Supabase SDK failed to load from CDN after multiple retries.');
    }
})(15);
