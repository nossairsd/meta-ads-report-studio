import { isAuthConfigured } from "@/lib/env";
import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import HowItWorks from "@/components/landing/how-it-works";
import CtaBand from "@/components/landing/cta-band";
import Footer from "@/components/landing/footer";

export default function Home() {
  // Decided on the server: a deployment without Meta credentials should not
  // offer a connection that cannot complete. The demo needs no configuration
  // and stays available either way.
  const canConnect = isAuthConfigured();

  return (
    <>
      <Navbar />

      <div className="mx-auto w-full max-w-6xl space-y-24 px-6 md:space-y-32">
        <Hero canConnect={canConnect} />
        <Features />
        <HowItWorks />
      </div>

      {/* Both sit outside the max-width column so they span the viewport, and
          share the same dark base so the page closes on one continuous block. */}
      <CtaBand />
      <Footer />
    </>
  );
}
