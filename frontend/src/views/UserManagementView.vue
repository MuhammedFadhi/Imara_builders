<script setup>
import { ref, onMounted } from 'vue'
import { useUsersStore } from '../stores/users'
import { useCompaniesStore } from '../stores/companies'
import { useAuthStore } from '../stores/auth'
import { useDialogStore } from '../stores/dialog'

const usersStore = useUsersStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const dialog = useDialogStore()

const ROLE_STYLES = {
  master_admin: 'bg-imara-redLight text-imara-red',
  partner_admin: 'bg-imara-blueLight text-imara-blue'
}
const ROLE_LABELS = { master_admin: 'Master Admin', partner_admin: 'Partner Admin' }

const showAddModal = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const formError = ref('')

const blankInvite = () => ({
  email: '',
  password: '',
  full_name: '',
  role: 'partner_admin',
  company_id: companiesStore.companies[0]?.id || ''
})

const inviteForm = ref(blankInvite())

const editForm = ref({ full_name: '', email: '', role: '', company_id: '' })

const openAddModal = () => {
  formError.value = ''
  inviteForm.value = blankInvite()
  showAddModal.value = true
}

const submitInvite = async () => {
  formError.value = ''
  saving.value = true
  try {
    await usersStore.inviteUser(inviteForm.value)
    showAddModal.value = false
  } catch (err) {
    formError.value = err.message || 'Failed to create user'
  } finally {
    saving.value = false
  }
}

const openEditModal = (user) => {
  formError.value = ''
  editingUser.value = user
  editForm.value = {
    full_name: user.full_name || '',
    email: user.email || '',
    role: user.role,
    company_id: user.company_id
  }
}

const submitEdit = async () => {
  formError.value = ''
  saving.value = true
  try {
    await usersStore.updateUser(editingUser.value.id, editForm.value)
    editingUser.value = null
  } catch (err) {
    formError.value = err.message || 'Failed to update user'
  } finally {
    saving.value = false
  }
}

const removeUser = async (user) => {
  if (!await dialog.confirm(`Delete ${user.full_name || user.email}? This permanently removes their account.`, 'Delete user')) return
  try {
    await usersStore.deleteUser(user.id)
  } catch (err) {
    dialog.alert('Error deleting user: ' + (err.message || 'Unknown error'), 'Error')
  }
}

onMounted(() => {
  companiesStore.fetchCompanies()
  usersStore.fetchUsers()
})
</script>

<template>
  <div class="px-10 pb-10">
    <div class="flex justify-between items-end mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p class="text-gray-500 text-sm">Master Admin only -- create, edit and remove user accounts.</p>
      </div>
      <button @click="openAddModal" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-md flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Invite User
      </button>
    </div>

    <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Name</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Email</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Company</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100">Role</th>
            <th class="px-6 py-4 font-semibold border-b border-gray-100 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="usersStore.loading">
            <td colspan="5" class="px-6 py-8 text-center text-gray-400">Loading users…</td>
          </tr>
          <tr v-else-if="usersStore.users.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-400">No users yet.</td>
          </tr>
          <tr v-for="user in usersStore.users" :key="user.id" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">{{ user.full_name || '—' }}</td>
            <td class="px-6 py-4 text-gray-500">{{ user.email }}</td>
            <td class="px-6 py-4 text-gray-500">{{ user.companies?.name || '—' }}</td>
            <td class="px-6 py-4">
              <span :class="ROLE_STYLES[user.role] || 'bg-gray-100 text-gray-600'" class="px-2.5 py-1 rounded text-xs font-semibold">
                {{ ROLE_LABELS[user.role] || user.role }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button @click="openEditModal(user)" class="text-imara-blue hover:text-imara-blueDark font-semibold text-xs bg-imara-blueLight px-3 py-1.5 rounded-full transition-colors">Edit</button>
                <button v-if="user.id !== auth.session?.user?.id" @click="removeUser(user)" class="text-imara-red hover:text-imara-redDark font-semibold text-xs bg-imara-redLight px-3 py-1.5 rounded-full transition-colors">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Invite User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="showAddModal = false" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Invite New User</h2>

        <form @submit.prevent="submitInvite" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input v-model="inviteForm.full_name" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="e.g. Jane Doe" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input v-model="inviteForm.email" required type="email" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="name@company.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
            <input v-model="inviteForm.password" required type="text" minlength="6" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" placeholder="At least 6 characters" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select v-model="inviteForm.role" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option value="partner_admin">Partner Admin</option>
                <option value="master_admin">Master Admin</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select v-model="inviteForm.company_id" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option v-for="c in companiesStore.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <p v-if="formError" class="text-sm text-imara-red">{{ formError }}</p>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="showAddModal = false" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="saving" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ saving ? 'Creating…' : 'Create User' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="editingUser" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button @click="editingUser = null" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Edit User</h2>

        <form @submit.prevent="submitEdit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input v-model="editForm.full_name" type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input v-model="editForm.email" required type="email" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select v-model="editForm.role" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option value="partner_admin">Partner Admin</option>
                <option value="master_admin">Master Admin</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select v-model="editForm.company_id" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow">
                <option v-for="c in companiesStore.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <p v-if="formError" class="text-sm text-imara-red">{{ formError }}</p>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="editingUser = null" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
            <button type="submit" :disabled="saving" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
