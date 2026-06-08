import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from './auth'

const PROJECT_SELECT = `
  id, project_number, project_date, customer_id, source_company_id,
  scope_of_work, project_manager, contract_value, project_status, lead_id, visible_to_partner, is_archived,
  created_at, updated_at,
  source_company:companies!projects_source_company_id_fkey ( id, name, slug ),
  customer:customers ( id, customer_number, full_name, phone, email, address )
`

// project_progress_view is a plain view with no FK to `projects`, so PostgREST
// can't embed it via select() -- fetch percent_complete with a separate query.
async function fetchPercentComplete(projectId) {
  const { data } = await supabase
    .from('project_progress_view')
    .select('percent_complete')
    .eq('project_id', projectId)
    .maybeSingle()
  return data?.percent_complete ?? 0
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([])
  const currentProject = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchProjects() {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      projects.value = data
    }
    loading.value = false
  }

  async function fetchProjectById(id) {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('id', id)
      .single()

    if (err) {
      error.value = err.message
      currentProject.value = null
    } else {
      const percent_complete = await fetchPercentComplete(id)
      currentProject.value = { ...data, percent_complete }
    }
    loading.value = false
    return currentProject.value
  }

  async function createProject(payload) {
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('projects')
      .insert({ ...payload, created_by: auth.session?.user?.id })
      .select(PROJECT_SELECT)
      .single()

    if (err) throw err
    projects.value.unshift(data)
    return data
  }

  async function updateProject(id, payload) {
    const { data, error: err } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select(PROJECT_SELECT)
      .single()

    if (err) throw err
    const idx = projects.value.findIndex(p => p.id === id)
    if (idx !== -1) projects.value[idx] = data
    if (currentProject.value?.id === id) {
      currentProject.value = { ...currentProject.value, ...data }
    }
    return data
  }

  async function archiveProject(id) {
    const auth = useAuthStore()
    return updateProject(id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: auth.session?.user?.id
    })
  }

  function canEditProject(project) {
    const auth = useAuthStore()
    if (!project) return false
    return project.source_company_id === auth.myCompanyId
  }

  async function setProjectVisibility(id, visible) {
    return updateProject(id, { visible_to_partner: visible })
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    fetchProjectById,
    createProject,
    updateProject,
    archiveProject,
    canEditProject,
    setProjectVisibility
  }
})
