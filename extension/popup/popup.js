// TalentWharf — Popup Script

let currentCandidate = null

// ── Security: Input sanitization ──────────────────────────────────────────
function sanitizeCandidate(data) {
  return {
    name: String(data.name || '').slice(0, 255).trim(),
    email: String(data.email || '').slice(0, 255),
    headline: String(data.headline || '').slice(0, 500),
    about: String(data.about || '').slice(0, 2000),
    skills: Array.isArray(data.skills) ? data.skills.map(s => String(s).slice(0, 100)).slice(0, 25) : [],
    experience: Array.isArray(data.experience) ? data.experience.slice(0, 10).map(e => ({
      title: String(e.title || '').slice(0, 200),
      company: String(e.company || '').slice(0, 200),
    })) : [],
    linkedin_url: String(data.linkedin_url || '').slice(0, 2048),
    source: String(data.source || 'LinkedIn').slice(0, 50),
    captured_from: String(data.captured_from || '').slice(0, 2048),
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // Wire up settings buttons
  document.getElementById('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage())
  document.getElementById('goToOptions').addEventListener('click', () => chrome.runtime.openOptionsPage())
  document.getElementById('captureBtn').addEventListener('click', handleCapture)
  document.getElementById('retryBtn').addEventListener('click', () => showPreview(currentCandidate))

  // Check API key
  const { apiKey } = await getSettings()
  if (!apiKey) showEl('noKeyWarning')

  // Get current tab and inject content script to extract data
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''

  if (url.includes('linkedin.com')) {
    showLoading('Extracting LinkedIn profile...')
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractLinkedIn,
      })
      const data = results?.[0]?.result
      if (data?.name) {
        currentCandidate = { ...sanitizeCandidate(data), source: 'LinkedIn', captured_from: url }
        showPreview(currentCandidate)
      } else {
        showUnsupported()
      }
    } catch (err) {
      console.error('LinkedIn extraction error:', err)
      showError(err?.message || 'Failed to extract LinkedIn data')
    }

  } else if (url.includes('mail.google.com')) {
    showLoading('Extracting Gmail sender...')
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractGmail,
      })
      const data = results?.[0]?.result
      if (data?.name) {
        currentCandidate = { ...sanitizeCandidate(data), source: 'Gmail', captured_from: url }
        showPreview(currentCandidate)
      } else {
        showUnsupported()
      }
    } catch (err) {
      console.error('Gmail extraction error:', err)
      showError(err?.message || 'Failed to extract Gmail data')
    }

  } else {
    showUnsupported()
  }
})

async function handleCapture() {
  if (!currentCandidate) return
  const btn = document.getElementById('captureBtn')
  btn.disabled = true
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Adding...'

  const response = await chrome.runtime.sendMessage({
    type: 'CAPTURE_CANDIDATE',
    payload: currentCandidate,
  })

  if (response.success) {
    showSuccess(currentCandidate.name)
  } else {
    showError(response.error)
  }
}

// ── Extraction functions (injected into page) ─────────────────────────────────

function extractLinkedIn() {
  function text(selector) {
    return document.querySelector(selector)?.innerText?.trim() ?? ''
  }

  // Name — try multiple selectors for robustness
  const name =
    text('h1.text-heading-xlarge') ||
    text('h1[class*="heading"]') ||
    text('.pv-text-details__left-panel h1') ||
    text('h1')

  if (!name) return null

  const headline =
    text('.text-body-medium[class*="break-words"]') ||
    text('[data-generated-suggestion-target] .text-body-medium') ||
    text('.pv-text-details__left-panel .text-body-medium')

  // About
  const about =
    text('#about ~ .display-flex .visually-hidden') ||
    text('.pv-shared-text-with-see-more .visually-hidden') ||
    text('[data-section="summary"] .pv-shared-text-with-see-more span') ||
    ''

  // Skills
  const skillEls = document.querySelectorAll(
    '.pv-skill-category-entity__name-text, [class*="skill"] .t-bold, .pvs-entity__supplementary-info'
  )
  const skills = Array.from(skillEls)
    .map(el => el.innerText?.trim())
    .filter(s => s && s.length < 60)
    .slice(0, 20)

  // Experience
  const expEls = document.querySelectorAll('[data-view-name="profile-component-entity"]')
  const experience = Array.from(expEls).slice(0, 5).map(el => ({
    title: el.querySelector('.t-bold span[aria-hidden]')?.innerText?.trim() ?? '',
    company: el.querySelector('.t-14.t-normal span[aria-hidden]')?.innerText?.trim() ?? '',
  })).filter(e => e.title)

  return {
    name,
    headline,
    about,
    skills,
    experience,
    linkedin_url: window.location.href.split('?')[0],
  }
}

function extractGmail() {
  // Try to get sender from open email thread
  const senderEl =
    document.querySelector('[email]') ||
    document.querySelector('.gD') ||
    document.querySelector('[data-hovercard-id]')

  if (!senderEl) return null

  const email = senderEl.getAttribute('email') || senderEl.getAttribute('data-hovercard-id') || ''
  const name = senderEl.getAttribute('name') || senderEl.innerText?.trim() || email.split('@')[0]

  if (!name && !email) return null

  return { name, email }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function showPreview(candidate) {
  hideAll()
  showEl('candidatePreview')
  document.getElementById('sourceBadge').textContent = candidate.source ?? 'LinkedIn'
  document.getElementById('candidateName').textContent = candidate.name
  document.getElementById('candidateHeadline').textContent = candidate.headline || candidate.source || ''

  // Avatar initials
  const initials = candidate.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  document.getElementById('avatar').textContent = initials

  // Email
  if (candidate.email) {
    document.getElementById('emailText').textContent = candidate.email
    showEl('candidateEmail')
  }

  // Skills
  const skills = candidate.skills ?? []
  if (skills.length > 0) {
    const list = document.getElementById('skillsList')
    list.textContent = ''
    skills.slice(0, 10).forEach(s => {
      const tag = document.createElement('span')
      tag.className = 'skill-tag'
      tag.textContent = s
      list.appendChild(tag)
    })
    showEl('skillsSection')
  }

  const btn = document.getElementById('captureBtn')
  btn.disabled = false
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to Wharf'
}

function showLoading(msg) {
  hideAll()
  showEl('loadingState')
  document.getElementById('loadingText').textContent = msg
}

function showUnsupported() {
  hideAll()
  showEl('unsupported')
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
  ['candidatePreview', 'loadingState', 'unsupported', 'successState', 'errorState'].forEach(hideEl)
}

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get(['apiKey', 'functionUrl'], result => resolve(result))
  })
}
