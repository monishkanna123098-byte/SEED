/**
 * S.E.E.D. Terms of Use
 * Route: /terms (public, no auth required)
 *
 * LEGAL NOTICE: This document was drafted by the platform engineering team
 * and must be reviewed by qualified legal counsel before public launch.
 */

import { Link } from 'react-router-dom'
import { ChevronLeft, ArrowRight } from 'lucide-react'
import { LandingHeader } from './LandingSections'
import { LandingFooter } from './LandingSections2'

// ─── Shared prose styles ─────────────────────────────────────────────────────

const prose = {
  h2: 'text-lg font-bold text-seed-dark mt-10 mb-3',
  h3: 'text-base font-semibold text-seed-dark mt-6 mb-2',
  p:  'text-sm leading-relaxed text-seed-muted mb-4',
  ul: 'list-disc list-outside pl-5 space-y-1.5 text-sm leading-relaxed text-seed-muted mb-4',
}

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

export function TermsPage() {
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
          <h1 className="text-3xl font-extrabold text-seed-dark mb-2">Terms of Use</h1>
          <p className={prose.p}>
            Effective date: 1 July 2026 &nbsp;·&nbsp; Last updated: 1 July 2026
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm
                          text-red-800 leading-relaxed">
            <strong>Critical notice:</strong> S.E.E.D. is a <strong>screening
            support tool only</strong>. It does not provide medical diagnoses.
            Results must always be reviewed by a qualified healthcare professional.
            Do not make clinical or therapeutic decisions based solely on S.E.E.D.
            output.
          </div>
        </div>

        {/* 1 */}
        <Section id="acceptance" title="1. Acceptance of Terms">
          <p className={prose.p}>
            By accessing or using the S.E.E.D. platform ("Platform"), you agree
            to be bound by these Terms of Use ("Terms"). If you do not agree,
            you must not use the Platform. These Terms apply to all users,
            including parents/guardians and clinicians.
          </p>
          <p className={prose.p}>
            These Terms are governed by the laws of India. Any disputes arising
            from use of the Platform shall be subject to the jurisdiction of
            courts in India.
          </p>
        </Section>

        {/* 2 */}
        <Section id="platform-scope" title="2. What S.E.E.D. Is and Is Not">
          <p className={prose.p}>
            S.E.E.D. is a digital developmental screening tool designed to assist
            qualified clinicians in identifying children who may benefit from
            further developmental evaluation. Specifically:
          </p>
          <ul className={prose.ul}>
            <li>
              <strong>S.E.E.D. is:</strong> a screening support tool that
              generates risk indicators for clinical review. It is intended to
              supplement, not replace, clinical judgement.
            </li>
            <li>
              <strong>S.E.E.D. is not:</strong> a diagnostic instrument. A
              screening result — including an ELEVATED risk tier — is not a
              diagnosis of autism spectrum disorder or any other condition.
            </li>
            <li>
              <strong>S.E.E.D. is not:</strong> a substitute for a comprehensive
              developmental assessment by a qualified paediatrician,
              developmental-behavioural paediatrician, child psychiatrist,
              or clinical psychologist.
            </li>
          </ul>
          <p className={prose.p}>
            The platform is currently in pilot phase. Accuracy metrics are based
            on preliminary data and have not yet been validated in a large-scale
            clinical trial. The platform's AUC figure (0.89) was derived from a
            pilot cohort of 47 children and should be interpreted accordingly.
          </p>
        </Section>

        {/* 3 */}
        <Section id="eligibility" title="3. Eligibility and Registration">
          <h3 className={prose.h3}>3.1 Parents and guardians</h3>
          <p className={prose.p}>
            Parent/guardian accounts require a valid clinician invite code.
            This requirement exists to ensure that every child screened has
            an assigned clinician who can review results. Attempting to
            circumvent this requirement, including by sharing or selling
            invite codes, is a violation of these Terms.
          </p>
          <h3 className={prose.h3}>3.2 Clinicians</h3>
          <p className={prose.p}>
            By registering as a clinician, you represent and warrant that you
            are a licensed healthcare professional authorised to order or review
            developmental screening assessments in your jurisdiction. You accept
            personal responsibility for reviewing screening results and taking
            appropriate clinical action.
          </p>
          <h3 className={prose.h3}>3.3 Account security</h3>
          <p className={prose.p}>
            You are responsible for maintaining the confidentiality of your
            account credentials. You must notify us immediately at{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>{' '}
            if you suspect unauthorised access to your account.
          </p>
        </Section>

        {/* 4 */}
        <Section id="acceptable-use" title="4. Acceptable Use">
          <p className={prose.p}>You agree not to:</p>
          <ul className={prose.ul}>
            <li>Use the Platform for any purpose other than developmental
              screening of children in your care or clinical practice</li>
            <li>Submit screening data for children for whom you do not have
              parental or guardianship authority, or clinical responsibility</li>
            <li>Attempt to reverse-engineer, decompile, or extract the
              machine learning models or scoring algorithms</li>
            <li>Use automated tools to scrape, bulk-access, or stress-test
              the Platform</li>
            <li>Share, sell, or transfer your account credentials or invite
              codes to unauthorised parties</li>
            <li>Submit false or misleading information about a child's age,
              developmental history, or identity</li>
            <li>Use the Platform in any way that violates applicable Indian
              law, including DPDPA-2023</li>
          </ul>
        </Section>

        {/* 5 */}
        <Section id="clinical-responsibility" title="5. Clinical Responsibility">
          <p className={prose.p}>
            Clinicians using S.E.E.D. retain full professional and ethical
            responsibility for:
          </p>
          <ul className={prose.ul}>
            <li>Reviewing all screening results assigned to them in a
              timely manner</li>
            <li>Exercising independent clinical judgement when interpreting
              results — S.E.E.D. output is an input to clinical reasoning,
              not a conclusion</li>
            <li>Communicating results to parents/guardians clearly and
              sensitively, including the limitations of screening</li>
            <li>Arranging appropriate follow-up evaluation where indicated</li>
            <li>Complying with all applicable professional standards and
              guidelines in their jurisdiction</li>
          </ul>
          <p className={prose.p}>
            S.E.E.D. does not constitute a clinical endorsement of any
            therapeutic or educational intervention. Referral decisions are
            entirely the responsibility of the reviewing clinician.
          </p>
        </Section>

        {/* 6 */}
        <Section id="intellectual-property" title="6. Intellectual Property">
          <p className={prose.p}>
            The S.E.E.D. platform, including its software, scoring methodology,
            visual design, and content, is the intellectual property of Team
            Jarvis. You are granted a limited, non-exclusive, non-transferable
            licence to use the Platform for its intended purpose.
          </p>
          <p className={prose.p}>
            The M-CHAT-R/F questionnaire used within the platform is the
            intellectual property of Diana L. Robins, Deborah Fein, and
            Marianne Barton. Use is subject to licensing requirements from
            mchatscreen.com. The questionnaire is reproduced under licence and
            may not be extracted or redistributed from this platform.
          </p>
        </Section>

        {/* 7 */}
        <Section id="disclaimer" title="7. Disclaimer of Warranties">
          <p className={prose.p}>
            The Platform is provided "as is" and "as available". To the maximum
            extent permitted by applicable law, we disclaim all warranties,
            express or implied, including warranties of merchantability, fitness
            for a particular purpose, and non-infringement.
          </p>
          <p className={prose.p}>
            We do not warrant that the Platform will be error-free, uninterrupted,
            or that screening results will be accurate in all cases. Developmental
            screening carries inherent false-positive and false-negative rates.
            No screening tool can guarantee detection of all children who may
            benefit from further evaluation.
          </p>
        </Section>

        {/* 8 */}
        <Section id="limitation-liability" title="8. Limitation of Liability">
          <p className={prose.p}>
            To the maximum extent permitted by applicable law, Team Jarvis and
            its contributors shall not be liable for any indirect, incidental,
            special, or consequential damages arising from use of the Platform,
            including but not limited to missed diagnoses, delayed referrals,
            or therapeutic decisions made in reliance on screening output.
          </p>
          <p className={prose.p}>
            Our total liability for any claim arising from use of the Platform
            shall not exceed the amount you paid us in the 12 months preceding
            the claim (which, for free pilot access, is zero).
          </p>
          <p className={prose.p}>
            Nothing in these Terms limits liability for death, personal injury,
            or fraud caused by our negligence, or any liability that cannot be
            excluded under applicable Indian law.
          </p>
        </Section>

        {/* 9 */}
        <Section id="termination" title="9. Termination">
          <p className={prose.p}>
            We may suspend or terminate your account if you breach these Terms,
            or if we reasonably believe continued access poses a risk to children
            or other users. You may delete your account at any time via account
            settings or by contacting{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>.
          </p>
        </Section>

        {/* 10 */}
        <Section id="changes" title="10. Changes to These Terms">
          <p className={prose.p}>
            We may update these Terms as the Platform evolves or as legal
            requirements change. Material changes will be communicated to
            registered users by email at least 14 days before taking effect.
            Continued use of the Platform after changes take effect constitutes
            acceptance of the revised Terms.
          </p>
        </Section>

        {/* 11 */}
        <Section id="contact" title="11. Contact">
          <p className={prose.p}>
            Questions, data rights requests, and security disclosures
            (all routed via the single pilot contact address):{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>
            <br />
            Data rights and privacy:{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>
            <br />
            Security vulnerabilities:{' '}
            <a href="mailto:admin@seed-platform.in"
              className="text-seed-teal hover:underline">
              admin@seed-platform.in
            </a>
          </p>
        </Section>

        {/* Back links */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-seed-teal font-medium hover:text-seed-navy
                       transition-colors inline-flex items-center gap-1"
          >
            <ChevronLeft size={14} />Back to home
          </Link>
          <Link
            to="/privacy"
            className="text-sm text-seed-muted hover:text-seed-teal transition-colors inline-flex items-center gap-1"
          >
            Privacy Policy<ArrowRight size={14} />
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
