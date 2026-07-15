from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.session import get_db
from app.models.user import User
from app.models.connection import BiConnection
from app.dependencies import get_current_user
from app.services.connection_service import (
    create_connection, get_connection, list_connections,
    test_connection, get_schemas, get_tables, get_columns
)
from app.schemas.connection import ConnectionCreate, ConnectionResponse, ConnectionTestResult
import os, shutil

router = APIRouter(prefix="/connections", tags=["connections"])

@router.get("", response_model=list[ConnectionResponse])
async def list_conn(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await list_connections(current_user.id, db)

@router.post("", response_model=ConnectionResponse, status_code=201)
async def create_conn(data: ConnectionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await create_connection(data, current_user.id, db)

@router.get("/{conn_id}", response_model=ConnectionResponse)
async def get_conn(conn_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_connection(conn_id, db)

@router.delete("/{conn_id}", status_code=204)
async def delete_conn(conn_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    conn = await get_connection(conn_id, db)
    conn.is_active = False
    await db.flush()

@router.post("/{conn_id}/test", response_model=ConnectionTestResult)
async def test_conn(conn_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await test_connection(conn_id, db)
    return ConnectionTestResult(**result)

@router.get("/{conn_id}/schemas")
async def conn_schemas(conn_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    schemas = await get_schemas(conn_id, db)
    return {"schemas": schemas}

@router.get("/{conn_id}/tables")
async def conn_tables(conn_id: int, schema: str = "public", current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tables = await get_tables(conn_id, schema, db)
    return {"tables": tables}

@router.get("/{conn_id}/tables/{table}/columns")
async def conn_columns(conn_id: int, table: str, schema: str = "public", current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cols = await get_columns(conn_id, table, schema, db)
    return {"columns": cols}

@router.post("/test-preview")
async def test_connection_preview(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Test a connection config without saving it (used by ConnectionsPage form)."""
    from app.connectors.registry import get_connector
    # Frontend sends 'type' field (e.g. "postgresql")
    connector_type = body.get("type") or body.get("connector_type") or body.get("db_type", "postgresql")
    try:
        connector = get_connector(connector_type, body)
        success, error = await connector.test_connection()
        if success:
            return {"success": True, "message": "Bağlantı başarılı"}
        else:
            return {"success": False, "message": error or "Bağlantı başarısız"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a CSV file and return its path for use as a data source."""
    upload_dir = "/tmp/vela-uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{file.filename}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"file_path": file_path, "filename": file.filename}
