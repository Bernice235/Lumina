# Security Summary

Lumina: Bloom & Balance underwent a comprehensive pre-launch security, privacy, authentication, compliance, and reliability hardening pass across its Web, iOS, Android, Express backend, Cloud Firestore rules, and AI wellness modules while preserving all existing features and user data.

## Key Protections & Improvements Implemented

1. **Authentication, Session Security & Native Biometrics**
   - Replaced simulated biometric delays with real platform authentication: native Face ID / Touch ID / Android BiometricPrompt via `@aparajita/capacitor-biometric-auth` (with iOS `NSFaceIDUsageDescription` configured in `ios/App/App/Info.plist`), WebAuthn/passkey verification on browsers, and an authenticated user-password fallback.
   - Removed silent auto-account creation on failed or unknown-email sign-in attempts, removed legacy plaintext password storage, hardened offline sign-in verification with salted PBKDF2-SHA256 hashes, enforced strong password creation and recovery validation, and added active session management plus cross-device session revocation (`sessionEpoch`), TOTP 2FA with local QR generation and backup codes, and login lockout protection.
   - Configured Android release obfuscation (`minifyEnabled true`, `shrinkResources true`) and ProGuard keep rules (`android/app/proguard-rules.pro`) and synchronized native Capacitor plugins (`@aparajita/capacitor-biometric-auth`, notifications, RevenueCat) across both Android and iOS targets.

2. **Privacy Isolation, Account Deletion & Regulatory Transparency (NDPA 2023 / GDPR)**
   - Enforced strict owner-only isolation for personal diary entries, mood notes, and doctor reports: partner data-sharing toggles, client projections (`buildPartnerSharedProjection`), `firebase-blueprint.json`, and deployed `firestore.rules` explicitly block `shareNotes`, `shareDoctorReports`, `diaryEntries`, `doctorReports`, `notes`, and `email` from partner projections.
   - Migrated local session, pregnancy weight tracking, and cached bank config data to encrypted client storage (`secureStorage`), replaced non-cryptographic ID/invite generators with `crypto.randomUUID()` / CSPRNG tokens, and enforced opt-in telemetry gating with automated telemetry purging on opt-out.
   - Preserved and hardened permanent account deletion with mandatory reauthentication, multi-step confirmation, session revocation, cascading personal cloud/invite/telemetry cleanup, legal retention disclosures, confirmation receipts, and public `/delete-account` and `/account-deletion` routes backed by rate-limited `POST /api/account-deletion-request`.
   - Added complete NDPA 2023 & GDPR disclosures in the Privacy Dashboard (controller identity, DPO contact `privacy@luminabloom.app`, named sub-processors, cross-border safeguards, automated profiling notice, retention schedules, and 72-hour breach notification commitments).

3. **Backend, Subscription Verification & Cloud Firestore Hardening**
   - Protected all `POST /api/gemini/*` and `POST /api/subscription/verify` routes with strict Firebase ID token verification (via Firebase Admin Auth), same-origin & trusted Capacitor origin checks, sliding-window per-IP and per-UID rate limiting, 100 KB payload limits, control-character/tag sanitization, and CSP / security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, production HSTS/HTTPS redirect).
   - Hardened Paystack verification on `/api/subscription/verify` to check `NGN` currency, authenticated UID metadata ownership, and minimum plan amounts (`450000`, `2250000`, `3999900` kobo). Updated native RevenueCat verification so explicit server rejections (`402`/`403`/`404`) deny access instead of falling through.
   - Audited and deployed hardened `firestore.rules` (enforcing mutual partner checks, blocking `senderEmail` leaks on invites, restricting invite `list` to `senderId`, adding owner delete access on `analytics_events` and `crash_reports`, and documenting the Spark/Starter-tier boundary on client-synced subscription fields until Firebase Admin server-side entitlement writes are connected on a Blaze plan).

