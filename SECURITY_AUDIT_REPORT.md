# 🔒 TalentWharf Security Audit Report
**Date:** February 19, 2026  
**Audit Scope:** Dashboard, Extension, Supabase Functions, Database Schema

---

## Executive Summary

This security audit identified **5 CRITICAL**, **6 HIGH**, and **8 MEDIUM** severity vulnerabilities that could compromise user data, enable unauthorized access, and violate data protection regulations. Immediate remediation is required for all critical issues.

**Overall Risk Level:** 🔴 **CRITICAL**

---

## Critical Vulnerabilities

### 1. ⚠️ EXPOSED SECRETS IN VERSION CONTROL
**Severity:** 🔴 CRITICAL  
**File:** [dashboard/.env](dashboard/.env)  
**Risk:** Database credentials, API keys, and authentication tokens exposed

**Details:**
```env
VITE_SUPABASE_URL=https://yfhwmbywrgzkdddwddtd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- ✅ .gitignore correctly lists `.env`, but `.env` file exists in repository
- The ANON_KEY is a valid JWT token that can be used to access Supabase
- Anyone with the key can authenticate as an anonymous user to Supabase
- This violates OWASP A1 (Broken Access Control) and GDPR data protection principles

**Immediate Actions Required:**
1. **DELETE** `.env` from git history immediately using:
   ```bash
   git filter-branch --tree-filter 'rm -f dashboard/.env' HEAD
   git push origin --force-all
   ```
2. Rotate all VITE_SUPABASE_* keys in Supabase dashboard
3. Audit Supabase audit logs for unauthorized access
4. Add explicit `dashboard/.env` entry to `.gitignore`

**Implementation:**
```
# This should already be in .gitignore but verify:
dashboard/.env
dashboard/.env.local
dashboard/.env.*.local
dashboard/.env.production
extension/.env
```

---

### 2. ⚠️ DATABASE QUERY ERROR - TABLE NAME MISMATCH
**Severity:** 🔴 CRITICAL  
**File:** [dashboard/src/contexts/AuthContext.jsx](dashboard/src/contexts/AuthContext.jsx#L31)  
**Risk:** Authentication broken, app cannot start

**Issue:**
```jsx
// Line 31 - INCORRECT TABLE NAME
const { data } = await supabase.from('users').select('*').eq('id', userId).single()
```

Database schema defines table as `profiles`, not `users`. This causes:
- User profiles fail to load after login
- App loading state gets stuck
- Silent authentication failures

**Fix:**
```jsx
const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
```

---

### 3. ⚠️ OVERLY PERMISSIVE CORS - OPTION REQUESTS
**Severity:** 🔴 CRITICAL  
**File:** [supabase/functions/extension-capture/index.ts](supabase/functions/extension-capture/index.ts#L24)  
**Risk:** CORS bypass, unauthorized preflight access

**Issue:**
```typescript
function corsHeaders(allowAll = false) {
  return {
    "Access-Control-Allow-Origin": allowAll ? "*" : "chrome-extension://",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders(true) }); // 👈 DANGEROUS: allowAll=true
}
```

- OPTIONS preflight requests allow `*` origin
- Attackers from any origin can make POST requests after preflight
- API key validation only happens on POST, not OPTIONS

**Fix:**
```typescript
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders(false) }); // Restrict to chrome-extension://
}
```

---

### 4. ⚠️ MISSING INPUT VALIDATION IN LINKEDIN SCRAPER
**Severity:** 🔴 CRITICAL  
**File:** [extension/content/linkedin.js](extension/content/linkedin.js)  
**Risk:** XSS injection, DOM-based attacks, malicious payload injection

**Issue:**
```javascript
function extractProfile() {
  const name = text('h1.text-heading-xlarge') // ❌ No sanitization
  const headline = text('.text-body-medium.break-words') // ❌ No sanitization
  const about = document.querySelector('#about')?.closest('section')?.querySelector(...) 
  
  // These values sent directly to backend without validation
  return { name, headline, about, skills, experience, linkedin_url }
}
```

**Risks:**
- LinkedIn page could be compromised or spoofed
- Malicious text injected into name/headline/about fields
- Backend stores this data unsanitized in database
- XSS attack if data displayed without escaping in dashboard

**Fix - Add input validation:**
```javascript
function sanitizeInput(str) {
  if (!str) return ''
  return str
    .trim()
    .slice(0, 500) // Length limit
    .replace(/[<>]/g, '') // Remove angle brackets
}

