/**
 * S.E.E.D. Public Landing Page — Part 1 of 2
 * Route: / (public, no auth)
 *
 * Sections in this file:
 *   1. LandingHeader  — sticky, transparent → solid on scroll, mobile hamburger
 *   2. HeroSection    — full-viewport, split, CSS float animation on Buddy
 *   3. ProblemSection — three cards, Framer Motion stagger on scroll
 *   4. HowItWorks     — three steps, scroll reveal
 *
 * Part 2 (LandingPage.tsx) will import and compose all sections.
 * This file exports each section individually so Part 2 can lay them out.
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'

// ─── Colours (match Tailwind tokens, used in inline SVG where Tailwind can't) ──

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
// 1. LANDING HEADER
// ══════════════════════════════════════════════════════════════════════════════

export function LandingHeader() {
  const [scrolled,     setScrolled]     = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 20) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close hamburger on route change / outside click
  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('#landing-nav')) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  const navLinks = [
    { label: 'For Families',    href: '#how-it-works' },
    { label: 'For Clinicians',  href: '#clinicians'   },
    { label: 'Sign In',         href: '/login'        },
  ]

  return (
    <header
      id="landing-nav"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 flex-shrink-0 group">
          <span className="text-2xl font-extrabold tracking-tight text-seed-navy">
            S<span className="text-seed-teal">.</span>E
            <span className="text-seed-teal">.</span>E
            <span className="text-seed-teal">.</span>D
            <span className="text-seed-teal">.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => (
            href.startsWith('/')
              ? (
                <Link key={label} to={href}
                  className="px-4 py-2 text-sm font-medium text-seed-dark/70
                             hover:text-seed-teal transition-colors rounded-lg
                             hover:bg-seed-teal/5">
                  {label}
                </Link>
              ) : (
                <a key={label} href={href}
                  className="px-4 py-2 text-sm font-medium text-seed-dark/70
                             hover:text-seed-teal transition-colors rounded-lg
                             hover:bg-seed-teal/5">
                  {label}
                </a>
              )
          ))}
          <Link
            to="/register"
            className="ml-2 px-5 py-2 rounded-xl bg-seed-teal text-white text-sm
                       font-semibold hover:bg-seed-navy transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg
                     text-seed-dark hover:bg-seed-teal/10 transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            className="w-5 h-5">
            {menuOpen ? (
              <>
                <line x1="18" y1="6"  x2="6"  y2="18" strokeLinecap="round" />
                <line x1="6"  y1="6"  x2="18" y2="18" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="3"  y1="6"  x2="21" y2="6"  strokeLinecap="round" />
                <line x1="3"  y1="12" x2="21" y2="12" strokeLinecap="round" />
                <line x1="3"  y1="18" x2="21" y2="18" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-white border-b border-slate-100 shadow-lg px-5 pb-4"
          >
            {navLinks.map(({ label, href }) => (
              href.startsWith('/')
                ? (
                  <Link key={label} to={href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-sm font-medium text-seed-dark
                               border-b border-slate-50 hover:text-seed-teal transition-colors">
                    {label}
                  </Link>
                ) : (
                  <a key={label} href={href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-sm font-medium text-seed-dark
                               border-b border-slate-50 hover:text-seed-teal transition-colors">
                    {label}
                  </a>
                )
            ))}
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="mt-3 block text-center py-3 rounded-xl bg-seed-teal text-white
                         text-sm font-semibold hover:bg-seed-navy transition-colors"
            >
              Get Started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. HERO SECTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Buddy illustration: phone/tablet silhouette with Buddy's face on screen.
 * Pure SVG, no external assets — matches the Graphics API pattern from Phaser scenes.
 */
