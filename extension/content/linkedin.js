// TalentWharf — LinkedIn Content Script
// Runs on linkedin.com pages and makes profile data available for extraction

(function () {
  // Mark page as TalentWharf-ready
  document.documentElement.setAttribute('data-talentwharf', 'linkedin')

  // Listen for extraction requests from the popup
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'TW_EXTRACT_LINKEDIN') return

    const data = extractProfile()
    window.postMessage({ type: 'TW_LINKEDIN_DATA', payload: data }, window.location.origin)
  })

  function text(selector) {
    return document.querySelector(selector)?.innerText?.trim() ?? ''
  }

  function extractProfile() {
    // Name — multiple fallback selectors for LinkedIn's changing DOM
    const name =
      text('h1.text-heading-xlarge') ||
      text('h1[class*="inline"]') ||
      text('.pv-text-details__left-panel h1') ||
      text('section.pv-top-card h1') ||
      text('h1')

    if (!name) return null

    // Headline
    const headline =
      text('.text-body-medium.break-words') ||
      text('[data-generated-suggestion-target] .text-body-medium') ||
      text('.pv-top-card--list .text-body-medium') ||
      text('.ph5 .text-body-medium')

    // About section
    const about =
      document.querySelector('#about')?.closest('section')?.querySelector('.visually-hidden')?.innerText?.trim() ||
      document.querySelector('[data-section="summary"]')?.querySelector('.pv-shared-text-with-see-more span[aria-hidden]')?.innerText?.trim() ||
      ''

    // Skills — grab from skills section
    const skillNodes = document.querySelectorAll(
      '.pv-skill-category-entity__name-text, ' +
      '.pvs-entity__supplementary-info .t-bold span[aria-hidden], ' +
      '[aria-label*="skill"] .t-bold'
    )
    const skills = Array.from(skillNodes)
      .map(el => el.innerText?.trim())
      .filter(s => s && s.length > 0 && s.length < 80)
      .filter((s, i, arr) => arr.indexOf(s) === i) // dedupe
      .slice(0, 25)

    // Experience
    const expSection = document.querySelector('#experience')?.closest('section')
    const expNodes = expSection
      ? expSection.querySelectorAll('.pvs-entity')
      : document.querySelectorAll('[data-view-name="profile-component-entity"]')

    const experience = Array.from(expNodes).slice(0, 6).map(el => {
      const spans = el.querySelectorAll('span[aria-hidden]')
      return {
        title: spans[0]?.innerText?.trim() ?? '',
        company: spans[1]?.innerText?.trim() ?? '',
        duration: spans[2]?.innerText?.trim() ?? '',
      }
    }).filter(e => e.title)

    return {
      name,
      headline,
      about,
      skills,
      experience,
      linkedin_url: window.location.href.split('?')[0],
    }
  }
})()
