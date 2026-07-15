import time
import hashlib
import json
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.connection import BiConnection
from app.models.dataset import BiDataset
from app.connectors.registry import connector_registry
from app.utils.query_validator import validate_sql, apply_filter_params
from app.utils.cache import cache_get, cache_set, make_cache_key
from app.config import settings

async def preview_dataset(dataset: BiDataset, connection: BiConnection, limit: int = 100) -> dict:
    connector = connector_registry.get_connector(connection)
    
    if dataset.source_type == "custom_sql":
        sql = f"SELECT * FROM ({dataset.custom_sql}) AS __preview LIMIT {limit}"
    else:
        schema = dataset.schema_name or "public"
        sql = f'SELECT * FROM "{schema}"."{dataset.table_name}" LIMIT {limit}'
    
    result = await connector.execute_query(sql)
    return {
        "columns": result.columns,
        "rows": result.rows,
        "row_count": result.row_count,
    }

async def execute_widget_query(
    sql: str,
    connection: BiConnection,
    params: dict = None,
    use_cache: bool = True,
    cache_ttl: int = 3600
) -> dict:
    # Apply filter params
    if params:
        sql = apply_filter_params(sql, params)
    
    # Validate
    validation = validate_sql(sql, max_rows=settings.QUERY_MAX_ROWS)
    if not validation.is_valid:
        raise ValueError(f"Invalid SQL: {'; '.join(validation.errors)}")
    
    safe_sql = validation.sanitized_sql
    
    # Check cache
    cache_key = make_cache_key("query", safe_sql, connection.id)
    if use_cache:
        cached = await cache_get(cache_key)
        if cached:
            cached["from_cache"] = True
            return cached
    
    # Execute
    connector = connector_registry.get_connector(connection)
    start = time.time()
    result = await connector.execute_query(safe_sql, timeout=settings.QUERY_TIMEOUT_SECONDS)
    elapsed = int((time.time() - start) * 1000)
    
    response = {
        "columns": result.columns,
        "rows": result.rows,
        "row_count": result.row_count,
        "execution_time_ms": elapsed,
        "from_cache": False,
        "truncated": result.row_count >= settings.QUERY_MAX_ROWS,
    }
    
    # Cache result
    if use_cache:
        await cache_set(cache_key, response, ttl=cache_ttl)
    
    return response
