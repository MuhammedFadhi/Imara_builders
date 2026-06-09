<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomersStore } from '../stores/customers'
import { useDialogStore } from '../stores/dialog'

const route = useRoute()
const router = useRouter()
const customersStore = useCustomersStore()
const dialog = useDialogStore()

const customer = computed(() => customersStore.currentCustomer)
const canEdit = computed(() => customersStore.canEditCustomer(customer.value))

const STATUS_STYLES = {
  done: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  'under process': 'bg-blue-100 text-blue-700'
}

const editing = ref(false)
const form = ref(null)
const saving = ref(false)

const startEdit = () => {
  form.value = {
    full_name: customer.value.full_name,
    phone: customer.value.phone,
    email: customer.value.email,
    address: customer.value.address,
    notes: customer.value.notes
  }
  editing.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    await customersStore.updateCustomer(customer.value.id, form.value)
    editing.value = false
  } catch (err) {
    dialog.alert('Error saving customer: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    saving.value = false
  }
}

const openProject = (project) => {
  router.push({ name: 'ProjectDetail', params: { id: project.id } })
}

onMounted(async () => {
  const id = route.params.id
  await customersStore.fetchCustomerById(id)
  if (customer.value) await customersStore.fetchCustomerProjects(id)
})
</script>

<template>
  <div class="px-10 pb-10">
    <button @click="router.push({ name: 'Customers' })" class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Back to Customers
    </button>

    <div v-if="customersStore.loading && !customer" class="text-gray-400 text-sm">Loading customer…</div>

    <template v-if="customer">
      <div class="flex justify-between items-start mb-8">
        <div>
          <p class="text-xs font-mono text-gray-400 mb-1">{{ customer.customer_number }}</p>
          <h1 class="text-3xl font-bold text-gray-900">{{ customer.full_name }}</h1>
          <p class="text-gray-500 text-sm mt-1">{{ customer.address || 'No address on file' }}</p>
        </div>
        <span :class="customer.source_company?.slug === 'imara' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-3 py-1.5 rounded-full text-xs font-semibold">
          {{ customer.source_company?.name }}
        </span>
      </div>

      <div v-if="!canEdit" class="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
        This customer belongs to {{ customer.source_company?.name }}. You can view it, but only {{ customer.source_company?.name }} can edit it.
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Customer details -->
        <div class="lg:col-span-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">Contact Details</h2>
            <button v-if="canEdit && !editing" @click="startEdit" class="text-xs font-semibold text-imara-blue bg-imara-blueLight hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">Edit</button>
          </div>

          <form v-if="editing" @submit.prevent="saveEdit" class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
              <input v-model="form.full_name" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input v-model="form.phone" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input v-model="form.email" type="email" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Address</label>
              <input v-model="form.address" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea v-model="form.notes" rows="3" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-imara-blue outline-none"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" @click="editing = false" class="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full">Cancel</button>
              <button type="submit" :disabled="saving" class="px-4 py-2 text-xs font-medium bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full disabled:opacity-60">
                {{ saving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>

          <dl v-else class="space-y-3 text-sm">
            <div class="flex justify-between"><dt class="text-gray-400">Phone</dt><dd class="text-gray-800 font-medium">{{ customer.phone || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Email</dt><dd class="text-gray-800 font-medium">{{ customer.email || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-400">Address</dt><dd class="text-gray-800 font-medium text-right">{{ customer.address || '—' }}</dd></div>
            <div v-if="customer.notes">
              <dt class="text-gray-400 mb-1">Notes</dt>
              <dd class="text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{{ customer.notes }}</dd>
            </div>
          </dl>
        </div>

        <!-- Linked Projects -->
        <div class="lg:col-span-2 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Projects</h2>

          <div v-if="customersStore.customerProjects.length === 0" class="text-center text-gray-400 text-sm py-8">
            No projects linked to this customer yet. Create one from the Projects tab and pick this customer from the dropdown.
          </div>

          <div v-else class="overflow-hidden rounded-xl border border-gray-100">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Project #</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Scope</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Contract Value</th>
                  <th class="px-4 py-3 font-semibold border-b border-gray-100">Status</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <tr v-for="project in customersStore.customerProjects" :key="project.id" @click="openProject(project)" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td class="px-4 py-3 text-gray-400 font-mono text-xs">{{ project.project_number }}</td>
                  <td class="px-4 py-3 font-medium text-gray-900">{{ project.scope_of_work || '—' }}</td>
                  <td class="px-4 py-3 text-gray-900 font-semibold">${{ Number(project.contract_value || 0).toLocaleString() }}</td>
                  <td class="px-4 py-3">
                    <span :class="STATUS_STYLES[project.project_status] || 'bg-gray-100 text-gray-600'" class="px-2.5 py-1 rounded text-xs font-semibold capitalize">{{ project.project_status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
