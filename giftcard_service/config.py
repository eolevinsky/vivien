from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    vivien_base_url: str = "http://localhost:8000"
    database_url: str = "sqlite:///./data/vivien.db"

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    passslot_mode: str = "mock"
    passslot_api_key: str = Field(
        default="", validation_alias=AliasChoices("PASSSLOT_API_KEY", "PASSLOT_API_KEY")
    )
    passslot_template_id: str = "6670122238476288"
    passslot_expected_type_identifier: str = "pass.loyalty"
    passslot_balance_field: str = "points"

    syrve_mode: str = "mock"
    syrve_base_url: str = "https://api-eu.syrve.live"
    syrve_api_login: str = Field(
        default="", validation_alias=AliasChoices("SYRVE_API_LOGIN", "SYRVE_API_KEY")
    )
    syrve_organization_id: str = "fecb3371-8475-4df5-92c8-4dae76a83a88"
    syrve_gift_program_id: str = "0eaa0000-29b3-b8cb-03ac-08dddb2b3534"
    syrve_loyalty_program_id: str = "0eaa0000-29b3-b8cb-e946-08ddac10ef86"
    syrve_loyalty_prefix: str = "syrve"
    syrve_webhook_secret: str = ""

    planfix_mode: str = "disabled"
    planfix_event_url: str = ""
    planfix_api_token: str = ""

    fulfillment_deadline_minutes: int = 120
    worker_poll_seconds: int = 2

    @property
    def base_url(self) -> str:
        return self.vivien_base_url.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
