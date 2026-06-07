<script setup>
import { ref, onMounted } from 'vue'

const projects = ref([])
const showAddModal = ref(false)

const newProject = ref({
  client_name: '',
  project_address: '',
  source_company: 'Imara Builders',
  contract_value: 0,
  job_status: 'Active'
})

const fetchProjects = async () => {
  try {
    const res = await fetch('http://localhost:5001/api/projects')
    if (res.ok) projects.value = await res.json()
  } catch (err) { console.error(err) }
}

const saveProject = async () => {
  try {
    const res = await fetch('http://localhost:5001/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject.value)
    })
    
    if (res.ok) {
      showAddModal.value = false
      newProject.value = { client_name: '', project_address: '', source_company: 'Imara Builders', contract_value: 0, job_status: 'Active' }
      fetchProjects()
    } else {
      const errorData = await res.json()
      alert("Error saving project: " + (errorData.error || "Unknown error"))
    }
  } catch (err) {
    console.error(err)
    alert("Network error: Could not reach backend")
  }
}

onMounted(() => fetchProjects())
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
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Client Name</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Address</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Source</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Contract Value</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Status</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Action</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="projects.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-400">No active projects yet. Convert a lead to start!</td>
          </tr>
          <tr v-for="job in projects" :key="job.id" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">{{ job.client_name }}</td>
            <td class="px-6 py-4 text-gray-500">{{ job.project_address }}</td>
            <td class="px-6 py-4 text-gray-500">{{ job.source_company }}</td>
            <td class="px-6 py-4 text-gray-900 font-semibold">${{ Number(job.contract_value).toLocaleString() }}</td>
            <td class="px-6 py-4">
              <span class="bg-green-100 text-green-700 px-2.5 py-1 rounded text-xs font-semibold">{{ job.job_status }}</span>
            </td>
            <td class="px-6 py-4">
              <button class="text-imara-blue hover:text-imara-blueDark font-semibold text-xs bg-imara-blueLight px-3 py-1 rounded-full">View Details</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Project Modal Overlay -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative">
        <button @click="showAddModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Create New Project directly</h2>
        
        <form @submit.prevent="saveProject" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input v-model="newProject.client_name" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. John Smith" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Project Address</label>
            <input v-model="newProject.project_address" required type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. 123 Main St, Saint John" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Source Company</label>
              <select v-model="newProject.source_company" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option>Imara Builders</option>
                <option>BKZ Reno's</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contract Value (CAD)</label>
              <input v-model="newProject.contract_value" type="number" min="0" step="0.01" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
            </div>
          </div>
          
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
