from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.config import get_settings
from app.models import User, UserRole

try:
    import stripe
except ImportError:  # pragma: no cover
    stripe = None


def get_stripe_module():
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe não configurado no backend")
    if stripe is None:
        raise HTTPException(status_code=503, detail="Dependência Stripe não instalada")

    stripe.api_key = settings.stripe_secret_key
    return stripe


def ensure_admin_user(user: User):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem acessar esta cobrança")


def sync_user_from_subscription(user: User, subscription: Any):
    customer = getattr(subscription, "customer", None)
    if customer:
        user.stripe_customer_id = customer

    user.stripe_subscription_id = getattr(subscription, "id", None)
    user.admin_subscription_status = getattr(subscription, "status", None)

    start_date = getattr(subscription, "start_date", None)
    current_period_end = getattr(subscription, "current_period_end", None)

    user.admin_subscription_started_at = (
        datetime.fromtimestamp(start_date, tz=timezone.utc) if start_date else None
    )
    user.admin_subscription_current_period_end = (
        datetime.fromtimestamp(current_period_end, tz=timezone.utc) if current_period_end else None
    )


def clear_user_subscription(user: User):
    user.stripe_subscription_id = None
    user.admin_subscription_status = "canceled"
    user.admin_subscription_current_period_end = None


def has_active_admin_subscription(user: User) -> bool:
    if user.role != UserRole.ADMIN:
        return True
    return user.admin_billing_active
