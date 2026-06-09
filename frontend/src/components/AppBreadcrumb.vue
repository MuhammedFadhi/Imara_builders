<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLeadsStore } from '../stores/leads'
import { useCustomersStore } from '../stores/customers'
import { useProjectsStore } from '../stores/projects'
import { useJobOrdersStore } from '../stores/jobOrders'

const route = useRoute()
const leadsStore = useLeadsStore()
const customersStore = useCustomersStore()
const projectsStore = useProjectsStore()
const jobOrdersStore = useJobOrdersStore()

const crumbs = computed(() => {
  const name = route.name
  const base = [{ label: 'Dashboard', to: '/' }]

  if (name === 'Dashboard') return []

  if (name === 'Leads') return [...base, { label: 'Leads' }]

  if (name === 'LeadDetail') return [
    ...base,
    { label: 'Leads', to: '/leads' },
    { label: leadsStore.currentLead?.client_name || 'Lead Detail' }
  ]

  if (name === 'Customers') return [...base, { label: 'Customers' }]

  if (name === 'CustomerDetail') return [
    ...base,
    { label: 'Customers', to: '/customers' },
    { label: customersStore.currentCustomer?.full_name || 'Customer Detail' }
  ]

  if (name === 'Projects') return [...base, { label: 'Projects' }]

  if (name === 'ProjectDetail') return [
    ...base,
    { label: 'Projects', to: '/projects' },
    { label: projectsStore.currentProject?.project_number || 'Project Detail' }
  ]

  if (name === 'JobOrderDetail') return [
    ...base,
    { label: 'Projects', to: '/projects' },
    {
      label: projectsStore.currentProject?.project_number || 'Project',
      to: `/projects/${route.params.projectId}`
    },
    { label: jobOrdersStore.currentJobOrder?.title || 'Job Order' }
  ]

  if (name === 'Billing') return [...base, { label: 'Billing' }]

  return base
})
</script>

<template>
  <nav v-if="crumbs.length" class="flex items-center gap-1.5 px-10 pb-2 text-xs text-gray-400">
    <template v-for="(crumb, i) in crumbs" :key="i">
      <router-link v-if="crumb.to" :to="crumb.to" class="hover:text-imara-blue transition-colors">
        {{ crumb.label }}
      </router-link>
      <span v-else class="text-gray-600 font-medium">{{ crumb.label }}</span>
      <svg v-if="i < crumbs.length - 1" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </template>
  </nav>
</template>
