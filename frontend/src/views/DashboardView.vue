<script setup>
import { ref, onMounted } from 'vue'

const metrics = ref({
  totalLeads: 0,
  activeProjects: 0,
  completedProjects: 0,
  outstandingPayments: 0
})

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:5001/api/dashboard')
    if (res.ok) {
      metrics.value = await res.json()
    }
  } catch (err) {
    console.error("Failed to load dashboard metrics", err)
  }
})
</script>

<template>
  <div class="px-10 pb-10">
    <!-- Page Header -->
    <div class="flex justify-between items-end mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p class="text-gray-500 text-sm">Track and manage your leads and active projects.</p>
      </div>
      <div class="flex gap-3">
        <button class="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          Generate Report
        </button>
        <router-link to="/leads" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-md flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Add Lead
        </router-link>
      </div>
    </div>

    <!-- Metrics Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <!-- Primary Card -->
      <div class="bg-gradient-to-br from-imara-blue to-imara-blueDark rounded-[1.5rem] p-6 text-white shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex justify-between items-start mb-6 relative z-10">
          <span class="text-sm font-medium text-white/90 opacity-90">Total Leads</span>
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </div>
        </div>
        <div class="text-4xl font-bold mb-2 relative z-10">{{ metrics.totalLeads }}</div>
        <div class="text-xs text-white/70 relative z-10 flex items-center gap-1">
          <span class="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Active</span>
        </div>
        <!-- Decorative Circle -->
        <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full"></div>
      </div>

      <!-- Secondary Cards -->
      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-6">
          <span class="text-sm font-medium text-gray-500">Active Projects</span>
          <div class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </div>
        </div>
        <div class="text-4xl font-bold text-gray-900 mb-2">{{ metrics.activeProjects }}</div>
        <div class="text-xs text-gray-400 flex items-center gap-1">
          <span class="bg-imara-blueLight text-imara-blue px-1.5 py-0.5 rounded text-[10px]">Live</span>
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-6">
          <span class="text-sm font-medium text-gray-500">Completed Jobs</span>
          <div class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </div>
        </div>
        <div class="text-4xl font-bold text-gray-900 mb-2">{{ metrics.completedProjects }}</div>
        <div class="text-xs text-gray-400 flex items-center gap-1">
          <span class="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">Historic</span>
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-6">
          <span class="text-sm font-medium text-gray-500">Outstanding</span>
          <div class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <div class="text-3xl font-bold text-gray-900 mb-2">${{ (metrics.outstandingPayments / 1000).toFixed(1) }}k</div>
        <div class="text-xs text-red-500 font-medium">Needs attention</div>
      </div>
    </div>

    <!-- Bottom Section: Analytics -->
    <div class="bg-white rounded-[1.5rem] p-8 shadow-sm border border-gray-100">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-bold text-gray-900">Project Analytics</h2>
        <select class="bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg focus:ring-imara-blue focus:border-imara-blue block p-2">
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>
      
      <!-- Dummy Bar Chart -->
      <div class="h-48 flex items-end justify-between gap-4 pt-8">
        <div class="w-full bg-gray-100 h-[60%] rounded-t-xl relative group">
          <div class="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">60%</div>
        </div>
        <div class="w-full bg-gradient-to-t from-imara-red to-imara-redDark h-[80%] rounded-t-xl"></div>
        <div class="w-full bg-imara-redLight h-[40%] rounded-t-xl border border-imara-red border-dashed"></div>
        <div class="w-full bg-gradient-to-t from-imara-blue to-imara-blueDark h-[100%] rounded-t-xl relative">
          <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-white shadow border text-gray-700 font-bold text-xs px-2 py-1 rounded">74%</div>
        </div>
        <div class="w-full bg-gray-100 h-[70%] rounded-t-xl"></div>
        <div class="w-full bg-gray-100 h-[50%] rounded-t-xl"></div>
        <div class="w-full bg-gray-100 h-[65%] rounded-t-xl"></div>
      </div>
      <div class="flex justify-between mt-4 text-xs font-semibold text-gray-400 px-2">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
    </div>
  </div>
</template>
