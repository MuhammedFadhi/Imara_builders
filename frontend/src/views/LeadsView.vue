<script setup>
import { ref, onMounted } from 'vue'

const leads = ref([])
const showAddModal = ref(false)

const newLead = ref({
  client_name: '',
  lead_source: 'Imara Builders',
  property_address: '',
  project_type: 'Renovation',
  estimated_value: 0
})

const fetchLeads = async () => {
  try {
    const res = await fetch('http://localhost:5001/api/leads')
    if (res.ok) leads.value = await res.json()
  } catch (err) {
    console.error(err)
  }
}

const saveLead = async () => {
  try {
    const res = await fetch('http://localhost:5001/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLead.value)
    })
    
    if (res.ok) {
      showAddModal.value = false
      newLead.value = { client_name: '', lead_source: 'Imara Builders', property_address: '', project_type: 'Renovation', estimated_value: 0 }
      fetchLeads()
    } else {
      const errorData = await res.json()
      alert("Error saving lead: " + (errorData.error || "Unknown error"))
    }
  } catch (err) {
    console.error(err)
    alert("Network error: Could not reach backend")
  }
}

const convertLead = async (id) => {
  try {
    const res = await fetch(`http://localhost:5001/api/leads/${id}/convert`, { method: 'PUT' })
    if (res.ok) fetchLeads()
  } catch (err) { console.error(err) }
}

onMounted(() => {
  fetchLeads()
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
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Client Name</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Address</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Source</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Type</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Value</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Status</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="leads.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-400">No leads found. Add your first lead!</td>
          </tr>
          <tr v-for="lead in leads" :key="lead.id" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">{{ lead.client_name }}</td>
            <td class="px-6 py-4 text-gray-500">{{ lead.property_address }}</td>
            <td class="px-6 py-4">
              <span :class="lead.lead_source === 'Imara Builders' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'" class="px-2.5 py-1 rounded text-xs font-semibold">
                {{ lead.lead_source }}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-500">{{ lead.project_type }}</td>
            <td class="px-6 py-4 text-gray-900 font-semibold">${{ Number(lead.estimated_value).toLocaleString() }}</td>
            <td class="px-6 py-4">
              <span class="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs font-semibold">{{ lead.lead_status }}</span>
            </td>
            <td class="px-6 py-4 text-right">
              <button v-if="lead.lead_status !== 'Won'" @click="convertLead(lead.id)" class="text-imara-blue hover:text-imara-blueDark font-semibold text-xs bg-imara-blueLight hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                Convert to Project
              </button>
              <span v-else class="text-xs text-gray-400 font-semibold italic">Converted</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Lead Modal Overlay -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative">
        <button @click="showAddModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Create New Lead</h2>
        
        <form @submit.prevent="saveLead" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input v-model="newLead.client_name" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. John Smith" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
            <input v-model="newLead.property_address" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. 123 Main St, Saint John" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
              <select v-model="newLead.lead_source" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option>Imara Builders</option>
                <option>BKZ Reno's</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
              <select v-model="newLead.project_type" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option>Renovation</option>
                <option>New Build</option>
                <option>Addition</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Estimated Value (CAD)</label>
            <input v-model="newLead.estimated_value" type="number" min="0" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
          </div>
          
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md">Save Lead</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
