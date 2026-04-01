import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAttendance({ employeeId, month, year } = {}) {
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchAttendance = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let query = supabase
                .from('attendance')
                .select('*, employees(name, department)')
                .order('date', { ascending: false })

            if (employeeId) query = query.eq('employee_id', employeeId)
            if (month && year) {
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`
                const endDay = new Date(year, month, 0).getDate()
                const endDate = `${year}-${String(month).padStart(2, '0')}-${endDay}`
                query = query.gte('date', startDate).lte('date', endDate)
            }

            const { data, error: err } = await query
            if (err) throw err
            setAttendance(data || [])
        } catch (err) {
            console.error('fetchAttendance error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [employeeId, month, year])

    useEffect(() => { fetchAttendance() }, [fetchAttendance])

    const upsertAttendance = async (records) => {
        const { error: err } = await supabase
            .from('attendance')
            .upsert(records, { onConflict: 'employee_id,date' })
        if (err) throw err
        await fetchAttendance()
    }

    const getAttendanceMap = () => {
        return attendance.reduce((acc, rec) => {
            acc[rec.date] = rec.status
            return acc
        }, {})
    }

    const getSummary = () => {
        const present = attendance.filter(r => r.status === 'present').length
        const absent = attendance.filter(r => r.status === 'absent').length
        const halfDay = attendance.filter(r => r.status === 'half-day').length
        const total = attendance.length
        const percentage = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0
        return { present, absent, halfDay, total, percentage }
    }

    return { attendance, loading, error, refetch: fetchAttendance, upsertAttendance, getAttendanceMap, getSummary }
}
