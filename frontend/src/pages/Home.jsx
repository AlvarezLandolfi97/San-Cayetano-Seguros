import Hero from "../components/Hero";
import PlansCarousel from "../components/plans/PlansCarousel";
import HowItWorks from "../components/home/HowItWorks";

export default function Home() {
  return (
    <>
      {/* FULL-BLEED: no lo envuelvas en container/section */}
      <Hero />
      <PlansCarousel
        title="Planes de cobertura"
        subtitle="Elegí el plan que mejor se adapte a tu vehículo y forma de uso."
      />
      <HowItWorks />
    </>
  );
}
