import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './auth'

const LEAD_SELECT = `
  id, lead_number, lead_source_company_id, lead_source, client_name, client_phone, client_email,
  property_address, project_type, estimated_value, lead_notes, assigned_company_id,
  lead_status, converted_project_id, visible_to_partner, created_by, is_archived, created_at, updated_at,
  source_company:companies!leads_lead_source_company_id_fkey ( id, name, slug ),
  creator:profiles!leads_created_by_fkey ( id, full_name, email )
`

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref([])
  const currentLead = ref(null)
  const activities = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchLeads() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('leads')
      .select(LEAD_SELECT)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      leads.value = data
    }
    loading.value = false
  }

  async function fetchLeadById(id) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('leads')
      .select(LEAD_SELECT)
      .eq('id', id)
      .single()

    if (err) {
      error.value = err.message
      currentLead.value = null
    } else {
      currentLead.value = data
    }
    loading.value = false
    return currentLead.value
  }

  async function createLead(payload) {
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('leads')
      .insert({ ...payload, created_by: auth.session?.user?.id })
      .select(LEAD_SELECT)
      .single()

    if (err) throw err
    leads.value.unshift(data)
    return data
  }

  async function updateLead(id, payload) {
    const { data, error: err } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select(LEAD_SELECT)
      .single()

    if (err) throw err
    const idx = leads.value.findIndex(l => l.id === id)
    if (idx !== -1) leads.value[idx] = data
    if (currentLead.value?.id === id) currentLead.value = data
    return data
  }

  async function updateLeadStatus(id, status) {
    const lead = await updateLead(id, { lead_status: status })
    await addActivity(id, {
      activity_type: 'status_change',
      body: `Status changed to "${status}"`,
      metadata: { to: status }
    })
    return lead
  }

  async function setLeadVisibility(id, visible) {
    return updateLead(id, { visible_to_partner: visible })
  }

  async function archiveLead(id) {
    const auth = useAuthStore()
    return updateLead(id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: auth.session?.user?.id
    })
  }

  async function fetchActivities(leadId) {
    const { data, error: err } = await supabase
      .from('lead_activities')
      .select(`
        id, lead_id, activity_type, author_id, author_company_id, body, file_path, file_name,
        metadata, created_at,
        author:profiles ( id, full_name, email ),
        author_company:companies ( id, name, slug )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (err) {
      console.error('Failed to fetch activities', err)
      activities.value = []
      return
    }
    activities.value = data
  }

  async function addActivity(leadId, { activity_type, body = null, file = null, metadata = null }) {
    const auth = useAuthStore()
    let file_path = null
    let file_name = null

    if (file) {
      file_path = `${leadId}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('lead-documents').upload(file_path, file)
      if (uploadErr) throw uploadErr
      file_name = file.name
    }

    const { data, error: err } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type,
        author_id: auth.session?.user?.id,
        author_company_id: auth.myCompanyId,
        body,
        file_path,
        file_name,
        metadata
      })
      .select(`
        id, lead_id, activity_type, author_id, author_company_id, body, file_path, file_name,
        metadata, created_at,
        author:profiles ( id, full_name, email ),
        author_company:companies ( id, name, slug )
      `)
      .single()

    if (err) throw err
    activities.value.unshift(data)
    return data
  }

  function addComment(leadId, body) {
    return addActivity(leadId, { activity_type: 'comment', body })
  }

  async function getActivityFileUrl(filePath) {
    const { data, error: err } = await supabase.storage.from('lead-documents').createSignedUrl(filePath, 60 * 10)
    if (err) {
      console.error('Failed to sign file URL', err)
      return null
    }
    return data.signedUrl
  }

  function canEditLead(lead) {
    const auth = useAuthStore()
    if (!lead) return false
    return auth.isMasterAdmin || lead.lead_source_company_id === auth.myCompanyId
  }

  return {
    leads,
    currentLead,
    activities,
    loading,
    error,
    fetchLeads,
    fetchLeadById,
    createLead,
    updateLead,
    updateLeadStatus,
    setLeadVisibility,
    archiveLead,
    fetchActivities,
    addActivity,
    addComment,
    getActivityFileUrl,
    canEditLead
  }
})
