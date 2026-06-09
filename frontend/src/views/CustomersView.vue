<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomersStore } from '../stores/customers'
import { useCompaniesStore } from '../stores/companies'
import { useAuthStore } from '../stores/auth'
import { useDialogStore } from '../stores/dialog'

const router = useRouter()
const customersStore = useCustomersStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const dialog = useDialogStore()

const showAddModal = ref(false)
const saving = ref(false)

const blankCustomer = () => ({
  full_name: '',
  phone: '',
  email: '',
  address: '',
  source_company_id: auth.myCompanyId,
  notes: ''
})

const newCustomer = ref(blankCustomer())

const saveCustomer = async () => {
  saving.value = true
  try {
    await customersStore.createCustomer(newCustomer.value)
    showAddModal.value = false
    newCustomer.value = blankCustomer()
  } catch (err) {
    dialog.alert('Error saving customer: ' + (err.message || 'Unknown error'), 'Error')
  } finally {
    saving.value = false
  }
}

const openCustomer = (customer) => {
  router.push({ name: 'CustomerDetail', params: { id: customer.id } })
}

onMounted(() => {
  companiesStore.fetchCompanies()
  customersStore.fetchCustomers()
})
</script>

<template>
  <div class="px-10 pb-10">
    <div class="flex justify-between items-end mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Customers</h1>
        <p class="text-gray-500 text-sm">Won leads land here -- link them to projects from a dropdown.</p>
      </div>
      <button @click="showAddModal = true" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-md flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        New Customer
      </button>
    </div>

    <!-- Customers Table -->
    <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Customer #</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Name</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Phone</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Email</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Company</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="customersStore.customers.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-400">No customers yet. Mark a lead as "Won" to create one automatically.</td>
          </tr>
          <tr v-for="customer in customersStore.customers" :key="customer.id" @click="openCustomer(customer)" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
            <td class="px-6 py-4 text-gray-400 font-mono text-xs">{{ customer.customer_number }}</td>
            <td class="px-6 py-4 font-medium text-gray-900">{{ customer.full_name }}</td>
            <td class="px-6 py-4 text-gray-500">{{ customer.phone || '—' }}</td>
            <td class="px-6 py-4 text-gray-500">{{ customer.email || '—' }}</td>
            <td class="px-6 py-4">
              <span :class="customer.source_company?.slug === 'imara' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-2.5 py-1 rounded text-xs font-semibold">
                {{ customer.source_company?.name }}
              </span>
            </td>
            <td class="px-6 py-4 text-right" @click.stop>
              <button @click="openCustomer(customer)" class="text-imara-blue hover:text-imara-blueDark font-semibold text-xs bg-imara-blueLight px-3 py-1.5 rounded-full transition-colors">View Details</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Customer Modal Overlay -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="showAddModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Add Customer</h2>

        <form @submit.prevent="saveCustomer" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input v-model="newCustomer.full_name" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. John Smith" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input v-model="newCustomer.phone" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. 506-555-1234" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input v-model="newCustomer.email" type="email" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="name@example.com" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input v-model="newCustomer.address" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. 123 Main St, Saint John" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea v-model="newCustomer.notes" rows="3" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="Anything worth remembering about this customer..."></textarea>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="saving" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ saving ? 'Saving…' : 'Create Customer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
