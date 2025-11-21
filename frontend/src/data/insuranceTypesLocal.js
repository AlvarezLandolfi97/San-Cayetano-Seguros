// Planes base para cuando el backend no responde o no existe el endpoint.
export const INSURANCE_TYPES_LOCAL = [
  {
    id: "A",
    code: "Plan A",
    name: "Responsabilidad Civil (RC)",
    subtitle: "",
    bullets: [
      "Responsabilidad civil para terceros por lesiones, muerte y daños materiales.",
    ],
    cta: "Cotizar este plan",
  },
  {
    id: "B",
    code: "Plan B",
    name: "Auto Total",
    subtitle: "Responsabilidad civil + coberturas totales",
    bullets: [
      "Responsabilidad civil",
      "Pérdida total por accidente, incendio y robo o hurto",
    ],
    cta: "Cotizar este plan",
  },
  {
    id: "D",
    code: "Plan D",
    name: "Todo Riesgo",
    subtitle: "",
    bullets: [
      "Responsabilidad civil",
      "Pérdida total y parcial por accidente, incendio y robo o hurto",
      "Modalidades: sin franquicia o con franquicia variable",
    ],
    cta: "Cotizar este plan",
  },
  {
    id: "P",
    code: "Plan P",
    name: "Mega Premium",
    subtitle: "",
    bullets: [
      "Responsabilidad civil",
      "Pérdida total por accidente y total/parcial por incendio y robo o hurto",
      "Daños parciales por granizo, cristales, cerraduras, cubiertas, antena, intento de robo",
      "Reposición a nuevo (según condiciones) y equipos de GNC sin descuento por antigüedad",
      "Accidentes personales para titular y ocupantes",
    ],
    cta: "Cotizar este plan",
  },
];
