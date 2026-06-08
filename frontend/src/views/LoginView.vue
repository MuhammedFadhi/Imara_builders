<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const submit = async () => {
  error.value = ''
  loading.value = true
  try {
    await auth.signIn(email.value, password.value)
    router.replace(route.query.redirect || '/')
  } catch (err) {
    error.value = err.message || 'Unable to sign in. Check your email and password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-200 flex items-center justify-center font-sans p-4">
    <div class="bg-white w-full max-w-md rounded-[2rem] shadow-xl border border-gray-100 p-10">
      <div class="flex flex-col items-center mb-8">
        <img src="https://imarabuilders.com/wp-content/uploads/2026/02/IB-Logo-New-Light.png" alt="Imara Builders" class="h-12 mb-6" />
        <h1 class="text-2xl font-bold text-gray-900">Sign in</h1>
        <p class="text-gray-500 text-sm mt-1">Access your Imara Builders dashboard</p>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input v-model="email" required type="email" autocomplete="username"
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow"
            placeholder="you@company.com" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input v-model="password" required type="password" autocomplete="current-password"
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-imara-blue outline-none transition-shadow"
            placeholder="••••••••" />
        </div>

        <p v-if="error" class="text-sm text-imara-red font-medium">{{ error }}</p>

        <button type="submit" :disabled="loading"
          class="w-full mt-2 px-6 py-3 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-60">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>
