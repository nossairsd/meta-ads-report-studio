import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import Footer from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="mx-auto w-full max-w-6xl space-y-24 px-6 pb-24 md:space-y-32">
        <Hero />
        <Features />
        <Footer />
      </div>
    </>
  );
}