function extractProfile() {
  const name = sanitizeInput(text('h1.text-heading-xlarge'))
  const headline = sanitizeInput(text('.text-body-medium.break-words'))
  const about = sanitizeInput(
    document.querySelector('#about')?.closest('section')?.innerText || ''
  )
  
  const skills = [/* ... */].map(s => sanitizeInput(s))
  
  return { name, headline, about, skills, experience, linkedin_url }
}
```

---

### 5. ⚠️ WEAK RATE LIMITING IMPLEMENTATION
**Severity:** 🔴 CRITICAL  
**File:** [supabase/functions/extension-capture/index.ts](supabase/functions/extension-capture/index.ts#L68-L82)  
**Risk:** DDoS attacks, resource exhaustion, abuse by attackers

**Issue:**
```typescript
const recentCount = (recent as any).count || 0;
const RATE_LIMIT_PER_MINUTE = 60; // 60 captures per minute (1 per second!)
if (recentCount > RATE_LIMIT_PER_MINUTE) {
  console.warn(`Rate limit...`);
  return json({ error: 'Rate limit exceeded' }, 429);
}
```

**Problems:**
- 60 requests/minute = 1 per second (too high for capture operations)
- Uses activity_log query (expensive database operation)
- Rate limit stored in database (slow, scales poorly)
- No per-IP rate limiting
- No accumulated cost tracking
- Can be defeated by using multiple API keys

**Recommended Fix:**
```typescript
// Use Redis for rate limiting (if available on Supabase)
// Or implement token bucket algorithm with lower limits:

const RATE_LIMITS = {
  free: 10,      // 10 captures per minute
  pro: 60,       // 60 captures per minute
  enterprise: 300 // 300 captures per minute
}

// Also implement:
// - Per-IP rate limiting
// - Burst protection (60 per minute but max 3 per 10 seconds)
// - Cost-based limiting (some operations cost more tokens)
```

---

## High Severity Vulnerabilities

### 6. 🔴 HARDCODED FUNCTION URL IN EXTENSION
**Severity:** 🔴 HIGH  
**File:** [extension/background.js](extension/background.js#L44)  
**Risk:** Redirect attacks, environment leakage

**Issue:**
```javascript
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'functionUrl'], (result) => {
      resolve({
        apiKey: result.apiKey ?? '',
        functionUrl: result.functionUrl ?? 'https://yfhwmbywrgzkdddwddtd.supabase.co/functions/v1/extension-capture',
        // ⬆️ Production domain hardcoded as fallback
      })
    })
  })
}
```

**Risks:**
- Supabase instance ID leaked in source code
- If user clears settings, reverts to exposed hardcoded URL
- URL visible in plain text in source

**Fix:**
```javascript
// Store this in manifest or config, not inline code
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'functionUrl'], (result) => {
      resolve({
        apiKey: result.apiKey ?? '',
        functionUrl: result.functionUrl ?? '', // No fallback - require user config
      })
    })
  })
}

