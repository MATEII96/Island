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
            if (!s.profiles[id]) {
              s.profiles[id] = { id, username: email.split('@')[0], coins: STARTING_COINS };
            }
            save(s);
            return s.profiles[id];
        },
        async signOut() {
            const s = load();
            s.user = null;
            save(s);
        },
        async getProfile() {
            const s = load();
            return s.user ? s.profiles[s.user] : null;
        },
        async getOcean(){
            const s = load();
            return s.islands.map(i => ({
                ...i,
                owner_username: s.profiles[i.owner_id]?.username || 'anonim'
            }))
        },
        async getMyIsland() {
            const s = load();
            if (!s.user) return null;
            return s.islands.find(i => i.owner_id === s.user) || null;
        },
        async claimIsland(x, y, name) {
            const s = load();
            if (!s.user) throw new Error('Trebuie să te conectezi');
            if (s.islands.find(i => i.owner_id === s.user)) throw new Error('Ai deja o insulă');
            if (s.islands.find(i => i.x === x && i.y === y)) throw new Error('Slotul e ocupat');
            const cost = 50;
            if (s.profiles[s.user].coins < cost) throw new Error('Nu ai destule monede');
            s.profiles[s.user].coins -= cost;
            const island = {
                id: 'i_' + Date.now(),
                owner_id: s.user, x, y, name: name || 'Insula mea',
                hearts_count: 0, visits_count: 0
            };
            s.islands.push(island);
            s.decorations[island.id] = [];
            save(s);
            return island;
        },
        async getIsland(id) {
            const s = load();
            const island = s.island.find(i => i.id === id);
            if (!island) return null;
            return {
                ...island,
                owner_username: s.profiles[island.owner_id]?.username || 'anonim',
                decorations: s.decorations[island.id] || [],
                liked_by_me: s.user ? !!s.hearts[`${s.user}:${island.id}`] : false
            };
        },
        async saveDecorations(islandId, decorations) {
            const s = load();
            if (!s.user) throw new Error('Trebuie să te conectezi');
            const island = s.islands.find(i => i.id === islandId);
            if (!island || island.owner_id !== s.user) throw new Error('Nu e insula ta');
            s.decorations[islandId] = decorations;
            save(s);
        },
        async toggleHeart(islandId) {
            const s = load();
            if (!s.user) throw new Error('Conectează-te');
            const k = `${s.user}:${islandId}`;
            const island = s.islands.find(i => i.id === islandId);
            if (!island) return;
            if (s.hearts[k]) {
                delete s.hearts[k];
                island.hearts_count = Math.max(0, island.hearts_count - 1);
            } else {
                s.hearts[k] = true;
                island.hearts_count++;
            }
            save(s);
            return !!s.hearts[k];
        },
        async setIslandName(islandId, name) {
            const s = load();
            const island = s.islands.find(i => i.id === islandId);
            if (!island || island.owner_id !== s.user) throw new Error('Nu e insula ta');
            island.name = name.slice(0, 40);
            save(s);
        },
        onAuthChange(cb) {}
    };
}

function supabaseStore() {
    return {
        async signIn(email) {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            alert('Verifică emailul pentru linkul magic de autentificare.');
        },
        async signOut() { await supabase.auth.signOut(); },
        async getProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return data;
        }
    }
}