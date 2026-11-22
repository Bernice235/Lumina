# Security Summary

Lumina: Bloom & Balance underwent a comprehensive security, privacy, performance, and functionality upgrade across its backend server, cloud database rules, authentication flows, backup encryption, consent management, and user interface.

## Key Protections & Improvements Implemented

1. **Server-Side Secret Isolation & Hardened HTTP Security**
   - Moved Gemini AI API key handling strictly to server-side environment configuration so private AI keys never enter client JavaScript bundles.
   - Enforced same-origin checks, `X-Requested-With: LuminaWebApp` verification, or valid Firebase ID Bearer token verification via Firebase Admin Auth on all `POST /api/*` routes.
   - Added sliding-window per-IP rate limiting (30 requests/minute on AI routes; 5 requests/minute on support submissions with `Retry-After` headers).
   - Added HTTP security headers (`Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and production HTTPS redirect + `Strict-Transport-Security`).
   - Added 100KB JSON body size caps and control-character/length sanitization on all backend inputs.

2. **Database Rules & Access Control Hardening**
   - Updated Cloud Firestore security rules to enforce strict owner-only access (`request.auth.uid == userId`), immutable ownership checks on updates, schema validation for cycle records, notifications, partner connection requests, gift records, and community insights, plus anti-tamper guards preventing privilege escalation or forged cross-account edits.
   - Audited rules with `@firebase/eslint-plugin-security-rules` and deployed the verified ruleset live to Firebase.

3. **Authentication, Credentials & Account Protection**
   - Removed legacy plaintext password storage (`lumina_saved_password`) and scrubbed stale client keys automatically on startup.
   - Added PBKDF2-SHA256 salted credential verifiers for offline sign-in resilience and strictly disabled silent account auto-creation during failed or unknown-email sign-in attempts.
   - Enforced strong password rules (8+ characters with uppercase, lowercase, digit, and symbol), 5-attempt failed-login lockout (5-minute cooldown), email verification status and resend support, password reset flows, RFC 6238 TOTP Two-Factor Authentication with locally rendered QR setup and 8 single-use backup recovery codes, active device/session listing, suspicious/new-device alerts, security change notifications, and remote "Log out of all devices" via synchronized `sessionEpoch` invalidation.

4. **Privacy Dashboard, Consent & Spam Protection**
   - Added a dedicated Privacy & Security Vault accessible from the header, navigation, Settings, and footer, allowing users to inspect collected data categories, manage granular privacy & partner-sharing toggles, manage active sessions, export encrypted backups, review the privacy policy, and perform typed-confirmation account and cloud data deletion.
   - Added a first-visit Cookie & Privacy Consent Banner (`Accept All`, `Reject Non-Essential`, `Customize`) gating optional Amplitude/Firebase Analytics, Web Vitals performance diagnostics, and personalization, with sensitive diary/note fields stripped before telemetry.
   - Added hidden honeypot traps, strict email/length validation, and rate limiting to Authentication and Support/Feedback forms backed by `POST /api/support`.

5. **AES-256-GCM Backups, SEO, Performance & Accessibility**
   - Implemented AES-256-GCM encrypted local automatic snapshots (rolling history with SHA-256 checksums) and portable/passphrase-encrypted backup exports with verified import/restore and recovery guidance.
   - Added local OpenGraph/app icon assets, `robots.txt`, `sitemap.xml`, `manifest.json`, Schema.org metadata, custom branded 404 recovery page, `React.lazy` route/component code splitting, local QR rendering (`qrcode` package without external QR image servers), local botanical yoga SVGs, and higher-contrast accessible text and form labels.

---

## PoC Verification

All checks below were executed directly against the running application, built bundle, and deployed security rules:

### 1. Live HTTP, Header, Auth, Anti-Spam & Rate-Limit Verification (`http://localhost:3000`)
- **Health & Security Headers (`GET /api/health`)**: Returned `200 OK` (`{"status":"ok","mode":"development"}`) with `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: camera=(self), microphone=(self), geolocation=(self), interest-cohort=()`, and `content-security-policy`.
- **Static SEO & PWA Assets (`GET /robots.txt`, `/sitemap.xml`, `/manifest.json`, `/og-image.jpg`)**: All returned `200 OK` with expected MIME types and non-empty payloads.
- **CSRF / Missing Header Protection (`POST /api/gemini/daily-affirmation` without `X-Requested-With`)**: Rejected with HTTP `403 Forbidden` (`{"error":"Missing required security verification header."}`).
- **Invalid Token Verification (`POST /api/gemini/daily-affirmation` with `Authorization: Bearer invalid.jwt.token`)**: Rejected with HTTP `401 Unauthorized` (`{"error":"Invalid or expired authentication token."}`).
- **Support Honeypot Spam Trap (`POST /api/support` with populated `website` field)**: Rejected with HTTP `400 Bad Request` (`{"error":"Submission rejected."}`).
- **Support Input Validation (`POST /api/support` with 2-character message)**: Rejected with HTTP `400 Bad Request` (`{"error":"Message must be at least 10 characters long."}`).
- **Support Valid Submission & Rate Limiting (`POST /api/support`)**: Valid request returned HTTP `201 Created` with ticket reference (`{"ok":true,"ticketId":"LMN-DCB7AC28",...}`); exceeding 5 requests in 60 seconds triggered HTTP `429 Too Many Requests` with header `Retry-After: 60`.
- **Built Bundle Secret Scan (`dist/assets/`)**: Zero occurrences of `GEMINI_API_KEY` or private backend credentials; `lumina_saved_password` appears only in startup cleanup removal calls.

### 2. Cloud Firestore Security Rules Verification
- **Static Rule Security Linting**: `npx eslint DRAFT_firestore.rules firestore.rules` exited with code `0` and zero findings.
- **Live Deployment**: Rules deployed directly to the project's live Firestore database (`DeployRules` completed cleanly).

### 3. Headless Chromium End-to-End Verification
- **Cookie Consent Banner & Persistence**: Banner rendered on initial load; `Customize` panel toggled privacy-safe analytics; saving preferences persisted `lumina_cookie_consent_v1` in `localStorage`.
- **Custom 404 Page & Recovery**: Navigating to `/nonexistent-sanctuary-page` rendered the branded `Error 404` page, and clicking `Return to Home Dashboard` returned cleanly to `/`.
- **Authentication Hardening**:
  - Weak sign-up password (`weak123`) was blocked with clear policy guidance before submission.
  - Invalid sign-in attempts stayed rejected (did not auto-create or log into any session), and 5 consecutive failed attempts triggered the 5-minute account lockout notice.
- **Privacy Dashboard, 2FA, Backups & Support Form**:
  - Privacy Dashboard opened cleanly from navigation and rendered Data & Policy, Account & 2FA, Devices & Activity (`Log Out of All Devices`), and Download & Delete sections.
  - Enabling 2FA rendered the TOTP setup QR image locally via data URI (`img[src^="data:image/png"]`) with zero external QR network calls.
  - Settings → Backup & Sync rendered encrypted export and snapshot recovery history controls.
  - Submitting the Settings → Help & Support modal form returned a verified live ticket confirmation (`Reference: LMN-8510F611`).
- **Responsive Mobile Layout & Runtime Errors**: Tested at `1440x900` and `375x812` viewports across Auth, Home Dashboard, and Privacy Dashboard with `scrollWidth === 375` (zero horizontal overflow) and zero uncaught page errors or CSP violations.

### 4. Build & TypeScript Verification
- `tsc --noEmit` (`lint_applet`) passed with zero errors.
- Production compilation (`compile_applet` / `npm run build`) succeeded cleanly.
