"""Publica itens na Resenha do racha. Não faz commit: entra na transação de quem chama."""

from sqlalchemy.orm import Session

from app.models import Noticia


def publicar(
    db: Session,
    racha_id: int,
    tipo: str,
    titulo: str,
    texto: str | None = None,
    jogo_id: int | None = None,
    atleta_id: int | None = None,
    autor_user_id: int | None = None,
) -> Noticia:
    noticia = Noticia(
        racha_id=racha_id,
        tipo=tipo,
        titulo=titulo[:200],
        texto=texto,
        jogo_id=jogo_id,
        atleta_id=atleta_id,
        autor_user_id=autor_user_id,
    )
    db.add(noticia)
    return noticia


def nome_curto(atleta) -> str:
    return (atleta.apelido or "").strip() or atleta.nome.split()[0]
