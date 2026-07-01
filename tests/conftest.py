import os

os.environ["DATABASE_URL"] = "sqlite:///./data/test-suite.db"
os.environ["VIVIEN_BASE_URL"] = "http://testserver"
os.environ["STRIPE_SECRET_KEY"] = "unit_test_stripe_secret_key"
os.environ["STRIPE_WEBHOOK_SECRET"] = "unit_test_stripe_webhook_secret"
os.environ["PASSSLOT_MODE"] = "mock"
os.environ["SYRVE_MODE"] = "mock"
os.environ["SYRVE_WEBHOOK_SECRET"] = "test-syrve-secret"

import pytest

from giftcard_service.db import Base, engine


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
