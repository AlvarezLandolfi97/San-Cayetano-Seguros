// Mock editable (hasta que consumamos /api/products de B).
const plansMock = [
  {
    id: "terceros",
    name: "Terceros",
    tagline: "Responsabilidad Civil (RC)",
    coverages: [
      "Daños a terceros (personas y bienes)",
      "Cobertura obligatoria"
    ],
    badges: ["Legal básico"],
    featured: false,
  },
  {
    id: "terceros-danio-total",
    name: "Terceros Daño Total",
    tagline: "RC + pérdida total",
    coverages: [
      "Responsabilidad civil",
      "Pérdida total por accidente, incendio o robo"
    ],
    badges: ["Popular"],
    featured: true
  },
  {
    id: "terceros-completo",
    name: "Terceros Completo",
    tagline: "RC + daños parciales",
    coverages: [
      "Pérdida total y parcial por accidente, incendio, robo o hurto",
      "Daños parciales por granizo, choque e intento de robo"
    ],
    badges: ["Recomendado"],
    featured: true
  },
  {
    id: "todo-riesgo",
    name: "Todo Riesgo",
    tagline: "Cobertura total (con/sin franquicia)",
    coverages: [
      "RC + pérdida total y parcial",
      "Cristales y parabrisas (según franquicia)"
    ],
    badges: ["Premium"],
    featured: false
  }
];

export default plansMock;
