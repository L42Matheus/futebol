# QuemJogaFC - Gestão de Rachas de Futebol

Sistema para gestão de rachas/peladas de futebol. Controle de atletas, presenças, financeiro e escalação.

## Stack

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Infra:** Docker + Docker Compose

## Início Rápido

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
venv\Scripts\activate     # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deploy de teste na Railway

Para validar o app fora do localhost, o caminho mais simples é criar primeiro um serviço
para o frontend e usar o Supabase como backend principal do MVP.

### Frontend

No serviço da Railway:

- Root directory: `frontend`
- Build: Dockerfile ou `npm ci && npm run build`
- Start: `npm run start`

Variáveis:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-anon
VITE_API_URL=
```

Se também subir o FastAPI em outro serviço, preencha:

```env
VITE_API_URL=https://sua-api.up.railway.app
```

### Backend FastAPI, opcional para teste completo

No serviço da Railway:

- Root directory: `backend`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Variáveis importantes:

```env
DEBUG=false
SECRET_KEY=troque-por-uma-chave-forte
DATABASE_URL=postgresql://...
FRONTEND_URL=https://seu-front.up.railway.app
CORS_ORIGINS=https://seu-front.up.railway.app
```

### Google/Supabase Auth

Depois que a Railway gerar a URL do frontend, cadastre no Supabase:

```txt
https://seu-front.up.railway.app/login
https://seu-front.up.railway.app/**
```

No Google Cloud, mantenha o callback do Supabase:

```txt
https://seu-projeto.supabase.co/auth/v1/callback
```

## API Endpoints

| Recurso | Endpoints |
|---------|-----------|
| Rachas | CRUD + saldo financeiro |
| Atletas | CRUD + histórico |
| Jogos | CRUD + lista de presença |
| Presenças | Confirmar/Recusar |
| Pagamentos | CRUD + aprovar/rejeitar |

## Modelo de Dados

- **Racha:** Campo (40), Society (30), Futsal (20) atletas
- **Atleta:** Posições de futebol, até 5 admins por racha
- **Pagamento:** Mensalidade, Rateio, Uniforme, Multas

## Licença

MIT
