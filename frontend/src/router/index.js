import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LeadsView from '../views/LeadsView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import BillingView from '../views/BillingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Dashboard', component: DashboardView },
    { path: '/leads', name: 'Leads', component: LeadsView },
    { path: '/projects', name: 'Projects', component: ProjectsView },
    { path: '/billing', name: 'Billing', component: BillingView }
  ]
})

export default router
