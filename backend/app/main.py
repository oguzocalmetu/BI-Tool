from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.db.base import engine, Base

# Import all models to register them with SQLAlchemy
import app.models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.v1.auth import router as auth_router
from app.api.v1.connections import router as conn_router
from app.api.v1.datasets import router as ds_router
from app.api.v1.semantic import router as semantic_router
from app.api.v1.dashboards import router as dash_router, router_ai, router_query

prefix = settings.API_PREFIX
app.include_router(auth_router, prefix=prefix)
app.include_router(conn_router, prefix=prefix)
app.include_router(ds_router, prefix=prefix)
app.include_router(semantic_router, prefix=prefix)
app.include_router(dash_router, prefix=prefix)
app.include_router(router_ai, prefix=prefix)
app.include_router(router_query, prefix=prefix)

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
