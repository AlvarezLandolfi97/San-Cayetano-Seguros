# payments/utils.py
import os
from io import BytesIO
from datetime import datetime

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import red

from pypdf import PdfReader, PdfWriter


# Plantilla PDF (relativa a BASE_DIR). Cambiable por env.
TEMPLATE_PDF_REL = os.getenv("RECEIPT_TEMPLATE_PDF", "static/receipts/COMPROBANTE.pdf")


# ====================== Helpers de posicionamiento ============================
def _y_from_top(height, top_mm: float) -> float:
    """Convierte milímetros desde el borde superior a coordenada Y (origen abajo-izq)."""
    return height - (top_mm * mm)

def _draw_grid(c, width, height, step_mm=10):
    """Grilla de calibración cada N mm (activar con RECEIPT_DEBUG_GRID=true)."""
    c.saveState()
    c.setFont("Helvetica", 6)
    c.setFillColorRGB(0.65, 0.65, 0.65)
    # verticales
    x = 0
    while x <= width:
        c.line(x, 0, x, height)
        c.drawString(x + 1, height - 8, f"{int(x/mm)}")
        x += step_mm * mm
    # horizontales
    y = 0
    while y <= height:
        c.line(0, y, width, y)
        c.drawString(1, y + 1, f"{int(y/mm)}")
        y += step_mm * mm
    c.restoreState()

# Posiciones iniciales (mm desde izquierda, mm desde arriba)
# Ajustalas si querés que caiga 1:1; con la grilla es muy rápido calibrar.
POS = {
    # Encabezado
    "fecha":        (18,  95),   # "FECHA dd/mm/aaaa"
    "cliente":      (35, 103),   # Nombre sobre línea "Recibimos ..."
    "cantidad_val": (35, 111),   # Solo el valor + moneda (la plantilla ya dice "La cantidad")

    # Tabla (valores columna derecha)
    "compania": (72, 132),
    "poliza":   (72, 138),
    "vehiculo": (72, 144),
    "patente":  (72, 150),
    "periodo":  (72, 156),
    "moneda":   (72, 162),

    # Total (solo el número, alineado a derecha dentro de la celda)
    "total_right":  (188, 162),

    # Forma de pago (alineado a derecha, un poco más a la izquierda para evitar corte)
    "metodo_right": (168, 70),
}

def _draw_text(c, width, height, key, text, *, right=False, font="Helvetica", size=10):
    x_mm, top_mm = POS[key]
    x = x_mm * mm
    y = _y_from_top(height, top_mm)
    c.setFont(font, size)
    if right:
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)
# ============================================================================


