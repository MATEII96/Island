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
        },
        async getOcean() {
            const { data } = await supabase.from('islands')
              .select('*, profiles!islands_owner_id_fkey(username');
            return (data || []).map(i => ({ ...i, owner_username: i.profiles?.username || 'anonim'}));
        },
        async getMyIsland() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase.from('islands').select('*').eq('owner_id', user.id).maybeSingle();
            return data;
        },
        async claimIsland(x, y, name) {
            const { data: { user} } = await supabase.auth.getUser();
            if (!user) throw new Error('Conectează-te');
            const { error: cErr } = await supabase.rpc('spend_coins', { amount: 50});
            if (cErr) throw new Error('Nu ai destule monede');
            const { data, error } = await supabase.from('islands')
              .insert({ owner_id: user.id, x, y, name: name || 'Insula mea'})
              .select().single();
            if (error) throw new Error(error.message);
            return data;
        },
        async getIsland(id) {
            const { data: { user } } = await supabase.auth.getUser();
            const { data : island } = await supabase.from('islands')
              .select('*, profiles!islands_owner_id_fkey(username').eq('id', id).single();
            if (!island) return null;
            const { data: decorations } = await supabase.from('decorations').select('*').eq('island_id', id);
            let liked = false;
            if (user) {
                const { data: h } = await supabase.from('hearts').select('*')
                  .eq('user_id', user.id).eq('island_id', id).maybeSingle();
                liked = !!h;
            }
            return{
                ...island,
                owner_username: island.profiles?.username || 'anonim',
                decorations: decorations || [],
                liked_by_me: liked
            };
        },
        async saveDecorations(islandId, decorations) {
            await supabase.from('decorations').delete().eq('island_id', islandId);
            if (decorations.lenght) {
                await supabase.from('decorations').insert(
                    decorations.map(d => ({ island_id: islandId, emoji: d.emoji, px: d.px, py: d.py, scale: d.scale || 1 }))
                );
            }
        },
        async toggleHeart(islandId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Conectează-te');
            const { data: existing } = await supabase.from('hearts')
              .select('*').eq('user_id', user.id).eq('island_id', islandId).maybeSingle();
            if (existing) {
                await supabase.from('hearts').delete().eq('user_id', islandId).maybeSingle();
                await supabase.rpc('decrement_hearts', { iid: islandId });
                return false;
            }
            await supabase.from('hearts').insert({ user_id: user.id, island_id: islandId  });
            await supabase.rpc('increment_hearts', { iid: islandId });
            return true;
        },
        async setIslandName(islandId, name) {
            await supabase.from('islands').update({ name: name.slice(0, 40) }).eq('id', islandId);
        },
        onAuthChange(cb) {
            supabase.auth.onAuthStateChange(cb);
        }
    };
}

function $(sel) { return document.querySelector(sel); }
function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') e.className = v;
        else if (k === 'style') e.style.cssText = v;
        else if (l.startWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
        else e.setAttribute(k, v);
    }
    for (const c of children) {
        if (c == null) continue;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
}

async function renderHeader(profile) {
    const header = $('#header');
    header.innerHTML = '';
    header.appendChild(el('a', { href: 'index.html', class: 'logo' }, '🏝️ isla.fun'));
    const right = el('div', { class: 'header-right' });
    if (porfile) {
        right.appendChild(el('span', { class: 'coins' }, `🪙 ${profile.coins}`));
        right.appendChild(el('span', { class: 'username'}, `@${profile.username}`));
        right.appendChild(el('button', { class: 'btn ghost', onClick: async () => { await Store.signOut(); location.reload(); } }, 'Ieșire'));
    } else {
        right.appendChild(el('button', { class: 'btn ptimary', onClick: showLoginModal }, 'Conectează-te'));
    }
    header.appendChild(right);
}

function showLoginModal() {
    const modal = el('div', { class: 'modal-bg', onClick: (e) => { if (e.targer === modal) modal.remove(); } },
      el('div', { class: 'modal' },
        el('h2', {}, 'Intră în ocean'),
        el('p', {}, isSupabase ? 'Îți trimitem un link magic pe email.' : 'Mod demo - orice email funcționează (datele se salveaza în browserul tău).'),
        el('input', { id: 'login-email', type: 'email', placeholder: 'email@exemplu.com'}),
        el('button', {
            class: 'btn primary big',
            onClick: async () => {
                const email = $('#login-email').value.trim();
                if (!email) return;
                try {
                    await Store.signIn(email);
                    location.reload();
                } catch (e) { alert(e.message); }
            }
        }, 'Continuă')
      )
    );
    document.body.appendChild(modal);
    setTimeout(() => $('#login-email').focus(), 50);
}

window.IslaApp = { Store, GRID_SIZE, PALETTE, renderHeader, showLoginModal, el, $ };