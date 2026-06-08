<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobOrdersStore } from '../stores/jobOrders'
import { useProjectsStore } from '../stores/projects'
import { useInvoicesStore } from '../stores/invoices'
import { useDialogStore } from '../stores/dialog'

const route = useRoute()
const router = useRouter()
const jobOrdersStore = useJobOrdersStore()
const projectsStore = useProjectsStore()
const invoicesStore = useInvoicesStore()
const dialog = useDialogStore()

const job = computed(() => jobOrdersStore.currentJobOrder)
const canEdit = computed(() => jobOrdersStore.canEditJobOrder(job.value))

const STATUS_OPTIONS = ['Active', 'On Hold', 'Completed', 'Cancelled']
const JOB_STATUS_STYLES = {
  Active: 'bg-blue-100 text-blue-700',
  'On Hold': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-gray-100 text-gray-500'
}
const INVOICE_STATUS_STYLES = {
  unpaid: 'bg-amber-100 text-amber-700',
  partial: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-gray-100 text-gray-500'
}

const editing = ref(false)
const form = ref(null)
const saving = ref(false)

const startEdit = () => {
  form.value = {
    description: job.value.description,
    scope_of_work: job.value.scope_of_work,
    project_manager: job.value.project_manager,
    start_date: job.value.start_date,
    estimated_completion_date: job.value.estimated_completion_date,
    contract_value: job.value.contract_value
  }
  editing.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.start_date) payload.start_date = null
    if (!payload.estimated_completion_date) payload.estimated_completion_date = null
    await jobOrdersStore.updateJobOrder(job.value.id, payload)
    editing.value = false
  } catch (err) {
    dialog.alert('Error saving job order: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    saving.value = false
  }
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

// --- Record Payment ---
const showPaymentModal = ref(false)
const savingPayment = ref(false)
const blankPayment = () => ({
  amount: '',
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: '',
  reference_note: ''
})
const newPayment = ref(blankPayment())

const submitPayment = async () => {
  savingPayment.value = true
  try {
    await jobOrdersStore.recordPayment(job.value.id, newPayment.value)
    await jobOrdersStore.fetchPayments(job.value.id)
    showPaymentModal.value = false
    newPayment.value = blankPayment()
  } catch (err) {
    dialog.alert('Error recording payment: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    savingPayment.value = false
  }
}

// --- Invoices ---
const showInvoiceModal = ref(false)
const savingInvoice = ref(false)
const blankInvoice = () => ({
  invoice_number: '',
  amount: '',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  status: 'unpaid',
  file: null
})
const newInvoice = ref(blankInvoice())

const onInvoiceFileChange = (e) => {
  newInvoice.value.file = e.target.files?.[0] || null
}

const submitInvoice = async () => {
  savingInvoice.value = true
  try {
    await invoicesStore.uploadInvoice(job.value.id, newInvoice.value)
    showInvoiceModal.value = false
    newInvoice.value = blankInvoice()
    if (document.getElementById('invoice-file-input')) document.getElementById('invoice-file-input').value = ''
  } catch (err) {
    dialog.alert('Error uploading invoice: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    savingInvoice.value = false
  }
}

const openInvoiceFile = async (invoice) => {
  if (!invoice.file_path) return
  const url = await invoicesStore.getInvoiceFileUrl(invoice.file_path)
  if (url) window.open(url, '_blank')
}

onMounted(async () => {
  await jobOrdersStore.fetchJobOrderById(route.params.jobId)
  if (job.value) {
    await Promise.all([
      projectsStore.fetchProjectById(job.value.project_id),
      jobOrdersStore.fetchPayments(job.value.id),
      invoicesStore.fetchInvoices(job.value.id)
    ])
  }
})
</script>

<template>
  <div class="px-10 pb-10">
    <button @click="router.push({ name: 'ProjectDetail', params: { id: route.params.projectId } })" class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Back to Project
    </button>

    <div v-if="jobOrdersStore.loading && !job" class="text-gray-400 text-sm">Loading job order…</div>

    <template v-if="job">
      <div class="flex justify-between items-start mb-8">
        <div>
          <p class="text-xs font-mono text-gray-400 mb-1">{{ job.job_number }}</p>
          <h1 class="text-3xl font-bold text-gray-900">{{ job.description || job.client_name }}</h1>
          <p class="text-gray-500 text-sm mt-1">{{ job.project_address }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span :class="job.source_company?.slug === 'imara' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-3 py-1.5 rounded-full text-xs font-semibold">
            {{ job.source_company?.name }}
          </span>
          <select :value="job.job_status" :disabled="!canEdit" @change="jobOrdersStore.updateJobOrder(job.id, { job_status: $event.target.value })"
            class="text-xs font-semibold text-gray-600 bg-gray-100 border-none rounded-full px-3 py-1.5 focus:ring-2 focus:ring-imara-blue outline-none disabled:opacity-60">
            <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <div v-if="!canEdit" class="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
        This job order belongs to {{ job.source_company?.name }}. You can view it, but only {{ job.source_company?.name }} can edit it.
      </div>

      <!-- % Paid progress -->
      <div class="mb-6 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
        <div class="flex justify-between items-end mb-2">
          <div>
            <p class="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Payment Progress</p>
            <p class="text-2xl font-bold text-gray-900">{{ Number(job.percent_paid || 0).toFixed(0) }}% paid</p>
          </div>
          <p class="text-sm text-gray-500">
            ${{ Number(job.amount_paid || 0).toLocaleString() }} of ${{ Number(job.contract_value || 0).toLocaleString() }}
          </p>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div class="bg-gradient-to-r from-imara-blue to-imara-blueLight h-2.5 rounded-full transition-all" :style="{ width: Math.min(100, Number(job.percent_paid || 0)) + '%' }"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">Job Order Details</h2>
            <button v-if="canEdit && !editing" @click="startEdit" class="text-xs font-semibold text-imara-blue hover:text-imara-blueDark">Edit</button>
          </div>

          <form v-if="editing" @submit.prevent="saveEdit" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <input v-model="form.description" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Scope of Work</label>
              <textarea v-model="form.scope_of_work" rows="3" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Project Manager</label>
              <input v-model="form.project_manager" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                <input v-model="form.start_date" type="date" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Est. Completion</label>
                <input v-model="form.estimated_completion_date" type="date" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Contract Value (CAD)</label>
              <input v-model="form.contract_value" type="number" min="0" step="0.01" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" @click="editing = false" class="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full">Cancel</button>
              <button type="submit" :disabled="saving" class="px-4 py-2 text-xs font-medium bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full disabled:opacity-60">
                {{ saving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>

          <dl v-else class="space-y-3 text-sm">
            <div class="flex justify-between"><dt class="text-gray-400">Date</dt><dd class="text-gray-800 font-medium">{{ formatDate(job.job_date) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Project Manager</dt><dd class="text-gray-800 font-medium">{{ job.project_manager || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Start Date</dt><dd class="text-gray-800 font-medium">{{ formatDate(job.start_date) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Est. Completion Date</dt><dd class="text-gray-800 font-medium">{{ formatDate(job.estimated_completion_date) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Contract Value</dt><dd class="text-gray-800 font-semibold">${{ Number(job.contract_value || 0).toLocaleString() }}</dd></div>
            <div v-if="job.scope_of_work">
              <dt class="text-gray-400 mb-1">Scope of Work</dt>
              <dd class="text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{{ job.scope_of_work }}</dd>
            </div>
          </dl>
        </div>

        <!-- Payments + Invoices -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Payments ledger -->
          <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900">Payments</h2>
              <button v-if="canEdit" @click="showPaymentModal = true" class="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full hover:opacity-90 transition-opacity shadow-md flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                Record Payment
              </button>
            </div>

            <div v-if="jobOrdersStore.payments.length === 0" class="text-center text-gray-400 text-sm py-6">No payments recorded yet.</div>
            <div v-else class="overflow-hidden rounded-xl border border-gray-100">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Date</th>
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Amount</th>
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Method</th>
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Note</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <tr v-for="p in jobOrdersStore.payments" :key="p.id" class="border-b border-gray-50">
                    <td class="px-4 py-3 text-gray-500">{{ formatDate(p.payment_date) }}</td>
                    <td class="px-4 py-3 font-semibold text-gray-900">${{ Number(p.amount).toLocaleString() }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ p.payment_method || '—' }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ p.reference_note || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Invoices -->
          <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900">Invoices</h2>
              <button v-if="canEdit" @click="showInvoiceModal = true" class="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full hover:opacity-90 transition-opacity shadow-md flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                Upload Invoice
              </button>
            </div>

            <div v-if="invoicesStore.invoices.length === 0" class="text-center text-gray-400 text-sm py-6">No invoices uploaded yet.</div>
            <div v-else class="overflow-hidden rounded-xl border border-gray-100">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Invoice #</th>
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Amount</th>
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Issued / Due</th>
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">Status</th>
                    <th class="px-4 py-3 font-semibold border-b border-gray-100">File</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <tr v-for="inv in invoicesStore.invoices" :key="inv.id" class="border-b border-gray-50">
                    <td class="px-4 py-3 text-gray-500 font-mono text-xs">{{ inv.invoice_number || '—' }}</td>
                    <td class="px-4 py-3 font-semibold text-gray-900">${{ Number(inv.amount).toLocaleString() }}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(inv.issue_date) }} → {{ formatDate(inv.due_date) }}</td>
                    <td class="px-4 py-3">
                      <span :class="INVOICE_STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'" class="px-2.5 py-1 rounded text-xs font-semibold capitalize">{{ inv.status }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <button v-if="inv.file_path" @click="openInvoiceFile(inv)" class="text-imara-blue hover:text-imara-blueDark text-xs font-semibold">View</button>
                      <span v-else class="text-gray-300 text-xs">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Record Payment Modal -->
    <div v-if="showPaymentModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
        <button @click="showPaymentModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Record Payment</h2>
        <form @submit.prevent="submitPayment" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount (CAD)</label>
            <input v-model="newPayment.amount" required type="number" min="0.01" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. 1500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
            <input v-model="newPayment.payment_date" type="date" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <input v-model="newPayment.payment_method" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. e-transfer, cheque, cash" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reference Note</label>
            <input v-model="newPayment.reference_note" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. cheque #1042" />
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showPaymentModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="savingPayment" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ savingPayment ? 'Saving…' : 'Record Payment' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Upload Invoice Modal -->
    <div v-if="showInvoiceModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="showInvoiceModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Upload Invoice</h2>
        <form @submit.prevent="submitInvoice" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
            <input v-model="newInvoice.invoice_number" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. INV-1042" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount (CAD)</label>
            <input v-model="newInvoice.amount" required type="number" min="0.01" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input v-model="newInvoice.issue_date" type="date" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input v-model="newInvoice.due_date" type="date" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select v-model="newInvoice.status" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Invoice File</label>
            <input id="invoice-file-input" type="file" @change="onInvoiceFileChange"
              class="text-xs text-gray-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-imara-blueLight file:text-imara-blue file:text-xs file:font-semibold" />
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showInvoiceModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="savingInvoice" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ savingInvoice ? 'Uploading…' : 'Upload Invoice' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
