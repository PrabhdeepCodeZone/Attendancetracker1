import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useEmployees() {
    const [employees, setEmployees] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchEmployees = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const { data, error: err } = await supabase
                .from('employees')
                .select('*, users(email)')
                .order('created_at', { ascending: false })

            if (err) throw err
            setEmployees(data || [])
        } catch (err) {
            console.error('fetchEmployees error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchEmployees() }, [fetchEmployees])

    const addEmployee = async (formData) => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()

            if (sessionError || !session) throw new Error('No active session. Please login again.')

            const token = session.access_token
            console.log('Token present:', !!token)
            console.log('Token preview:', token?.substring(0, 20))

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify(formData)
                }
            )
            console.log('5. Response status:', response.status)
            const result = await response.json()
            console.log('6. Result:', result)
            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Failed to create employee')
            }

            await fetchEmployees()
            return result

        } catch (err) {
            console.error('addEmployee error:', err)
            throw err
        }
    }

    const updateEmployee = async (id, updates) => {
        try {
            const { error: err } = await supabase
                .from('employees')
                .update(updates)
                .eq('id', id)
            if (err) throw err
            await fetchEmployees()
        } catch (err) {
            console.error('updateEmployee error:', err)
            throw err
        }
    }

    const deleteEmployee = async (id) => {
        try {
            const { data } = await supabase.from('employees').select('user_id').eq('id', id).single()

            const { error: empErr } = await supabase.from('employees').delete().eq('id', id)
            if (empErr) throw empErr

            if (data?.user_id) {
                await supabase.from('users').delete().eq('id', data.user_id)
            }

            setEmployees(prev => prev.filter(e => e.id !== id))
        } catch (err) {
            console.error('deleteEmployee error:', err)
            throw err
        }
    }

    return { employees, isLoading, error, fetchEmployees, addEmployee, updateEmployee, deleteEmployee }
}
