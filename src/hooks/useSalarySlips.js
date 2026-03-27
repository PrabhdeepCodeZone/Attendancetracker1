import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// Returns total working days in a month (all days minus Sundays)
export function getWorkingDays(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate()
    let sundays = 0
    for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month - 1, d).getDay() === 0) sundays++
    }
    return daysInMonth - sundays
}

export function useSalarySlips({ employeeId } = {}) {
    const [slips, setSlips] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchSlips = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let query = supabase
                .from('salary_slips')
                .select('*, employees(name, designation, department, join_date)')
                .order('year', { ascending: false })
                .order('month', { ascending: false })

            if (employeeId) query = query.eq('employee_id', employeeId)

            const { data, error: err } = await query
            if (err) throw err
            setSlips(data || [])
        } catch (err) {
            console.error('fetchSlips error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [employeeId])

    useEffect(() => { fetchSlips() }, [fetchSlips])

    const generateSlip = async ({ employee_id, month, year, basic_pay, deductions, generated_by }) => {
        const net_pay = Number(basic_pay) - Number(deductions)
        const { error: err } = await supabase
            .from('salary_slips')
            .upsert(
                { employee_id, month, year, basic_pay, deductions, net_pay, generated_by },
                { onConflict: 'employee_id,month,year' }
            )
        if (err) throw err
        await fetchSlips()
    }

    // Auto-calculates salary for all employees based on attendance
    const bulkGenerateSlips = async ({ month, year, generatedBy, previews }) => {
        const records = previews.map(p => ({
            employee_id: p.employee_id,
            month,
            year,
            basic_pay: p.basic_pay,
            deductions: p.deductions,
            net_pay: p.net_pay,
            working_days: p.working_days,
            present_days: p.present_days,
            absent_days: p.absent_days,
            half_days: p.half_days,
            per_day_rate: p.per_day_rate,
            generated_by: generatedBy,
        }))

        const { error: err } = await supabase
            .from('salary_slips')
            .upsert(records, { onConflict: 'employee_id,month,year' })
        if (err) throw err
        await fetchSlips()
    }

    const deleteSlip = async (id) => {
        const { error: err } = await supabase.from('salary_slips').delete().eq('id', id)
        if (err) throw err
        await fetchSlips()
    }

    return { slips, loading, error, refetch: fetchSlips, generateSlip, bulkGenerateSlips, deleteSlip }
}
