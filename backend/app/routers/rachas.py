import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Racha, TipoRacha, Atleta, RachaAdmin, User, UserRole
from app.schemas.racha import RachaCreate, RachaUpdate, RachaResponse
from app.services.auth import get_current_user
from app.deps import verificar_acesso_racha, verificar_admin_racha

router = APIRouter(prefix="/rachas", tags=["Rachas"])
logger = logging.getLogger(__name__)


def get_max_atletas(tipo: TipoRacha) -> int:
    limites = {TipoRacha.CAMPO: 40, TipoRacha.SOCIETY: 30, TipoRacha.FUTSAL: 20}
    return limites.get(tipo, 30)


def _normalize_tipo(value) -> TipoRacha:
    raw = getattr(value, "value", value)
    tipo = str(raw or TipoRacha.SOCIETY.value).lower()
    if tipo in {"campo", "society", "futsal"}:
        return TipoRacha(tipo)
    return TipoRacha.SOCIETY


def _resolve_tipo_db_label(db: Session, tipo: TipoRacha) -> str:
    """Return the enum label accepted by the current database.

    Some test databases were created with SQLAlchemy's enum names
    (``SOCIETY``), others with app values (``society``). This keeps writes
    compatible with both.
    """

    row = db.execute(
        text(
            """
            SELECT udt_name
            FROM information_schema.columns
            WHERE table_name = 'rachas' AND column_name = 'tipo'
            LIMIT 1
            """
        )
    ).mappings().first()
    udt_name = row["udt_name"] if row else None
    if not udt_name:
        return tipo.value

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
    if tipo.name in labels:
        return tipo.name
    if tipo.value in labels:
        return tipo.value
    return tipo.value


def _racha_response_from_mapping(row, *, total_atletas: int = 0, is_admin: bool = False) -> RachaResponse:
    return RachaResponse(
        id=row["id"],
        nome=row["nome"],
        tipo=_normalize_tipo(row.get("tipo")),
        descricao=row.get("descricao"),
        max_atletas=row.get("max_atletas") or get_max_atletas(_normalize_tipo(row.get("tipo"))),
        valor_mensalidade=row.get("valor_mensalidade") or 0,
        valor_cartao_amarelo=row.get("valor_cartao_amarelo") or 1000,
        valor_cartao_vermelho=row.get("valor_cartao_vermelho") or 2000,
        estatuto=row.get("estatuto"),
        escalacao_size=row.get("escalacao_size"),
        ativo=True if row.get("ativo") is None else bool(row.get("ativo")),
        created_at=row.get("created_at") or datetime.utcnow(),
        updated_at=row.get("updated_at"),
        total_atletas=total_atletas,
        is_admin=is_admin,
    )


def _table_exists(db: Session, table_name: str) -> bool:
    return bool(
        db.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = :table_name
                LIMIT 1
                """
            ),
            {"table_name": table_name},
        ).first()
    )


def _table_columns(db: Session, table_name: str) -> set[str]:
    return {
        row[0]
        for row in db.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table_name
                """
            ),
            {"table_name": table_name},
        ).all()
    }


def _select_column(
    columns: set[str],
    alias: str,
    column_name: str,
    default_sql: str,
    *,
    cast_text: bool = False,
) -> str:
    if column_name not in columns:
        return f"{default_sql} AS {column_name}"

    expression = f"{alias}.{column_name}"
    if cast_text:
        expression = f"{expression}::text"
    return f"{expression} AS {column_name}"


