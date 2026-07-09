import Hero from "@/components/Hero";
import PositioningStats from "@/components/PositioningStats";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import AISection from "@/components/AISection";
import DualModeSection from "@/components/DualModeSection";
import Platform from "@/components/Platform";
import WhoItsFor from "@/components/WhoItsFor";
import AboutSection from "@/components/AboutSection";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Hero />
      <PositioningStats />
      <Features />
      <HowItWorks />
      <AISection />
      <DualModeSection />
      <Platform />
      <WhoItsFor />
      <TeamSection />
      <AboutSection />
      <Footer />
    </>
  );
}
