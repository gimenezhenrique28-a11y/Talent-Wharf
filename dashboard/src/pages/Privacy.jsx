function WharfWordmark({ height = 32 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 160 160"
      height={height}
      style={{ width: 'auto', display: 'block' }}
      aria-label="TalentWharf"
    >
      <path fill="currentColor" d="M61.37,65.52h6.16v9.81c1.58-1.65,4.12-2.89,7.39-2.89,5.27,0,8.85,3.54,8.85,9.16v11.54h-6.16v-9.74c0-3.42-1.65-5.5-4.81-5.5-3.35,0-5.27,2.04-5.27,5.54v9.7h-6.16v-27.63Z"/>
      <path fill="currentColor" d="M86.26,87.3c0-3.96,3.5-5.93,8.27-6.39l8.08-.73v-.12c0-1.54-1.31-2.77-4.58-2.77-2.77,0-4.89,1.15-5.5,2.73l-5.54-1.5c1.27-3.66,5.73-6.08,11.31-6.08,6.46,0,10.27,2.58,10.27,7.66v7.39c0,1.08.46,1.58,2.62,1.12v4.54c-4.5.85-6.97-.31-8-2.23-1.85,1.62-4.77,2.66-8.35,2.66-5,0-8.58-2.27-8.58-6.27ZM102.61,84.3l-7.2.73c-2.12.19-3.19.69-3.19,2.04s1.35,2,3.73,2c3.16,0,6.66-1.35,6.66-3.69v-1.08Z"/>
      <path fill="currentColor" d="M130.28,77.95c-3.8-.09-2.39-.08-3.7-.1-5.21-.09-7.11,2.52-7.11,7.06v8.24h-6.16v-20.28h6.16v3.5c1.77-2.58,2.92-3.51,6.23-3.51.92,0,.15-.01,4.58.01v5.08Z"/>
      <path fill="currentColor" d="M144.4,65.1c1.89,0,3.85.27,5.08.73l-.81,4.81c-1.27-.35-2.46-.54-3.89-.54-2.62,0-3.85.77-3.85,2.58v.19h7.47v5.08h-7.47v15.2h-6.08v-15.2h-4.58v-5.08h4.58v-.31c0-5.04,3.54-7.47,9.54-7.47Z"/>
      <polygon fill="currentColor" points="22.99 93.15 18.01 65.5 9.61 65.5 14.69 93.15 22.99 93.15"/>
      <polygon fill="currentColor" points="35.34 65.5 39.97 93.15 47.25 93.15 42.61 65.5 35.34 65.5"/>
      <polygon fill="currentColor" points="30.36 93.15 35.02 65.5 27.94 65.5 23.3 93.15 30.36 93.15"/>
      <polygon fill="currentColor" points="52.54 65.5 47.56 93.15 55.67 93.15 60.75 65.5 52.54 65.5"/>
    </svg>
  )
}

const LAST_UPDATED = 'March 31, 2026'
const CONTACT_EMAIL = 'privacy@talentwharf.com'
const APP_URL = 'https://app.talentwharf.com'

