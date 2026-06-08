<script setup>
import { useLeadsStore } from '../stores/leads'

const props = defineProps({
  activities: { type: Array, default: () => [] }
})

const leadsStore = useLeadsStore()

const TYPE_LABELS = {
  note: 'Note',
  site_visit: 'Site Visit',
  document: 'Document',
  photo: 'Photo',
  comment: 'Comment',
  status_change: 'Status Change'
}

const TYPE_ICONS = {
  note: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  site_visit: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  photo: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
  comment: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  status_change: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
}

const fileUrls = {}
const openFile = async (activity) => {
  if (!activity.file_path) return
  const url = await leadsStore.getActivityFileUrl(activity.file_path)
  if (url) window.open(url, '_blank')
}

const formatDate = (iso) => new Date(iso).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
})
</script>

<template>
  <div class="space-y-4">
    <p v-if="activities.length === 0" class="text-sm text-gray-400 text-center py-8">No activity yet.</p>

    <div v-for="a in activities" :key="a.id" class="flex gap-3">
      <div class="w-9 h-9 rounded-full bg-imara-blueLight flex items-center justify-center text-imara-blue shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="TYPE_ICONS[a.activity_type]" />
        </svg>
      </div>
      <div class="flex-1 bg-gray-50 rounded-xl p-4">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-imara-blue bg-imara-blueLight px-2 py-0.5 rounded">{{ TYPE_LABELS[a.activity_type] }}</span>
            <span class="text-sm font-medium text-gray-800">{{ a.author?.full_name || a.author?.email || 'Unknown' }}</span>
            <span class="text-xs text-gray-400">· {{ a.author_company?.name }}</span>
          </div>
          <span class="text-xs text-gray-400">{{ formatDate(a.created_at) }}</span>
        </div>
        <p v-if="a.body" class="text-sm text-gray-600 whitespace-pre-wrap">{{ a.body }}</p>
        <button v-if="a.file_path" @click="openFile(a)" class="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-imara-blue hover:text-imara-blueDark bg-white border border-gray-200 px-3 py-1.5 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h6l6 6v10a2 2 0 01-2 2z" /></svg>
          {{ a.file_name || 'Download file' }}
        </button>
      </div>
    </div>
  </div>
</template>
