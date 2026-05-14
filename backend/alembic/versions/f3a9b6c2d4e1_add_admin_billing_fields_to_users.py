"""add admin billing fields to users

Revision ID: f3a9b6c2d4e1
Revises: e1c3a1f9a7b2
Create Date: 2026-05-14 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a9b6c2d4e1'
down_revision: Union[str, None] = 'e1c3a1f9a7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('admin_subscription_status', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('admin_subscription_started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('admin_subscription_current_period_end', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'], unique=True)
    op.create_index('ix_users_stripe_subscription_id', 'users', ['stripe_subscription_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_users_stripe_subscription_id', table_name='users')
    op.drop_index('ix_users_stripe_customer_id', table_name='users')
    op.drop_column('users', 'admin_subscription_current_period_end')
    op.drop_column('users', 'admin_subscription_started_at')
    op.drop_column('users', 'admin_subscription_status')
    op.drop_column('users', 'stripe_subscription_id')
    op.drop_column('users', 'stripe_customer_id')