function BuddyIllustration() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Soft background circle */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full"
        style={{ backgroundColor: C.ice, opacity: 0.8 }} />

      {/* Float animation wrapper */}
      <div className="relative z-10 animate-[float_4s_ease-in-out_infinite]">
        <svg
          viewBox="0 0 200 340"
          width="200"
          className="drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Phone body */}
          <rect x="10" y="10" width="180" height="320" rx="24"
            fill={C.navy} />
          {/* Screen bezel */}
          <rect x="18" y="30" width="164" height="270" rx="14"
            fill={C.ice} />
          {/* Home bar */}
          <rect x="75" y="310" width="50" height="6" rx="3"
            fill="white" opacity="0.3" />
          {/* Front camera */}
          <circle cx="100" cy="20" r="4"
            fill="white" opacity="0.25" />

          {/* ── Buddy on screen ── */}
          {/* Sky background */}
          <rect x="18" y="30" width="164" height="270" rx="14"
            fill="#E0F4FF" />

          {/* Buddy body */}
          <ellipse cx="100" cy="205" rx="36" ry="42"
            fill="#FFB347" />
          {/* Left arm */}
          <ellipse cx="64" cy="210" rx="10" ry="22"
            fill="#F2A23E" transform="rotate(-12 64 210)" />
          {/* Right arm */}
          <ellipse cx="136" cy="210" rx="10" ry="22"
            fill="#F2A23E" transform="rotate(12 136 210)" />
          {/* Left leg */}
          <ellipse cx="84" cy="243" rx="9" ry="18"
            fill="#F2A23E" transform="rotate(6 84 243)" />
          {/* Right leg */}
          <ellipse cx="116" cy="243" rx="9" ry="18"
            fill="#F2A23E" transform="rotate(-6 116 243)" />

          {/* Buddy head */}
          <circle cx="100" cy="158" r="34"
            fill="#FFB347" />
          {/* Left ear */}
          <circle cx="69" cy="155" r="8"
            fill="#F2A23E" />
          {/* Right ear */}
          <circle cx="131" cy="155" r="8"
            fill="#F2A23E" />

          {/* Eyes */}
          <ellipse cx="89" cy="154" rx="7" ry="8"
            fill="white" />
          <ellipse cx="111" cy="154" rx="7" ry="8"
            fill="white" />
          <circle cx="91" cy="155" r="4"
            fill="#1A2B3C" />
          <circle cx="113" cy="155" r="4"
            fill="#1A2B3C" />
          {/* Pupils shine */}
          <circle cx="93" cy="153" r="1.5"
            fill="white" />
          <circle cx="115" cy="153" r="1.5"
            fill="white" />
          {/* Brows */}
          <path d="M84 145 Q89 141 94 144"
            fill="none" stroke="#8A5A1E" strokeWidth="2" strokeLinecap="round" />
          <path d="M106 144 Q111 141 116 145"
            fill="none" stroke="#8A5A1E" strokeWidth="2" strokeLinecap="round" />

          {/* Smile */}
          <path d="M88 167 Q100 177 112 167"
            fill="none" stroke="#8A5A1E" strokeWidth="2.5" strokeLinecap="round" />
          {/* Cheeks */}
          <circle cx="81" cy="166" r="6"
            fill="#FFC1CC" opacity="0.6" />
          <circle cx="119" cy="166" r="6"
            fill="#FFC1CC" opacity="0.6" />

          {/* Score display at bottom of screen */}
          <rect x="36" y="272" width="128" height="20" rx="10"
            fill={C.teal} opacity="0.9" />
          <text x="100" y="285" textAnchor="middle"
            fontSize="9" fill="white" fontFamily="system-ui" fontWeight="bold">
            Assessment Complete ✓
          </text>
        </svg>
      </div>

      {/* Floating score card */}
      <motion.div
        className="absolute -right-2 top-12 bg-white rounded-2xl shadow-xl
                   px-3 py-2.5 flex items-center gap-2 border border-slate-100"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center
                        justify-center flex-shrink-0">
          <svg viewBox="0 0 16 16" fill="none" stroke="#10b981" strokeWidth={2}
            className="w-4 h-4">
            <polyline points="3,8 6,11 13,4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] text-seed-muted leading-none">Composite Score</p>
          <p className="text-sm font-extrabold text-seed-dark leading-tight">18 / 70</p>
        </div>
      </motion.div>

      {/* Floating clinician badge */}
      <motion.div
        className="absolute -left-4 bottom-16 bg-white rounded-2xl shadow-xl
                   px-3 py-2.5 flex items-center gap-2 border border-slate-100"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center
                        justify-center flex-shrink-0 text-xs font-bold text-violet-700">
          Dr
        </div>
        <div>
          <p className="text-[10px] text-seed-muted leading-none">Clinician Review</p>
          <p className="text-xs font-semibold text-seed-dark leading-tight">Within 72 hrs</p>
        </div>
      </motion.div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-16">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-seed-ice/60
                      pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-16
                      flex flex-col lg:flex-row items-center gap-12 lg:gap-8 w-full">

        {/* Left — copy (60%) */}
        <motion.div
          className="flex-[3] max-w-xl"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Eyebrow */}
          <motion.p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: C.teal }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            AI-Powered Developmental Screening
          </motion.p>

          {/* H1 — Cambria with fallback */}
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-[56px] font-bold leading-tight mb-6"
            style={{
              color: C.navy,
              fontFamily: 'Cambria, Georgia, "Times New Roman", serif',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
          >
            Early Detection
            <br />
            <span style={{ color: C.teal }}>Changes Everything</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="text-base leading-relaxed mb-8 max-w-lg"
            style={{ color: C.muted }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
          >
            S.E.E.D. helps Indian families and pediatricians identify early
            developmental patterns in children aged 18 months to 5 years —
            privately, affordably, and without specialist access.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-wrap gap-3 mb-6"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.38 }}
          >
            <Link
              to="/register"
              className="px-7 py-3.5 rounded-xl bg-seed-teal text-white font-semibold
                         text-sm hover:bg-seed-navy transition-all duration-200 shadow-md
                         hover:shadow-lg hover:-translate-y-0.5"
            >
              Start Screening
            </Link>
            <Link
              to="/register"
              className="px-7 py-3.5 rounded-xl border-2 border-seed-navy font-semibold text-sm
                         text-seed-navy bg-transparent
                         hover:bg-seed-navy hover:text-white
                         transition-all duration-200 hover:-translate-y-0.5"
            >
              For Clinicians →
            </Link>
          </motion.div>

          {/* Disclaimer */}
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke={C.amber} strokeWidth={1.8}
              className="w-3.5 h-3.5 flex-shrink-0 mt-0.5">
              <path d="M8 1.5L1.5 13.5h13L8 1.5z" strokeLinejoin="round" />
              <path d="M8 6v3.5M8 11.5v.5" strokeLinecap="round" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: C.amber }}>
              Screening tool only. Not a diagnostic instrument.
              Clinical confirmation required.
            </p>
          </motion.div>
        </motion.div>

        {/* Right — illustration (40%) */}
        <motion.div
          className="flex-[2] flex justify-center items-center"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <BuddyIllustration />
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col
                   items-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <span className="text-xs text-seed-muted">Scroll to learn more</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-5 flex items-center justify-center"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke={C.muted} strokeWidth={1.8}
            className="w-4 h-4">
            <polyline points="3,5 8,10 13,5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. PROBLEM SECTION
// ══════════════════════════════════════════════════════════════════════════════

const PROBLEM_CARDS = [
  {
    key:   'late',
    color: '#EF4444',
    bg:    '#FEF2F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Late Diagnosis',
    body: "India lacks population-validated, scalable ASD screening infrastructure. Diagnosis routinely arrives past the critical 18–36 month neuroplasticity window.",
  },
  {
    key:   'snapshot',
    color: C.amber,
    bg:    '#FFF7ED',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
          strokeLinejoin="round" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    title: 'Snapshot Assessment',
    body: "Current clinical standard relies on a single 20-minute observation. Developmental patterns require continuous longitudinal monitoring.",
  },
  {
    key:   'window',
    color: C.navy,
    bg:    '#EFF6FF',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
          strokeLinejoin="round" />
      </svg>
    ),
    title: 'The Window Closes',
    body: "Missing early neuroplasticity limits the impact of evidence-based interventions. Every month matters.",
  },
]

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 bg-white" id="problem">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Section header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-3"
            style={{ color: C.teal }}>
            The Challenge
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: C.navy, fontFamily: 'Cambria, Georgia, serif' }}>
            The Problem We're Solving
          </h2>
          <p className="text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: C.muted }}>
            India's ASD screening system is failing children at the most critical window.
          </p>
        </motion.div>

        {/* Cards */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROBLEM_CARDS.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="rounded-2xl p-7 flex flex-col gap-4 border border-slate-100
                         hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ backgroundColor: card.bg }}
            >
              {/* Icon circle */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: card.color + '18', color: card.color }}
              >
                {card.icon}
              </div>

              <h3 className="text-lg font-bold" style={{ color: C.dark }}>
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
                {card.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. HOW IT WORKS
// ══════════════════════════════════════════════════════════════════════════════

const HOW_STEPS = [
  {
    key:    'questionnaire',
    number: '01',
    color:  C.teal,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    title:    'Parent Questionnaire',
    body:     'Complete the M-CHAT-R, a validated developmental screening questionnaire, in your own time and language.',
  },
  {
    key:    'assessment',
    number: '02',
    color:  C.navy,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="12" cy="14" r="3" />
        <path d="M9 8h6M9 6h6" strokeLinecap="round" />
      </svg>
    ),
    title:    'Child Assessment',
    body:     "Your child plays Buddy's World — our purpose-built game that captures behavioral signals while your child plays naturally.",
  },
  {
    key:    'review',
    number: '03',
    color:  '#7C3AED',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        className="w-7 h-7">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title:    'Clinician Review',
    body:     'Results are analyzed by our behavioral model and reviewed by your assigned pediatrician within 72 hours.',
  },
]

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 bg-seed-ice/40" id="how-it-works">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-3"
            style={{ color: C.teal }}>
            The Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: C.navy, fontFamily: 'Cambria, Georgia, serif' }}>
            How S.E.E.D. Works
          </h2>
          <p className="text-base max-w-xl mx-auto leading-relaxed"
            style={{ color: C.muted }}>
            Three steps to evidence-informed developmental insight.
          </p>
        </motion.div>

        {/* Steps */}
        <div ref={ref} className="relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+28px)]
                          right-[calc(16.67%+28px)] h-0.5 bg-slate-200 z-0">
            {/* Animated fill */}
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: C.teal }}
              initial={{ scaleX: 0, transformOrigin: 'left' }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.0, delay: 0.4, ease: 'easeOut' }}
            />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 36 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.2 + i * 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col items-center text-center"
              >
                {/* Number + icon circle */}
                <div className="relative mb-5">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center
                               shadow-lg border-2 border-white"
                    style={{ backgroundColor: step.color, color: 'white' }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center
                               justify-center text-xs font-extrabold text-white shadow-md"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Arrow between steps (mobile) */}
                {i < HOW_STEPS.length - 1 && (
                  <div className="md:hidden my-1 text-slate-300 text-2xl">↓</div>
                )}

                <h3 className="text-lg font-bold mb-2" style={{ color: C.dark }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: C.muted }}>
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA beneath steps */}
        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            to="/register"
            className="inline-block px-8 py-4 rounded-xl bg-seed-teal text-white
                       font-semibold text-sm hover:bg-seed-navy transition-all duration-200
                       shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Begin Your Child's Screening →
          </Link>
          <p className="text-xs mt-3" style={{ color: C.muted }}>
            Free for families during pilot · Results reviewed by a licensed clinician
          </p>
        </motion.div>
      </div>
    </section>
  )
}
