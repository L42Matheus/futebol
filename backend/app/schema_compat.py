"""Small production bootstrap for databases created before the latest models.

The project currently uses ``Base.metadata.create_all`` on startup. That is good
for creating missing tables in a fresh Railway/Supabase database, but SQLAlchemy
does not add new columns to tables that already exist. During this test phase we
keep a tiny, idempotent compatibility layer so deploys do not fail with opaque
500 errors after model changes.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def ensure_schema_compatibility(engine: Engine) -> None:
    """Apply safe additive schema fixes.

    Every statement is idempotent and only adds missing structures. It never
    drops, renames or rewrites existing data.
    """

    statements = [
        # SQLAlchemy Enum columns persist enum member names in this project.
        # These DO blocks make the additive ALTERs below safe on fresh DBs where
        # create_all has not created the type yet.
        """
        DO $$
        BEGIN
            CREATE TYPE tiporacha AS ENUM ('CAMPO', 'SOCIETY', 'FUTSAL');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END
        $$;
        """,
        """
        ALTER TYPE tiporacha ADD VALUE IF NOT EXISTS 'campo'
        """,
        """
        ALTER TYPE tiporacha ADD VALUE IF NOT EXISTS 'society'
        """,
        """
        ALTER TYPE tiporacha ADD VALUE IF NOT EXISTS 'futsal'
        """,
        """
        DO $$
        BEGIN
            CREATE TYPE posicao AS ENUM (
                'GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'VOLANTE', 'MEIA', 'ATACANTE', 'PONTA'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END
        $$;
        """,
        """
        ALTER TYPE posicao ADD VALUE IF NOT EXISTS 'goleiro'
        """,
        """
        ALTER TYPE posicao ADD VALUE IF NOT EXISTS 'zagueiro'
        """,
        """
        ALTER TYPE posicao ADD VALUE IF NOT EXISTS 'lateral'
        """,
        """
        ALTER TYPE posicao ADD VALUE IF NOT EXISTS 'volante'
        """,
        """
        ALTER TYPE posicao ADD VALUE IF NOT EXISTS 'meia'
        """,
        """
        ALTER TYPE posicao ADD VALUE IF NOT EXISTS 'atacante'
        """,
        """
        ALTER TYPE posicao ADD VALUE IF NOT EXISTS 'ponta'
        """,
        """
        DO $$
        BEGIN
            CREATE TYPE pernaboa AS ENUM ('DIREITA', 'ESQUERDA', 'AMBIDESTRA');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END
        $$;
        """,
        """
        ALTER TYPE pernaboa ADD VALUE IF NOT EXISTS 'direita'
        """,
        """
        ALTER TYPE pernaboa ADD VALUE IF NOT EXISTS 'esquerda'
        """,
        """
        ALTER TYPE pernaboa ADD VALUE IF NOT EXISTS 'ambidestra'
        """,
        """
        DO $$
        BEGIN
            CREATE TYPE inviterole AS ENUM ('ADMIN', 'ATLETA');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END
        $$;
        """,
        # Rachas gained billing/card fields and athlete limits after the first
        # versions of the app.
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS descricao TEXT
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS max_atletas INTEGER NOT NULL DEFAULT 30
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS valor_mensalidade INTEGER DEFAULT 0
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS valor_cartao_amarelo INTEGER DEFAULT 1000
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS valor_cartao_vermelho INTEGER DEFAULT 2000
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS estatuto TEXT
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()
        """,
        """
        ALTER TABLE rachas
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        """,
        # A separate admin relation lets a user manage a racha without also
        # being created as an athlete.
        """
        CREATE TABLE IF NOT EXISTS racha_admins (
            id SERIAL PRIMARY KEY,
            racha_id INTEGER NOT NULL REFERENCES rachas(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            is_owner BOOLEAN DEFAULT FALSE,
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT now()
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_racha_admins_id ON racha_admins (id)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_racha_admins_user_id ON racha_admins (user_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_racha_admins_racha_id ON racha_admins (racha_id)
        """,
        # Racha listing joins atletas by user_id; older tables may not have it.
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS user_id INTEGER
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS apelido VARCHAR(50)
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500)
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS posicao posicao DEFAULT 'MEIA'
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS numero_camisa INTEGER
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()
        """,
        """
        ALTER TABLE atletas
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        """,
        # Existing jogo tables need these flags and score fields for the latest
        # agenda/placar UI.
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS valor_campo INTEGER DEFAULT 0
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS observacoes TEXT
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS finalizado BOOLEAN DEFAULT FALSE
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT FALSE
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS time_a_nome VARCHAR(80)
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS time_b_nome VARCHAR(80)
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS placar_time_a INTEGER
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS placar_time_b INTEGER
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()
        """,
        """
        ALTER TABLE jogos
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
        """,
        # Profile table exists in recent models; add missing nullable columns if
        # it came from an older deploy.
        """
        ALTER TABLE athlete_profiles
        ADD COLUMN IF NOT EXISTS apelido VARCHAR(50)
        """,
        """
        ALTER TABLE athlete_profiles
        ADD COLUMN IF NOT EXISTS posicao posicao
        """,
        """
        ALTER TABLE athlete_profiles
        ADD COLUMN IF NOT EXISTS perna_boa pernaboa
        """,
        """
        ALTER TABLE athlete_profiles
        ADD COLUMN IF NOT EXISTS numero_camisa INTEGER
        """,
        """
        ALTER TABLE athlete_profiles
        ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500)
        """,
        """
        ALTER TABLE athlete_profiles
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        """,
        # Team lineup fields used by the escalação screen.
        """
        ALTER TABLE team_members
        ADD COLUMN IF NOT EXISTS is_titular BOOLEAN DEFAULT TRUE
        """,
        """
        ALTER TABLE team_members
        ADD COLUMN IF NOT EXISTS posicao_escalacao VARCHAR(20)
        """,
        """
        ALTER TABLE team_members
        ADD COLUMN IF NOT EXISTS ordem_banco INTEGER
        """,
        # Invites grew role/team fields when the app added admin vs athlete
        # invitation flows.
        """
        ALTER TABLE invites
        ADD COLUMN IF NOT EXISTS role inviterole
        """,
        """
        ALTER TABLE invites
        ADD COLUMN IF NOT EXISTS team_id INTEGER
        """,
        """
        ALTER TABLE invites
        ADD COLUMN IF NOT EXISTS nome VARCHAR(100)
        """,
    ]

    try:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))
        logger.info("Schema compatibility checks applied.")
    except Exception:
        logger.exception("Failed to apply schema compatibility checks.")
        raise
