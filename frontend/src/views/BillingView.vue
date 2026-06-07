<script setup>
import { ref, onMounted } from 'vue'

const billing = ref({
  totalContractValue: 0,
  totalInvoiced: 0,
  totalPaid: 0,
  outstandingBalance: 0
})

const fetchBilling = async () => {
  try {
    const res = await fetch('http://localhost:5001/api/billing')
    if (res.ok) billing.value = await res.json()
  } catch (err) { console.error(err) }
}

onMounted(() => fetchBilling())
</script>

<template>
  <div class="px-10 pb-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Billing & Payments</h1>
      <p class="text-gray-500 text-sm">Overall financial health and outstanding invoices.</p>
    </div>

    <!-- Metrics Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <span class="text-sm font-medium text-gray-500">Total Contract Value</span>
        <div class="text-3xl font-bold text-gray-900 mt-2 mb-2">${{ billing.totalContractValue.toLocaleString() }}</div>
      </div>
      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <span class="text-sm font-medium text-gray-500">Total Invoiced</span>
        <div class="text-3xl font-bold text-gray-900 mt-2 mb-2">${{ billing.totalInvoiced.toLocaleString() }}</div>
      </div>
      <div class="bg-gradient-to-br from-imara-blue to-imara-blueDark text-white rounded-[1.5rem] p-6 shadow-lg">
        <span class="text-sm font-medium text-white/90 opacity-90">Total Paid</span>
        <div class="text-3xl font-bold mt-2 mb-2">${{ billing.totalPaid.toLocaleString() }}</div>
      </div>
      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow border-l-4 border-l-red-500">
        <span class="text-sm font-medium text-gray-500">Outstanding Balance</span>
        <div class="text-3xl font-bold text-red-500 mt-2 mb-2">${{ billing.outstandingBalance.toLocaleString() }}</div>
      </div>
    </div>
    
    <div class="bg-white rounded-[1.5rem] p-8 shadow-sm border border-gray-100 text-center text-gray-500 py-20">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      Select a specific project from the Projects tab to view and upload detailed invoices and payments.
    </div>
  </div>
</template>
