// TalentWharf — Outlook Add-in Task Pane
// Uses Office.js to read email sender data and capture candidates

const DEFAULT_URL = 'https://yfhwmbywrgzkdddwddtd.supabase.co/functions/v1/extension-capture'

let currentCandidate = null

// ── Security: Input sanitization ─────────────────────────────────────────────
function sanitizeCandidate(data) {
  return {
    name:        String(data.name        || '').slice(0, 255).trim(),
    email:       String(data.email       || '').slice(0, 255),
    headline:    String(data.headline    || '').slice(0, 500),
    about:       String(data.about       || '').slice(0, 2000),
    skills:      [],
    experience:  [],
    linkedin_url: '',
    source:      String(data.source      || 'Outlook').slice(0, 50),
    captured_from: String(data.captured_from || '').slice(0, 2048),
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
Office.onReady((info) => {
  if (info.host !== Office.HostType.Outlook) return

  // Wire up controls
  document.getElementById('openSettings').addEventListener('click', openSettings)
  document.getElementById('goToSettings').addEventListener('click', (e) => { e.preventDefault(); openSettings() })
  document.getElementById('closeSettings').addEventListener('click', closeSettings)
  document.getElementById('saveSettings').addEventListener('click', saveSettings)
  document.getElementById('toggleKey').addEventListener('click', toggleKeyVisibility)
  document.getElementById('captureBtn').addEventListener('click', handleCapture)
  document.getElementById('retryBtn').addEventListener('click', loadCandidate)
  document.getElementById('captureAnotherBtn').addEventListener('click', loadCandidate)

  loadCandidate()
})

// ── Load candidate from current email ─────────────────────────────────────────
async function loadCandidate() {
  showLoading('Reading email sender...')

  const apiKey = getSettings().apiKey
  if (!apiKey) showEl('noKeyWarning')
  else hideEl('noKeyWarning')

  try {
    const item = Office.context.mailbox.item

    // item.from is a EmailAddressDetails object: { displayName, emailAddress }
    const from = await getFrom(item)

    if (!from || (!from.displayName && !from.emailAddress)) {
      showError('Could not read sender information from this email.')
      return
    }

    const subject = await getSubject(item)

    currentCandidate = sanitizeCandidate({
      name:          from.displayName || from.emailAddress.split('@')[0],
      email:         from.emailAddress || '',
      headline:      subject ? `Re: ${subject}` : '',
      source:        'Outlook',
      captured_from: `mailto:${from.emailAddress}`,
    })

    showPreview(currentCandidate)
  } catch (err) {
    showError(err?.message || 'Failed to read email data.')
  }
}

// Office.js from property can be synchronous or async depending on the client
function getFrom(item) {
  return new Promise((resolve, reject) => {
    if (!item.from) {
      reject(new Error('No sender found on this item.'))
      return
    }
    // In Outlook on the web and new Outlook, item.from is a Promise-based property
    if (typeof item.from.getAsync === 'function') {
      item.from.getAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value)
        } else {
          reject(new Error(result.error?.message || 'Failed to get sender.'))
        }
      })
    } else {
      // Classic Outlook desktop: item.from is already an EmailAddressDetails object
      resolve(item.from)
    }
  })
}

function getSubject(item) {
  return new Promise((resolve) => {
    if (!item.subject) { resolve(''); return }
    if (typeof item.subject.getAsync === 'function') {
      item.subject.getAsync((result) => {
        resolve(result.status === Office.AsyncResultStatus.Succeeded ? result.value : '')
      })
    } else {
      resolve(item.subject || '')
    }
  })
}

// ── Capture (send to backend) ─────────────────────────────────────────────────
async function handleCapture() {
  if (!currentCandidate) return

  const btn = document.getElementById('captureBtn')
  btn.disabled = true
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Adding...'

  const { apiKey, functionUrl } = getSettings()

  if (!apiKey) {
    showError('No API key configured. Open Settings to add your key.')
    return
  }

  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(currentCandidate),
    })

    const data = await res.json()

    if (!res.ok) {
      showError(data.error ?? `Server error ${res.status}`)
      return
    }

    showSuccess(currentCandidate.name)
  } catch (err) {
    showError(err?.message || 'Network error. Check your connection.')
  }
}

// ── Settings (Office Roaming Settings — sync across devices) ──────────────────
function getSettings() {
  const settings = Office.context.roamingSettings
  return {
    apiKey:      settings.get('apiKey')      || '',
    functionUrl: settings.get('functionUrl') || DEFAULT_URL,
  }
}

function openSettings() {
  const { apiKey, functionUrl } = getSettings()
  document.getElementById('apiKeyInput').value      = apiKey
  document.getElementById('functionUrlInput').value = functionUrl || DEFAULT_URL
  showEl('settingsPanel')
}

function closeSettings() {
  hideEl('settingsPanel')
}

function saveSettings() {
  const apiKey      = document.getElementById('apiKeyInput').value.trim()
  const functionUrl = document.getElementById('functionUrlInput').value.trim() || DEFAULT_URL

  const settings = Office.context.roamingSettings
  settings.set('apiKey', apiKey)
  settings.set('functionUrl', functionUrl)

  settings.saveAsync((result) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const toast = document.getElementById('saveToast')
      toast.classList.remove('hidden')
      toast.classList.remove('fade-out')
      setTimeout(() => {
        toast.classList.add('fade-out')
        setTimeout(() => toast.classList.add('hidden'), 300)
      }, 2000)

      // Refresh the no-key warning
      if (apiKey) hideEl('noKeyWarning')
      else showEl('noKeyWarning')
    }
  })
}

function toggleKeyVisibility() {
  const input = document.getElementById('apiKeyInput')
  input.type = input.type === 'password' ? 'text' : 'password'
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showPreview(candidate) {
  hideAll()
  showEl('candidatePreview')

  document.getElementById('sourceBadge').textContent    = candidate.source ?? 'Outlook'
  document.getElementById('candidateName').textContent  = candidate.name
  document.getElementById('candidateHeadline').textContent = candidate.headline || ''

  const initials = candidate.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  document.getElementById('avatar').textContent = initials

  if (candidate.email) {
    document.getElementById('emailText').textContent = candidate.email
    showEl('candidateEmail')
  } else {
    hideEl('candidateEmail')
  }

  const btn = document.getElementById('captureBtn')
  btn.disabled = false
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    Add to Wharf`
}

function showLoading(msg) {
  hideAll()
  showEl('loadingState')
  document.getElementById('loadingText').textContent = msg
}

function showSuccess(name) {
  hideAll()
  showEl('successState')
  document.getElementById('successName').textContent = name
}

function showError(msg) {
  hideAll()
  showEl('errorState')
  document.getElementById('errorMsg').textContent = msg
}

function showEl(id) { document.getElementById(id)?.classList.remove('hidden') }
function hideEl(id) { document.getElementById(id)?.classList.add('hidden') }

function hideAll() {
  ['candidatePreview', 'loadingState', 'successState', 'errorState'].forEach(hideEl)
}
