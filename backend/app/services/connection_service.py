import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.connection import BiConnection
from app.connectors.registry import connector_registry
from app.core.security import encrypt_secret
from app.core.exceptions import NotFoundException
from app.schemas.connection import ConnectionCreate, ConnectionUpdate

async def create_connection(data: ConnectionCreate, user_id: int, db: AsyncSession) -> BiConnection:
    conn = BiConnection(
        name=data.name,
        type=data.type,
        host=data.host,
        port=data.port,
        database_name=data.database_name,
        username=data.username,
        encrypted_password=encrypt_secret(data.password) if data.password else None,
        extra_config=data.extra_config or {},
        created_by=user_id,
    )
    db.add(conn)
    await db.flush()
    await db.refresh(conn)
    return conn

async def get_connection(conn_id: int, db: AsyncSession) -> BiConnection:
    result = await db.execute(select(BiConnection).where(BiConnection.id == conn_id, BiConnection.is_active == True))
    conn = result.scalar_one_or_none()
    if not conn:
        raise NotFoundException("Connection")
    return conn

async def list_connections(user_id: int, db: AsyncSession) -> list[BiConnection]:
    result = await db.execute(select(BiConnection).where(BiConnection.is_active == True).order_by(BiConnection.created_at.desc()))
    return result.scalars().all()

async def test_connection(conn_id: int, db: AsyncSession) -> dict:
    from datetime import datetime, timezone
    conn = await get_connection(conn_id, db)
    connector = connector_registry.get_connector(conn)
    start = time.time()
    success, error = await connector.test_connection()
    latency = int((time.time() - start) * 1000)
    
    conn.last_tested_at = datetime.now(timezone.utc)
    conn.last_test_success = success
    await db.flush()
    
    return {
        "success": success,
        "latency_ms": latency,
        "error": error,
        "message": "Connection successful" if success else f"Connection failed: {error}"
    }

async def get_schemas(conn_id: int, db: AsyncSession) -> list[str]:
    conn = await get_connection(conn_id, db)
    connector = connector_registry.get_connector(conn)
    return await connector.get_schemas()

async def get_tables(conn_id: int, schema: str, db: AsyncSession) -> list[dict]:
    conn = await get_connection(conn_id, db)
    connector = connector_registry.get_connector(conn)
    tables = await connector.get_tables(schema)
    return [{"name": t.name, "schema": t.schema} for t in tables]

async def get_columns(conn_id: int, table: str, schema: str, db: AsyncSession) -> list[dict]:
    conn = await get_connection(conn_id, db)
    connector = connector_registry.get_connector(conn)
    cols = await connector.get_columns(table, schema)
    return [{"name": c.name, "data_type": c.data_type, "is_nullable": c.is_nullable} for c in cols]
