import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'

export const useCompaniesStore = defineStore('companies', () => {
  const companies = ref([])
  const loaded = ref(false)

  async function fetchCompanies() {
    if (loaded.value) return
    const { data, error } = await supabase.from('companies').select('id, name, slug').order('name')
    if (error) {
      console.error('Failed to fetch companies', error)
      return
    }
    companies.value = data
    loaded.value = true
  }

  const companyName = computed(() => (id) => companies.value.find(c => c.id === id)?.name || '—')
  const companyBySlug = computed(() => (slug) => companies.value.find(c => c.slug === slug))

  return { companies, fetchCompanies, companyName, companyBySlug }
})
