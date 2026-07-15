import asyncio
import time
from typing import Optional, Any

try:
    import trino
    TRINO_AVAILABLE = True
except ImportError:
    TRINO_AVAILABLE = False

from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult


class TrinoConnector(BaseConnector):
    def _connect(self):
        if not TRINO_AVAILABLE:
            raise RuntimeError("trino not installed. Run: pip install trino")
        extra = self.config.get("extra_config") or {}
        return trino.dbapi.connect(
            host=self.config.get("host", "localhost"),
            port=int(self.config.get("port", 8080)),
            user=self.config.get("username", "trino"),
            catalog=extra.get("catalog", self.config.get("database_name", "hive")),
            schema=extra.get("schema", "default"),
            http_scheme=extra.get("http_scheme", "http"),
        )

    def _sync_execute(self, sql: str) -> tuple[list[str], list[list[Any]]]:
        conn = self._connect()
        try:
            cur = conn.cursor()
            cur.execute(sql)
            columns = [d[0] for d in (cur.description or [])]
            rows = [list(r) for r in cur.fetchall()]
            return columns, rows
        finally:
            conn.close()

    async def _execute(self, sql: str):
        loop = asyncio.get_event_loop()
        cols, rows = await loop.run_in_executor(None, self._sync_execute, sql)
        return cols, rows, len(rows)

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        try:
            await self._execute("SELECT 1")
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        extra = self.config.get("extra_config") or {}
        catalog = extra.get("catalog", self.config.get("database_name", "hive"))
        _, rows, _ = await self._execute(f"SHOW SCHEMAS FROM {catalog}")
        return [r[0] for r in rows]

    async def get_tables(self, schema: str = "default") -> list[TableInfo]:
        extra = self.config.get("extra_config") or {}
        catalog = extra.get("catalog", self.config.get("database_name", "hive"))
        _, rows, _ = await self._execute(f'SHOW TABLES FROM "{catalog}"."{schema}"')
        return [TableInfo(name=r[0], schema=schema) for r in rows]

    async def get_columns(self, table: str, schema: str = "default") -> list[ColumnInfo]:
        extra = self.config.get("extra_config") or {}
        catalog = extra.get("catalog", self.config.get("database_name", "hive"))
        _, rows, _ = await self._execute(f'DESCRIBE "{catalog}"."{schema}"."{table}"')
        return [ColumnInfo(name=r[0], data_type=r[1], is_nullable=True) for r in rows]

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        t0 = time.monotonic()
        cols, rows, count = await asyncio.wait_for(self._execute(sql), timeout=timeout)
        return QueryResult(columns=cols, rows=rows, row_count=count,
                           execution_time_ms=int((time.monotonic() - t0) * 1000))
