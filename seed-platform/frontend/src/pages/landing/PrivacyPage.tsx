/**
 * S.E.E.D. Privacy Policy
 * Route: /privacy (public, no auth required)
 *
 * Drafted in accordance with Digital Personal Data Protection Act 2023 (India),
 * Schedule IV obligations for health-adjacent platforms.
 *
 * LEGAL NOTICE: This document was drafted by the platform engineering team
 * and must be reviewed by qualified legal counsel before public launch.
 */

import { Link } from 'react-router-dom'
import { LandingHeader } from './LandingSections'
import { LandingFooter } from './LandingSections2'

// ─── Shared prose styles ─────────────────────────────────────────────────────

const prose = {
  h2: 'text-lg font-bold text-seed-dark mt-10 mb-3',
  h3: 'text-base font-semibold text-seed-dark mt-6 mb-2',
  p:  'text-sm leading-relaxed text-seed-muted mb-4',
  ul: 'list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-seed-muted mb-4',
  li: '',
}

// ─── Section component ───────────────────────────────────────────────────────

function Section({ id, title, children }: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id}>
      <h2 className={prose.h2}>{title}</h2>
      {children}
      <div className="border-t border-slate-100 mt-8" />
    </section>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-28 pb-20">

        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-seed-muted
                       hover:text-seed-teal transition-colors mb-6"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <h1 className="text-3xl font-extrabold text-seed-dark mb-2">Privacy Policy</h1>
          <p className={prose.p}>
            Effective date: 1 July 2026 &nbsp;·&nbsp; Last updated: 1 July 2026
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm
                          text-amber-800 leading-relaxed">
            <strong>Important:</strong> S.E.E.D. collects developmental screening data
            about children. We treat this data with the highest level of care. Please
            read this policy carefully before using the platform.
          </div>
        </div>

        {/* 1 */}
        <Section id="who-we-are" title="1. Who We Are">
          <p className={prose.p}>
            S.E.E.D. (Social Emotional Early Detection) is a developmental screening
            platform operated by Team Jarvis ("we", "us", "our"). The platform is
            designed to assist qualified healthcare professionals in the early
            identification of developmental concerns in children aged 18 months to
            5 years. S.E.E.D. is a screening support tool and does not provide
            medical diagnoses.
          </p>
          <p className={prose.p}>
            For privacy-related inquiries during the pilot phase, contact us at:{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>
          </p>
        </Section>

        {/* 2 */}
        <Section id="data-we-collect" title="2. Data We Collect">
          <h3 className={prose.h3}>2.1 Account information</h3>
          <p className={prose.p}>
            When you register, we collect your name, email address, and role
            (parent/guardian or clinician). Clinicians additionally provide their
            specialty and licence number. We do not collect payment information.
          </p>

          <h3 className={prose.h3}>2.2 Child profile data</h3>
          <p className={prose.p}>
            Parents provide the child's name, date of birth, and gender. This
            information is used solely to calibrate age-appropriate screening
            parameters and to display results in context.
          </p>

          <h3 className={prose.h3}>2.3 Screening session data</h3>
          <ul className={prose.ul}>
            <li>
              <strong>Video recordings</strong> — short video clips submitted for
              automated behavioural analysis. Videos are processed on our servers,
              are never shared with third parties, and are deleted within 30 days
              of session completion unless you explicitly request earlier deletion.
            </li>
            <li>
              <strong>Game interaction data</strong> — anonymised event logs from
              the in-platform game (tap coordinates, reaction times, gaze-proxy
              metrics). No raw biometric data is stored.
            </li>
            <li>
              <strong>Questionnaire responses</strong> — your answers to the
              M-CHAT-R/F developmental questionnaire. Responses are stored
              encrypted at rest.
            </li>
            <li>
              <strong>Computed screening scores</strong> — risk tier, composite
              score, and behavioural pattern classifications generated by the
              analysis engine.
            </li>
          </ul>

          <h3 className={prose.h3}>2.4 Technical and usage data</h3>
          <p className={prose.p}>
            We collect standard server logs (IP address, browser type, pages
            visited) for security and performance monitoring. Log data is retained
            for 90 days.
          </p>
        </Section>

        {/* 3 */}
        <Section id="how-we-use" title="3. How We Use Your Data">
          <ul className={prose.ul}>
            <li>To provide, operate, and improve the screening platform</li>
            <li>To generate screening reports for review by your assigned clinician</li>
            <li>
              To conduct aggregate, de-identified research to improve screening
              accuracy (only with explicit consent, and only after data is
              irreversibly de-identified)
            </li>
            <li>To send transactional communications (account verification, results
              notifications). We do not send marketing emails.</li>
            <li>To comply with applicable law, including DPDPA-2023</li>
          </ul>
          <p className={prose.p}>
            We do <strong>not</strong> use your data for advertising, profiling for
            commercial purposes, or sale to third parties.
          </p>
        </Section>

        {/* 4 */}
        <Section id="legal-basis" title="4. Legal Basis for Processing (DPDPA-2023)">
          <p className={prose.p}>
            Under the Digital Personal Data Protection Act 2023 (India), our legal
            bases for processing personal data are:
          </p>
          <ul className={prose.ul}>
            <li>
              <strong>Consent</strong> — you provide explicit consent at registration
              for collection of child developmental data. Consent for research use
              is sought separately and is optional.
            </li>
            <li>
              <strong>Legitimate use</strong> — processing necessary to provide
              the services you have contracted for.
            </li>
            <li>
              <strong>Legal obligation</strong> — where required by applicable
              Indian law or regulatory authority.
            </li>
          </ul>
          <p className={prose.p}>
            As a platform handling health-adjacent data about children, we treat
            all child developmental data as sensitive personal data under
            Schedule II of DPDPA-2023 and apply corresponding safeguards.
          </p>
        </Section>

        {/* 5 */}
        <Section id="data-sharing" title="5. Data Sharing">
          <p className={prose.p}>
            We share your data only in the following limited circumstances:
          </p>
          <ul className={prose.ul}>
            <li>
              <strong>Your assigned clinician</strong> — screening results are
              shared with the clinician who issued your invite code. This is the
              core purpose of the platform.
            </li>
            <li>
              <strong>Infrastructure providers</strong> — we use cloud
              infrastructure providers bound by data processing agreements. No
              child data is stored outside India.
            </li>
            <li>
              <strong>Legal requirements</strong> — if required by court order
              or lawful authority under Indian law.
            </li>
          </ul>
          <p className={prose.p}>
            We do <strong>not</strong> share data with advertisers, data brokers,
            insurance companies, or any third party for commercial purposes.
          </p>
        </Section>

        {/* 6 */}
        <Section id="data-retention" title="6. Data Retention">
          <ul className={prose.ul}>
            <li>Account data — retained while your account is active and for
              2 years after deletion request</li>
            <li>Child profiles and screening results — retained for 5 years
              from last session, or until deletion requested, whichever is sooner</li>
            <li>Video files — deleted within 30 days of session completion</li>
            <li>Server logs — 90 days</li>
          </ul>
          <p className={prose.p}>
            You may request earlier deletion at any time (see Section 8).
          </p>
        </Section>

        {/* 7 */}
        <Section id="security" title="7. Security">
          <p className={prose.p}>
            We implement the following technical and organisational measures to
            protect your data:
          </p>
          <ul className={prose.ul}>
            <li>All data transmitted between your device and our servers is
              encrypted in transit using TLS 1.2+</li>
            <li>Screening data is stored encrypted at rest</li>
            <li>Access to child data is role-gated — only the assigned clinician
              and platform administrators can access a child's records</li>
            <li>Clinician registration requires a validated invite code issued
              by a verified healthcare professional (DPDPA-2023 Schedule IV)</li>
            <li>Session tokens expire after 15 minutes of inactivity</li>
          </ul>
          <p className={prose.p}>
            No security system is perfect. If you discover a vulnerability,
            please disclose it responsibly to{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>.
          </p>
        </Section>

        {/* 8 */}
        <Section id="your-rights" title="8. Your Rights (DPDPA-2023)">
          <p className={prose.p}>
            Under DPDPA-2023, you have the following rights regarding your personal
            data and your child's data:
          </p>
          <ul className={prose.ul}>
            <li><strong>Right to access</strong> — request a copy of the data
              we hold about you and your child</li>
            <li><strong>Right to correction</strong> — request correction of
              inaccurate data</li>
            <li><strong>Right to erasure</strong> — request deletion of your
              account and associated data</li>
            <li><strong>Right to withdraw consent</strong> — withdraw consent
              for optional processing (e.g. research use) at any time</li>
            <li><strong>Right to grievance redressal</strong> — raise a grievance
              with our Data Protection Officer</li>
          </ul>
          <p className={prose.p}>
            To exercise any of these rights, email{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>{' '}
            with subject line "Data Rights Request". We will respond within
            72 hours and fulfil valid requests within 30 days.
          </p>
        </Section>

        {/* 9 */}
        <Section id="children" title="9. Data About Children">
          <p className={prose.p}>
            All data about children on this platform is provided by a
            parent or guardian. We do not knowingly collect data directly from
            children. The in-platform game collects interaction events (taps,
            timings) for clinical analysis — this data is associated with the
            child's clinical profile and is accessible only to the parent and
            assigned clinician.
          </p>
          <p className={prose.p}>
            Parents may request deletion of all data associated with their child
            at any time by contacting us at the address above. Deletion is
            permanent and irreversible.
          </p>
        </Section>

        {/* 10 */}
        <Section id="changes" title="10. Changes to This Policy">
          <p className={prose.p}>
            We may update this policy as the platform evolves or as legal
            requirements change. Material changes will be notified by email
            to registered users at least 14 days before taking effect. The
            effective date at the top of this page will always reflect the
            current version.
          </p>
        </Section>

        {/* Back link */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-seed-teal font-medium hover:text-seed-navy
                       transition-colors"
          >
            ← Back to home
          </Link>
          <Link
            to="/terms"
            className="text-sm text-seed-muted hover:text-seed-teal transition-colors"
          >
            Terms of Use →
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
