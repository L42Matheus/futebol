"""add asaas subscription fields to users

Revision ID: b7d2e4f8a1c3
Revises: f3a9b6c2d4e1
Create Date: 2026-06-27 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d2e4f8a1c3'
down_revision: Union[str, None] = 'f3a9b6c2d4e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('cpf_cnpj', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('asaas_customer_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('asaas_subscription_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('subscription_status', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('subscription_current_period_end', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'subscription_current_period_end')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'asaas_subscription_id')
    op.drop_column('users', 'asaas_customer_id')
    op.drop_column('users', 'cpf_cnpj')
