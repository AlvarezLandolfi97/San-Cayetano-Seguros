import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import "@/styles/ContactSection.css";

const FALLBACK = {
  whatsapp: "+54 9 221 000 0000",
  email: "hola@sancayetano.com",
  address: "Av. Ejemplo 1234, La Plata, Buenos Aires",
  map_embed_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.798536911205!2d-58.381592984774424!3d-34.603738980460806!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDM2JzEzLjQiUyA1OMKwMjInNTUuNyJX!5e0!3m2!1ses!2sar!4v1700000000000",
  schedule: "Lun a Vie 9:00 a 18:00",
};

export default function ContactSection() {
  const [contact, setContact] = useState(FALLBACK);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/common/contact-info/");
        setContact({ ...FALLBACK, ...data });
      } catch {
        setContact(FALLBACK);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waLink = useMemo(
    () => `https://wa.me/${(contact.whatsapp || "").replace(/\D/g, "")}`,
    [contact.whatsapp]
  );

  return (
    <section className="contact" id="contacto">
      <div className="container contact__inner">
        <div className="contact__info">
          <h2>Contacto</h2>
          <p className="contact__subtitle">Escribinos por WhatsApp, mail o visitanos en nuestra oficina.</p>

          <ul className="contact__list">
            <li>
              <span className="contact__label">WhatsApp</span>
              <a href={waLink} target="_blank" rel="noreferrer">
                {contact.whatsapp}
              </a>
            </li>
            <li>
              <span className="contact__label">Email</span>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            <li>
              <span className="contact__label">Dirección</span>
              <span>{contact.address}</span>
            </li>
            <li>
              <span className="contact__label">Horario</span>
              <span>{contact.schedule}</span>
            </li>
          </ul>
        </div>

        <div className="contact__map" aria-label={`Mapa de ${contact.address}`}>
          <iframe
            src={contact.map_embed_url || FALLBACK.map_embed_url}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa de la oficina"
          />
        </div>
      </div>
    </section>
  );
}
