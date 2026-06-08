<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeadsStore } from '../stores/leads'
import { useCompaniesStore } from '../stores/companies'
import { useAuthStore } from '../stores/auth'
import { useDialogStore } from '../stores/dialog'
import ActivityFeed from '../components/ActivityFeed.vue'

const route = useRoute()
const router = useRouter()
const leadsStore = useLeadsStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const dialog = useDialogStore()

const lead = computed(() => leadsStore.currentLead)
const canEdit = computed(() => leadsStore.canEditLead(lead.value))

const STATUS_OPTIONS = ['New Lead', 'Contacted', 'Site Visit Completed', 'Estimate Sent', 'Follow Up', 'Won', 'Lost']
const LEAD_SOURCE_OPTIONS = ['Social Media', 'Referral', 'Website', 'Walk-in', 'Phone Call', 'Advertisement', 'Other']

const editing = ref(false)
const form = ref(null)
const saving = ref(false)

const startEdit = () => {
  form.value = {
    client_name: lead.value.client_name,
    client_phone: lead.value.client_phone,
    client_email: lead.value.client_email,
    property_address: lead.value.property_address,
    lead_source: lead.value.lead_source,
    project_type: lead.value.project_type,
    estimated_value: lead.value.estimated_value,
    lead_notes: lead.value.lead_notes
  }
  editing.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    await leadsStore.updateLead(lead.value.id, form.value)
    editing.value = false
  } catch (err) {
    dialog.alert('Error saving lead: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    saving.value = false
  }
}

