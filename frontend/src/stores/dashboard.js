import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useBillingStore } from './billing'

export const useDashboardStore = defineStore('dashboard', () => {
  const metrics = ref({
    totalLeads: 0,
    activeProjects: 0,
    completedProjects: 0,
    outstandingPayments: 0
  })
  const loading = ref(false)
  const error = ref(null)

  async function fetchMetrics() {
    loading.value = true
    error.value = null
    const billingStore = useBillingStore()

    const [leadsRes, projectsRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('is_archived', false),
      supabase.from('projects').select('project_status').eq('is_archived', false),
      billingStore.fetchBillingSummary()
    ])

    const err = leadsRes.error || projectsRes.error
    if (err) {
      error.value = err.message
    } else {
      const projects = projectsRes.data || []
      metrics.value = {
        totalLeads: leadsRes.count || 0,
        activeProjects: projects.filter(p => p.project_status !== 'done').length,
        completedProjects: projects.filter(p => p.project_status === 'done').length,
        outstandingPayments: billingStore.summary.outstandingBalance
      }
    }
    loading.value = false
  }

  return { metrics, loading, error, fetchMetrics }
})
