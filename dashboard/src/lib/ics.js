/**
 * generateICS — creates and downloads a .ics calendar invite file.
 * Zero dependencies, works in any modern browser.
 */
export function generateICS({
  summary,
  description = '',
  location = '',
  dtstart,
  dtend,
  organizer = 'TalentWharf',
  organizerEmail = 'noreply@talentwharf.com',
}) {
  const fmt = d =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const uid  = `wharf-${Date.now()}-${Math.random().toString(36).slice(2)}@talentwharf.com`
  const now  = fmt(new Date())
  const desc = description.replace(/\n/g, '\\n').replace(/,/g, '\\,')
  const loc  = location.replace(/,/g, '\\,')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TalentWharf//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmt(dtstart)}`,
    `DTEND:${fmt(dtend)}`,
    `SUMMARY:${summary}`,
    desc   ? `DESCRIPTION:${desc}`         : null,
    loc    ? `LOCATION:${loc}`             : null,
    `ORGANIZER;CN="${organizer}":mailto:${organizerEmail}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `interview-invite.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * parseDateTime — parse "2026-03-15" + "14:30" into a Date object.
 * Returns null if either is empty / invalid.
 */
export function parseDateTime(date, time) {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}:00`)
  return isNaN(d.getTime()) ? null : d
}
