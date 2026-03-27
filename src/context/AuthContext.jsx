import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [employeeProfile, setEmployeeProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchUserRole = useCallback(async (authUser) => {
        if (!authUser) {
            setUser(null)
            setUserRole(null)
            setEmployeeProfile(null)
            setLoading(false)
            return
        }

        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (userError) throw userError

            setUser(authUser)
            setUserRole(userData.role)

            if (userData.role === 'employee') {
                const { data: empData, error: empError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .single()

                if (!empError) setEmployeeProfile(empData)
            }
        } catch (error) {
            console.error('Error fetching user role:', error)
            setUser(null)
            setUserRole(null)
            setEmployeeProfile(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        // Timeout fallback: if Supabase is unreachable (e.g. placeholder .env),
        // resolve loading after 5 seconds so the UI is still usable.
        const timeoutId = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn('[AttendanceIQ] Auth check timed out. Supabase may be unreachable. Check your .env file.')
                    return false
                }
                return prev
            })
        }, 5000)

        supabase.auth.getSession().then(({ data: { session } }) => {
            clearTimeout(timeoutId)
            fetchUserRole(session?.user ?? null)
        }).catch(() => {
            clearTimeout(timeoutId)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            fetchUserRole(session?.user ?? null)
        })

        return () => {
            clearTimeout(timeoutId)
            subscription.unsubscribe()
        }
    }, [fetchUserRole])

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setUserRole(null)
        setEmployeeProfile(null)
    }

    const value = { user, userRole, employeeProfile, loading, signIn, signOut }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within an AuthProvider')
    return context
}
