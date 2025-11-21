export default function Sidebar({ active, setActive }) {
  return (
    <aside className="sidebar">
      <h2>Mi cuenta</h2>
      <ul>
        <li className={active === "summary" ? "active" : ""} onClick={() => setActive("summary")}>
          Resumen
        </li>
        <li className={active === "profile" ? "active" : ""} onClick={() => setActive("profile")}>
          Mi perfil
        </li>
        <li className={active === "policies" ? "active" : ""} onClick={() => setActive("policies")}>
          Mis seguros
        </li>
        <li className={active === "payments" ? "active" : ""} onClick={() => setActive("payments")}>
          Pagos
        </li>
        <li onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
          Cerrar sesión
        </li>
      </ul>
    </aside>
  );
}
