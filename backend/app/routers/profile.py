from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
import os
import uuid
import shutil
import logging
from datetime import datetime

from app.database import get_db
from app.models import AthleteProfile, User, Atleta
from app.schemas.athlete_profile import AthleteProfileUpdate, AthleteProfileResponse
from app.services.auth import get_current_user
from app.config import get_settings
from app.utils.file_upload import ALLOWED_IMAGE_EXTENSIONS, validate_image_mime

router = APIRouter(prefix="/profile", tags=["Profile"])
settings = get_settings()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS


def get_upload_dir():
    upload_path = settings.get_upload_path()
    os.makedirs(upload_path, exist_ok=True)
    return upload_path


def get_or_create_profile(db: Session, user: User) -> AthleteProfile:
    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user.id).first()
    if not profile:
        profile = AthleteProfile(user_id=user.id, nome=user.nome, telefone=user.telefone)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _enum_text(value):
    if value is None or value == "":
        return None
    return str(getattr(value, "value", value)).lower()


def _resolve_enum_label(db: Session, table_name: str, column_name: str, value) -> str | None:
    normalized = _enum_text(value)
    if not normalized:
        return None

    row = db.execute(
        text(
            """
            SELECT udt_name
            FROM information_schema.columns
            WHERE table_name = :table_name AND column_name = :column_name
            LIMIT 1
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).mappings().first()
    udt_name = row["udt_name"] if row else None
    if not udt_name:
        return normalized

    labels = [
        item[0]
        for item in db.execute(
            text(
                """
                SELECT e.enumlabel
                FROM pg_type t
                JOIN pg_enum e ON e.enumtypid = t.oid
                WHERE t.typname = :type_name
                """
            ),
            {"type_name": udt_name},
        ).all()
    ]
    if normalized in labels:
        return normalized
    upper = normalized.upper()
    if upper in labels:
        return upper
    return normalized


def _profile_response(row, user: User) -> AthleteProfileResponse:
    data = dict(row or {})
    return AthleteProfileResponse(
        id=data.get("id") or 0,
        user_id=data.get("user_id") or user.id,
        nome=data.get("nome") or user.nome,
        apelido=data.get("apelido"),
        telefone=data.get("telefone") or user.telefone,
        posicao=_enum_text(data.get("posicao")),
        perna_boa=_enum_text(data.get("perna_boa")),
        numero_camisa=data.get("numero_camisa"),
        foto_url=data.get("foto_url"),
        created_at=data.get("created_at") or user.created_at or datetime.utcnow(),
        updated_at=data.get("updated_at"),
    )


def sync_atleta_foto(db: Session, user: User, foto_url: str | None):
    atletas = db.query(Atleta).filter(Atleta.user_id == user.id, Atleta.ativo.is_(True)).all()
    for atleta in atletas:
        atleta.foto_url = foto_url
    db.commit()


@router.get("/me", response_model=AthleteProfileResponse)
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        profile = get_or_create_profile(db, current_user)
        return AthleteProfileResponse.model_validate(profile)
    except SQLAlchemyError:
        logger.exception("Falha ao carregar perfil do usuário %s", current_user.id)
        db.rollback()
        return {
            "id": 0,
            "user_id": current_user.id,
            "nome": current_user.nome,
            "telefone": current_user.telefone,
            "created_at": current_user.created_at,
        }


@router.patch("/me", response_model=AthleteProfileResponse)
def update_me(payload: AthleteProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    values = {
        "user_id": current_user.id,
        "nome": data.get("nome"),
        "apelido": data.get("apelido"),
        "telefone": data.get("telefone"),
        "posicao": _resolve_enum_label(db, "athlete_profiles", "posicao", data.get("posicao")),
        "perna_boa": _resolve_enum_label(db, "athlete_profiles", "perna_boa", data.get("perna_boa")),
        "numero_camisa": data.get("numero_camisa"),
        "foto_url": data.get("foto_url"),
    }
    try:
        existing = db.execute(
            text("SELECT id FROM athlete_profiles WHERE user_id = :user_id LIMIT 1"),
            {"user_id": current_user.id},
        ).mappings().first()

        if existing:
            row = db.execute(
                text(
                    """
                    UPDATE athlete_profiles
                    SET nome = COALESCE(:nome, nome),
                        apelido = :apelido,
                        telefone = COALESCE(:telefone, telefone),
                        posicao = :posicao,
                        perna_boa = :perna_boa,
                        numero_camisa = :numero_camisa,
                        foto_url = COALESCE(:foto_url, foto_url),
                        updated_at = now()
                    WHERE id = :profile_id
                    RETURNING
                        id, user_id, nome, apelido, telefone, posicao::text AS posicao,
                        perna_boa::text AS perna_boa, numero_camisa, foto_url,
                        created_at, updated_at
                    """
                ),
                {**values, "profile_id": existing["id"]},
            ).mappings().first()
        else:
            row = db.execute(
                text(
                    """
                    INSERT INTO athlete_profiles (
                        user_id, nome, apelido, telefone, posicao, perna_boa,
                        numero_camisa, foto_url, updated_at
                    )
                    VALUES (
                        :user_id, :nome, :apelido, :telefone, :posicao, :perna_boa,
                        :numero_camisa, :foto_url, now()
                    )
                    RETURNING
                        id, user_id, nome, apelido, telefone, posicao::text AS posicao,
                        perna_boa::text AS perna_boa, numero_camisa, foto_url,
                        created_at, updated_at
                    """
                ),
                values,
            ).mappings().first()

        db.execute(
            text(
                """
                UPDATE users
                SET nome = COALESCE(:nome, nome),
                    telefone = COALESCE(:telefone, telefone)
                WHERE id = :user_id
                """
            ),
            values,
        )
        db.commit()
        return _profile_response(row, current_user)
    except SQLAlchemyError:
        logger.exception("Falha ao salvar perfil do usuário %s", current_user.id)
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar perfil")


@router.post("/me/foto", response_model=AthleteProfileResponse)
def upload_foto(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = get_or_create_profile(db, current_user)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extensão não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    file_bytes = file.file.read()
    file.file.seek(0)

    if len(file_bytes) > settings.max_upload_size:
        raise HTTPException(status_code=400, detail="Arquivo muito grande")

    if not validate_image_mime(file_bytes, ext):
        raise HTTPException(status_code=400, detail="Conteúdo do arquivo não corresponde à extensão declarada.")

    upload_dir = os.path.join(get_upload_dir(), "profiles")
    os.makedirs(upload_dir, exist_ok=True)

    if profile.foto_url:
        old_path = os.path.join(settings.get_upload_path(), profile.foto_url.lstrip('/'))
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(file_bytes)

    profile.foto_url = f"/uploads/profiles/{filename}"
    db.commit()
    db.refresh(profile)
    sync_atleta_foto(db, current_user, profile.foto_url)
    return AthleteProfileResponse.model_validate(profile)


@router.delete("/me/foto", response_model=AthleteProfileResponse)
def delete_foto(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_profile(db, current_user)
    if profile.foto_url:
        filepath = os.path.join(settings.get_upload_path(), profile.foto_url.lstrip('/'))
        if os.path.exists(filepath):
            os.remove(filepath)
        profile.foto_url = None
        db.commit()
        db.refresh(profile)
        sync_atleta_foto(db, current_user, None)
    return AthleteProfileResponse.model_validate(profile)
