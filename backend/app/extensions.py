from flask import request
from flask_caching import Cache
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_sqlalchemy import SQLAlchemy
from redis import Redis

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
limiter = Limiter(key_func=lambda: request.access_route[0] if request.access_route else request.remote_addr)
cache = Cache()
# Set during app initialization in app/__init__.py.
# May be None if Redis is unavailable — always check before use.
redis_client: Redis | None = None

# RQ job queue — initialized during create_app; None if Redis is unavailable
job_queue = None

__all__ = ["db", "jwt", "cors", "limiter", "cache", "redis_client", "job_queue"]
