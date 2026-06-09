<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { useJobOrdersStore } from '../stores/jobOrders'
import { useCompaniesStore } from '../stores/companies'
import { useChangeOrdersStore } from '../stores/changeOrders'
import { useAuthStore } from '../stores/auth'
import { useDialogStore } from '../stores/dialog'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const jobOrdersStore = useJobOrdersStore()
const companiesStore = useCompaniesStore()
const changeOrdersStore = useChangeOrdersStore()
const auth = useAuthStore()
const dialog = useDialogStore()

const project = computed(() => projectsStore.currentProject)
const canEdit = computed(() => projectsStore.canEditProject(project.value))

const STATUS_OPTIONS = ['pending', 'under process', 'done']
const JOB_STATUS_STYLES = {
  Active: 'bg-blue-100 text-blue-700',
  'On Hold': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-gray-100 text-gray-500'
}
const CHANGE_ORDER_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}

const editing = ref(false)
const form = ref(null)
const saving = ref(false)

const startEdit = () => {
  form.value = {
    scope_of_work: project.value.scope_of_work,
    project_manager: project.value.project_manager,
    contract_value: project.value.contract_value,
    project_status: project.value.project_status
  }
  editing.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    await projectsStore.updateProject(project.value.id, form.value)
    editing.value = false
  } catch (err) {
    dialog.alert('Error saving project: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    saving.value = false
  }
}

// --- Add Job Order ---
const showAddJobModal = ref(false)
const savingJob = ref(false)

const blankJob = () => ({
  description: '',
  scope_of_work: '',
  project_manager: '',
  start_date: '',
  estimated_completion_date: '',
  contract_value: 0,
  job_status: 'Active',
  isChangeOrder: false,
  changeDelta: 0
})

const newJob = ref(blankJob())

