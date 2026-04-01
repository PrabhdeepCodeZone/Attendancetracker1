import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        '[AttendanceIQ] Supabase environment variables are missing.\n' +
        'VITE_SUPABASE_URL:', !!supabaseUrl, '\n' +
        'VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey
    )
} else {
    console.log('[AttendanceIQ] Supabase environment variables are present.', {
        url: supabaseUrl,
        keyExists: !!supabaseAnonKey
    })
}

// Provide placeholder values so createClient does not throw when .env is missing.
// All queries will fail gracefully with network errors instead of crashing.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key'
)
