// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "@/components/home/Hero";
import PlansSection from "@/components/home/PlansSection";
import HowItWorks from "@/components/home/HowItWorks";
import ContactSection from "@/components/home/ContactSection";
import "@/styles/Home.css";
import { api } from "@/api";

const FALLBACK_PLANS = [
  {
    code: "Plan A",
    name: "Responsabilidad Civil (RC)",
    features: [
      "Responsabilidad civil para terceros por lesiones o muerte y daños materiales.",
    ],
  },
  {
    code: "Plan B",
    name: "Auto Total",
    subtitle: "Responsabilidad civil + coberturas totales",
    features: [
      "Responsabilidad civil",
      "Pérdida total por accidente, incendio y robo o hurto",
    ],
  },
  {
    code: "Plan D",
    name: "Todo Riesgo",
    features: [
      "Responsabilidad civil",
      "Pérdida total y parcial por accidente, incendio y robo o hurto",
      "Modalidades con y sin franquicia",
    ],
  },
  {
    code: "Plan P",
    name: "Mega Premium",
    features: [
      "Responsabilidad civil",
      "Pérdida total y parcial por accidente, incendio y robo o hurto",
      "Reposición a nuevo, cristales, cerraduras, cubiertas, GNC sin descuento por antigüedad, etc.",
    ],
  },
];

export default function Home() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const normalize = (data = []) =>
        data.map((it) => ({
          id: it.id,
          code: it.code || it.short || it.plan_type || it.id || "",
          name: it.name || it.title || "",
          subtitle: it.subtitle || it.tag || it.tagline || "",
          features: it.features || it.includes || [],
        }));

      try {
        // Preferimos productos reales gestionados por el admin
        const { data } = await api.get("/api/products/home");
        const list = Array.isArray(data) ? data : [];
        if (list.length) {
          setTypes(normalize(list));
          return;
        }
        // Fallback alternativo
        const { data: alt } = await api.get("/api/products/");
        const listAlt = Array.isArray(alt) ? alt : [];
        if (listAlt.length) {
          setTypes(normalize(listAlt));
          return;
        }
        setTypes(FALLBACK_PLANS);
      } catch {
        setTypes(FALLBACK_PLANS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleQuote = (plan) => {
    const qs = new URLSearchParams({
      plan: plan.code || plan.name || "",
      plan_name: plan.name || plan.code || "",
    }).toString();
    navigate(`/quote?${qs}`);
  };

  return (
    <main id="main" className="home">
      <Hero />

      <PlansSection plans={types} loading={loading} onQuote={handleQuote} />
      <HowItWorks />
      <ContactSection />
    </main>
  );
}
