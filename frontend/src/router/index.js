import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LeadsView from '../views/LeadsView.vue'
import LeadDetailView from '../views/LeadDetailView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import CustomersView from '../views/CustomersView.vue'
import CustomerDetailView from '../views/CustomerDetailView.vue'
import JobOrderDetailView from '../views/JobOrderDetailView.vue'
import BillingView from '../views/BillingView.vue'
import UserManagementView from '../views/UserManagementView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'Login', component: LoginView, meta: { public: true } },
    { path: '/', name: 'Dashboard', component: DashboardView },
    { path: '/leads', name: 'Leads', component: LeadsView },
    { path: '/leads/:id', name: 'LeadDetail', component: LeadDetailView },
    { path: '/customers', name: 'Customers', component: CustomersView },
    { path: '/customers/:id', name: 'CustomerDetail', component: CustomerDetailView },
    { path: '/projects', name: 'Projects', component: ProjectsView },
    { path: '/projects/:id', name: 'ProjectDetail', component: ProjectDetailView },
    { path: '/projects/:projectId/jobs/:jobId', name: 'JobOrderDetail', component: JobOrderDetailView },
    { path: '/billing', name: 'Billing', component: BillingView },
    { path: '/users', name: 'UserManagement', component: UserManagementView, meta: { roles: ['master_admin'], disabled: true } }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.loading) {
    await auth.init()
  }

  if (to.meta.public) {
    if (to.name === 'Login' && auth.isAuthenticated) {
      return { path: '/' }
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.meta.disabled) {
    return { path: '/' }
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.profile?.role)) {
    return { path: '/' }
  }

  return true
})

export default router
