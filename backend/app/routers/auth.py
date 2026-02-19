from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
import uuid

from app.database import get_db
from app.models import User, Atleta, Invite, InviteStatus, PushToken, InviteRole, TeamMember, Team, UserRole, RachaAdmin, AthleteProfile
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    GoogleAuthRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.invite import InviteCreate, InviteResponse, InviteAccept
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    get_current_user,
)
from app.services.google_auth import exchange_code_for_tokens, get_google_user_info, get_google_auth_url
from app.services.email_service import send_password_reset_email
from app.deps import verificar_admin_racha
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Converte strings vazias para None
    email = user_in.email.strip() if user_in.email else None
    telefone = user_in.telefone.strip() if user_in.telefone else None
    email = email or None  # Converte "" para None
    telefone = telefone or None  # Converte "" para None

    filters = []
    if email:
        filters.append(User.email == email)
    if telefone:
        filters.append(User.telefone == telefone)
    existing = db.query(User).filter(or_(*filters)).first() if filters else None
    if existing:
        raise HTTPException(status_code=400, detail="Usuário já existe")

    user = User(
        nome=user_in.nome,
        email=email,
        telefone=telefone,
        senha_hash=hash_password(user_in.senha),
        role=user_in.role,
        ativo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Cria perfil básico para atleta sem convite
    if user_in.role == UserRole.ATLETA:
        from app.models import AthleteProfile
        profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user.id).first()
        if not profile:
            db.add(AthleteProfile(user_id=user.id, nome=user.nome, telefone=user.telefone))
            db.commit()

    if user_in.invite_token:
        invite = db.query(Invite).filter(Invite.token == user_in.invite_token).first()
        if invite and invite.status == InviteStatus.PENDENTE:
            if invite.role == InviteRole.ADMIN:
                # Convite de admin: cria RachaAdmin
                racha_admin = RachaAdmin(
                    user_id=user.id,
                    racha_id=invite.racha_id,
                    is_owner=False,
                    ativo=True,
                )
                db.add(racha_admin)
            else:
                # Convite de atleta: cria Atleta
                profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user.id).first()
                atleta = Atleta(
                    user_id=user.id,
                    racha_id=invite.racha_id,
                    nome=invite.nome or user.nome or "Atleta",
                    telefone=invite.telefone or user.telefone,
                    ativo=True,
                    foto_url=profile.foto_url if profile else None,
                )
                db.add(atleta)
                db.flush()
                if invite.team_id:
                    db.add(TeamMember(team_id=invite.team_id, atleta_id=atleta.id, ativo=True))
            invite.status = InviteStatus.ACEITO
            invite.aceito_em = datetime.utcnow()
            db.commit()
    # Atleta pode criar conta sem convite, mas não terá racha até aceitar convite

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(User.email == payload.identificador, User.telefone == payload.identificador)
    ).first()
    if not user or not verify_password(payload.senha, user.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if payload.push_token:
        existing = db.query(PushToken).filter(
            PushToken.user_id == user.id,
            PushToken.token == payload.push_token
        ).first()
        if not existing:
            db.add(PushToken(user_id=user.id, token=payload.push_token, plataforma=payload.plataforma))
            db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/invites", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def criar_invite(invite_in: InviteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, invite_in.racha_id)

    if invite_in.team_id:
        team = db.query(Team).filter(Team.id == invite_in.team_id, Team.racha_id == invite_in.racha_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Time não encontrado")
    token = uuid.uuid4().hex
    invite = Invite(
        token=token,
        racha_id=invite_in.racha_id,
        email=invite_in.email,
        telefone=invite_in.telefone,
        nome=invite_in.nome,
        status=InviteStatus.PENDENTE,
        role=invite_in.role,
        team_id=invite_in.team_id,
        criado_por_user_id=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return InviteResponse.model_validate(invite)


@router.post("/invites/accept", response_model=InviteResponse)
def aceitar_invite(payload: InviteAccept, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invite = db.query(Invite).filter(Invite.token == payload.token).first()
    if not invite or invite.status != InviteStatus.PENDENTE:
        raise HTTPException(status_code=400, detail="Convite inválido")

    if invite.role == InviteRole.ADMIN:
        # Verifica se já é admin
        existing_admin = db.query(RachaAdmin).filter(
            RachaAdmin.user_id == current_user.id,
            RachaAdmin.racha_id == invite.racha_id
        ).first()
        if not existing_admin:
            racha_admin = RachaAdmin(
                user_id=current_user.id,
                racha_id=invite.racha_id,
                is_owner=False,
                ativo=True,
            )
            db.add(racha_admin)
    else:
        # Verifica se já é atleta
        existing_atleta = db.query(Atleta).filter(
            Atleta.user_id == current_user.id,
            Atleta.racha_id == invite.racha_id
        ).first()
        if not existing_atleta:
            profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == current_user.id).first()
            atleta = Atleta(
                user_id=current_user.id,
                racha_id=invite.racha_id,
                nome=invite.nome or current_user.nome or "Atleta",
                telefone=invite.telefone or current_user.telefone,
                ativo=True,
                foto_url=profile.foto_url if profile else None,
            )
            db.add(atleta)
            db.flush()
            if invite.team_id:
                db.add(TeamMember(team_id=invite.team_id, atleta_id=atleta.id, ativo=True))

    invite.status = InviteStatus.ACEITO
    invite.aceito_em = datetime.utcnow()
    db.commit()
    db.refresh(invite)
    return InviteResponse.model_validate(invite)


@router.get("/invites/{token}", response_model=InviteResponse)
def obter_invite(token: str, db: Session = Depends(get_db)):
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    return InviteResponse.model_validate(invite)


@router.get("/google/url")
def get_google_login_url(redirect_uri: str, state: str = None):
    """Retorna a URL para iniciar o login com Google."""
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth não configurado")
    return {"url": get_google_auth_url(redirect_uri, state)}


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Autentica usuário via Google OAuth."""
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth não configurado")

    try:
        tokens = await exchange_code_for_tokens(payload.code, payload.redirect_uri)
        google_user = await get_google_user_info(tokens["access_token"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao autenticar com Google: {str(e)}")

    email = google_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email não disponível na conta Google")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            nome=google_user.get("name", email.split("@")[0]),
            email=email,
            senha_hash=hash_password(uuid.uuid4().hex),
            role=UserRole.ATLETA,
            ativo=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        profile = AthleteProfile(user_id=user.id, nome=user.nome, telefone=None)
        db.add(profile)
        db.commit()

    if payload.invite_token:
        invite = db.query(Invite).filter(Invite.token == payload.invite_token).first()
        if invite and invite.status == InviteStatus.PENDENTE:
            if invite.role == InviteRole.ADMIN:
                existing_admin = db.query(RachaAdmin).filter(
                    RachaAdmin.user_id == user.id,
                    RachaAdmin.racha_id == invite.racha_id
                ).first()
                if not existing_admin:
                    db.add(RachaAdmin(
                        user_id=user.id,
                        racha_id=invite.racha_id,
                        is_owner=False,
                        ativo=True,
                    ))
            else:
                existing_atleta = db.query(Atleta).filter(
                    Atleta.user_id == user.id,
                    Atleta.racha_id == invite.racha_id
                ).first()
                if not existing_atleta:
                    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user.id).first()
                    atleta = Atleta(
                        user_id=user.id,
                        racha_id=invite.racha_id,
                        nome=invite.nome or user.nome or "Atleta",
                        telefone=invite.telefone or user.telefone,
                        ativo=True,
                        foto_url=profile.foto_url if profile else None,
                    )
                    db.add(atleta)
                    db.flush()
                    if invite.team_id:
                        db.add(TeamMember(team_id=invite.team_id, atleta_id=atleta.id, ativo=True))
            invite.status = InviteStatus.ACEITO
            invite.aceito_em = datetime.utcnow()
            db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Sempre retorna sucesso para não expor se o email existe.
    user = db.query(User).filter(User.email == payload.email, User.ativo == True).first()
    if user:
        token = create_password_reset_token(user.id, user.senha_hash)
        settings = get_settings()
        reset_link = f"{settings.frontend_url}/reset-senha?token={token}"
        send_password_reset_email(user.email, reset_link)
    return {"message": "Se o e-mail existir, enviamos as instrucoes de redefinicao."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        user_id, pwd_marker = verify_password_reset_token(payload.token)
    except Exception:
        raise HTTPException(status_code=400, detail="Token invalido ou expirado")

    user = db.query(User).filter(User.id == user_id, User.ativo == True).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token invalido ou expirado")

    if user.senha_hash[-12:] != pwd_marker:
        raise HTTPException(status_code=400, detail="Token invalido ou expirado")

    user.senha_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Senha redefinida com sucesso"}
