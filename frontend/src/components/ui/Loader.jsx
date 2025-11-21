export default function Loader({ fullscreen = false, label = "Cargando..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={fullscreen ? "loader-backdrop" : ""}
      style={
        fullscreen
          ? { position: "fixed", inset: 0, background: "rgba(255,255,255,.6)", zIndex: 9999 }
          : {}
      }
    >
      <div className="loader">
        <span className="loader__spinner" />
        <span className="loader__label">{label}</span>
      </div>
    </div>
  );
}
