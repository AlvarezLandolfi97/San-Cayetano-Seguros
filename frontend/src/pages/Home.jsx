// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Hero from "@/components/home/Hero";
import PricingGrid from "@/components/home/PricingGrid";
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

  useEffect(() => {
    (async () => {
      // normaliza la respuesta del backend a la forma esperada por <PricingGrid />
      const normalize = (data = []) =>
        data.map((it) => ({
          code: it.code || it.short || it.id || "",
          name: it.name || it.title || "",
          subtitle: it.subtitle || it.tagline || "",
          features: it.features || it.includes || [],
          id: it.id,
        }));

      try {
        // 1) intenta /api/insurance-types
        const { data } = await api.get("/api/insurance-types");
        const list = Array.isArray(data) ? data : [];
        if (list.length) {
          setTypes(normalize(list));
          return;
        }
        // 2) intenta /insurance-types (sin /api)
        const { data: data2 } = await api.get("/insurance-types");
        const list2 = Array.isArray(data2) ? data2 : [];
        if (list2.length) {
          setTypes(normalize(list2));
          return;
        }
        // 3) fallback local
        setTypes(FALLBACK_PLANS);
      } catch {
        // cualquier error -> fallback local
        setTypes(FALLBACK_PLANS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main id="main" className="home">
      <Hero />

      <section className="section container plans-section">
        <div className="home__sectionHeader">
          <h2 className="h2 section-title">Nuestros seguros</h2>
          <p className="muted">Elegí el plan que mejor se adapte a vos y a tu vehículo.</p>
        </div>

        {loading ? (
          <div className="pricing-grid">
            {[1, 2, 3].map((k) => (
              <article key={`sk-${k}`} className="pricing-card skeleton">
                <div className="sk-title" />
                <div className="sk-line" />
                <div className="sk-line" />
                <div className="sk-btn" style={{ width: 160, marginTop: 8 }} />
              </article>
            ))}
          </div>
        ) : (
          <PricingGrid items={types} />
        )}

        <div style={{ marginTop: 18 }}>
          <Link to="/plans" className="btn btn--primary">
            Ver planes
          </Link>
        </div>
      </section>
    </main>
  );
}
