# QuemJogaFC - Gestão de Rachas de Futebol

Sistema para gestão de rachas/peladas de futebol. Controle de atletas, presenças, financeiro e escalação.

## Stack

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Auth:** próprio no FastAPI (JWT + bcrypt + Google OAuth)
- **Infra:** Railway (Postgres + API + frontend)

## Início Rápido (local)

```bash
# Clone o repositório
git clone https://github.com/L42Matheus/futebol.git
cd futebol

# Suba os containers
docker-compose up -d

# Acesse:
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

## Desenvolvimento Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Deploy no Railway

Três serviços no mesmo projeto do Railway: **Postgres**, **backend** e **frontend**.

### 1. Postgres

Adicione o plugin **PostgreSQL** no projeto. O Railway expõe a connection string em
`DATABASE_URL` dentro do mesmo projeto — basta referenciar no backend.

### 2. Backend FastAPI

- Root directory: `backend`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Variáveis:

```env
DEBUG=false
SECRET_KEY=<gere-uma-chave-forte>
DATABASE_URL=${{Postgres.DATABASE_URL}}

PAYMENTS_ENABLED=false

FRONTEND_URL=https://seu-front.up.railway.app
CORS_ORIGINS=https://seu-front.up.railway.app

# Google OAuth (console.cloud.google.com → OAuth client ID "Web application")
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Gmail SMTP (gere um App Password em myaccount.google.com/apppasswords)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=seu-email@gmail.com
SMTP_PASSWORD=<app-password-de-16-chars>
SMTP_FROM_EMAIL=seu-email@gmail.com
SMTP_USE_TLS=true
```

### 3. Frontend

- Root directory: `frontend`
- Build: Dockerfile ou `npm ci && npm run build`
- Start: `npm run start`
- Public Networking port: `3000`

Variáveis:

```env
VITE_API_URL=https://sua-api.up.railway.app
VITE_PAYMENTS_ENABLED=false
```

### Google OAuth — URIs autorizadas

No Google Cloud Console → OAuth client ID → **Authorized redirect URIs**, adicione:

```
http://localhost:3000/login
https://seu-front.up.railway.app/login
```

E em **Authorized JavaScript origins**:

```
http://localhost:3000
https://seu-front.up.railway.app
```

## API Endpoints

| Recurso | Endpoints |
|---------|-----------|
| Auth | login/register, Google OAuth, reset de senha |
| Rachas | CRUD + saldo financeiro |
| Atletas | CRUD + histórico |
| Jogos | CRUD + lista de presença |
| Presenças | Confirmar/Recusar |
| Pagamentos | CRUD + aprovar/rejeitar (desligado em modo teste) |

## Modelo de Dados

- **Racha:** Campo (40), Society (30), Futsal (20) atletas
- **Atleta:** Posições de futebol, até 5 admins por racha
- **Pagamento:** Mensalidade, Rateio, Uniforme, Multas

## Licença

MIT
