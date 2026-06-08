<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLeadsStore } from '../stores/leads'
import { useCompaniesStore } from '../stores/companies'
import { useAuthStore } from '../stores/auth'
import { useDialogStore } from '../stores/dialog'

const router = useRouter()
const leadsStore = useLeadsStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const dialog = useDialogStore()

const showAddModal = ref(false)
const saving = ref(false)

const LEAD_SOURCE_OPTIONS = ['Social Media', 'Referral', 'Website', 'Walk-in', 'Phone Call', 'Advertisement', 'Other']

const blankLead = () => ({
  client_name: '',
  client_phone: '',
  client_email: '',
  lead_source_company_id: auth.myCompanyId,
  lead_source: '',
  property_address: '',
  project_type: 'Renovation',
  estimated_value: 0,
  lead_notes: ''
})

const newLead = ref(blankLead())

const saveLead = async () => {
  saving.value = true
  try {
    await leadsStore.createLead(newLead.value)
    showAddModal.value = false
    newLead.value = blankLead()
  } catch (err) {
    dialog.alert('Error saving lead: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    saving.value = false
  }
}

const markWon = async (lead) => {
  if (!await dialog.confirm(`Mark "${lead.client_name}" as Won? This will convert the lead into a customer.`, 'Mark as Won')) return
  try {
    await leadsStore.updateLeadStatus(lead.id, 'Won')
  } catch (err) {
    dialog.alert('Error updating lead: ' + (err.message || 'Unknown error'), 'Error')
  }
}

const openLead = (lead) => {
  router.push({ name: 'LeadDetail', params: { id: lead.id } })
}

// Imara-only: hide their leads from BKZ unless explicitly shared
const togglingVisibilityId = ref(null)
const toggleVisibility = async (lead) => {
  togglingVisibilityId.value = lead.id
  try {
    await leadsStore.setLeadVisibility(lead.id, !lead.visible_to_partner)
  } catch (err) {
    dialog.alert('Error updating visibility: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    togglingVisibilityId.value = null
  }
}

onMounted(() => {
  companiesStore.fetchCompanies()
  leadsStore.fetchLeads()
})
</script>

<template>
  <div class="px-10 pb-10">
    <!-- Page Header -->
    <div class="flex justify-between items-end mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
        <p class="text-gray-500 text-sm">Manage potential jobs and client inquiries.</p>
      </div>
      <button @click="showAddModal = true" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-md flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        New Lead
      </button>
    </div>

    <!-- Leads Table -->
    <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Lead #</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Client Name</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Address</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Company</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Lead Source</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Visible to BKZ</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Type</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Value</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Status</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="leadsStore.leads.length === 0">
            <td colspan="10" class="px-6 py-8 text-center text-gray-400">No leads found. Add your first lead!</td>
          </tr>
          <tr v-for="lead in leadsStore.leads" :key="lead.id" @click="openLead(lead)" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
            <td class="px-6 py-4 text-gray-400 font-mono text-xs">{{ lead.lead_number }}</td>
            <td class="px-6 py-4 font-medium text-gray-900">{{ lead.client_name }}</td>
            <td class="px-6 py-4 text-gray-500">{{ lead.property_address }}</td>
            <td class="px-6 py-4">
              <span :class="lead.source_company?.slug === 'imara' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-2.5 py-1 rounded text-xs font-semibold">
                {{ lead.source_company?.name }}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-500">{{ lead.lead_source || '—' }}</td>
            <td class="px-6 py-4" @click.stop>
              <div v-if="lead.source_company?.slug === 'imara' && leadsStore.canEditLead(lead)" class="flex items-center gap-2">
                <button @click="toggleVisibility(lead)" :disabled="togglingVisibilityId === lead.id"
                  class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
                  :class="lead.visible_to_partner ? 'bg-imara-blue' : 'bg-gray-300'">
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" :class="lead.visible_to_partner ? 'translate-x-[18px]' : 'translate-x-1'"></span>
                </button>
                <span class="text-xs font-medium" :class="lead.visible_to_partner ? 'text-imara-blue' : 'text-gray-400'">{{ lead.visible_to_partner ? 'Shared' : 'Private' }}</span>
              </div>
              <span v-else-if="lead.source_company?.slug === 'imara'" class="text-xs font-medium" :class="lead.visible_to_partner ? 'text-imara-blue' : 'text-gray-400'">{{ lead.visible_to_partner ? 'Shared' : 'Private' }}</span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-6 py-4 text-gray-500">{{ lead.project_type }}</td>
            <td class="px-6 py-4 text-gray-900 font-semibold">${{ Number(lead.estimated_value || 0).toLocaleString() }}</td>
            <td class="px-6 py-4">
              <span class="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs font-semibold">{{ lead.lead_status }}</span>
            </td>
            <td class="px-6 py-4 text-right" @click.stop>
              <button v-if="lead.lead_status !== 'Won' && leadsStore.canEditLead(lead)" @click="markWon(lead)" class="text-imara-blue hover:text-imara-blueDark font-semibold text-xs bg-imara-blueLight hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                Mark as Won
              </button>
              <span v-else-if="lead.lead_status === 'Won'" class="text-xs text-gray-400 font-semibold italic">Converted</span>
              <span v-else class="text-xs text-gray-300 italic">View only</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Lead Modal Overlay -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="showAddModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Create New Lead</h2>

        <form @submit.prevent="saveLead" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input v-model="newLead.client_name" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. John Smith" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client Phone</label>
              <input v-model="newLead.client_phone" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. (506) 555-1234" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
              <input v-model="newLead.client_email" type="email" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. john@example.com" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
            <input v-model="newLead.property_address" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. 123 Main St, Saint John" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select v-model="newLead.lead_source_company_id" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option v-for="c in companiesStore.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
              <select v-model="newLead.lead_source" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option value="">— Select —</option>
                <option v-for="s in LEAD_SOURCE_OPTIONS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
              <select v-model="newLead.project_type" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option>Renovation</option>
                <option>New Build</option>
                <option>Addition</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estimated Value (CAD)</label>
              <input v-model="newLead.estimated_value" type="number" min="0" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Lead Notes</label>
            <textarea v-model="newLead.lead_notes" rows="3" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="Any context worth recording..."></textarea>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="saving" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ saving ? 'Saving…' : 'Save Lead' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
