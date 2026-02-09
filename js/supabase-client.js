const SUPABASE_URL = 'https://rblgnalkjuxtxofchncy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8nwCLgs8JmKnile2SbZoJg_lvIMjR3i';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.supabaseClient = supabaseClient;
