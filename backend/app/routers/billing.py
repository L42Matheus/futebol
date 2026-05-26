from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.schemas.billing import BillingCheckoutResponse, BillingConfigResponse, BillingSyncRequest
from app.schemas.user import UserResponse
from app.services.auth import get_current_user
from app.services.stripe_billing import (
    clear_user_subscription,
    ensure_admin_user,
    get_stripe_module,
    has_active_admin_subscription,
    sync_user_from_subscription,
)

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/config", response_model=BillingConfigResponse)
def get_billing_config():
    settings = get_settings()
    return BillingConfigResponse(publishable_key=settings.stripe_publishable_key)


def _find_user_for_subscription(db: Session, subscription) -> User | None:
    user = None
    metadata = getattr(subscription, "metadata", {}) or {}
    user_id = metadata.get("user_id")

    if user_id:
        user = db.query(User).filter(User.id == int(user_id)).first()

    if not user and getattr(subscription, "id", None):
        user = db.query(User).filter(User.stripe_subscription_id == subscription.id).first()

    if not user and getattr(subscription, "customer", None):
        user = db.query(User).filter(User.stripe_customer_id == subscription.customer).first()

    return user


@router.post(
    "/admin-subscription/checkout",
    response_model=BillingCheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin_subscription_checkout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin_user(current_user)
    if has_active_admin_subscription(current_user):
        raise HTTPException(status_code=400, detail="A assinatura administrativa já está ativa")

    stripe = get_stripe_module()
    settings = get_settings()

    checkout_payload = {
        "mode": "subscription",
        "success_url": (
            f"{settings.frontend_url}/admin-assinatura"
            "?checkout=success&session_id={CHECKOUT_SESSION_ID}"
        ),
        "cancel_url": f"{settings.frontend_url}/admin-assinatura?checkout=canceled",
        "client_reference_id": str(current_user.id),
        "metadata": {"user_id": str(current_user.id), "billing_scope": "admin_access"},
        "subscription_data": {
            "metadata": {"user_id": str(current_user.id), "billing_scope": "admin_access"},
            "trial_period_days": settings.stripe_trial_period_days,
        },
        "line_items": [
            {
                "quantity": 1,
                "price_data": {
                    "currency": settings.stripe_admin_monthly_currency,
                    "unit_amount": settings.stripe_admin_monthly_price_cents,
                    "recurring": {"interval": "month"},
                    "product_data": {
                        "name": "QuemJoga Pro",
                        "description": "Gestão completa de rachas com trial de 7 dias grátis",
                    },
                },
            }
        ],
    }
    if current_user.stripe_customer_id:
        checkout_payload["customer"] = current_user.stripe_customer_id
    elif current_user.email:
        checkout_payload["customer_email"] = current_user.email

    checkout_session = stripe.checkout.Session.create(**checkout_payload)

    if getattr(checkout_session, "customer", None):
        current_user.stripe_customer_id = checkout_session.customer
        db.commit()

    return BillingCheckoutResponse(
        url=checkout_session.url,
        session_id=checkout_session.id,
    )


@router.post("/admin-subscription/sync", response_model=UserResponse)
def sync_admin_subscription(
    payload: BillingSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin_user(current_user)
    stripe = get_stripe_module()

    session = stripe.checkout.Session.retrieve(payload.session_id)
    metadata = session.metadata.to_dict() if hasattr(session.metadata, "to_dict") else (session.metadata or {})
    session_user_id = metadata.get("user_id") or getattr(session, "client_reference_id", None)

    if str(session_user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sessão Stripe não pertence a este usuário")

    if getattr(session, "customer", None):
        current_user.stripe_customer_id = session.customer

    if getattr(session, "subscription", None):
        subscription = stripe.Subscription.retrieve(session.subscription)
        sync_user_from_subscription(current_user, subscription)

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    stripe = get_stripe_module()
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook não configurado")

    payload = await request.body()
    signature = request.headers.get("Stripe-Signature")

    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook Stripe inválido: {exc}")

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed" and data_object.get("mode") == "subscription":
        user_id = (data_object.get("metadata") or {}).get("user_id") or data_object.get("client_reference_id")
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                if data_object.get("customer"):
                    user.stripe_customer_id = data_object["customer"]
                if data_object.get("subscription"):
                    subscription = stripe.Subscription.retrieve(data_object["subscription"])
                    sync_user_from_subscription(user, subscription)
                db.commit()

    elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
        user = _find_user_for_subscription(db, data_object)
        if user:
            sync_user_from_subscription(user, data_object)
            db.commit()

    elif event_type == "customer.subscription.deleted":
        user = _find_user_for_subscription(db, data_object)
        if user:
            clear_user_subscription(user)
            db.commit()

    return {"received": True}
