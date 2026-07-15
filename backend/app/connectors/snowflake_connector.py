import asyncio
import time
from typing import Optional, Any

try:
    import snowflake.connector
    SNOWFLAKE_AVAILABLE = True
except ImportError:
    SNOWFLAKE_AVAILABLE = False

from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult


class SnowflakeConnector(BaseConnector):
    def _params(self) -> dict:
        extra = self.config.get("extra_config") or {}
        p = {
            "account": self.config.get("host", ""),
            "user": self.config.get("username"),
            "password": self.config.get("password", ""),
            "database": self.config.get("database_name"),
        }
        for k in ("warehouse", "role", "schema"):
            if extra.get(k):
                p[k] = extra[k]
        return {k: v for k, v in p.items() if v}

    def _sync_execute(self, sql: str) -> tuple[list[str], list[list[Any]]]:
        if not SNOWFLAKE_AVAILABLE:
            raise RuntimeError(
                "snowflake-connector-python not installed. "
                "Run: pip install snowflake-connector-python"
            )
        conn = snowflake.connector.connect(**self._params())
        try:
            cur = conn.cursor()
            cur.execute(sql)
            columns = [d[0].lower() for d in (cur.description or [])]
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
            await self._execute("SELECT CURRENT_VERSION()")
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        _, rows, _ = await self._execute("SHOW SCHEMAS")
        return [r[1] for r in rows if r[1] != "INFORMATION_SCHEMA"]

    async def get_tables(self, schema: str = "PUBLIC") -> list[TableInfo]:
        db = self.config.get("database_name", "")
        _, rows, _ = await self._execute(f'SHOW TABLES IN SCHEMA "{db}"."{schema}"')
        return [TableInfo(name=r[1], schema=schema) for r in rows]

    async def get_columns(self, table: str, schema: str = "PUBLIC") -> list[ColumnInfo]:
        db = self.config.get("database_name", "")
        sql = (f"SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT "
               f"FROM INFORMATION_SCHEMA.COLUMNS "
               f"WHERE TABLE_SCHEMA = '{schema.upper()}' AND TABLE_NAME = '{table.upper()}' "
               f"ORDER BY ORDINAL_POSITION")
        _, rows, _ = await self._execute(sql)
        return [ColumnInfo(name=r[0].lower(), data_type=r[1],
                           is_nullable=(r[2] == "YES"),
                           default_value=str(r[3]) if r[3] else None)
                for r in rows]

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        t0 = time.monotonic()
        cols, rows, count = await asyncio.wait_for(self._execute(sql), timeout=timeout)
        return QueryResult(columns=cols, rows=rows, row_count=count,
                           execution_time_ms=int((time.monotonic() - t0) * 1000))
