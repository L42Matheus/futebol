from pydantic import BaseModel


class BillingCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class BillingSyncRequest(BaseModel):
    session_id: str
