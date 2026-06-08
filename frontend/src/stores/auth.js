import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!session.value)
  const isMasterAdmin = computed(() => profile.value?.role === 'master_admin')
  const isPartnerAdmin = computed(() => profile.value?.role === 'partner_admin')
  const myCompanyId = computed(() => profile.value?.company_id ?? null)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, company_id, companies ( id, name, slug )')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch profile', error)
      profile.value = null
      return
    }
    profile.value = data
  }

  async function init() {
    loading.value = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    if (session.value) {
      await fetchProfile(session.value.user.id)
    }
    loading.value = false

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session.value = newSession
      if (newSession) {
        await fetchProfile(newSession.user.id)
      } else {
        profile.value = null
      }
    })

    // Tabs left open for a long time can end up with a stale access token
    // (browsers throttle background timers). Refresh as soon as the tab
    // regains focus so the token is valid before the user starts interacting.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession()
      }
    })
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
    await fetchProfile(data.session.user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
    profile.value = null
  }

  return {
    session,
    profile,
    loading,
    isAuthenticated,
    isMasterAdmin,
    isPartnerAdmin,
    myCompanyId,
    init,
    signIn,
    signOut,
    fetchProfile
  }
})
