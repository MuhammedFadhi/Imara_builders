import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

function sumBy(rows, key) {
  return (rows || []).reduce((total, row) => total + Number(row[key] || 0), 0)
}

export const useBillingStore = defineStore('billing', () => {
  const summary = ref({
    totalContractValue: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    outstandingBalance: 0
  })
  const profitSummary = ref([])
  const loading = ref(false)
  const profitLoading = ref(false)
  const error = ref(null)

  async function fetchBillingSummary() {
    loading.value = true
    error.value = null
    const [projectsRes, invoicesRes, paymentsRes] = await Promise.all([
      supabase.from('projects').select('contract_value').eq('is_archived', false),
      supabase.from('invoices').select('amount'),
      supabase.from('payments').select('amount')
    ])

    const err = projectsRes.error || invoicesRes.error || paymentsRes.error
    if (err) {
      error.value = err.message
    } else {
      const totalContractValue = sumBy(projectsRes.data, 'contract_value')
      const totalInvoiced = sumBy(invoicesRes.data, 'amount')
      const totalPaid = sumBy(paymentsRes.data, 'amount')
      summary.value = {
        totalContractValue,
        totalInvoiced,
        totalPaid,
        outstandingBalance: totalContractValue - totalPaid
      }
    }
    loading.value = false
  }

  // Only invoked when auth.isMasterAdmin -- RLS on project_financials returns
  // nothing for Partner Admin even if this were ever called by mistake.
  //
  // project_profit_view has no FK to `projects` (views can't carry FK
  // constraints, so PostgREST can't embed it via select()) -- fetch the
  // project labels with a separate query and merge client-side.
  async function fetchProfitSummary() {
    profitLoading.value = true
    error.value = null
    const { data: rows, error: err } = await supabase
      .from('project_profit_view')
      .select('project_id, contract_value, internal_cost, profit_margin')

    if (err) {
      error.value = err.message
      profitSummary.value = []
      profitLoading.value = false
      return
    }

    const projectIds = rows.map(r => r.project_id)
    let projectsById = {}
    if (projectIds.length > 0) {
      const { data: projectRows } = await supabase
        .from('projects')
        .select('id, project_number, customer:customers ( full_name )')
        .in('id', projectIds)
      projectsById = Object.fromEntries((projectRows || []).map(p => [p.id, p]))
    }

    profitSummary.value = rows.map(r => ({ ...r, project: projectsById[r.project_id] || null }))
    profitLoading.value = false
  }

  return {
    summary,
    profitSummary,
    loading,
    profitLoading,
    error,
    fetchBillingSummary,
    fetchProfitSummary
  }
})
