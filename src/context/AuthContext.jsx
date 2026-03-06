/**
 * SyndicPulse — Auth Context
 *
 * Provides: user, role, accessibleBuildings, activeBuilding,
 *           setActiveBuilding, login, logout, loading
 *
 * Role behaviour:
 *   super_admin     → sees all buildings, can switch freely
 *   syndic_manager  → sees only their building(s), no switcher
 *   resident        → future: read-only portal (not implemented yet)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { BUILDINGS } from '../lib/mockData.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user,            setUser]            = useState(null)
    const [loading,         setLoading]         = useState(true)
    const [activeBuilding,  setActiveBuilding]  = useState(null)
    const [loginError,      setLoginError]      = useState('')

    // ── Derive accessible buildings from user role ───────────────────────────
    // Include extra buildings persisted in localStorage (added via AddBuildingModal)
    const extraBldgs = (() => {
        try { return JSON.parse(localStorage.getItem('sp_extra_buildings') ?? '[]') } catch { return [] }
    })()
    const allKnownBuildings = [...BUILDINGS, ...extraBldgs]
    const accessibleBuildings = user
        ? allKnownBuildings.filter(b => user.accessible_building_ids.includes(b.id))
        : []

    const canSwitchBuildings = user?.role === 'super_admin'

    // ── Restore session on page load ─────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user)
                initBuilding(session.user)
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user)
                initBuilding(session.user)
            } else {
                setUser(null)
                setActiveBuilding(null)
            }
        })

        // Re-check session when user returns to the tab — catches 8h expiry
        function handleVisibility() {
            if (document.visibilityState !== 'visible') return
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) {
                    setUser(null)
                    setActiveBuilding(null)
                }
            })
        }
        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            subscription.unsubscribe()
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [])

    function initBuilding(u) {
        // Set default active building — includes extra buildings from localStorage
        const extra = (() => {
            try { return JSON.parse(localStorage.getItem('sp_extra_buildings') ?? '[]') } catch { return [] }
        })()
        const buildings = [...BUILDINGS, ...extra].filter(b => u.accessible_building_ids.includes(b.id))
        if (buildings.length > 0) setActiveBuilding(buildings[0])
    }

    // ── Login ────────────────────────────────────────────────────────────────
    const login = useCallback(async (email, password) => {
        setLoginError('')
        setLoading(true)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) {
            setLoginError(error.message)
            return false
        }
        // Directly update state — the mock onAuthStateChange only fires on mount,
        // not on subsequent sign-ins. Real Supabase fires it automatically.
        // Supports both Supabase shape (data.session.user) and mock fallback (data.user)
        const u = data.session?.user ?? data.user
        setUser(u)
        initBuilding(u)
        return true
    }, [])

    // ── Logout ───────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        await supabase.auth.signOut()
        setUser(null)
        setActiveBuilding(null)
    }, [])

    const value = {
        user,
        role: user?.role ?? null,
        loading,
        loginError,
        setLoginError,
        accessibleBuildings,
        activeBuilding,
        setActiveBuilding,
        canSwitchBuildings,
        login,
        logout,
        isSuperAdmin: user?.role === 'super_admin',
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
