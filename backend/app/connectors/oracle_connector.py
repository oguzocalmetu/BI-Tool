import asyncio
import time
from typing import Optional, Any

try:
    import oracledb
    ORACLE_AVAILABLE = True
except ImportError:
    ORACLE_AVAILABLE = False

from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult


class OracleConnector(BaseConnector):
    def _dsn(self) -> str:
        host = self.config.get("host", "localhost")
        port = self.config.get("port", 1521)
        svc = self.config.get("database_name", "ORCL")
        return f"{host}:{port}/{svc}"

    def _sync_execute(self, sql: str, params: dict | None = None) -> tuple[list[str], list[list[Any]]]:
        if not ORACLE_AVAILABLE:
            raise RuntimeError("oracledb not installed. Run: pip install oracledb")
        conn = oracledb.connect(
            user=self.config.get("username"),
            password=self.config.get("password", ""),
            dsn=self._dsn(),
        )
        try:
            cur = conn.cursor()
            cur.execute(sql, params or {})
            columns = [d[0].lower() for d in (cur.description or [])]
            rows = [list(row) for row in cur.fetchall()]
            return columns, rows
        finally:
            conn.close()

    async def _execute(self, sql: str, params=None):
        loop = asyncio.get_event_loop()
        cols, rows = await loop.run_in_executor(None, self._sync_execute, sql, params)
        return cols, rows, len(rows)

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        try:
            await self._execute("SELECT 1 FROM DUAL")
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        _, rows, _ = await self._execute("SELECT DISTINCT OWNER FROM ALL_TABLES ORDER BY OWNER")
        return [r[0] for r in rows]

    async def get_tables(self, schema: str = "PUBLIC") -> list[TableInfo]:
        sql = "SELECT TABLE_NAME, NUM_ROWS FROM ALL_TABLES WHERE OWNER = :owner ORDER BY TABLE_NAME"
        _, rows, _ = await self._execute(sql, {"owner": schema.upper()})
        return [TableInfo(name=r[0], schema=schema, row_count=r[1]) for r in rows]

    async def get_columns(self, table: str, schema: str = "PUBLIC") -> list[ColumnInfo]:
        sql = ("SELECT COLUMN_NAME, DATA_TYPE, NULLABLE, DATA_DEFAULT "
               "FROM ALL_TAB_COLUMNS WHERE OWNER = :owner AND TABLE_NAME = :table ORDER BY COLUMN_ID")
        _, rows, _ = await self._execute(sql, {"owner": schema.upper(), "table": table.upper()})
        return [ColumnInfo(name=r[0].lower(), data_type=r[1],
                           is_nullable=(r[2] == "Y"),
                           default_value=str(r[3]).strip() if r[3] else None)
                for r in rows]

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        t0 = time.monotonic()
        cols, rows, count = await asyncio.wait_for(self._execute(sql, params), timeout=timeout)
        return QueryResult(columns=cols, rows=rows, row_count=count,
                           execution_time_ms=int((time.monotonic() - t0) * 1000))
