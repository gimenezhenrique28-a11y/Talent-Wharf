// TalentWharf — Gmail Content Script
// Runs on mail.google.com and makes sender data available for extraction

(function () {
  document.documentElement.setAttribute('data-talentwharf', 'gmail')

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'TW_EXTRACT_GMAIL') return

    const data = extractSender()
    window.postMessage({ type: 'TW_GMAIL_DATA', payload: data }, window.location.origin)
  })

  function extractSender() {
    // Try the open email thread first
    const senderEl =
      document.querySelector('.gD[email]') ||
      document.querySelector('[email].go') ||
      document.querySelector('span[email]') ||
      document.querySelector('[data-hovercard-id*="@"]')

    if (!senderEl) return null

    const email =
      senderEl.getAttribute('email') ||
      senderEl.getAttribute('data-hovercard-id') ||
      ''

    const name =
      senderEl.getAttribute('name') ||
      senderEl.innerText?.trim() ||
      email.split('@')[0]

    if (!name && !email) return null

    // Try subject as headline hint
    const subject = document.querySelector('h2.hP')?.innerText?.trim() ?? ''

    return {
      name,
      email: email || null,
      headline: subject ? `Re: ${subject}` : null,
    }
  }
})()
