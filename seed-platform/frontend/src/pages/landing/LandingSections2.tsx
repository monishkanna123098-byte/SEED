/**
 * S.E.E.D. Public Landing Page — Part 2 sections
 *
 * Exports: TrustSection | AudienceSection | DisclaimerSection | LandingFooter
 *
 * ⚠ KNOWN COPY ISSUES (must fix before public launch):
 *   - Badge 2 "All data processed on-device" is FALSE — video analysis
 *     runs server-side on FastAPI/MediaPipe. Needs corrected copy.
 *   - Badge 3 "AES-256 encryption" is NOT implemented in the current build.
 *     Aspirational copy only.
 */

import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'

const C = {
  navy:  '#065A82',
  teal:  '#028090',
  mint:  '#02C39A',
  ice:   '#EAF4F8',
  dark:  '#1A2B3C',
  muted: '#64748B',
  amber: '#F4A261',
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. TRUST INDICATORS
// ══════════════════════════════════════════════════════════════════════════════

const TRUST_BADGES = [
  {
    key: 'dsm5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'DSM-5 Aligned',
    body: 'Behavioral metrics map directly to DSM-5 diagnostic criteria for ASD across Criterion A and Criterion B domains.',
  },
  {
    key: 'dpdpa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
      </svg>
    ),
    title: 'DPDPA-2023 Compliant',
    // ⚠ "processed on-device" is inaccurate — video runs server-side. Fix before launch.
    body: 'Designed around Digital Personal Data Protection Act 2023 requirements. No child data shared with third-party services.',
  },
  {
    key: 'privacy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Privacy-First',
    // ⚠ AES-256 not yet implemented. Aspirational copy only.
    body: 'No child data sent to third-party services. Role-gated access with clinician invite codes required for parent registration.',
  },
  {
    key: 'clinical',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: 'Built on DSM-5 Criteria',
    body: 'Behavioral scoring framework grounded in DSM-5 diagnostic criteria. Clinical validation study planned, not yet conducted.',
  },
]

