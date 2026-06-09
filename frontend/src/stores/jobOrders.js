import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './auth'

const JOB_ORDER_SELECT = `
  id, job_number, project_id, job_date, description, client_name, project_address,
  source_company_id, scope_of_work, project_manager, start_date, estimated_completion_date,
  contract_value, job_status, is_archived, created_at, updated_at,
  source_company:companies!job_orders_source_company_id_fkey ( id, name, slug )
`

// job_order_progress_view is a plain view with no FK to `job_orders`, so PostgREST
// can't embed it via select() -- fetch amount_paid/percent_paid with a separate query.
async function fetchProgress(jobOrderId) {
  const { data } = await supabase
    .from('job_order_progress_view')
    .select('amount_paid, percent_paid')
    .eq('job_order_id', jobOrderId)
    .maybeSingle()
  return {
    amount_paid: data?.amount_paid ?? 0,
    percent_paid: data?.percent_paid ?? 0
  }
}

export const useJobOrdersStore = defineStore('jobOrders', () => {
  const jobOrders = ref([])
  const currentJobOrder = ref(null)
  const payments = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchJobOrders(projectId) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('job_orders')
      .select(JOB_ORDER_SELECT)
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      jobOrders.value = data
    }
    loading.value = false
  }

  async function fetchJobOrderById(id) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('job_orders')
      .select(JOB_ORDER_SELECT)
      .eq('id', id)
      .single()

    if (err) {
      error.value = err.message
      currentJobOrder.value = null
    } else {
      const progress = await fetchProgress(id)
      currentJobOrder.value = { ...data, ...progress }
    }
    loading.value = false
    return currentJobOrder.value
  }

  async function createJobOrder(projectId, payload) {
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('job_orders')
      .insert({ ...payload, project_id: projectId, created_by: auth.session?.user?.id })
      .select(JOB_ORDER_SELECT)
      .single()

    if (err) throw err
    jobOrders.value.unshift(data)
    return data
  }

  async function updateJobOrder(id, payload) {
    const { data, error: err } = await supabase
      .from('job_orders')
      .update(payload)
      .eq('id', id)
      .select(JOB_ORDER_SELECT)
      .single()

    if (err) throw err
    const idx = jobOrders.value.findIndex(j => j.id === id)
    if (idx !== -1) jobOrders.value[idx] = data
    if (currentJobOrder.value?.id === id) {
      currentJobOrder.value = { ...currentJobOrder.value, ...data }
    }
    return data
  }

  async function archiveJobOrder(id) {
    const auth = useAuthStore()
    return updateJobOrder(id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: auth.session?.user?.id
    })
  }

  function canEditJobOrder(jobOrder) {
    const auth = useAuthStore()
    if (!jobOrder) return false
    return auth.isMasterAdmin || jobOrder.source_company_id === auth.myCompanyId
  }

  async function fetchPayments(jobOrderId) {
    const { data, error: err } = await supabase
      .from('payments')
      .select('id, job_order_id, amount, payment_date, payment_method, reference_note, recorded_by, created_at')
      .eq('job_order_id', jobOrderId)
      .order('payment_date', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      payments.value = data
    }
  }

  async function recordPayment(jobOrderId, { amount, payment_date, payment_method, reference_note }) {
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('payments')
      .insert({
        job_order_id: jobOrderId,
        amount,
        payment_date: payment_date || new Date().toISOString().slice(0, 10),
        payment_method: payment_method || null,
        reference_note: reference_note || null,
        recorded_by: auth.session?.user?.id
      })
      .select('id, job_order_id, amount, payment_date, payment_method, reference_note, recorded_by, created_at')
      .single()

    if (err) throw err
    payments.value.unshift(data)
    // Refresh the job order so its derived % paid / amount paid stays in sync
    await fetchJobOrderById(jobOrderId)
    return data
  }

  return {
    jobOrders,
    currentJobOrder,
    payments,
    loading,
    error,
    fetchJobOrders,
    fetchJobOrderById,
    createJobOrder,
    updateJobOrder,
    archiveJobOrder,
    canEditJobOrder,
    fetchPayments,
    recordPayment
  }
})
