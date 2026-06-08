import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './auth'

const CHANGE_ORDER_SELECT = `
  id, project_id, job_order_id, description, amount_delta, status,
  requested_by, approved_by, created_at, updated_at,
  requester:profiles!change_orders_requested_by_fkey ( id, full_name, email ),
  approver:profiles!change_orders_approved_by_fkey ( id, full_name, email )
`

export const useChangeOrdersStore = defineStore('changeOrders', () => {
  const changeOrders = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchChangeOrders(projectId) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('change_orders')
      .select(CHANGE_ORDER_SELECT)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      changeOrders.value = data
    }
    loading.value = false
  }

  async function createChangeOrder(projectId, { job_order_id, description, amount_delta }) {
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('change_orders')
      .insert({
        project_id: projectId,
        job_order_id: job_order_id || null,
        description,
        amount_delta: amount_delta || 0,
        requested_by: auth.session?.user?.id
      })
      .select(CHANGE_ORDER_SELECT)
      .single()

    if (err) throw err
    changeOrders.value.unshift(data)
    return data
  }

  async function setChangeOrderStatus(id, status) {
    const auth = useAuthStore()
    const payload = { status }
    if (status === 'approved' || status === 'rejected') {
      payload.approved_by = auth.session?.user?.id
    }
    const { data, error: err } = await supabase
      .from('change_orders')
      .update(payload)
      .eq('id', id)
      .select(CHANGE_ORDER_SELECT)
      .single()

    if (err) throw err
    const idx = changeOrders.value.findIndex(c => c.id === id)
    if (idx !== -1) changeOrders.value[idx] = data
    return data
  }

  return {
    changeOrders,
    loading,
    error,
    fetchChangeOrders,
    createChangeOrder,
    setChangeOrderStatus
  }
})
