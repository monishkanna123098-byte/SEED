/**
 * S.E.E.D. Public Landing Page
 * Route: / (public, no auth required)
 *
 * Composes all landing sections from Part 1 and Part 2.
 */

import { LandingHeader, HeroSection, ProblemSection, HowItWorksSection }
  from './LandingSections'
import { TrustSection, AudienceSection, DisclaimerSection, LandingFooter }
  from './LandingSections2'

export function LandingPage() {
  return (
    // bg-white overrides the global body bg-seed-ice for the landing page
    <div className="min-h-screen bg-white overflow-x-hidden">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <TrustSection />
        <AudienceSection />
        <DisclaimerSection />
      </main>
      <LandingFooter />
    </div>
  )
}
