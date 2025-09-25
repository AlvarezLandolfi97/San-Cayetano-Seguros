# Seguros Vehiculares – React + Django (MVP)

## Backend (Django/DRF)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
cp .env.example .env  # opcional, por defecto usa SQLite
python manage.py makemigrations accounts vehicles products inspections policies payments quotes
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_products
python manage.py runserver 0.0.0.0:8000
```

## Frontend (React/Vite)
```bash
cd frontend
cp .env.example .env
npm i
npm run dev
```

## Flujo de prueba
1. Ir a **/quote** → ver planes → subir 4 fotos → queda **Pendiente**.
2. Loguearte al **/admin** (Django) o crear una vista de admin en **/admin/inspections** del frontend → **Aprobar** inspección (elige plan).
3. Se crea **usuario** (si no existía) y **póliza PEND**.
4. Loguearte en el frontend (JWT) → ir a **Dashboard** → entrar a póliza → **Pagar** (stub).
5. Simular webhook:
   ```bash
   curl -X POST http://localhost:8000/api/payments/webhook/      -H 'Content-Type: application/json'      -d '{"payment_id":1, "mp_payment_id":"TEST123", "status":"approved"}'
   ```
6. Ver el comprobante en `backend/media/receipts/`.
