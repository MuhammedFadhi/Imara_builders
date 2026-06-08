import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './auth'

const INVOICE_SELECT = `
  id, invoice_number, job_order_id, project_id, amount, issue_date, due_date,
  status, file_path, file_name, uploaded_by, created_at,
  uploader:profiles!invoices_uploaded_by_fkey ( id, full_name, email )
`

export const useInvoicesStore = defineStore('invoices', () => {
  const invoices = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchInvoices(jobOrderId) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('invoices')
      .select(INVOICE_SELECT)
      .eq('job_order_id', jobOrderId)
      .order('created_at', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      invoices.value = data
    }
    loading.value = false
  }

  async function uploadInvoice(jobOrderId, { invoice_number, amount, issue_date, due_date, status, file }) {
    const auth = useAuthStore()
    let file_path = null
    let file_name = null

    if (file) {
      file_path = `${jobOrderId}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('invoices').upload(file_path, file)
      if (uploadErr) throw uploadErr
      file_name = file.name
    }

    const { data, error: err } = await supabase
      .from('invoices')
      .insert({
        job_order_id: jobOrderId,
        invoice_number: invoice_number || null,
        amount,
        issue_date: issue_date || new Date().toISOString().slice(0, 10),
        due_date: due_date || null,
        status: status || 'unpaid',
        file_path,
        file_name,
        uploaded_by: auth.session?.user?.id
      })
      .select(INVOICE_SELECT)
      .single()

    if (err) throw err
    invoices.value.unshift(data)
    return data
  }

  async function updateInvoiceStatus(id, status) {
    const { data, error: err } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id)
      .select(INVOICE_SELECT)
      .single()

    if (err) throw err
    const idx = invoices.value.findIndex(i => i.id === id)
    if (idx !== -1) invoices.value[idx] = data
    return data
  }

  async function getInvoiceFileUrl(filePath) {
    const { data, error: err } = await supabase.storage.from('invoices').createSignedUrl(filePath, 60 * 10)
    if (err) {
      console.error('Failed to sign invoice file URL', err)
      return null
    }
    return data?.signedUrl ?? null
  }

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    uploadInvoice,
    updateInvoiceStatus,
    getInvoiceFileUrl
  }
})
