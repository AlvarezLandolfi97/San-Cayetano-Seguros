import React from "react";
import Hero from "../components/Hero";

export default function Home() {
  return (
    <>
      <Hero
        companyName="San Cayetano"
        quoteHref="/quote"
        whatsapp="+54 9 221 000 0000"
      />
      {/* …resto del contenido de Home… */}
    </>
  );
}