// In options page:
if (!functionUrl) {
  showError('API function URL must be configured in options')
  return
}
```

---

### 7. 🔴 MISSING AUTHENTICATION ERROR HANDLING
**Severity:** 🔴 HIGH  
**File:** [dashboard/src/contexts/AuthContext.jsx](dashboard/src/contexts/AuthContext.jsx)  
**Risk:** Silent auth failures, unhandled promise rejections

**Issue:**
```jsx
async function fetchProfile(userId) {
  const { data } = await supabase.from('users').select('*').eq('id', userId).single()
  // ❌ No error handling
  // ❌ If query fails, data is undefined but setProfile(data) is called anyway
  setProfile(data)
  setLoading(false) // Always sets false, even on error
}
```

**Fix:**
```jsx
async function fetchProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Profile fetch failed:', error)
      setProfile(null)
      return
    }
    
    setProfile(data)
  } catch (err) {
    console.error('Unexpected error fetching profile:', err)
    setProfile(null)
  } finally {
    setLoading(false)
  }
}
```

---

### 8. 🔴 MISSING API KEY SECURITY ATTRIBUTES
**Severity:** 🔴 HIGH  
**File:** [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql#L87)  
**Risk:** Malicious API keys never expire, weak audit trail

**Issue:**
```sql
CREATE TABLE public.api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash     TEXT UNIQUE NOT NULL,
  key_prefix   TEXT,
  name         TEXT DEFAULT 'Default Key',
  last_used_at TIMESTAMPTZ,
  revoked      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
  -- ❌ Missing: expires_at (no expiration)
  -- ❌ Missing: last_rotated_at
  -- ❌ Missing: scope (what can this key do?)
);
```

**Risks:**
- API keys never expire (compromised keys work forever)
- No scope restrictions (all keys have full access)
- No audit trail of key usage patterns
- Rotation not tracked

**Fix - Update schema:**
```sql
CREATE TABLE public.api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash     TEXT UNIQUE NOT NULL,
  key_prefix   TEXT,
  name         TEXT DEFAULT 'Default Key',
  last_used_at TIMESTAMPTZ,
  revoked      BOOLEAN DEFAULT false,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 year'), -- ✅ NEW
  scope        TEXT[] DEFAULT '{"capture:create"}', -- ✅ NEW: permissions
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Add index for expiration check
CREATE INDEX idx_api_keys_expires_at ON public.api_keys(expires_at);
```

---

### 9. 🔴 MISSING CSRF PROTECTION IN EXTENSION OPTIONS
**Severity:** 🔴 HIGH  
**File:** [extension/popup/popup.html](extension/popup/popup.html)  
**Risk:** CSRF attacks, malicious website changing settings

**Issue:**
- No CSRF tokens in extension popups/options
- If a malicious website gains access to extension, it could modify settings
- `chrome.storage.local.set()` has no validation

**Fix - Add input validation:**
```html
<input type="text" id="functionUrl" placeholder="https://..." aria-label="Function URL" />

<script>
document.getElementById('functionUrl').addEventListener('blur', (e) => {
  const url = e.target.value.trim()
  
  // Validate URL
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
    if (!parsed.hostname.includes('supabase')) {
      console.warn('URL does not appear to be a Supabase URL')
    }
    
    chrome.storage.local.set({ functionUrl: url })
  } catch (err) {
    alert('Invalid URL: ' + err.message)
  }
})
</script>
```

---

### 10. 🔴 NO DELETION PROTECTION FOR CANDIDATES
**Severity:** 🔴 HIGH  
**File:** [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql#L39)  
**Risk:** Accidental data loss, compliance violations (audit trail requirement)

**Issue:**
```sql
CREATE POLICY "candidates_delete"
  ON public.candidates FOR DELETE
  USING (org_id = public.current_org_id());

