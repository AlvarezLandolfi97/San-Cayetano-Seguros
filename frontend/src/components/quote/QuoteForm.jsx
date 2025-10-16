import { useState, useMemo } from "react";
import "./QuoteForm.css";
import { VEHICLES, BRANDS, OTHER_OPTION } from "../../data/vehicles";

export default function QuoteForm() {
  const [form, setForm] = useState({
    telefono: "",
    marca: "",
    marcaOtra: "",
    modelo: "",
    modeloOtro: "",
    tipo: "",
    anio: "",
    frente: null,
    atras: null,
    derecha: null,
    izquierda: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "marca") {
      return setForm(prev => ({ ...prev, marca: value, marcaOtra: "", modelo: "", modeloOtro: "" }));
    }
    setForm(prev => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const brandIsOther = form.marca === OTHER_OPTION;
  const selectedBrandHasModels = !!VEHICLES[form.marca];
  const modelOptions = useMemo(() => selectedBrandHasModels ? VEHICLES[form.marca] : [], [form.marca, selectedBrandHasModels]);

  const onSubmit = (e) => {
    e.preventDefault();
    const brandValue = brandIsOther ? form.marcaOtra.trim() : form.marca;
    const modelValue = (form.modelo === OTHER_OPTION || !selectedBrandHasModels)
      ? form.modeloOtro.trim()
      : form.modelo;
    if (!form.telefono) return alert("Ingresá el teléfono.");
    if (!brandValue) return alert("Ingresá la marca.");
    if (!modelValue) return alert("Ingresá el modelo.");
    // integrar con backend…
    console.log({ ...form, marca: brandValue, modelo: modelValue });
    alert("Formulario listo para enviar ✅");
  };

  return (
    <section className="quote container">
      <h2 className="quote__title">Solicitá tu cotización</h2>
      <p className="quote__subtitle">
        Completá tus datos y subí las fotos del vehículo para recibir tu evaluación.
      </p>

      {/* GRID: izq (campos) | der (fotos) */}
      <form className="quote__form form-grid" onSubmit={onSubmit}>
        {/* Columna izquierda: campos */}
        <div className="form__fields">
          <div className="form__group">
            <label>Teléfono (WhatsApp)</label>
            <input
              type="tel"
              name="telefono"
              placeholder="+54 9 ..."
              value={form.telefono}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form__row">
            <div className="form__group">
              <label>Marca</label>
              <select name="marca" value={form.marca} onChange={handleChange} className="select" required>
                <option value="">Seleccionar...</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
              </select>
              {brandIsOther && (
                <input
                  type="text"
                  name="marcaOtra"
                  placeholder="Especificá la marca"
                  value={form.marcaOtra}
                  onChange={handleChange}
                  className="mt-8"
                  required
                />
              )}
            </div>

            <div className="form__group">
              <label>Modelo</label>
              {selectedBrandHasModels ? (
                <>
                  <select
                    name="modelo"
                    value={form.modelo}
                    onChange={handleChange}
                    className="select"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
                  </select>
                  {form.modelo === OTHER_OPTION && (
                    <input
                      type="text"
                      name="modeloOtro"
                      placeholder="Especificá el modelo"
                      value={form.modeloOtro}
                      onChange={handleChange}
                      className="mt-8"
                      required
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  name="modeloOtro"
                  placeholder="Especificá el modelo"
                  value={form.modeloOtro}
                  onChange={handleChange}
                  required
                />
              )}
            </div>
          </div>

          <div className="form__row">
            <div className="form__group">
              <label>Tipo</label>
              <input
                type="text"
                name="tipo"
                placeholder="Auto / Pickup / SUV / Utilitario / Moto"
                value={form.tipo}
                onChange={handleChange}
              />
            </div>
            <div className="form__group">
              <label>Año</label>
              <input
                type="number"
                name="anio"
                min="1990"
                max={new Date().getFullYear()}
                value={form.anio}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--wide">Enviar cotización</button>
        </div>

        {/* Columna derecha: fotos */}
        <aside className="form__photos-col">
          <div className="photos__card">
            <h3 className="quote__section-title">Fotos del vehículo</h3>
            <div className="form__photos">
              {[
                { key: "frente", label: "Frente", img: "/illustrations/front-car.png" },
                { key: "atras", label: "Atrás", img: "/illustrations/back-car.png" },
                { key: "derecha", label: "Lado derecho", img: "/illustrations/right-car.png" },
                { key: "izquierda", label: "Lado izquierdo", img: "/illustrations/left-car.png" },
              ].map(({ key, label, img }) => (
                <label key={key} className="photo__input">
                  <div className="photo__thumb">
                    <img src={img} alt={label} />
                  </div>
                  <input type="file" name={key} accept="image/*" onChange={handleChange} required />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="photos__hint">Consejo: tomá las fotos de día, sin flash y con el vehículo limpio.</p>
          </div>
        </aside>
      </form>
    </section>
  );
}
