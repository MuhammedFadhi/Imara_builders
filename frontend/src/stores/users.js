import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './auth'

const ADMIN_USERS_URL = `${import.meta.env.VITE_API_URL}/api/admin/users`

// Provisioning/editing/deleting auth users requires the service-role key,
// which must never reach the browser -- these three calls are the only
// store actions in the app that go through Express instead of Supabase directly.
async function adminRequest(path, options = {}) {
  const auth = useAuthStore()
  const token = auth.session?.access_token
  const res = await fetch(`${ADMIN_USERS_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, company_id, companies ( id, name, slug )')
      .order('full_name')

    if (err) {
      error.value = err.message
    } else {
      users.value = data
    }
    loading.value = false
  }

  async function inviteUser(payload) {
    const created = await adminRequest('', { method: 'POST', body: JSON.stringify(payload) })
    await fetchUsers()
    return created
  }

  async function updateUser(id, payload) {
    const updated = await adminRequest(`/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], ...updated }
    return updated
  }

  async function deleteUser(id) {
    await adminRequest(`/${id}`, { method: 'DELETE' })
    users.value = users.value.filter(u => u.id !== id)
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    inviteUser,
    updateUser,
    deleteUser
  }
})