4. **AI Clinical Safety Triage & Removal of Simulated Telemetry**
   - Added deterministic pre-AI clinical red-flag triage (`detectClinicalRedFlags` on the server and `checkClientClinicalRedFlags` in the client safety fallback) for crisis/self-harm, obstetric hemorrhage, severe unilateral/ectopic pain, preeclampsia warning signs, and high fever across symptom advice, Ask Lumina, product advice, and Companion Chat, plus strict `allowAiPersonalization === true` opt-in enforcement in Companion Chat.
   - Removed unconditioned supplement recommendations from offline fallbacks, upgraded `@google/genai` to `^3.6.1`, and used free-tier compatible Gemini models (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-3.8-flash-lite-tts`).
   - Removed fabricated `Math.random()` heart-rate/alignment biofeedback displays in `Dashboard` and `YogaTutorials`, replaced hardcoded `Math.random()` analytics arrays with real session-backed reporting, and replaced fabricated Apple Health / Google Fit sleep/exercise imports in `HealthService` with honest native bridge checks and manual logging.

5. **Dependency Upgrades**
   - Upgraded runtime packages to `@google/genai@3.6.1`, `firebase-admin@14.5.1`, `express@5.3.0`, `@capacitor/core@6.2.4`, `@capacitor/android@6.2.4`, and `@capacitor/ios@6.2.4` (staying on Capacitor 6 to preserve plugin compatibility with notifications and biometrics). Residual `npm audit --omit=dev` lockfile advisories remain recorded for future major-version Capacitor 8 migration if native plugin major versions are upgraded together.

---

## PoC Verification

All verification checks below were executed directly after the final code and dependency updates:

1. **Live HTTP Server Security & Route Guards (`http://localhost:3000`)**
   - `GET /api/health` returned `200 OK` with `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Content-Security-Policy`.
   - `POST /api/gemini/daily-affirmation` without an auth header returned `401` (`Authentication required. Missing Bearer token.`).
   - `POST /api/gemini/companion-chat` with an invalid Bearer token returned `401` (`Invalid or expired authentication token.`).
   - `POST /api/subscription/verify` without an auth header returned `401` (`Authentication required. Missing Bearer token.`).
   - `POST /api/support` with an untrusted cross-origin `Origin` header returned `403` (`Cross-origin POST requests are forbidden.`).
   - `POST /api/account-deletion-request` with a populated honeypot field returned `400` (`Submission rejected.`), and invalid email format returned `400` (`Please provide a valid account email address.`).
   - `POST /api/support` with a `>100 KB` JSON payload returned `413` (`Request payload exceeds maximum allowed size.`).
   - `GET /api/unknown-route` returned `404` (`API route not found.`).

2. **Privacy Projection, Clinical Triage & Native Health Refusal Assertions**
   - Executed runtime assertions (`npx tsx`) verifying `buildPartnerSharedProjection` forces `shareNotes: false` and `shareDoctorReports: false` and strips `diaryEntries`, `doctorReports`, `notes`, `email`, and mood note text even when passed permissive input flags.
   - Verified `getLuminaAdvice` and `sendCompanionChatMessage` return urgent crisis helpline / emergency evaluation guidance deterministically when red-flag crisis or hemorrhage inputs are submitted.
   - Verified `HealthService.importHealthMetrics` rejects Apple Health and Google Fit simulated imports when native permissions/bridges are unavailable.

3. **Firestore Security Rules, Bundle Hygiene, Capacitor Sync & Build**
   - `npx eslint firestore.rules` exited with code `0` (zero errors or warnings), and rules deployed live to Firebase.
   - Production Vite + esbuild bundle (`npm run build`) succeeded cleanly, `CI=true npx cap sync` synchronized `@aparajita/capacitor-biometric-auth@8.0.2`, `@capacitor/local-notifications@6.1.3`, `@capacitor/push-notifications@6.0.5`, and `@revenuecat/purchases-capacitor@9.2.2` into both `android/app/capacitor.build.gradle` and `ios/App/Podfile`.
   - Built client asset scan (`dist/assets/`) confirmed zero occurrences of `GEMINI_API_KEY`, `PAYSTACK_SECRET_KEY`, or `REVENUECAT_SECRET_API_KEY`.
   - Final TypeScript check (`lint_applet`) and build verification (`compile_applet`) passed with zero errors.
