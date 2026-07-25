"""WSGI entry point for Vercel and production deployment.

Sets GNOVIUM_MODE to cloud for Vercel/production environment.
All env vars are configured via Vercel project environment variables.
"""
import os

os.environ.setdefault("GNOVIUM_MODE", "cloud")

from app import create_app
from app.core.config import get_config

app = create_app(get_config())
