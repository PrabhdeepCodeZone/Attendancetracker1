import { supabase } from './supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Helper to get auth headers and construct request configuration
const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
    };
};

export const createEmployee = async (formData) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-employee`, {
            method: 'POST',
            headers,
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create employee');

        return { data: result.data || result, error: null };
    } catch (error) {
        console.error('Create Employee Error:', error);
        return { data: null, error: error.message || error };
    }
};

export const deleteEmployee = async (employeeId, userId) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-employee`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ employee_id: employeeId, user_id: userId })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to delete employee');

        return { data: result, error: null };
    } catch (error) {
        console.error('Delete Employee Error:', error);
        return { data: null, error: error.message || error };
    }
};

export const updateEmployeeRole = async (userId, newRole) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${SUPABASE_URL}/functions/v1/update-employee-role`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ user_id: userId, new_role: newRole })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update employee role');

        return { data: result.data || result, error: null };
    } catch (error) {
        console.error('Update Employee Role Error:', error);
        return { data: null, error: error.message || error };
    }
};
