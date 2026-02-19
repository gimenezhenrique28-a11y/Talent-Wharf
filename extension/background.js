// TalentWharf — Background Service Worker
// Handles API calls to the extension-capture Edge Function

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_CANDIDATE') {
    captureCandidate(message.payload).then(sendResponse)
    return true // keep channel open for async response
  }
})

async function captureCandidate(payload) {
  try {
    const { apiKey, functionUrl } = await getSettings()

    if (!apiKey) {
      return { success: false, error: 'No API key configured. Open extension options to set your key.' }
    }
    if (!functionUrl) {
      return { success: false, error: 'No function URL configured. Open extension options to set the URL.' }
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error ?? `Server error ${res.status}` }
    }

    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message ?? 'Network error' }
  }
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'functionUrl'], (result) => {
      resolve({
        apiKey: result.apiKey ?? '',
        functionUrl: result.functionUrl ?? 'https://yfhwmbywrgzkdddwddtd.supabase.co/functions/v1/extension-capture',
      })
    })
  })
}