export default function Privacy() {
  return (
    <div style={{
      background: '#0A0A0A',
      color: '#D4D4D4',
      minHeight: '100vh',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 0',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href={APP_URL} style={{ color: '#fff', textDecoration: 'none' }}>
            <WharfWordmark height={28} />
          </a>
          <a
            href={APP_URL}
            style={{ fontSize: 13, color: '#737373', textDecoration: 'none', letterSpacing: '-0.006em' }}
          >
            ← Back to app
          </a>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* Title block */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#525252', marginBottom: 12 }}>
            Legal
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.2 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 14, color: '#737373', letterSpacing: '-0.006em' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Intro */}
        <Section>
          <p>
            TalentWharf ("we", "our", or "us") operates the TalentWharf dashboard at{' '}
            <A href={APP_URL}>app.talentwharf.com</A> and the TalentWharf Chrome Extension
            (collectively, the "Service"). This Privacy Policy explains what data we collect,
            how we use it, and the choices you have.
          </p>
          <p style={{ marginTop: 12 }}>
            By using the Service you agree to the collection and use of information as described here.
          </p>
        </Section>

        <Divider />

        {/* 1 */}
        <Section title="1. Data we collect">
          <Subsection title="1.1 Account data">
            <p>When you create an account we collect your <strong>email address</strong> and <strong>name</strong>. This is stored securely in Supabase and is used solely to authenticate you and identify your organisation within the app.</p>
          </Subsection>

          <Subsection title="1.2 Candidate data you capture">
            <p>The Chrome Extension lets you save candidate profiles from LinkedIn and sender information from Gmail. When you click <em>Add to Wharf</em>, the following data is extracted <strong>only from the page you are currently viewing</strong> and sent to your private TalentWharf workspace:</p>
            <List items={[
              'Full name',
              'Email address (where visible)',
              'Professional headline or job title',
              'About / summary section',
              'Skills (up to 20)',
              'Work experience entries (up to 5)',
              'LinkedIn profile URL',
              'Source page URL',
            ]} />
            <p style={{ marginTop: 12 }}>
              <strong>Extraction is always manual and user-initiated.</strong> The extension never runs automatically, never scrapes pages in the background, and never collects data without you explicitly clicking the capture button.
            </p>
          </Subsection>

          <Subsection title="1.3 API keys">
            <p>Your TalentWharf API key is stored locally in your browser using <code>chrome.storage.local</code>, which is encrypted by Chrome and inaccessible to other extensions or websites. The key is transmitted only to our Supabase Edge Function over HTTPS when you capture a candidate.</p>
          </Subsection>

          <Subsection title="1.4 Usage data">
            <p>We do not use third-party analytics services (e.g. Google Analytics). We may log server-side metadata (timestamps, HTTP status codes) for operational purposes only.</p>
          </Subsection>
        </Section>

        <Divider />

        {/* 2 */}
        <Section title="2. How we use your data">
          <List items={[
            'To provide, operate, and improve the Service',
            'To authenticate you and enforce access controls between organisations',
            'To store candidate records in your private workspace',
            'To send transactional emails (e.g. account confirmation) — never marketing without your consent',
          ]} />
        </Section>

        <Divider />

        {/* 3 */}
        <Section title="3. Data sharing & third parties">
          <p>We do not sell, rent, or share your personal data with advertisers or data brokers. We use the following sub-processors to operate the Service:</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Th>Provider</Th>
                <Th>Purpose</Th>
                <Th>Data transferred</Th>
              </tr>
            </thead>
            <tbody>
              <Tr cells={['Supabase', 'Database, authentication, edge functions', 'Account & candidate data']} />
              <Tr cells={['Vercel', 'Frontend hosting', 'None (static assets only)']} />
              <Tr cells={['Anthropic (Claude)', 'AI features (CV parsing, email assist)', 'Candidate text snippets — no PII required']} />
            </tbody>
          </table>
        </Section>

        <Divider />

        {/* 4 */}
        <Section title="4. Data retention">
          <p>Your data is retained for as long as your account is active. You can delete individual candidates at any time from the dashboard. To delete your account and all associated data, email us at <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.</p>
        </Section>

        <Divider />

        {/* 5 */}
        <Section title="5. Security">
          <p>All data is transmitted over HTTPS. Our database uses row-level security (RLS) policies so that each organisation can only access its own data. API keys are hashed before storage. We perform regular security reviews of our infrastructure.</p>
        </Section>

        <Divider />

        {/* 6 */}
        <Section title="6. LinkedIn & Gmail data">
          <p>
            TalentWharf accesses LinkedIn and Gmail pages solely to extract information that is
            already visible to you on screen. We do not bypass any authentication, access private
            messages, or store credentials for those platforms. Use of the extension is subject
            to LinkedIn's and Google's respective Terms of Service.
          </p>
        </Section>

        <Divider />

        {/* 7 */}
        <Section title="7. Your rights">
          <p>Depending on your jurisdiction you may have the right to access, correct, port, or delete your personal data. To exercise any of these rights, contact us at <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>. We will respond within 30 days.</p>
        </Section>

        <Divider />

        {/* 8 */}
        <Section title="8. Cookies">
          <p>The TalentWharf dashboard uses a single session cookie managed by Supabase Auth for authentication purposes. We do not use tracking or advertising cookies.</p>
        </Section>

        <Divider />

        {/* 9 */}
        <Section title="9. Children's privacy">
          <p>The Service is not directed at anyone under the age of 16. We do not knowingly collect personal data from children.</p>
        </Section>

        <Divider />

        {/* 10 */}
        <Section title="10. Changes to this policy">
          <p>We may update this policy from time to time. We will notify you of material changes by posting a notice in the dashboard or emailing your registered address. The "Last updated" date at the top of this page always reflects the current version.</p>
        </Section>

        <Divider />

        {/* Contact */}
        <Section title="11. Contact">
          <p>
            Questions about this policy? Email us at{' '}
            <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
          </p>
        </Section>

      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '24px',
        textAlign: 'center',
        fontSize: 12,
        color: '#525252',
      }}>
        © {new Date().getFullYear()} TalentWharf. All rights reserved.
      </footer>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      {title && (
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 16 }}>
          {title}
        </h2>
      )}
      <div style={{ fontSize: 14, lineHeight: 1.75, color: '#A3A3A3', letterSpacing: '-0.006em' }}>
        {children}
      </div>
    </section>
  )
}

function Subsection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#D4D4D4', marginBottom: 8, letterSpacing: '-0.006em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0 40px' }} />
}

function List({ items }) {
  return (
    <ul style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14, color: '#A3A3A3', lineHeight: 1.65 }}>{item}</li>
      ))}
    </ul>
  )
}

function A({ href, children }) {
  return (
    <a href={href} style={{ color: '#D4D4D4', textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {children}
    </a>
  )
}

function Th({ children }) {
  return (
    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#525252', fontWeight: 500, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
      {children}
    </th>
  )
}

function Tr({ cells }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {cells.map((cell, i) => (
        <td key={i} style={{ padding: '10px 12px', color: '#A3A3A3', verticalAlign: 'top' }}>{cell}</td>
      ))}
    </tr>
  )
}