-- ❌ Any org member can permanently delete candidate records
-- ❌ No audit trail of deletions
-- ❌ Violates GDPR right to access (can't audit if deleted)
```

**Fix - Implement soft delete:**
```sql
-- Add deleted_at column to candidates table
ALTER TABLE public.candidates ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE public.candidates ADD COLUMN deleted_by UUID REFERENCES public.profiles(id);

-- Update RLS policy
DROP POLICY "candidates_delete" ON public.candidates;

CREATE POLICY "candidates_delete"
  ON public.candidates FOR UPDATE
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- Hard delete only allowed for admins after GDPR retention period
CREATE POLICY "candidates_hard_delete"
  ON public.candidates FOR DELETE
  USING (
    org_id = public.current_org_id() 
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    AND deleted_at < now() - INTERVAL '1 year'
  );

-- Log deletion in activity_log
CREATE OR REPLACE FUNCTION public.soft_delete_candidate()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (candidate_id, user_id, action, metadata)
  VALUES (NEW.id, auth.uid(), 'candidate_deleted', jsonb_build_object('reason', 'soft_delete'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER when_candidate_deleted
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION public.soft_delete_candidate();
```

---

## Medium Severity Issues

### 11. 📊 MISSING DEPENDENCY VULNERABILITY SCANNING
**Severity:** 🟡 MEDIUM  
**Files:** [dashboard/package.json](dashboard/package.json), [wharf-demo/package.json](wharf-demo/package.json)

**Issue:**
- No `package-lock.json` version pinning
- No automated dependency scanning (npm audit, Snyk)
- Dependencies not scanned for known vulnerabilities

**Fix:**
```bash
# Run immediately
npm audit
npm audit fix

# Add to CI/CD pipeline
npm ci  # Use exact versions from lock file
npm audit --audit-level=moderate
```

---

### 12. 📊 MISSING SECURITY HEADERS IN EXTENSION MANIFEST
**Severity:** 🟡 MEDIUM  
**File:** [extension/manifest.json](extension/manifest.json)

**Issue:**
- No `host_permissions` restriction (runs on all HTTPS sites)
- No `default_title` security message
- Missing `permissions` for `tabs` (needed for security)

**Fix:**
```json
{
  "manifest_version": 3,
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "*://www.linkedin.com/*",
    "*://mail.google.com/*"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  }
}
```

---

### 13. 📊 NO PASSWORD POLICY ENFORCEMENT
**Severity:** 🟡 MEDIUM  
**Risk:** Weak passwords, account takeover

**Issue:**
- Supabase default password policy not enforced
- No minimum password length rules
- No complexity requirements (uppercase, numbers, symbols)

**Fix - Add to auth.jsx:**
```jsx
function validatePassword(password) {
  const errors = []
  
  if (password.length < 12) errors.push('Password must be at least 12 characters')
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter')
  if (!/[0-9]/.test(password)) errors.push('Must contain number')
  if (!/[!@#$%^&*]/.test(password)) errors.push('Must contain special character')
  
  return errors
}

async function signUp(email, password, name) {
  const errors = validatePassword(password)
  if (errors.length > 0) {
    return { error: { message: errors.join(', ') } }
  }
  
  // Continue with signup...
}
```

---

### 14. 📊 MISSING SESSION TIMEOUT
**Severity:** 🟡 MEDIUM  
**Risk:** Session hijacking, unauthorized access to unattended terminals

**Issue:**
- No idle session timeout
- No automatic logout after inactivity
- Supabase session tokens valid for extended periods

**Fix:**
```jsx
// In AuthContext.jsx
useEffect(() => {
  let timeoutId
  
  const resetTimeout = () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      signOut()
      console.warn('Session expired due to inactivity')
    }, 30 * 60 * 1000) // 30 minutes
  }
  
  // Reset on user activity
  window.addEventListener('mousedown', resetTimeout)
  window.addEventListener('keydown', resetTimeout)
  
  resetTimeout() // Start initial timer
  
  return () => {
    clearTimeout(timeoutId)
    window.removeEventListener('mousedown', resetTimeout)
    window.removeEventListener('keydown', resetTimeout)
  }
}, [])
```

---

### 15. 📊 MISSING LOG ROTATION AND RETENTION POLICY
**Severity:** 🟡 MEDIUM  
**Risk:** Log tampering, disk space exhaustion

**Issue:**
- No log retention policy defined
- No log rotation mechanism
- Supabase activity_log can grow unbounded

**Fix:**
```sql
-- Add retention policy to activity_log
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.activity_log
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Run weekly cleanup (setup in edge function or cron)
-- Can be triggered from dashboard UI admin panel
```

---

### 16. 📊 MISSING NEW DEVICE/LOCATION ALERTS
**Severity:** 🟡 MEDIUM  
**Risk:** Account takeover, unauthorized access

**Issue:**
- No alerts when account accessed from new location
- No new device login notifications
- No suspicious activity detection

**Recommendation:**
```jsx
// Add to auth flow
async function notifyNewDeviceLogin(user) {
  // Send email to user if:
  // - Login from new IP (store previous IPs)
  // - Login from new device (use user agent)
  // - Multiple rapid logins
  
  const { data: lastLogin } = await supabase
    .from('login_history')
    .select('ip_address')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (lastLogin?.ip_address !== getCurrentIP()) {
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'new_device_login',
      message: 'Login detected from a new device'
    })
  }
}
```

---

### 17. 📊 NO ENCRYPTION FOR SENSITIVE DATA AT REST
**Severity:** 🟡 MEDIUM  
**Risk:** Data breach if database compromised

**Issue:**
- Candidate notes stored in plaintext
- Email content stored in plaintext
- No field-level encryption

**Fix - Add pgcrypto encryption:**
```sql
-- Create encrypted columns for sensitive data
ALTER TABLE public.candidate_notes ADD COLUMN content_encrypted bytea;
ALTER TABLE public.email_history ADD COLUMN body_encrypted bytea;

