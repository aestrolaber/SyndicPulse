/**
 * SyndicPulse — Supabase Client
 *
 * CURRENT MODE: Mock client (Phase 0 development)
 *
 * TO SWITCH TO PRODUCTION:
 * 1. Run: npm install @supabase/supabase-js
 * 2. Create a .env file from .env.example
 * 3. Replace this entire file with:
 *
 *    import { createClient } from '@supabase/supabase-js'
 *    export const supabase = createClient(
 *      import.meta.env.VITE_SUPABASE_URL,
 *      import.meta.env.VITE_SUPABASE_ANON_KEY
 *    )
 */

import { DEMO_USERS, BUILDINGS, RESIDENTS_BLD1 } from './mockData.js'

const AUTH_KEY = 'sp_auth_user'

// ── Auth mock ──────────────────────────────────────────────────────────────────
const auth = {
    async signInWithPassword({ email, password }) {
        await delay(800) // simulate network
        const user = DEMO_USERS.find(
            u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        )
        if (!user) {
            return { data: null, error: { message: 'Email ou mot de passe incorrect.' } }
        }
        const safeUser = { ...user, password: undefined }
        // Match real Supabase shape: { data: { user, session: { user, access_token } } }
        const session = { user: safeUser, access_token: 'mock-token' }
        localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser))
        return { data: { user: safeUser, session }, error: null }
    },

    async signOut() {
        localStorage.removeItem(AUTH_KEY)
        return { error: null }
    },

    async getSession() {
        const stored = localStorage.getItem(AUTH_KEY)
        if (!stored) return { data: { session: null } }
        return { data: { session: { user: JSON.parse(stored) } } }
    },

    onAuthStateChange(callback) {
        // In production, Supabase fires this on token refresh, sign-in, sign-out
        // For mock: fire immediately with current state
        const stored = localStorage.getItem(AUTH_KEY)
        const user = stored ? JSON.parse(stored) : null
        setTimeout(() => callback('INITIAL_SESSION', user ? { user } : null), 0)
        // Return a fake subscription object
        return { data: { subscription: { unsubscribe: () => {} } } }
    },
}

// ── Database mock (mirrors Supabase query builder interface) ──────────────────
function createQueryBuilder(data) {
    let result = [...(data ?? [])]
    let limitN = null
    let orderCol = null
    let orderAsc = true

    const builder = {
        eq(col, val) {
            result = result.filter(row => row[col] === val)
            return builder
        },
        in(col, vals) {
            result = result.filter(row => vals.includes(row[col]))
            return builder
        },
        order(col, { ascending = true } = {}) {
            orderCol = col
            orderAsc = ascending
            return builder
        },
        limit(n) {
            limitN = n
            return builder
        },
        select() { return builder },
        async then(resolve) {
            await delay(200)
            let r = [...result]
            if (orderCol) r.sort((a, b) => orderAsc ? (a[orderCol] > b[orderCol] ? 1 : -1) : (a[orderCol] < b[orderCol] ? 1 : -1))
            if (limitN)   r = r.slice(0, limitN)
            resolve({ data: r, error: null })
        }
    }
    return builder
}

const DATABASE_MOCK = {
    buildings:  BUILDINGS,
    residents:  RESIDENTS_BLD1,
}

const db = {
    from(table) {
        return createQueryBuilder(DATABASE_MOCK[table] ?? [])
    }
}

// ── Public export (same shape as real Supabase client) ────────────────────────
export const supabase = {
    auth,
    from: (table) => db.from(table),
}

// ── Helper ────────────────────────────────────────────────────────────────────
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
