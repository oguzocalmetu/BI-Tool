import time
from typing import Optional, Any

try:
    import clickhouse_connect
    CLICKHOUSE_AVAILABLE = True
except ImportError:
    CLICKHOUSE_AVAILABLE = False

from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult


class ClickHouseConnector(BaseConnector):
    def _client(self):
        if not CLICKHOUSE_AVAILABLE:
            raise RuntimeError("clickhouse-connect not installed. Run: pip install clickhouse-connect")
        extra = self.config.get("extra_config") or {}
        return clickhouse_connect.get_client(
            host=self.config.get("host", "localhost"),
            port=int(self.config.get("port", 8123)),
            username=self.config.get("username", "default"),
            password=self.config.get("password", ""),
            database=self.config.get("database_name", "default"),
            secure=extra.get("secure", False),
        )

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        try:
            self._client().ping()
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        skip = {"system", "information_schema", "INFORMATION_SCHEMA"}
        result = self._client().query("SHOW DATABASES")
        return [r[0] for r in result.result_rows if r[0] not in skip]

    async def get_tables(self, schema: str = "default") -> list[TableInfo]:
        result = self._client().query(f"SHOW TABLES FROM `{schema}`")
        return [TableInfo(name=r[0], schema=schema) for r in result.result_rows]

    async def get_columns(self, table: str, schema: str = "default") -> list[ColumnInfo]:
        result = self._client().query(f"DESCRIBE TABLE `{schema}`.`{table}`")
        return [ColumnInfo(name=r[0], data_type=r[1], is_nullable=("Nullable" in r[1]))
                for r in result.result_rows]

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        t0 = time.monotonic()
        result = self._client().query(sql)
        columns = list(result.column_names)
        rows = [list(r) for r in result.result_rows]
        return QueryResult(columns=columns, rows=rows, row_count=len(rows),
                           execution_time_ms=int((time.monotonic() - t0) * 1000))
