import {
  LandingNavbar,
  HeroSection,
  FeaturesSection,
  PricingSection,
  CTASection,
  LandingFooter,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}