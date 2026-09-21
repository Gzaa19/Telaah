import logging
from typing import Optional
from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from backend.src.core.config import settings

logger = logging.getLogger(__name__)


def get_redis_settings() -> RedisSettings:
    """Parse RedisSettings from the application settings."""
    return RedisSettings.from_dsn(settings.REDIS_URL)


async def get_redis_pool() -> ArqRedis:
    """Create an ARQ Redis client connection pool."""
    return await create_pool(get_redis_settings())


async def startup(ctx: dict):
    """Worker startup hook."""
    logger.info("ARQ Worker starting up...")


async def shutdown(ctx: dict):
    """Worker shutdown hook."""
    logger.info("ARQ Worker shutting down...")


class WorkerSettings:
    """ARQ Worker settings configuration."""
    redis_settings = get_redis_settings()
    on_startup = startup
    on_shutdown = shutdown
    functions = []
    max_jobs = 10
    job_timeout = 300
