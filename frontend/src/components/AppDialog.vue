<script setup>
import { useDialogStore } from '../stores/dialog'

const dialog = useDialogStore()
</script>

<template>
  <Transition name="fade">
    <div v-if="dialog.visible" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" @click.self="dialog.type === 'confirm' ? dialog.resolve(false) : dialog.resolve(true)">
      <div class="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative text-center">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
             :class="dialog.type === 'confirm' ? 'bg-imara-blueLight text-imara-blue' : 'bg-red-50 text-imara-red'">
          <svg v-if="dialog.type === 'confirm'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 class="text-lg font-bold text-gray-900 mb-2">{{ dialog.title }}</h2>
        <p class="text-sm text-gray-500 mb-6 whitespace-pre-wrap">{{ dialog.message }}</p>
        <div class="flex justify-center gap-3">
          <button v-if="dialog.type === 'confirm'" @click="dialog.resolve(false)" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors">Cancel</button>
          <button @click="dialog.resolve(true)" class="px-6 py-2.5 bg-gradient-to-r from-imara-red to-imara-redDark text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md">
            {{ dialog.type === 'confirm' ? 'Confirm' : 'OK' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
