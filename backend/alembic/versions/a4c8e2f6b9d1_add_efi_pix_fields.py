"""add efi pix fields to users

Revision ID: a4c8e2f6b9d1
Revises: b7d2e4f8a1c3
Create Date: 2026-11-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4c8e2f6b9d1'
down_revision: Union[str, None] = 'b7d2e4f8a1c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('subscription_gateway', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('efi_pix_txid', sa.String(length=35), nullable=True))
    op.create_index('ix_users_efi_pix_txid', 'users', ['efi_pix_txid'])


def downgrade() -> None:
    op.drop_index('ix_users_efi_pix_txid', table_name='users')
    op.drop_column('users', 'efi_pix_txid')
    op.drop_column('users', 'subscription_gateway')
