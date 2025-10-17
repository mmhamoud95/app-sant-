import redis
from app.config import settings


def get_redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)
