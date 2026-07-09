from pydantic import BaseModel, EmailStr, Field, field_validator


class CheckoutRequest(BaseModel):
    amount: int = Field(ge=10, le=500)
    payer_email: EmailStr
    payer_note: str = Field(default="", max_length=1000)
    recipient_first_name: str = Field(min_length=1, max_length=100)
    recipient_last_name: str = Field(min_length=1, max_length=100)
    recipient_email: EmailStr | None = None
    message_to_recipient: str = Field(default="", max_length=2000)
    language: str = "en"

    @field_validator("amount")
    @classmethod
    def amount_must_be_whole_euros(cls, value: int) -> int:
        if isinstance(value, bool):
            raise ValueError("Amount must be a whole number")
        return value

    @field_validator("recipient_first_name", "recipient_last_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Name is required")
        return value

    @field_validator("language")
    @classmethod
    def supported_language(cls, value: str) -> str:
        return value if value in {"en", "lv", "fr", "ru"} else "en"


class CheckoutResponse(BaseModel):
    checkout_url: str


class CardStatusResponse(BaseModel):
    status: str
    recipient_name: str
    amount: str
    balance: str | None = None
    card_number: str | None = None
    wallet_url: str | None = None
    qr_url: str | None = None
    gift_message: str = ""
    error: str | None = None
