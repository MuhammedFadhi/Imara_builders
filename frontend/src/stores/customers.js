import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './auth'

const CUSTOMER_SELECT = `
  id, customer_number, full_name, phone, email, address, source_company_id, lead_id,
  notes, is_archived, created_at, updated_at,
  source_company:companies!customers_source_company_id_fkey ( id, name, slug )
`

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref([])
  const currentCustomer = ref(null)
  const customerProjects = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchCustomers() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      customers.value = data
    }
    loading.value = false
  }

  async function fetchCustomerById(id) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('id', id)
      .single()

    if (err) {
      error.value = err.message
      currentCustomer.value = null
    } else {
      currentCustomer.value = data
    }
    loading.value = false
    return currentCustomer.value
  }

  async function fetchCustomerProjects(customerId) {
    const { data, error: err } = await supabase
      .from('projects')
      .select('id, project_number, project_status, contract_value, scope_of_work, created_at')
      .eq('customer_id', customerId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (err) {
      console.error('Failed to fetch customer projects', err)
      customerProjects.value = []
      return
    }
    customerProjects.value = data
  }

  async function createCustomer(payload) {
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('customers')
      .insert({ ...payload, created_by: auth.session?.user?.id })
      .select(CUSTOMER_SELECT)
      .single()

    if (err) throw err
    customers.value.unshift(data)
    return data
  }

  async function updateCustomer(id, payload) {
    const { data, error: err } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id)
      .select(CUSTOMER_SELECT)
      .single()

    if (err) throw err
    const idx = customers.value.findIndex(c => c.id === id)
    if (idx !== -1) customers.value[idx] = data
    if (currentCustomer.value?.id === id) currentCustomer.value = data
    return data
  }

  async function archiveCustomer(id) {
    const auth = useAuthStore()
    return updateCustomer(id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: auth.session?.user?.id
    })
  }

  function canEditCustomer(customer) {
    const auth = useAuthStore()
    if (!customer) return false
    return auth.isMasterAdmin || customer.source_company_id === auth.myCompanyId
  }

  return {
    customers,
    currentCustomer,
    customerProjects,
    loading,
    error,
    fetchCustomers,
    fetchCustomerById,
    fetchCustomerProjects,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    canEditCustomer
  }
})
