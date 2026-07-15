from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

@dataclass
class TableInfo:
    name: str
    schema: str
    row_count: Optional[int] = None
    description: Optional[str] = None

@dataclass
class ColumnInfo:
    name: str
    data_type: str
    is_nullable: bool = True
    default_value: Optional[str] = None

@dataclass
class QueryResult:
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    execution_time_ms: int = 0

class BaseConnector(ABC):
    def __init__(self, connection_config: dict):
        self.config = connection_config

    @abstractmethod
    async def test_connection(self) -> tuple[bool, Optional[str]]: ...

    @abstractmethod
    async def get_schemas(self) -> list[str]: ...

    @abstractmethod
    async def get_tables(self, schema: str = "public") -> list[TableInfo]: ...

    @abstractmethod
    async def get_columns(self, table: str, schema: str = "public") -> list[ColumnInfo]: ...

    @abstractmethod
    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult: ...

    async def execute_preview(self, table: str, schema: str = "public", limit: int = 100) -> QueryResult:
        sql = f'SELECT * FROM "{schema}"."{table}" LIMIT {limit}'
        return await self.execute_query(sql)
