import os
from django.conf import settings
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

def generate_receipt_pdf(payment):
    receipts_dir = os.path.join(settings.MEDIA_ROOT, 'receipts')
    os.makedirs(receipts_dir, exist_ok=True)
    filename = f"receipt_{payment.id}.pdf"
    filepath = os.path.join(receipts_dir, filename)

    c = canvas.Canvas(filepath, pagesize=A4)
    text = c.beginText(40, 800)
    text.textLine("Comprobante de pago — Aseguradora")
    text.textLine("")
    text.textLine(f"Póliza: {payment.policy.number}")
    text.textLine(f"Patente: {payment.policy.license_plate}")
    text.textLine(f"Periodo: {payment.period}")
    text.textLine(f"Importe: ${payment.amount}")
    text.textLine(f"MP Payment ID: {payment.mp_payment_id}")
    c.drawText(text)
    c.showPage()
    c.save()

    return f"receipts/{filename}"