def _draw_overlay(c, payment, width, height):
    """
    Dibuja los textos sobre el canvas del mismo tamaño que la plantilla PDF.
    Origen (0,0) = abajo-izquierda; POS usa mm desde arriba/izquierda.
    """
    # ---- Datos (adaptá nombres si difieren) ----------------------------------
    policy   = getattr(payment, "policy", None)
    poliza   = getattr(policy, "number", "")
    patente  = getattr(policy, "license_plate", "")
    vehiculo = getattr(policy, "vehicle_display", "")
    cliente  = getattr(getattr(policy, "holder", None), "full_name",
                       getattr(payment, "payer_name", ""))

    periodo  = getattr(payment, "period", "")
    moneda   = getattr(payment, "currency", "PESOS")
    total    = float(getattr(payment, "amount", 0.0))
    metodo   = getattr(payment, "method", "EFECTIVO")
    mp_id    = getattr(payment, "mp_payment_id", "")
    fecha    = getattr(payment, "created_at", datetime.now())

    total_fmt = f"{total:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    fecha_str = fecha.strftime("%d/%m/%Y")

    # ---- Grilla de calibración (opcional) ------------------------------------
    if str(os.getenv("RECEIPT_DEBUG_GRID", "")).lower() in ("1", "true", "yes", "y", "on"):
        _draw_grid(c, width, height)

    # ---- Encabezado -----------------------------------------------------------
    _draw_text(c, width, height, "fecha",   f"FECHA {fecha_str}")
    _draw_text(c, width, height, "cliente", (cliente or "").upper())
    # Solo el valor + moneda para no duplicar el rótulo de la plantilla
    _draw_text(c, width, height, "cantidad_val", f"{total_fmt} {moneda}")

    # ---- Tabla ----------------------------------------------------------------
    _draw_text(c, width, height, "compania", getattr(policy, "company_name", ""))
    _draw_text(c, width, height, "poliza",   str(poliza))
    _draw_text(c, width, height, "vehiculo", str(vehiculo))
    _draw_text(c, width, height, "patente",  str(patente))
    _draw_text(c, width, height, "periodo",  str(periodo))
    _draw_text(c, width, height, "moneda",   str(moneda))

    # ---- Total (solo número, a la derecha) -----------------------------------
    _draw_text(c, width, height, "total_right", f"{total_fmt}", right=True, font="Helvetica-Bold", size=12)

    # ---- Forma de pago (a la derecha, sin cortar) ----------------------------
    _draw_text(c, width, height, "metodo_right", str(metodo).upper(), right=True, font="Helvetica-Bold", size=11)

    # ---- Sello PAGADO ---------------------------------------------------------
    status = str(getattr(payment, "status", "")).upper()
    if status in ("APPROVED", "PAID", "PAGADO"):
        c.saveState()
        c.setFillColor(red)
        c.setFont("Helvetica-Bold", 26)
        c.translate(52*mm, 38*mm)  # movelo si querés otra ubicación
        c.rotate(-15)
        c.drawString(0, 0, "PAGADO")
        c.restoreState()

    # ---- MP ID (abajo derecha chiquito) --------------------------------------
    if mp_id:
        c.setFont("Helvetica", 8)
        c.drawRightString(width - 14*mm, 14*mm, f"MP ID: {mp_id}")


def generate_receipt_pdf(payment, template_pdf_rel: str = TEMPLATE_PDF_REL) -> str:
    """
    Funde la plantilla PDF (fondo) con un overlay de datos (ReportLab).
    Guarda en MEDIA/receipts/YYYY/MM/receipt_<payment.id>.pdf
    y devuelve la ruta relativa dentro del storage.
    """
    template_abs = os.path.join(settings.BASE_DIR, template_pdf_rel)

    # 1) Tamaño desde la plantilla
    reader = None
    if os.path.exists(template_abs):
        reader = PdfReader(template_abs)
        page = reader.pages[0]
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
    else:
        # Fallback: A4 (puntos)
        width, height = 595.275590551, 841.88976378

    # 2) Crear overlay en memoria
    overlay_buf = BytesIO()
    c = canvas.Canvas(overlay_buf, pagesize=(width, height))
    if not reader:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(20*mm, height - 20*mm, "Comprobante de pago — San Cayetano")
    _draw_overlay(c, payment, width, height)
    c.save()
    overlay_buf.seek(0)

    # 3) Fusionar overlay + plantilla
    writer = PdfWriter()
    if reader:
        base_page = reader.pages[0]
        overlay_reader = PdfReader(overlay_buf)
        overlay_page = overlay_reader.pages[0]
        base_page.merge_page(overlay_page)  # dibuja overlay arriba de la base
        writer.add_page(base_page)
    else:
        only_overlay_reader = PdfReader(overlay_buf)
        writer.add_page(only_overlay_reader.pages[0])

    # 4) Guardar en MEDIA
    out_buf = BytesIO()
    writer.write(out_buf)
    out_buf.seek(0)

    rel_path = f"receipts/{datetime.now():%Y/%m}/receipt_{getattr(payment, 'id', 'tmp')}.pdf"
    return default_storage.save(rel_path, ContentFile(out_buf.getvalue()))
