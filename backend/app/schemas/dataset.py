from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    connection_id: int
    source_type: str  # table, custom_sql
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    custom_sql: Optional[str] = None

class DatasetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    connection_id: int
    source_type: str
    schema_name: Optional[str]
    table_name: Optional[str]
    row_count_est: Optional[int]
    last_profiled_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ColumnProfileResponse(BaseModel):
    id: int
    column_name: str
    data_type: Optional[str]
    semantic_type: Optional[str]
    display_name: Optional[str]
    is_nullable: Optional[bool]
    unique_count: Optional[int]
    null_count: Optional[int]
    null_pct: Optional[float]
    min_value: Optional[str]
    max_value: Optional[str]
    avg_value: Optional[float]
    sample_values: Optional[Any]
    quality_score: Optional[float]

    class Config:
        from_attributes = True

class QueryExecuteRequest(BaseModel):
    sql: str
    dataset_id: int
    params: Optional[dict] = {}
    limit: Optional[int] = 100

class QueryResult(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    truncated: bool = False
    execution_time_ms: Optional[int] = None
    from_cache: bool = False
