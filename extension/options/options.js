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
    const rawUrl = functionUrlInput.value.trim() || DEFAULT_URL

    // Validate URL before saving
    try {
      const parsed = new URL(rawUrl)
      if (parsed.protocol !== 'https:') throw new Error('URL must use HTTPS')
    } catch (err) {
      alert('Invalid endpoint URL: ' + err.message)
      return
    }

    chrome.storage.local.set({ apiKey, functionUrl: rawUrl }, () => {
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), 3000)
    })
  })
})
