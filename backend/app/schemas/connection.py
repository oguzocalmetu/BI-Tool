from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ConnectionCreate(BaseModel):
    name: str
    type: str  # postgresql, mysql, csv, excel
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    extra_config: Optional[dict] = {}

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    extra_config: Optional[dict] = None

class ConnectionResponse(BaseModel):
    id: int
    name: str
    type: str
    host: Optional[str]
    port: Optional[int]
    database_name: Optional[str]
    username: Optional[str]
    is_active: bool
    last_tested_at: Optional[datetime]
    last_test_success: Optional[bool]
    created_at: datetime

    class Config:
        from_attributes = True

class ConnectionTestResult(BaseModel):
    success: bool
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    message: str
