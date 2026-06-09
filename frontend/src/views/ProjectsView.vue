<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { useCompaniesStore } from '../stores/companies'
import { useCustomersStore } from '../stores/customers'
import { useAuthStore } from '../stores/auth'
import { useDialogStore } from '../stores/dialog'

const router = useRouter()
const projectsStore = useProjectsStore()
const companiesStore = useCompaniesStore()
const customersStore = useCustomersStore()
const auth = useAuthStore()
const dialog = useDialogStore()

const showAddModal = ref(false)
const saving = ref(false)

const STATUS_STYLES = {
  done: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  'under process': 'bg-blue-100 text-blue-700'
}

const blankProject = () => ({
  customer_id: '',
  source_company_id: auth.myCompanyId,
  scope_of_work: '',
  project_manager: '',
  contract_value: 0,
  project_status: 'pending'
})

const newProject = ref(blankProject())

// Imara-only: hide their projects from BKZ unless explicitly shared
const togglingVisibilityId = ref(null)
const toggleVisibility = async (project) => {
  togglingVisibilityId.value = project.id
  try {
    await projectsStore.setProjectVisibility(project.id, !project.visible_to_partner)
  } catch (err) {
    dialog.alert('Error updating visibility: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    togglingVisibilityId.value = null
  }
}

const saveProject = async () => {
  saving.value = true
  try {
    await projectsStore.createProject(newProject.value)
    showAddModal.value = false
    newProject.value = blankProject()
  } catch (err) {
    dialog.alert('Error saving project: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    saving.value = false
  }
}

const openProject = (project) => {
  router.push({ name: 'ProjectDetail', params: { id: project.id } })
}

onMounted(() => {
  companiesStore.fetchCompanies()
  customersStore.fetchCustomers()
  projectsStore.fetchProjects()
})
</script>

<template>
  <div class="px-10 pb-10">
    <div class="flex justify-between items-end mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Projects</h1>
        <p class="text-gray-500 text-sm">Active and completed construction jobs.</p>
      </div>
      <button @click="showAddModal = true" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-md flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        New Project
      </button>
    </div>

    <!-- Projects Table -->
    <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Project #</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Customer</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Address</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Company</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Visible to BKZ</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Contract Value</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Status</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="projectsStore.projects.length === 0">
            <td colspan="8" class="px-6 py-8 text-center text-gray-400">No active projects yet. Convert a lead to start!</td>
          </tr>
          <tr v-for="project in projectsStore.projects" :key="project.id" @click="openProject(project)" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
            <td class="px-6 py-4 text-gray-400 font-mono text-xs">{{ project.project_number }}</td>
            <td class="px-6 py-4 font-medium text-gray-900">{{ project.customer?.full_name || '—' }}</td>
            <td class="px-6 py-4 text-gray-500">{{ project.customer?.address || '—' }}</td>
            <td class="px-6 py-4">
              <span :class="project.source_company?.slug === 'imara' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-2.5 py-1 rounded text-xs font-semibold">
                {{ project.source_company?.name }}
              </span>
            </td>
            <td class="px-6 py-4" @click.stop>
              <div v-if="project.source_company?.slug === 'imara' && projectsStore.canEditProject(project)" class="flex items-center gap-2">
                <button @click="toggleVisibility(project)" :disabled="togglingVisibilityId === project.id"
                  class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
                  :class="project.visible_to_partner ? 'bg-imara-blue' : 'bg-gray-300'">
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" :class="project.visible_to_partner ? 'translate-x-[18px]' : 'translate-x-1'"></span>
                </button>
                <span class="text-xs font-medium" :class="project.visible_to_partner ? 'text-imara-blue' : 'text-gray-400'">{{ project.visible_to_partner ? 'Shared' : 'Private' }}</span>
              </div>
              <span v-else-if="project.source_company?.slug === 'imara'" class="text-xs font-medium" :class="project.visible_to_partner ? 'text-imara-blue' : 'text-gray-400'">{{ project.visible_to_partner ? 'Shared' : 'Private' }}</span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-6 py-4 text-gray-900 font-semibold">${{ Number(project.contract_value || 0).toLocaleString() }}</td>
            <td class="px-6 py-4">
              <span :class="STATUS_STYLES[project.project_status] || 'bg-gray-100 text-gray-600'" class="px-2.5 py-1 rounded text-xs font-semibold capitalize">{{ project.project_status }}</span>
            </td>
            <td class="px-6 py-4 text-right" @click.stop>
              <button @click="openProject(project)" class="text-imara-blue hover:text-imara-blueDark font-semibold text-xs bg-imara-blueLight px-3 py-1.5 rounded-full transition-colors">View Details</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Project Modal Overlay -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="showAddModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Create New Project</h2>

        <form @submit.prevent="saveProject" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select v-model="newProject.customer_id" required class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
              <option value="" disabled>Select a customer…</option>
              <option v-for="c in customersStore.customers" :key="c.id" :value="c.id">{{ c.full_name }}{{ c.address ? ' — ' + c.address : '' }}</option>
            </select>
            <p v-if="customersStore.customers.length === 0" class="text-xs text-gray-400 mt-1">No customers yet -- mark a lead as "Won" or add one from the Customers tab first.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contract Value (CAD)</label>
            <input v-model="newProject.contract_value" type="number" min="0" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
            <input v-model="newProject.project_manager" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. Jane Doe" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
            <textarea v-model="newProject.scope_of_work" rows="3" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="Describe the scope of work..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Project Status</label>
            <select v-model="newProject.project_status" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
              <option value="pending">Pending</option>
              <option value="under process">Under Process</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="saving" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ saving ? 'Saving…' : 'Create Project' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
