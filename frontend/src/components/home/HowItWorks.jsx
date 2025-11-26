import "@/styles/HowItWorks.css";

const STEPS = [
  {
    title: "Enviá tu cotización",
    desc: "Completá el formulario con datos del vehículo y fotos, y compartilo por WhatsApp.",
    image: "/steps/paso1.png",
    alt: "Persona enviando una cotización desde el celular",
  },
  {
    title: "Acordamos el plan",
    desc: "Validamos la info, elegimos el plan y generamos tu póliza con un código único.",
    image: "/steps/paso2.png",
    alt: "Agente de seguros confirmando un plan con un cliente",
  },
  {
    title: "Creá tu usuario",
    desc: "Registrate en el sitio y asociá tu póliza ingresando el código que te enviamos.",
    image: "/steps/paso3.png",
    alt: "Pantalla de registro de usuario en la plataforma",
  },
  {
    title: "Administrá todo",
    desc: "Gestioná tus pólizas y pagos desde tu cuenta: descargar comprobantes, ver estados y renovar.",
    image: "/steps/paso4.png",
    alt: "Panel con pólizas y pagos administrados online",
  },
];

export default function HowItWorks() {
  return (
    <section className="how" id="como-funciona">
      <div className="container how__inner">
        <div className="how__header">
          <h2>Cómo funciona</h2>
          <p className="how__subtitle">
            De la cotización al panel: seguí estos pasos para tener tu póliza activa y gestionarla online.
          </p>
        </div>

        <div className="how__grid">
          {STEPS.map((s, idx) => (
            <article
              key={s.title}
              className="how__card"
              style={{ "--how-bg": `url(${s.image})` }}
            >
              <div className="how__body">
                <div className="how__heading">
                  <div className="how__step">Paso {idx + 1}</div>
                  <h3 className="how__title">{s.title}</h3>
                </div>
                <p className="how__desc">{s.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