const saveJobOrder = async () => {
  savingJob.value = true
  try {
    const { isChangeOrder, changeDelta, ...jobPayload } = newJob.value
    if (!jobPayload.start_date) jobPayload.start_date = null
    if (!jobPayload.estimated_completion_date) jobPayload.estimated_completion_date = null

    const createdJob = await jobOrdersStore.createJobOrder(project.value.id, jobPayload)

    if (isChangeOrder && Number(changeDelta) !== 0) {
      await changeOrdersStore.createChangeOrder(project.value.id, {
        job_order_id: createdJob.id,
        description: `Change order for ${createdJob.job_number}${createdJob.description ? ': ' + createdJob.description : ''}`,
        amount_delta: Number(changeDelta)
      })
    }

    showAddJobModal.value = false
    newJob.value = blankJob()
  } catch (err) {
    dialog.alert('Error creating job order: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    savingJob.value = false
  }
}

const openJobOrder = (job) => {
  router.push({ name: 'JobOrderDetail', params: { projectId: project.value.id, jobId: job.id } })
}

// --- Change Orders (Master Admin manages; both roles can view) ---
const showAddChangeOrderModal = ref(false)
const savingChangeOrder = ref(false)
const blankChangeOrder = () => ({ description: '', amount_delta: 0 })
const newChangeOrder = ref(blankChangeOrder())

const saveChangeOrder = async () => {
  savingChangeOrder.value = true
  try {
    await changeOrdersStore.createChangeOrder(project.value.id, newChangeOrder.value)
    showAddChangeOrderModal.value = false
    newChangeOrder.value = blankChangeOrder()
  } catch (err) {
    dialog.alert('Error creating change order: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    savingChangeOrder.value = false
  }
}

const setChangeOrderStatus = async (changeOrder, status) => {
  try {
    await changeOrdersStore.setChangeOrderStatus(changeOrder.id, status)
    await projectsStore.fetchProjectById(project.value.id)
  } catch (err) {
    dialog.alert('Error updating change order: ' + (err.message || 'Unknown error'), 'Error')
  }
}

// --- Edit Job Order ---
const editingJobOrder = ref(null)
const editJobForm = ref(null)
const savingEditJob = ref(false)

const startEditJobOrder = (job) => {
  editJobForm.value = {
    description: job.description,
    scope_of_work: job.scope_of_work,
    project_manager: job.project_manager,
    start_date: job.start_date,
    estimated_completion_date: job.estimated_completion_date,
    contract_value: job.contract_value,
    job_status: job.job_status
  }
  editingJobOrder.value = job
}

const saveEditJobOrder = async () => {
  savingEditJob.value = true
  try {
    const payload = { ...editJobForm.value }
    if (!payload.start_date) payload.start_date = null
    if (!payload.estimated_completion_date) payload.estimated_completion_date = null
    await jobOrdersStore.updateJobOrder(editingJobOrder.value.id, payload)
    editingJobOrder.value = null
  } catch (err) {
    dialog.alert('Error updating job order: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    savingEditJob.value = false
  }
}

const deleteJobOrderFromProject = async (job) => {
  const confirmed = await dialog.confirm(
    `Permanently delete job order ${job.job_number}? This cannot be undone.`,
    'Delete Job Order'
  )
  if (!confirmed) return
  try {
    await jobOrdersStore.deleteJobOrder(job.id)
  } catch (err) {
    dialog.alert('Error deleting job order: ' + (err.message || 'Unknown error'), 'Error')
  }
}

// --- Edit / Delete Change Order ---
const editingChangeOrder = ref(null)
const editChangeForm = ref(null)
const savingEditChangeOrder = ref(false)

const startEditChangeOrder = (co) => {
  editChangeForm.value = {
    description: co.description,
    amount_delta: co.amount_delta
  }
  editingChangeOrder.value = co
}

const saveEditChangeOrder = async () => {
  savingEditChangeOrder.value = true
  try {
    await changeOrdersStore.updateChangeOrder(editingChangeOrder.value.id, editChangeForm.value)
    editingChangeOrder.value = null
  } catch (err) {
    dialog.alert('Error updating change order: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    savingEditChangeOrder.value = false
  }
}

const deleteChangeOrder = async (co) => {
  const msg = co.status === 'approved'
    ? `Delete this approved change order? The $${Number(co.amount_delta).toLocaleString()} adjustment will be reversed on the project.`
    : 'Delete this change order?'
  const confirmed = await dialog.confirm(msg, 'Delete Change Order')
  if (!confirmed) return
  try {
    await changeOrdersStore.deleteChangeOrder(co.id)
    if (co.status === 'approved') {
      await projectsStore.fetchProjectById(project.value.id)
    }
  } catch (err) {
    dialog.alert('Error deleting change order: ' + (err.message || 'Unknown error'), 'Error')
  }
}

onMounted(async () => {
  await companiesStore.fetchCompanies()
  await projectsStore.fetchProjectById(route.params.id)
  if (project.value) {
    await Promise.all([
      jobOrdersStore.fetchJobOrders(project.value.id),
      changeOrdersStore.fetchChangeOrders(project.value.id)
    ])
  }
})
</script>

<template>
  <div class="px-10 pb-10">
    <button @click="router.push({ name: 'Projects' })" class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Back to Projects
    </button>

    <div v-if="projectsStore.loading && !project" class="text-gray-400 text-sm">Loading project…</div>

    <template v-if="project">
      <div class="flex justify-between items-start mb-8">
        <div>
          <p class="text-xs font-mono text-gray-400 mb-1">{{ project.project_number }}</p>
          <h1 class="text-3xl font-bold text-gray-900">
            <router-link v-if="project.customer" :to="{ name: 'CustomerDetail', params: { id: project.customer.id } }" class="hover:text-imara-blue transition-colors">{{ project.customer.full_name }}</router-link>
            <span v-else>—</span>
          </h1>
          <p class="text-gray-500 text-sm mt-1">{{ project.customer?.address || '—' }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span :class="project.source_company?.slug === 'imara' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-3 py-1.5 rounded-full text-xs font-semibold">
            {{ project.source_company?.name }}
          </span>
          <select :value="project.project_status" :disabled="!canEdit" @change="projectsStore.updateProject(project.id, { project_status: $event.target.value })"
            class="text-xs font-semibold text-gray-600 bg-gray-100 border-none rounded-full px-3 py-1.5 focus:ring-2 focus:ring-imara-blue outline-none disabled:opacity-60 capitalize">
            <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <div v-if="!canEdit" class="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
        This project belongs to {{ project.source_company?.name }}. You can view it, but only {{ project.source_company?.name }} can edit it.
      </div>

      <!-- % Complete progress (derived from job orders' % paid, weighted by contract value) -->
      <div class="mb-6 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
        <div class="flex justify-between items-end mb-2">
          <div>
            <p class="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Project Progress</p>
            <p class="text-2xl font-bold text-gray-900">{{ Number(project.percent_complete || 0).toFixed(0) }}% complete</p>
          </div>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div class="bg-gradient-to-r from-imara-red to-imara-redDark h-2.5 rounded-full transition-all" :style="{ width: Math.min(100, Number(project.percent_complete || 0)) + '%' }"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Project details -->
        <div class="lg:col-span-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">Project Details</h2>
            <button v-if="canEdit && !editing" @click="startEdit" class="text-xs font-semibold text-imara-blue bg-imara-blueLight hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">Edit</button>
          </div>

          <form v-if="editing" @submit.prevent="saveEdit" class="space-y-3">
            <p class="text-xs text-gray-400 -mt-1">Customer and address are managed on the linked customer record.</p>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Project Manager</label>
              <input v-model="form.project_manager" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Contract Value (CAD)</label>
              <input v-model="form.contract_value" type="number" min="0" step="0.01" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Scope of Work</label>
              <textarea v-model="form.scope_of_work" rows="3" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" @click="editing = false" class="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full">Cancel</button>
              <button type="submit" :disabled="saving" class="px-4 py-2 text-xs font-medium bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full disabled:opacity-60">
                {{ saving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>

          <dl v-else class="space-y-3 text-sm">
            <div class="flex justify-between">
              <dt class="text-gray-400">Customer</dt>
              <dd class="text-gray-800 font-medium">
                <router-link v-if="project.customer" :to="{ name: 'CustomerDetail', params: { id: project.customer.id } }" class="text-imara-blue hover:text-imara-blueDark">{{ project.customer.full_name }}</router-link>
                <span v-else>—</span>
              </dd>
            </div>
            <div class="flex justify-between"><dt class="text-gray-400">Date</dt><dd class="text-gray-800 font-medium">{{ new Date(project.project_date).toLocaleDateString() }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Project Manager</dt><dd class="text-gray-800 font-medium">{{ project.project_manager || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Contract Value</dt><dd class="text-gray-800 font-semibold">${{ Number(project.contract_value || 0).toLocaleString() }}</dd></div>
            <div v-if="project.scope_of_work">
              <dt class="text-gray-400 mb-1">Scope of Work</dt>
              <dd class="text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{{ project.scope_of_work }}</dd>
            </div>
          </dl>
        </div>

        <!-- Job Orders -->
        <div class="lg:col-span-2 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">Job Orders</h2>
            <button v-if="auth.isMasterAdmin" @click="showAddJobModal = true" class="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full hover:opacity-90 transition-opacity shadow-md flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Add Job Order
            </button>
          </div>

          <div v-if="jobOrdersStore.jobOrders.length === 0" class="text-center text-gray-400 text-sm py-8">
            No job orders yet.
          </div>

          <div v-else class="overflow-hidden rounded-xl border border-gray-100">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Job #</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Description</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Manager</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Contract Value</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Status</th>
                  <th v-if="auth.isMasterAdmin" class="px-4 py-3 font-semibold border-b border-gray-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <tr v-for="job in jobOrdersStore.jobOrders" :key="job.id" @click="openJobOrder(job)" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td class="px-4 py-3 text-gray-400 font-mono text-xs">{{ job.job_number }}</td>
                  <td class="px-4 py-3 font-medium text-gray-900">{{ job.description || '—' }}</td>
                  <td class="px-4 py-3 text-gray-500">{{ job.project_manager || '—' }}</td>
                  <td class="px-4 py-3 text-gray-900 font-semibold">${{ Number(job.contract_value || 0).toLocaleString() }}</td>
                  <td class="px-4 py-3">
                    <span :class="JOB_STATUS_STYLES[job.job_status] || 'bg-gray-100 text-gray-600'" class="px-2.5 py-1 rounded text-xs font-semibold">{{ job.job_status }}</span>
                  </td>
                  <td v-if="auth.isMasterAdmin" class="px-4 py-3 text-right" @click.stop>
                    <div class="flex justify-end gap-2">
                      <button @click="startEditJobOrder(job)" class="text-xs font-semibold text-imara-blue hover:text-imara-blueDark bg-blue-50 px-3 py-1 rounded-full">Edit</button>
                      <button @click="deleteJobOrderFromProject(job)" class="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1 rounded-full">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Change Orders (Master Admin manages; both roles can view) -->
        <div class="lg:col-span-3 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">Change Orders</h2>
            <button v-if="auth.isMasterAdmin" @click="showAddChangeOrderModal = true" class="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full hover:opacity-90 transition-opacity shadow-md flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              New Change Order
            </button>
          </div>

          <div v-if="changeOrdersStore.changeOrders.length === 0" class="text-center text-gray-400 text-sm py-6">No change orders yet.</div>
          <div v-else class="overflow-hidden rounded-xl border border-gray-100">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Description</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Job Order</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Amount Δ</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Requested By</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Status</th>
                  <th v-if="auth.isMasterAdmin" class="px-4 py-3 font-semibold border-b border-gray-100 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <tr v-for="co in changeOrdersStore.changeOrders" :key="co.id" class="border-b border-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ co.description }}</td>
                  <td class="px-4 py-3 text-gray-500 font-mono text-xs">{{ co.job_order?.job_number || '—' }}</td>
                  <td class="px-4 py-3 font-semibold" :class="Number(co.amount_delta) < 0 ? 'text-red-600' : 'text-green-600'">
                    {{ Number(co.amount_delta) >= 0 ? '+' : '' }}${{ Number(co.amount_delta).toLocaleString() }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ co.requester?.full_name || co.requester?.email || '—' }}</td>
                  <td class="px-4 py-3">
                    <span :class="CHANGE_ORDER_STATUS_STYLES[co.status] || 'bg-gray-100 text-gray-600'" class="px-2.5 py-1 rounded text-xs font-semibold capitalize">{{ co.status }}</span>
                  </td>
                  <td v-if="auth.isMasterAdmin" class="px-4 py-3 text-right">
                    <div class="flex justify-end items-center gap-2">
                      <template v-if="co.status === 'pending'">
                        <button @click="setChangeOrderStatus(co, 'approved')" class="text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1 rounded-full">Approve</button>
                        <button @click="setChangeOrderStatus(co, 'rejected')" class="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1 rounded-full">Reject</button>
                        <button @click="startEditChangeOrder(co)" class="text-xs font-semibold text-imara-blue hover:text-imara-blueDark bg-blue-50 px-3 py-1 rounded-full">Edit</button>
                      </template>
                      <button @click="deleteChangeOrder(co)" class="text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-1 rounded-full transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Job Order Modal -->
    <div v-if="showAddJobModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="showAddJobModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Add Job Order</h2>

        <form @submit.prevent="saveJobOrder" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input v-model="newJob.description" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. Kitchen demolition" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
            <textarea v-model="newJob.scope_of_work" rows="2" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
              <input v-model="newJob.project_manager" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contract Value (CAD)</label>
              <input v-model="newJob.contract_value" type="number" min="0" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input v-model="newJob.start_date" type="date" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Est. Completion Date</label>
              <input v-model="newJob.estimated_completion_date" type="date" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Job Status</label>
            <select v-model="newJob.job_status" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
              <option>Active</option>
              <option>On Hold</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>

          <div class="border-t border-gray-100 pt-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="newJob.isChangeOrder" type="checkbox" class="w-4 h-4 rounded border-gray-300 accent-imara-blue" />
              <span class="text-sm font-medium text-gray-700">This is a Change Order</span>
            </label>
            <div v-if="newJob.isChangeOrder" class="mt-3 space-y-1">
              <label class="block text-sm font-medium text-gray-700">Contract Value Adjustment (CAD)</label>
              <input v-model="newJob.changeDelta" type="number" step="0.01"
                class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow"
                placeholder="e.g. 1500 or -500" />
              <p class="text-xs text-gray-400">Positive = scope increase, negative = reduction. Will be applied to the project contract value once approved.</p>
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddJobModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="savingJob" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ savingJob ? 'Saving…' : 'Add Job Order' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Job Order Modal -->
    <div v-if="editingJobOrder" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="editingJobOrder = null" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <p class="text-xs font-mono text-gray-400 mb-1">{{ editingJobOrder.job_number }}</p>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Edit Job Order</h2>

        <form @submit.prevent="saveEditJobOrder" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input v-model="editJobForm.description" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
            <textarea v-model="editJobForm.scope_of_work" rows="2" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
              <input v-model="editJobForm.project_manager" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contract Value (CAD)</label>
              <input v-model="editJobForm.contract_value" type="number" min="0" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input v-model="editJobForm.start_date" type="date" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Est. Completion Date</label>
              <input v-model="editJobForm.estimated_completion_date" type="date" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Job Status</label>
            <select v-model="editJobForm.job_status" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
              <option>Active</option>
              <option>On Hold</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="editingJobOrder = null" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="savingEditJob" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ savingEditJob ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Change Order Modal -->
    <div v-if="editingChangeOrder" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
        <button @click="editingChangeOrder = null" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Edit Change Order</h2>
        <form @submit.prevent="saveEditChangeOrder" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="editChangeForm.description" required rows="3" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contract Value Adjustment (CAD)</label>
            <input v-model="editChangeForm.amount_delta" type="number" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            <p class="text-xs text-gray-400 mt-1">Positive = scope increase, negative = reduction.</p>
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="editingChangeOrder = null" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="savingEditChangeOrder" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ savingEditChangeOrder ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Change Order Modal -->
    <div v-if="showAddChangeOrderModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
        <button @click="showAddChangeOrderModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">New Change Order</h2>
        <form @submit.prevent="saveChangeOrder" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="newChangeOrder.description" required rows="3" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="Describe the requested change..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contract Value Adjustment (CAD)</label>
            <input v-model="newChangeOrder.amount_delta" type="number" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. 1500 or -500" />
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddChangeOrderModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="savingChangeOrder" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ savingChangeOrder ? 'Saving…' : 'Create Change Order' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
