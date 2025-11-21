import React, { useMemo } from "react";
import "./ReceiptTicket.css";

/**
 * Props esperadas:
 * - receipt: {
 *     id, date, amount, concept, method, auth_code,
 *     next_due // yyyy-mm-dd ó Date
 *   }
 * - policy:  { number, product, plate }
 * - detail:  { vehicle:{ make, model, version, year }, currency? }
 */
export default function ReceiptTicket({ receipt = {}, policy = {}, detail = {} }) {
  // ========================= Helpers =========================
  const currency = detail?.currency || "PESOS";

  const formatAmount = (n) =>
    typeof n === "number"
      ? n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "—";

  const vehStr = useMemo(() => {
    const v = detail?.vehicle || {};
    const s = [v.make, v.model, v.version].filter(Boolean).join(" ");
    return (s || "—").toUpperCase();
  }, [detail?.vehicle]);

  const dateFmt = useMemo(() => {
    if (!receipt?.date) return "—";
    const d = new Date(receipt.date);
    if (isNaN(d)) return String(receipt.date).toUpperCase();
    return d
      .toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })
      .toUpperCase();
  }, [receipt?.date]);

  // Próximo vencimiento (cajitas DD / MM / YY)
  const nextDueBoxes = useMemo(() => {
    if (!receipt?.next_due) return ["", "", ""];
    const d = new Date(receipt.next_due);
    if (isNaN(d)) return ["", "", ""];
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return [dd, mm, yy];
  }, [receipt?.next_due]);

  const amountFmt = formatAmount(receipt?.amount);
  const methodLabel = (receipt?.method || "EFECTIVO").toUpperCase();
  const totalFmt = amountFmt; // en este layout, TOTAL == amount

  // ===========================================================

  return (
    <div className="rtkt">
      {/* Cabecera */}
      <div className="rtkt__head">
        <div className="rtkt__brand">
          {/* Si querés logo real: <img src="/logo.png" alt="San Cayetano" className="rtkt__logoImg" /> */}
          <div className="rtkt__logo">San Cayetano</div>
          <div className="rtkt__brandSub">SEGUROS GENERALES</div>
        </div>

        <div className="rtkt__clientBox">
          <div className="rtkt__clientRow">
            <span>CLIENTE Nº</span>
            <strong>{policy?.plate || "—"}</strong>
          </div>
          <div className="rtkt__nextDue">
            <span>PRÓXIMO VENCIMIENTO DE PAGO</span>
            <div className="rtkt__nextDueBoxes">
              <span>{nextDueBoxes[0]}</span>
              <span>{nextDueBoxes[1]}</span>
              <span>{nextDueBoxes[2]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Productor */}
      <div className="rtkt__producerRow">
        <strong>
          PRODUCTOR - ASESOR DE SEGUROS - DIAGONAL LOS POETAS 389 (BOSQUES) FCIO. VARELA
        </strong>
        <strong>11-6033-0747</strong>
      </div>

      {/* Identificación fiscal */}
      <div className="rtkt__idRow">
        <div className="rtkt__idCol">
          <div>
            <strong>C.U.I.T.</strong> <span>27-21672285-5</span>
          </div>
          <div>
            <strong>Ing. Btos.</strong> <span>27-21672285-5</span>
          </div>
          <div>
            <strong>Inicio de Actividades:</strong> <span>26/04/99</span>
          </div>
          <div className="rtkt__email">antoniosancayetano@hotmail.com</div>
        </div>
        <div className="rtkt__coverage">
          <div className="rtkt__coverageTitle">COBERTURA EN</div>
          <div className="rtkt__coverageList">
            AUTOMOTORES · MOTOS · CASAS
            <br />
            ACCIDENTES PERSONALES · LOCALES · CARTELES
          </div>
        </div>
      </div>

      {/* Medio de pago */}
      <div className="rtkt__payMethod">{methodLabel}</div>

      {/* Fecha + líneas vacías estilo formulario */}
      <div className="rtkt__dateLine">
        <strong>FECHA</strong>&nbsp; {dateFmt}
      </div>
      <div className="rtkt__emptyLine"></div>
      <div className="rtkt__emptyLine"></div>

      {/* Leyenda */}
      <div className="rtkt__legend">
        DICHO IMPORTE SE IMPUTARÁ AL PAGO DE LA PÓLIZA CORRESPONDIENTE / RECIBO POR CUENTA Y
        ORDEN DE TERCEROS
      </div>

      {/* Tabla principal, adaptada al ejemplo */}
      <table className="rtkt__table">
        <tbody>
          <tr>
            <th>Compañía</th>
            <td colSpan={3}>SAN CAYETANO</td>
          </tr>

          <tr>
            <th>Póliza</th>
            <td className="rtkt__amountCell">
              {amountFmt} {currency}
            </td>
            <th>Vehículo</th>
            <td>{vehStr}</td>
          </tr>

          <tr>
            <th>Patente</th>
            <td>{policy?.plate || "—"}</td>
            <th>Cuota</th>
            <td>{receipt?.concept || "—"}</td>
          </tr>

          <tr>
            <th>Tipo de Moneda</th>
            <td>{currency}</td>
            <th>Nº Póliza</th>
            <td>{policy?.number || "—"}</td>
          </tr>

          <tr>
            <td colSpan={3} className="rtkt__vehFooter">
              {[
                detail?.vehicle?.make,
                detail?.vehicle?.model,
                detail?.vehicle?.version,
                detail?.vehicle?.year,
              ]
                .filter(Boolean)
                .join(" ")
                .toUpperCase() || " "}
            </td>
            <td className="rtkt__totalCell">
              <div>
                <strong>TOTAL</strong>
              </div>
              <div className="rtkt__totalVal">$ {totalFmt}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Pie con datos extras/foliado (opcional) */}
      <div className="rtkt__foot">
        <div>{policy?.plate || ""}</div>
        <div>{policy?.number || ""}</div>
        <div>{policy?.product || ""}</div>
      </div>

      {/* Sello PAGADO (se oculta si explicitamente viene paid === false) */}
      {receipt?.paid !== false && (
        <div className="rtkt__stamp">
          <span>PAGADO</span>
        </div>
      )}

      {/* Código / autorización (si existiera) */}
      {receipt?.auth_code && (
        <div className="rtkt__auth">Código de autorización: {receipt.auth_code}</div>
      )}
    </div>
  );
}
