<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.name || 'Dashboard')

const menuItems = [
  { name: 'Dashboard', path: '/', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { name: 'Leads', path: '/leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { name: 'Projects', path: '/projects', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2' },
  { name: 'Billing', path: '/billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
]

const generalItems = [
  { name: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { name: 'Logout', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' }
]
</script>

<template>
  <div class="min-h-screen bg-gray-200 p-4 md:p-8 flex items-center justify-center font-sans">
    
    <!-- App Container (The white rounded box from screenshot) -->
    <div class="bg-imara-bg w-full max-w-[1400px] h-[90vh] min-h-[800px] rounded-[2rem] shadow-xl flex overflow-hidden border border-gray-100">
      
      <!-- Sidebar -->
      <div class="w-64 bg-white flex flex-col h-full border-r border-gray-100">
        <!-- Logo Area -->
        <div class="p-8 flex items-center gap-3">
          <img src="https://imarabuilders.com/wp-content/uploads/2026/02/IB-Logo-New-Light.png" alt="Imara Builders" class="h-10" />
        </div>

        <!-- Menu Section -->
        <div class="px-6 flex-1">
          <p class="text-xs font-semibold text-gray-400 mb-4 tracking-wider">MENU</p>
          <ul class="space-y-1">
            <li v-for="item in menuItems" :key="item.name">
              <router-link :to="item.path"
                 class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                 :class="activeMenu === item.name ? 'bg-gradient-to-r from-imara-blueLight to-transparent text-imara-blue font-medium relative' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'">
                <!-- Active Indicator Line -->
                <div v-if="activeMenu === item.name" class="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-imara-red to-imara-redDark rounded-r-full"></div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
                </svg>
                {{ item.name }}
              </router-link>
            </li>
          </ul>

          <p class="text-xs font-semibold text-gray-400 mt-8 mb-4 tracking-wider">GENERAL</p>
          <ul class="space-y-1">
            <li v-for="item in generalItems" :key="item.name">
              <a href="#" class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
                </svg>
                {{ item.name }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
        
        <!-- Header -->
        <div class="px-10 py-8 flex justify-between items-center">
          <!-- Search -->
          <div class="relative w-96">
            <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search tasks, leads, projects..." class="w-full bg-white pl-12 pr-4 py-3 rounded-full border-none shadow-sm focus:ring-2 focus:ring-imara-blue outline-none text-sm text-gray-700 placeholder-gray-400" />
          </div>

          <!-- User Profile & Actions -->
          <div class="flex items-center gap-4">
            <button class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 hover:text-imara-blue">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <div class="flex items-center gap-3 bg-white pl-2 pr-4 py-1.5 rounded-full shadow-sm cursor-pointer border border-gray-50">
              <div class="w-8 h-8 bg-gradient-to-br from-imara-blue to-imara-blueDark rounded-full flex items-center justify-center text-white font-bold text-sm">IB</div>
              <div class="flex flex-col">
                <span class="text-sm font-semibold text-gray-800 leading-none">Imara Admin</span>
                <span class="text-xs text-gray-500">imara@a360.ca</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Dashboard Content -->
        <router-view />

      </div>
    </div>
  </div>
</template>
