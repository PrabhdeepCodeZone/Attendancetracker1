import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Section 1: Setup (clients, cors) ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (data: unknown, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
}

// Interface for type safety
interface EmployeeRequest {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    address?: string;
    department?: string;
    designation?: string;
    join_date?: string;
    salary?: string | number;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return jsonResponse({ success: false, error: 'Method Not Allowed' }, 405)
    }

    try {
        // --- Section 2: Auth verification ---
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return jsonResponse({ success: false, error: 'No authorization header' }, 401)
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
        }

        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (adminError || adminData?.role !== 'admin') {
            return jsonResponse({ success: false, error: 'Forbidden: Admin access required' }, 403)
        }

        // --- Section 3: Input validation ---
        const body: EmployeeRequest = await req.json()

        const email = body.email?.trim().toLowerCase()
        const password = body.password
        const name = body.name?.trim()
        const department = body.department?.trim()
        const designation = body.designation?.trim()
        const phone = body.phone?.trim() || null
        const address = body.address?.trim() || null
        const join_date = body.join_date?.trim() || null

        if (!email || !password || !name || !department || !designation) {
            return jsonResponse({
                success: false,
                error: 'Email, password, name, department, and designation are required'
            }, 400)
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return jsonResponse({ success: false, error: 'Invalid email format' }, 400)
        }

        if (password.length < 6) {
            return jsonResponse({ success: false, error: 'Password must be at least 6 characters long' }, 400)
        }

        if (join_date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            if (!dateRegex.test(join_date)) {
                return jsonResponse({ success: false, error: 'Invalid join_date format. Use YYYY-MM-DD' }, 400)
            }
        }

        let parsedSalary = 0
        if (body.salary !== undefined && body.salary !== null && body.salary !== '') {
            parsedSalary = parseFloat(String(body.salary))
            if (isNaN(parsedSalary)) {
                return jsonResponse({ success: false, error: 'Salary must be a valid number' }, 400)
            }
            if (parsedSalary < 0) {
                return jsonResponse({ success: false, error: 'Salary cannot be negative' }, 400)
            }
        }

        // --- Section 4: Database operations ---
        const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name }
        })

        if (createAuthError || !newAuthUser.user) {
            return jsonResponse({
                success: false,
                error: createAuthError?.message || 'Failed to create auth user'
            }, 400)
        }

        const newUserId = newAuthUser.user.id

        // Wait briefly for the trigger to insert into public.users
        await new Promise(resolve => setTimeout(resolve, 500))

        const { data: employeeData, error: employeesInsertError } = await supabaseAdmin
            .from('employees')
            .insert({
                user_id: newUserId,
                name,
                phone,
                address,
                department,
                designation,
                join_date,
                salary: parsedSalary
            })
            .select()
            .single()

        if (employeesInsertError) {
            await supabaseAdmin.auth.admin.deleteUser(newUserId)
            return jsonResponse({
                success: false,
                error: employeesInsertError.message || 'Failed to insert employee record'
            }, 400)
        }

        // --- Section 5: Success response ---
        return jsonResponse({
            success: true,
            data: employeeData,
            message: 'Employee created successfully'
        }, 200)

    } catch (error: unknown) {
        console.error('Create Employee Error:', error)
        const message = error instanceof Error ? error.message : 'Internal Server Error'
        return jsonResponse({ success: false, error: message }, 500)
    }
})