@router.post("/", response_model=RachaResponse, status_code=status.HTTP_201_CREATED)
def criar_racha(racha: RachaCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar racha")
    tipo = _normalize_tipo(racha.tipo)
    tipo_db = _resolve_tipo_db_label(db, tipo)
    row = db.execute(
        text(
            """
            INSERT INTO rachas (
                nome, tipo, descricao, max_atletas, valor_mensalidade,
                valor_cartao_amarelo, valor_cartao_vermelho, estatuto,
                escalacao_size, ativo
            )
            VALUES (
                :nome, :tipo, :descricao, :max_atletas, :valor_mensalidade,
                :valor_cartao_amarelo, :valor_cartao_vermelho, :estatuto,
                :escalacao_size, TRUE
            )
            RETURNING
                id, nome, tipo::text AS tipo, descricao, max_atletas,
                valor_mensalidade, valor_cartao_amarelo, valor_cartao_vermelho,
                estatuto, escalacao_size, ativo, created_at, updated_at
            """
        ),
        {
            "nome": racha.nome,
            "tipo": tipo_db,
            "descricao": racha.descricao,
            "max_atletas": get_max_atletas(tipo),
            "valor_mensalidade": racha.valor_mensalidade,
            "valor_cartao_amarelo": racha.valor_cartao_amarelo,
            "valor_cartao_vermelho": racha.valor_cartao_vermelho,
            "estatuto": racha.estatuto,
            "escalacao_size": racha.escalacao_size,
        },
    ).mappings().first()
    if not row:
        db.rollback()
        raise HTTPException(status_code=500, detail="Não foi possível criar o racha")

    db.execute(
        text(
            """
            INSERT INTO racha_admins (user_id, racha_id, is_owner, ativo)
            VALUES (:user_id, :racha_id, TRUE, TRUE)
            """
        ),
        {"user_id": current_user.id, "racha_id": row["id"]},
    )
    db.commit()
    return _racha_response_from_mapping(row, total_atletas=0, is_admin=True)


@router.get("/", response_model=List[RachaResponse])
def listar_rachas(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if not _table_exists(db, "rachas"):
            return []

        racha_columns = _table_columns(db, "rachas")
        if not {"id", "nome"}.issubset(racha_columns):
            logger.warning("Tabela rachas sem colunas mínimas: %s", sorted(racha_columns))
            return []

        access_parts = []

        if _table_exists(db, "racha_admins"):
            admin_columns = _table_columns(db, "racha_admins")
            if {"racha_id", "user_id"}.issubset(admin_columns):
                admin_active_filter = "AND ativo IS TRUE" if "ativo" in admin_columns else ""
                access_parts.append(
                    f"""
                    SELECT racha_id, TRUE AS is_admin
                    FROM racha_admins
                    WHERE user_id = :user_id {admin_active_filter}
                    """
                )

        has_atletas = _table_exists(db, "atletas")
        atleta_columns = _table_columns(db, "atletas") if has_atletas else set()
        if {"racha_id", "user_id"}.issubset(atleta_columns):
            atleta_active_filter = "AND ativo IS TRUE" if "ativo" in atleta_columns else ""
            access_parts.append(
                f"""
                SELECT racha_id, FALSE AS is_admin
                FROM atletas
                WHERE user_id = :user_id {atleta_active_filter}
                """
            )

        if not access_parts:
            logger.warning("Nenhuma relação de acesso a rachas disponível para user_id=%s", current_user.id)
            return []

        if "racha_id" in atleta_columns:
            count_active_filter = "WHERE ativo IS TRUE" if "ativo" in atleta_columns else ""
            atletas_count_sql = f"""
                SELECT racha_id, COUNT(*) AS total_atletas
                FROM atletas
                {count_active_filter}
                GROUP BY racha_id
            """
        else:
            atletas_count_sql = """
                SELECT NULL::integer AS racha_id, 0::bigint AS total_atletas
                WHERE FALSE
            """

        select_columns = [
            "r.id AS id",
            "r.nome AS nome",
            _select_column(racha_columns, "r", "tipo", "'society'", cast_text=True),
            _select_column(racha_columns, "r", "descricao", "NULL"),
            _select_column(racha_columns, "r", "max_atletas", "30"),
            _select_column(racha_columns, "r", "valor_mensalidade", "0"),
            _select_column(racha_columns, "r", "valor_cartao_amarelo", "1000"),
            _select_column(racha_columns, "r", "valor_cartao_vermelho", "2000"),
            _select_column(racha_columns, "r", "estatuto", "NULL"),
            _select_column(racha_columns, "r", "escalacao_size", "NULL"),
            _select_column(racha_columns, "r", "ativo", "TRUE"),
            _select_column(racha_columns, "r", "created_at", "now()"),
            _select_column(racha_columns, "r", "updated_at", "NULL"),
            "COALESCE(ac.total_atletas, 0) AS total_atletas",
            "COALESCE(ur.is_admin, FALSE) AS is_admin",
        ]

        active_filter = "WHERE r.ativo = :ativo" if ativo is not None and "ativo" in racha_columns else ""
        order_sql = (
            "ORDER BY r.created_at DESC NULLS LAST, r.id DESC"
            if "created_at" in racha_columns
            else "ORDER BY r.id DESC"
        )

        rows = db.execute(
            text(
                f"""
                WITH access_rows AS (
                    {" UNION ALL ".join(access_parts)}
                ),
                user_rachas AS (
                    SELECT racha_id, BOOL_OR(is_admin) AS is_admin
                    FROM access_rows
                    GROUP BY racha_id
                ),
                atletas_count AS (
                    {atletas_count_sql}
                )
                SELECT
                    {", ".join(select_columns)}
                FROM rachas r
                JOIN user_rachas ur ON ur.racha_id = r.id
                LEFT JOIN atletas_count ac ON ac.racha_id = r.id
                {active_filter}
                {order_sql}
                OFFSET :skip
                LIMIT :limit
                """
            ),
            {
                "user_id": current_user.id,
                "ativo": ativo,
                "skip": skip,
                "limit": limit,
            },
        ).mappings().all()

        return [
            _racha_response_from_mapping(
                row,
                total_atletas=row.get("total_atletas") or 0,
                is_admin=bool(row.get("is_admin")),
            )
            for row in rows
        ]
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Erro ao listar rachas para user_id=%s", current_user.id)
        return []


@router.get("/{racha_id}", response_model=RachaResponse)
def obter_racha(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, racha_id)
    row = db.execute(
        text(
            """
            SELECT
                r.id, r.nome, r.tipo::text AS tipo, r.descricao, r.max_atletas,
                r.valor_mensalidade, r.valor_cartao_amarelo, r.valor_cartao_vermelho,
                r.estatuto, r.escalacao_size, r.ativo, r.created_at, r.updated_at,
                COALESCE(ac.total_atletas, 0) AS total_atletas,
                EXISTS (
                    SELECT 1 FROM racha_admins ra
                    WHERE ra.racha_id = r.id AND ra.user_id = :user_id AND ra.ativo IS TRUE
                ) AS is_admin
            FROM rachas r
            LEFT JOIN (
                SELECT racha_id, COUNT(*) AS total_atletas
                FROM atletas
                WHERE ativo IS TRUE
                GROUP BY racha_id
            ) ac ON ac.racha_id = r.id
            WHERE r.id = :racha_id
            """
        ),
        {"racha_id": racha_id, "user_id": current_user.id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    return _racha_response_from_mapping(
        row,
        total_atletas=row.get("total_atletas") or 0,
        is_admin=bool(row.get("is_admin")),
    )


@router.patch("/{racha_id}", response_model=RachaResponse)
def atualizar_racha(racha_id: int, racha_update: RachaUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, racha_id)
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    update_data = racha_update.model_dump(exclude_unset=True)
    if "tipo" in update_data:
        update_data["max_atletas"] = get_max_atletas(update_data["tipo"])
    for field, value in update_data.items():
        setattr(racha, field, value)
    db.commit()
    db.refresh(racha)
    total = db.query(func.count(Atleta.id)).filter(Atleta.racha_id == racha.id, Atleta.ativo.is_(True)).scalar()
    return RachaResponse(**{c.name: getattr(racha, c.name) for c in racha.__table__.columns}, total_atletas=total)


@router.delete("/{racha_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_racha(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_admin_racha(db, current_user, racha_id)
    racha = db.query(Racha).filter(Racha.id == racha_id).first()
    if not racha:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    racha.ativo = False
    db.commit()


@router.get("/{racha_id}/saldo")
def obter_saldo(racha_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verificar_acesso_racha(db, current_user, racha_id)
    from app.models import Pagamento, StatusPagamento
    exists = db.execute(
        text("SELECT 1 FROM rachas WHERE id = :racha_id"),
        {"racha_id": racha_id},
    ).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Racha não encontrado")
    total_recebido = db.query(func.sum(Pagamento.valor)).join(Atleta).filter(
        Atleta.racha_id == racha_id, Pagamento.status == StatusPagamento.APROVADO).scalar() or 0
    total_pendente = db.query(func.sum(Pagamento.valor)).join(Atleta).filter(
        Atleta.racha_id == racha_id,
        Pagamento.status.in_([StatusPagamento.PENDENTE, StatusPagamento.AGUARDANDO_APROVACAO])).scalar() or 0
    return {
        "racha_id": racha_id, "saldo": total_recebido, "pendente": total_pendente,
        "saldo_formatado": f"R$ {total_recebido / 100:.2f}", "pendente_formatado": f"R$ {total_pendente / 100:.2f}"
    }
