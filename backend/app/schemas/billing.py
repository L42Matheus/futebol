from pydantic import BaseModel
from typing import Optional


class BillingConfigResponse(BaseModel):
    publishable_key: str


class BillingCheckoutResponse(BaseModel):
    client_secret: str
    session_id: str


class BillingSyncRequest(BaseModel):
    session_id: str
