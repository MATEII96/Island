const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

const GRID_SIZE = 30;
const STARTING_COINS = 100;
const PALETTE = ['🌴','🌺','🏖️','⛵','🗼','🐚','🦀','🐠','🪸','🔥','🏠','🌊','🐢','🦩','🍹'];

const isSupabase = SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_');
const supabase = isSupabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const Store = isSupabase ? supabaseStore() : localStore();

function localStore() {
    const KEY = 'isla_demo_v1'
    const load = () => {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
        const init = {user: null, profiles: {}, islands: [], decorations: {}, hearts: {} };
        localStorage.setItem(KEY, JSON.stringify(init));
        return init;
    };
    const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));

    return{
        async signIn(email) {
            const s = load();
            const id = 'u_' + email.replace(/\W)/g, '').slice(0, 8);
            s.user = id;
            
        }
    }


}