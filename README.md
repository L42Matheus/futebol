# QuemJoga - Gestão de Rachas de Futebol

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