-- Add encryption function
CREATE OR REPLACE FUNCTION public.encrypt_candidate_notes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_encrypted = pgp_sym_encrypt(NEW.content, 'encryption_key_from_env');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER encrypt_notes_trigger
  BEFORE INSERT ON public.candidate_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_candidate_notes();
```

---

### 18. 📊 MISSING GDPR DATA EXPORT/DELETION ENDPOINTS
**Severity:** 🟡 MEDIUM  
**Risk:** GDPR violation, compliance failure

**Issue:**
- No way for users to export their data
- No automated data deletion at user request
- No "right to be forgotten" implementation

**Recommendation:**
```typescript
// Add Supabase edge functions:
// POST /api/user/export-data (GDPR data portability)
// POST /api/user/delete-account (right to be forgotten)
// POST /api/candidate/:id/delete (candidate deletion)

// These should:
// 1. Verify user identity
// 2. Generate JSON/CSV export of all user data
// 3. Permanently delete records after 30-day grace period
// 4. Log all deletion attempts
```

---

## Vulnerability Statistics

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 5 | Requires immediate action |
| 🔴 HIGH | 5 | Fix within 7 days |
| 🟡 MEDIUM | 8 | Fix within 30 days |
| 🟢 LOW | — | None identified |

---

## Remediation Timeline

### Immediate (Next 24 hours)
- [ ] Remove `.env` file from git history and rotate keys
- [ ] Fix CORS issue in extension-capture function
- [ ] Fix authentication table name bug
- [ ] Implement input validation in LinkedIn scraper

### This Week (Days 2-7)
- [ ] Fix rate limiting implementation
- [ ] Remove hardcoded URLs from extension
- [ ] Add error handling to auth context
- [ ] Add CSRF protection to extension

### This Month (Days 8-30)
- [ ] Implement API key expiration and scoping
- [ ] Add soft delete for candidates
- [ ] Set up dependency scanning
- [ ] Implement session timeout
- [ ] Add security headers

### This Quarter (Days 31-90)
- [ ] Field-level encryption for sensitive data
- [ ] GDPR export/deletion endpoints
- [ ] New device login alerts
- [ ] Log retention policies

---

## Tools and Resources

### Recommended Security Tools
```bash
# Dependency scanning
npm install -D snyk npm-check-updates
snyk test
npm audit fix

# SAST (Static Application Security Testing)
npm install -D eslint-plugin-security
npm install -D SonarQube

# Monitoring
# - Supabase activity logs
# - Sentry for error tracking
# - PagerDuty for incidents
```

### Standards to Follow
- OWASP Top 10 2023
- GDPR (if EU users)
- SOC 2 (if enterprise)
- CWE Top 25 most dangerous

---

## Sign-Off

**Auditor:** GitHub Copilot Security Team  
**Date:** February 19, 2026  
**Next Review:** May 19, 2026 (90 days)

---

## Appendix: Quick Fixes

### Fix 1: AuthContext Table Name
```bash
cd dashboard/src/contexts
# Line 31: Change 'users' to 'profiles'
```

### Fix 2: Remove .env from Git
```bash
cd dashboard
git filter-branch --tree-filter 'rm -f .env' HEAD
# Create .env.example instead:
echo 'VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here' > .env.example
git add .env.example
git commit -m 'docs: add .env.example template'
```

### Fix 3: CORS Fix in Edge Function
Change line 24 in supabase/functions/extension-capture/index.ts from:
```typescript
return new Response(null, { headers: corsHeaders(true) });
```
to:
```typescript
return new Response(null, { headers: corsHeaders(false) });
```

---

**Report Status:** Complete ✅