const changingStatus = ref(false)
const changeStatus = async (status) => {
  if (status === lead.value.lead_status) return
  if (status === 'Won' && !await dialog.confirm('Mark this lead as Won? This will convert it into a customer.', 'Mark as Won')) return
  changingStatus.value = true
  try {
    await leadsStore.updateLeadStatus(lead.value.id, status)
    await leadsStore.fetchActivities(lead.value.id)
  } catch (err) {
    dialog.alert('Error updating status: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    changingStatus.value = false
  }
}

// --- Activity composer ---
const activityType = ref('comment')
const activityBody = ref('')
const activityFile = ref(null)
const submittingActivity = ref(false)

const ACTIVITY_TABS = [
  { value: 'comment', label: 'Comment' },
  { value: 'note', label: 'Note' },
  { value: 'site_visit', label: 'Site Visit Log' },
  { value: 'document', label: 'Document' },
  { value: 'photo', label: 'Photo' }
]

// Comments are always allowed; other activity types require edit rights on the lead
const availableTabs = computed(() => canEdit.value ? ACTIVITY_TABS : ACTIVITY_TABS.filter(t => t.value === 'comment'))

const onFileChange = (e) => {
  activityFile.value = e.target.files?.[0] || null
}

const submitActivity = async () => {
  if (!activityBody.value && !activityFile.value) return
  submittingActivity.value = true
  try {
    await leadsStore.addActivity(lead.value.id, {
      activity_type: activityType.value,
      body: activityBody.value || null,
      file: activityFile.value
    })
    activityBody.value = ''
    activityFile.value = null
    if (document.getElementById('activity-file-input')) document.getElementById('activity-file-input').value = ''
  } catch (err) {
    dialog.alert('Error adding activity: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    submittingActivity.value = false
  }
}

onMounted(async () => {
  await companiesStore.fetchCompanies()
  await leadsStore.fetchLeadById(route.params.id)
  if (lead.value) await leadsStore.fetchActivities(lead.value.id)
})
</script>

<template>
  <div class="px-10 pb-10">
    <button @click="router.push({ name: 'Leads' })" class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Back to Leads
    </button>

    <div v-if="leadsStore.loading && !lead" class="text-gray-400 text-sm">Loading lead…</div>

    <template v-if="lead">
      <div class="flex justify-between items-start mb-8">
        <div>
          <p class="text-xs font-mono text-gray-400 mb-1">{{ lead.lead_number }}</p>
          <h1 class="text-3xl font-bold text-gray-900">{{ lead.client_name }}</h1>
          <p class="text-gray-500 text-sm mt-1">{{ lead.property_address }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span :class="lead.source_company?.slug === 'imara' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-3 py-1.5 rounded-full text-xs font-semibold">
            {{ lead.source_company?.name }}
          </span>
          <select :value="lead.lead_status" :disabled="!canEdit || changingStatus" @change="changeStatus($event.target.value)"
            class="text-xs font-semibold text-gray-600 bg-gray-100 border-none rounded-full px-3 py-1.5 focus:ring-2 focus:ring-imara-blue outline-none disabled:opacity-60">
            <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <div v-if="!canEdit" class="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
        This lead belongs to {{ lead.source_company?.name }}. You can view it and add comments, but only {{ lead.source_company?.name }} can edit it.
      </div>


      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Lead details -->
        <div class="lg:col-span-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">Lead Details</h2>
            <button v-if="canEdit && !editing" @click="startEdit" class="text-xs font-semibold text-imara-blue hover:text-imara-blueDark">Edit</button>
          </div>

          <form v-if="editing" @submit.prevent="saveEdit" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Client Name</label>
              <input v-model="form.client_name" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input v-model="form.client_phone" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input v-model="form.client_email" type="email" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Property Address</label>
              <input v-model="form.property_address" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Lead Source</label>
              <select v-model="form.lead_source" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none">
                <option value="">— Select —</option>
                <option v-for="s in LEAD_SOURCE_OPTIONS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Project Type</label>
              <select v-model="form.project_type" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none">
                <option>Renovation</option>
                <option>New Build</option>
                <option>Addition</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Estimated Value (CAD)</label>
              <input v-model="form.estimated_value" type="number" min="0" step="0.01" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Lead Notes</label>
              <textarea v-model="form.lead_notes" rows="3" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" @click="editing = false" class="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full">Cancel</button>
              <button type="submit" :disabled="saving" class="px-4 py-2 text-xs font-medium bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full disabled:opacity-60">
                {{ saving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>

          <dl v-else class="space-y-3 text-sm">
            <div class="flex justify-between"><dt class="text-gray-400">Phone</dt><dd class="text-gray-800 font-medium">{{ lead.client_phone || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Email</dt><dd class="text-gray-800 font-medium">{{ lead.client_email || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Lead Source</dt><dd class="text-gray-800 font-medium">{{ lead.lead_source || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Project Type</dt><dd class="text-gray-800 font-medium">{{ lead.project_type || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Estimated Value</dt><dd class="text-gray-800 font-semibold">${{ Number(lead.estimated_value || 0).toLocaleString() }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Assigned Company</dt><dd class="text-gray-800 font-medium">{{ companiesStore.companyName(lead.assigned_company_id) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Created By</dt><dd class="text-gray-800 font-medium">{{ lead.creator?.full_name || lead.creator?.email || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Date Created</dt><dd class="text-gray-800 font-medium">{{ new Date(lead.created_at).toLocaleDateString() }}</dd></div>
            <div v-if="lead.lead_notes">
              <dt class="text-gray-400 mb-1">Notes</dt>
              <dd class="text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{{ lead.lead_notes }}</dd>
            </div>
          </dl>
        </div>

        <!-- Activity feed -->
        <div class="lg:col-span-2 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Activity</h2>

          <!-- Composer -->
          <div class="mb-6 bg-gray-50 rounded-xl p-4">
            <div class="flex flex-wrap gap-2 mb-3">
              <button v-for="tab in availableTabs" :key="tab.value" @click="activityType = tab.value"
                :class="activityType === tab.value ? 'bg-imara-blue text-white' : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-700'"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                {{ tab.label }}
              </button>
            </div>
            <textarea v-model="activityBody" rows="2"
              :placeholder="activityType === 'comment' ? 'Add a comment…' : `Add a ${activityType.replace('_',' ')}…`"
              class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none mb-3"></textarea>
            <div v-if="activityType === 'document' || activityType === 'photo'" class="mb-3">
              <input id="activity-file-input" type="file" :accept="activityType === 'photo' ? 'image/*' : undefined" @change="onFileChange"
                class="text-xs text-gray-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-imara-blueLight file:text-imara-blue file:text-xs file:font-semibold" />
            </div>
            <div class="flex justify-end">
              <button @click="submitActivity" :disabled="submittingActivity || (!activityBody && !activityFile)"
                class="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full disabled:opacity-50">
                {{ submittingActivity ? 'Posting…' : 'Post' }}
              </button>
            </div>
          </div>

          <ActivityFeed :activities="leadsStore.activities" />
        </div>
      </div>
    </template>
  </div>
</template>
