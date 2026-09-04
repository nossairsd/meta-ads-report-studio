import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import CtaBand from "@/components/landing/cta-band";
import Footer from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />

      <div className="mx-auto w-full max-w-6xl space-y-24 px-6 md:space-y-32">
        <Hero />
        <Features />
      </div>

      {/* Both sit outside the max-width column so they span the viewport, and
          share the same dark base so the page closes on one continuous block. */}
      <CtaBand />
      <Footer />
    </>
  );
}
