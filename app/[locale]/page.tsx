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

      {/* Full-bleed: sits outside the max-width column so it spans the viewport */}
      <CtaBand />

      <div className="mx-auto mt-24 w-full max-w-6xl px-6 pb-10 md:mt-28">
        <Footer />
      </div>
    </>
  );
}
