<script setup>
import { onMounted } from 'vue'
import { useBillingStore } from '../stores/billing'
import { useAuthStore } from '../stores/auth'

const billingStore = useBillingStore()
const auth = useAuthStore()

onMounted(async () => {
  await billingStore.fetchBillingSummary()
  if (auth.isMasterAdmin) {
    await billingStore.fetchProfitSummary()
  }
})
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
        <div class="text-3xl font-bold text-gray-900 mt-2 mb-2">${{ billingStore.summary.totalContractValue.toLocaleString() }}</div>
      </div>
      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <span class="text-sm font-medium text-gray-500">Total Invoiced</span>
        <div class="text-3xl font-bold text-gray-900 mt-2 mb-2">${{ billingStore.summary.totalInvoiced.toLocaleString() }}</div>
      </div>
      <div class="bg-gradient-to-br from-imara-blue to-imara-blueDark text-white rounded-[1.5rem] p-6 shadow-lg">
        <span class="text-sm font-medium text-white/90 opacity-90">Total Payment Received</span>
        <div class="text-3xl font-bold mt-2 mb-2">${{ billingStore.summary.totalPaid.toLocaleString() }}</div>
      </div>
      <div class="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow border-l-4 border-l-red-500">
        <span class="text-sm font-medium text-gray-500">Outstanding Balance</span>
        <div class="text-3xl font-bold text-red-500 mt-2 mb-2">${{ billingStore.summary.outstandingBalance.toLocaleString() }}</div>
      </div>
    </div>

    <!-- Profit & Margins (Master Admin only) -->
    <div v-if="auth.isMasterAdmin" class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div class="px-8 py-6 border-b border-gray-100">
        <h2 class="text-lg font-bold text-gray-900">Profit & Margins</h2>
        <p class="text-gray-400 text-xs mt-1">Internal cost vs. contract value -- visible to Master Admin only.</p>
      </div>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th class="px-8 py-4 font-semibold border-b border-gray-100">Project</th>
            <th class="px-8 py-4 font-semibold border-b border-gray-100">Contract Value</th>
            <th class="px-8 py-4 font-semibold border-b border-gray-100">Internal Cost</th>
            <th class="px-8 py-4 font-semibold border-b border-gray-100">Profit Margin</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="billingStore.profitLoading">
            <td colspan="4" class="px-8 py-8 text-center text-gray-400">Loading…</td>
          </tr>
          <tr v-else-if="billingStore.profitSummary.length === 0">
            <td colspan="4" class="px-8 py-8 text-center text-gray-400">No financial records yet. Add internal cost data per project to see margins here.</td>
          </tr>
          <tr v-for="row in billingStore.profitSummary" :key="row.project_id" class="border-b border-gray-50">
            <td class="px-8 py-4 font-medium text-gray-900">
              {{ row.project?.customer?.full_name || '—' }}
              <span class="text-gray-400 font-mono text-xs block">{{ row.project?.project_number }}</span>
            </td>
            <td class="px-8 py-4 text-gray-700">${{ Number(row.contract_value || 0).toLocaleString() }}</td>
            <td class="px-8 py-4 text-gray-700">${{ Number(row.internal_cost || 0).toLocaleString() }}</td>
            <td class="px-8 py-4 font-semibold" :class="Number(row.profit_margin) >= 0 ? 'text-green-600' : 'text-imara-red'">
              ${{ Number(row.profit_margin || 0).toLocaleString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bg-white rounded-[1.5rem] p-8 shadow-sm border border-gray-100 text-center text-gray-500 py-20">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      Open a job order from a project to upload invoices and record payments.
    </div>
  </div>
</template>
