from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid
import shutil

from app.database import get_db
from app.models import AthleteProfile, User, Atleta
from app.schemas.athlete_profile import AthleteProfileUpdate, AthleteProfileResponse
from app.services.auth import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/profile", tags=["Profile"])
settings = get_settings()

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}


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


def sync_atleta_foto(db: Session, user: User, foto_url: str | None):
    atletas = db.query(Atleta).filter(Atleta.user_id == user.id, Atleta.ativo == True).all()
    for atleta in atletas:
        atleta.foto_url = foto_url
    db.commit()


@router.get("/me", response_model=AthleteProfileResponse)
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_profile(db, current_user)
    return AthleteProfileResponse.model_validate(profile)


@router.patch("/me", response_model=AthleteProfileResponse)
def update_me(payload: AthleteProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = get_or_create_profile(db, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return AthleteProfileResponse.model_validate(profile)


@router.post("/me/foto", response_model=AthleteProfileResponse)
def upload_foto(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = get_or_create_profile(db, current_user)
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extensão não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > settings.max_upload_size:
        raise HTTPException(status_code=400, detail="Arquivo muito grande")

    upload_dir = os.path.join(get_upload_dir(), "profiles")
    os.makedirs(upload_dir, exist_ok=True)

    if profile.foto_url:
        old_path = os.path.join(settings.get_upload_path(), profile.foto_url.lstrip('/'))
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

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
