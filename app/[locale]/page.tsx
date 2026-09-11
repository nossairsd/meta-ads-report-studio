import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import HowItWorks from "@/components/landing/how-it-works";
import Pricing from "@/components/landing/pricing";
import EarlyAccess from "@/components/landing/early-access";
import CtaBand from "@/components/landing/cta-band";
import Footer from "@/components/landing/footer";
import { SignInNotice } from "@/components/landing/sign-in-notice";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string; error?: string }>;
}) {
  // Auth.js reports failures by redirecting here with a reason, and the proxy
  // adds one of its own when it turns an anonymous visitor away. Reading them
  // is what stops a failed sign-in looking like a page that did nothing.
  const { signin, error } = await searchParams;

  return (
    <>
      <Navbar />

      {/* Floats above the page; it no longer pushes the hero down. */}
      <SignInNotice signin={signin} error={error} />

      <div className="mx-auto w-full max-w-6xl space-y-24 px-6 md:space-y-32">
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <EarlyAccess />
      </div>

      {/* Both sit outside the max-width column so they span the viewport, and
          share the same dark base so the page closes on one continuous block. */}
      <CtaBand />
      <Footer />
    </>
  );
}
