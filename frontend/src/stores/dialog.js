import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDialogStore = defineStore('dialog', () => {
  const visible = ref(false)
  const type = ref('alert') // 'alert' | 'confirm'
  const title = ref('')
  const message = ref('')
  let resolver = null

  function open(type_, message_, title_) {
    return new Promise((resolve) => {
      type.value = type_
      title.value = title_
      message.value = message_
      visible.value = true
      resolver = resolve
    })
  }

  function alert(message_, title_ = 'Heads up') {
    return open('alert', message_, title_)
  }

  function confirm(message_, title_ = 'Please confirm') {
    return open('confirm', message_, title_)
  }

  function resolve(value) {
    visible.value = false
    if (resolver) {
      resolver(value)
      resolver = null
    }
  }

  return { visible, type, title, message, alert, confirm, resolve }
})
