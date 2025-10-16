import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import PlanCard from "./PlanCard";
import "./PlansCarousel.css";

export default function PlansCarousel() {
  const plans = [
    {
      id: 1,
      name: "Terceros",
      subtitle: "Responsabilidad Civil (RC)",
      tag: "Legal básico",
      features: ["Daños a terceros (personas y bienes)", "Cobertura obligatoria"],
    },
    {
      id: 2,
      name: "Terceros Daño Total",
      subtitle: "RC + pérdida total",
      tag: "Popular",
      features: ["Responsabilidad civil", "Pérdida total por accidente, incendio o robo"],
    },
    {
      id: 3,
      name: "Terceros Completo",
      subtitle: "RC + daños parciales",
      tag: "Recomendado",
      features: [
        "Pérdida total y parcial por accidente, incendio, robo o hurto",
        "Daños parciales por granizo, choque o intento de robo",
      ],
    },
    {
      id: 4,
      name: "Todo Riesgo",
      subtitle: "Cobertura total (con/sin franquicia)",
      tag: "Premium",
      features: ["RC + pérdida total y parcial", "Rayones, golpes y parabrisas (según franquicia)"],
    },
  ];

  return (
    <section className="plans-section" id="plans">
      <div className="container plans-head">
        <h2 className="plans-title">Planes de cobertura</h2>
        <p className="plans-subtitle">
          Elegí el plan que mejor se adapte a tu vehículo y forma de uso.
        </p>
      </div>

      <Swiper
        modules={[Navigation, Pagination, A11y, Autoplay]}
        spaceBetween={24}
        loop={true}
        navigation
        pagination={{ clickable: true }}
        autoplay={{
          delay: 6000,
          pauseOnMouseEnter: true,
          disableOnInteraction: false,
        }}
        breakpoints={{
          0: { slidesPerView: 1 },
          700: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
        className="plans-swiper"
      >
        {plans.map((plan) => (
          <SwiperSlide key={plan.id}>
            <PlanCard {...plan} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
