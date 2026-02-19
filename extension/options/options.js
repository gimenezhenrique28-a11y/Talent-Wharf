const DEFAULT_URL = 'https://yfhwmbywrgzkdddwddtd.supabase.co/functions/v1/extension-capture'

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey')
  const functionUrlInput = document.getElementById('functionUrl')
  const saveBtn = document.getElementById('saveBtn')
  const toggleKey = document.getElementById('toggleKey')
  const toast = document.getElementById('toast')

  // Load saved settings
  chrome.storage.local.get(['apiKey', 'functionUrl'], (result) => {
    if (result.apiKey) apiKeyInput.value = result.apiKey
    functionUrlInput.value = result.functionUrl || DEFAULT_URL
  })

  // Toggle key visibility
  toggleKey.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password'
  })

  // Save
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim()
    const functionUrl = functionUrlInput.value.trim() || DEFAULT_URL

    chrome.storage.local.set({ apiKey, functionUrl }, () => {
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), 3000)
    })
  })
})