export function TrustSection() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-3"
            style={{ color: C.teal }}>
            Our Foundations
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold"
            style={{ color: C.navy, fontFamily: 'Cambria, Georgia, serif' }}>
            Built With Rigor
          </h2>
        </motion.div>

        {/* Badges grid */}
        <div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {TRUST_BADGES.map((badge, i) => (
            <motion.div
              key={badge.key}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-6
                         flex flex-col gap-3 hover:border-seed-teal/30
                         hover:bg-white hover:shadow-md transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: C.teal + '14', color: C.teal }}
              >
                {badge.icon}
              </div>
              <h3 className="font-bold text-sm" style={{ color: C.dark }}>
                {badge.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
                {badge.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. FOR FAMILIES / FOR CLINICIANS
// ══════════════════════════════════════════════════════════════════════════════

const FAMILY_FEATURES = [
  'Register with a clinician invite code',
  'Complete M-CHAT-R questionnaire at your own pace',
  "Run Buddy's World — the child-friendly screening game",
  'Receive results reviewed by your clinician within 72 hours',
]

const CLINICIAN_FEATURES = [
  'Generate invite codes for your patients',
  'Review AI screening summaries and behavioral metrics',
  'Override risk tiers with clinical judgment',
  'Generate referral letters automatically',
]

function CheckIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={2.5}
      className="w-4 h-4 flex-shrink-0 mt-0.5">
      <polyline points="3,8 6,11 13,4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AudienceSection() {
  return (
    <section className="py-24 bg-seed-ice/40" id="clinicians">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-3"
            style={{ color: C.teal }}>
            Who It's For
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold"
            style={{ color: C.navy, fontFamily: 'Cambria, Georgia, serif' }}>
            Built for Families and Clinicians
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* For Families — ice blue */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="rounded-2xl p-8 flex flex-col gap-5 border border-seed-teal/20
                       shadow-sm"
            style={{ backgroundColor: C.ice }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: C.teal }}>
                For Families
              </p>
              <h3 className="text-2xl font-bold"
                style={{ color: C.navy, fontFamily: 'Cambria, Georgia, serif' }}>
                Screen Your Child
                <br />at Home
              </h3>
            </div>

            <ul className="space-y-3 flex-1">
              {FAMILY_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm"
                  style={{ color: C.dark }}>
                  <CheckIcon color={C.teal} />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 py-3.5
                         rounded-xl bg-seed-teal text-white font-semibold text-sm
                         hover:bg-seed-navy transition-all duration-200
                         hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
            >
              Register as a Parent →
            </Link>
          </motion.div>

          {/* For Clinicians — navy */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="rounded-2xl p-8 flex flex-col gap-5 shadow-lg"
            style={{ backgroundColor: C.navy }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2 text-white/50">
                For Clinicians
              </p>
              <h3 className="text-2xl font-bold text-white"
                style={{ fontFamily: 'Cambria, Georgia, serif' }}>
                AI-Assisted
                <br />Clinical Review
              </h3>
            </div>

            <ul className="space-y-3 flex-1">
              {CLINICIAN_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                  <CheckIcon color={C.mint} />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/register?role=clinician"
              className="inline-flex items-center justify-center gap-2 py-3.5
                         rounded-xl font-semibold text-sm transition-all duration-200
                         hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
              style={{
                backgroundColor: C.teal,
                color: 'white',
              }}
            >
              Register as a Clinician →
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. DISCLAIMER SECTION
// ══════════════════════════════════════════════════════════════════════════════

export function DisclaimerSection() {
  return (
    <motion.section
      className="py-14"
      style={{ backgroundColor: '#FFFBEB', borderTop: '1px solid #FDE68A',
               borderBottom: '1px solid #FDE68A' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth={1.8}
            className="w-5 h-5 flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              strokeLinejoin="round" />
            <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-bold" style={{ color: '#92400E' }}>
            Important Notice
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#78350F' }}>
          <strong>S.E.E.D. is a screening support tool, not a diagnostic instrument.</strong>{' '}
          Results do not constitute a medical diagnosis. Always consult a qualified
          healthcare professional for any developmental concerns. The platform is
          currently in pilot phase. Clinical validation studies are being planned
          in collaboration with partner institutions.
        </p>
      </div>
    </motion.section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. FOOTER
// ══════════════════════════════════════════════════════════════════════════════

const FOOTER_LINKS = [
  { label: 'About',          href: '#' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use',   href: '/terms' },
  { label: 'Contact',        href: '#' },
]

export function LandingFooter() {
  return (
    <footer style={{ backgroundColor: C.dark }}>
      {/* Main footer row */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10
                      flex flex-col md:flex-row items-center
                      justify-between gap-6">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <span className="text-2xl font-extrabold tracking-tight text-white">
            S<span style={{ color: C.teal }}>.</span>E
            <span style={{ color: C.teal }}>.</span>E
            <span style={{ color: C.teal }}>.</span>D
            <span style={{ color: C.teal }}>.</span>
          </span>
          <p className="text-xs text-white/40 leading-snug">
            Social Emotional Early Detection
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-1">
          {FOOTER_LINKS.map(({ label, href }) => (
            href.startsWith('/')
              ? (
                <Link
                  key={label}
                  to={href}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white
                             transition-colors rounded-lg hover:bg-white/5"
                >
                  {label}
                </Link>
              )
              : (
                <a
                  key={label}
                  href={href}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white
                             transition-colors rounded-lg hover:bg-white/5"
                >
                  {label}
                </a>
              )
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-xs text-white/40 text-center md:text-right">
          © 2026 S.E.E.D. Platform.
          <br className="hidden sm:block" />
          Team Jarvis.
        </p>
      </div>

      {/* Bottom disclaimer bar */}
      <div
        className="border-t px-5 sm:px-8 py-3"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <p className="text-center text-[11px] text-white/25 max-w-3xl mx-auto">
          Screening tool only. Not a diagnostic instrument. Clinical confirmation
          required. S.E.E.D. does not replace professional medical evaluation.
        </p>
      </div>
    </footer>
  )
}
