"""add atleta stats

Revision ID: e1c3a1f9a7b2
Revises: c59af22735c9
Create Date: 2026-02-12 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1c3a1f9a7b2'
down_revision: Union[str, None] = 'c59af22735c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS atleta_stats (
            id SERIAL PRIMARY KEY,
            atleta_id INTEGER NOT NULL REFERENCES atletas(id),
            racha_id INTEGER NOT NULL REFERENCES rachas(id),
            gols INTEGER DEFAULT 0,
            assistencias INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ,
            UNIQUE(atleta_id, racha_id)
        );
        """
    )


def downgrade() -> None:
    op.drop_table('atleta_stats')
