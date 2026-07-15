import json
import hashlib
from typing import Optional, Any
import redis.asyncio as aioredis
from app.config import settings

_redis: Optional[aioredis.Redis] = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis

def make_cache_key(prefix: str, *args) -> str:
    payload = json.dumps(args, sort_keys=True, default=str)
    h = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return f"{prefix}:{h}"

async def cache_get(key: str) -> Optional[Any]:
    try:
        r = await get_redis()
        data = await r.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception:
        return None

async def cache_set(key: str, value: Any, ttl: int = 3600):
    try:
        r = await get_redis()
        await r.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass

async def cache_delete(key: str):
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception:
        pass

async def cache_delete_pattern(pattern: str):
    try:
        r = await get_redis()
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
    except Exception:
        pass
