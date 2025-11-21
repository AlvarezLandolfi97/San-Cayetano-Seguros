import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/ui/Navbar";
import Footer from "./components/ui/Footer";

function Home() {
  return (
    <section className="section container">
      <h1>Bienvenido a San Cayetano</h1>
      <p>Elegí el plan ideal para tu vehículo.</p>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quote" element={<div className="section container"><h1>Cotizador</h1></div>} />
          <Route path="/plans" element={<div className="section container"><h1>Planes</h1></div>} />
          <Route path="/how-it-works" element={<div className="section container"><h1>Cómo funciona</h1></div>} />
          <Route path="/dashboard" element={<div className="section container"><h1>Mi cuenta</h1></div>} />
          <Route path="/login" element={<div className="section container"><h1>Ingresar</h1></div>} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
