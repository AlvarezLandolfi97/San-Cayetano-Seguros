function addMonths(dateStr, months = 0) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d)) return "";
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return Infinity;
  const end = new Date(dateStr + "T00:00:00");
  end.setHours(0, 0, 0, 0);
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const diffMs = end - base;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function visibleEndDate(row) {
  return row?.client_end_date || row?.end_date || "";
}

function clampDay(year, monthIndex0, day) {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  return Math.max(1, Math.min(day, daysInMonth));
}

function isoFromYMD(y, m0, d) {
  const dd = clampDay(y, m0, d);
  const dt = new Date(y, m0, dd);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

function anchorDayFromStart(row) {
  const start = row?.start_date;
  if (!start) return null;
  const d = new Date(start + "T00:00:00");
  if (Number.isNaN(d)) return null;
  return d.getDate();
}

function nextInstallment(row) {
  if (!Array.isArray(row?.installments) || row.installments.length === 0) return null;

  const sorted = [...row.installments].sort((a, b) => {
    const da = new Date((a.due_date_real || a.due_date_display || "9999-12-31") + "T00:00:00");
    const db = new Date((b.due_date_real || b.due_date_display || "9999-12-31") + "T00:00:00");
    return da - db;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = sorted.find((inst) => {
    const d = new Date((inst.due_date_real || inst.due_date_display || "9999-12-31") + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    return d >= today;
  });

  return upcoming || sorted[0];
}

function paymentWindowFromSettings(prefWindowDays, dueDayDisplay) {
  const days = Number(prefWindowDays);
  const display = Number(dueDayDisplay);
  if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(display) || display <= 0) {
    return { start: "", end: "" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const startDay = clampDay(y, m0, display);
  const endDay = clampDay(y, m0, display + (days - 1));
  return {
    start: isoFromYMD(y, m0, startDay),
    end: isoFromYMD(y, m0, endDay),
  };
}

function paymentWindow(row, prefWindowDays, dueDayDisplay) {
  const anchorDay = anchorDayFromStart(row);
  const displayDay = Number(dueDayDisplay);
  const effectiveDisplay = Number.isFinite(displayDay) && displayDay > 0 ? displayDay : anchorDay;
  const inst = nextInstallment(row);
  const instStart = inst?.payment_window_start || "";
  const instEnd = inst?.payment_window_end || inst?.due_date_display || "";
  const instRealEnd = inst?.due_date_real || instEnd || "";
  if (instStart && (instEnd || instRealEnd)) return { start: instStart, end: instEnd, realEnd: instRealEnd };
  const explicit = {
    start: row?.payment_start_date || "",
    end: row?.payment_end_date || "",
    realEnd: row?.real_end_date || row?.end_date || "",
  };
  if (explicit.start && explicit.end) return explicit;
  const fromSettings = paymentWindowFromSettings(prefWindowDays ?? row?.payment_window_days, effectiveDisplay);
  if (fromSettings.start && fromSettings.end) return fromSettings;
  const days = Number(prefWindowDays ?? row?.payment_window_days);
  if (Number.isFinite(anchorDay) && Number.isFinite(days) && days > 0) {
    const start = row?.start_date || "";
    if (start) {
      const startDate = new Date(start + "T00:00:00");
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);
      return {
        start: start,
        end: endDate.toISOString().slice(0, 10),
        realEnd: endDate.toISOString().slice(0, 10),
      };
    }
  }
  return { start: row?.start_date || "", end: row?.end_date || "", realEnd: row?.real_end_date || row?.end_date || "" };
}

function isPolicyExpiringAfterWindow(row, paymentWindowDays, dueDayDisplay, expiringMaxDays = 30) {
  if (!row) return false;
  const window = paymentWindow(row, paymentWindowDays, dueDayDisplay);
  const payEnd = window.end;
  const paymentEndDiff = daysUntil(payEnd);
  const windowEnded = Number.isFinite(paymentEndDiff) && paymentEndDiff < 0;
  const realEndDiff = daysUntil(row.real_end_date || row.end_date);
  return (
    row.status === "active" &&
    !row.has_paid_in_window &&
    windowEnded &&
    realEndDiff >= 0 &&
    realEndDiff <= (Number.isFinite(expiringMaxDays) ? expiringMaxDays : 30)
  );
}

export {
  addMonths,
  daysUntil,
  visibleEndDate,
  paymentWindow,
  isPolicyExpiringAfterWindow,
  nextInstallment,
};
