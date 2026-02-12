from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import get_settings
from app.database import engine, Base
from app.routers import rachas, atletas, jogos, presencas, pagamentos, auth, teams, profile

settings = get_settings()

Base.metadata.create_all(bind=engine)

# Cria diretório de uploads se não existe
upload_path = settings.get_upload_path()
os.makedirs(upload_path, exist_ok=True)

app = FastAPI(
    title=settings.app_name,
    description="API para gestão de rachas/peladas de futebol",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(teams.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(rachas.router, prefix="/api/v1")
app.include_router(atletas.router, prefix="/api/v1")
app.include_router(jogos.router, prefix="/api/v1")
app.include_router(presencas.router, prefix="/api/v1")
app.include_router(pagamentos.router, prefix="/api/v1")

# Servir arquivos de upload (fotos de atletas)
app.mount("/uploads", StaticFiles(directory=upload_path), name="uploads")


@app.get("/")
def root():
    return {"app": settings.app_name, "version": "1.0.0", "docs": "/docs", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
