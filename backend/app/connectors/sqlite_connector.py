import asyncio
import time
from typing import Optional, Any

try:
    import aiosqlite
    AIOSQLITE_AVAILABLE = True
except ImportError:
    AIOSQLITE_AVAILABLE = False

from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult


class SQLiteConnector(BaseConnector):
    @property
    def db_path(self) -> str:
        return (self.config.get("file_path") or
                self.config.get("database_name") or ":memory:")

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        if not AIOSQLITE_AVAILABLE:
            return False, "aiosqlite not installed. Run: pip install aiosqlite"
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("SELECT 1")
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        return ["main"]

    async def get_tables(self, schema: str = "main") -> list[TableInfo]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ) as cur:
                rows = await cur.fetchall()
        return [TableInfo(name=r[0], schema="main") for r in rows]

    async def get_columns(self, table: str, schema: str = "main") -> list[ColumnInfo]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(f"PRAGMA table_info('{table}')") as cur:
                rows = await cur.fetchall()
        # rows: (cid, name, type, notnull, dflt_value, pk)
        return [ColumnInfo(name=r[1], data_type=r[2] or "TEXT",
                           is_nullable=(r[3] == 0),
                           default_value=str(r[4]) if r[4] else None)
                for r in rows]

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        t0 = time.monotonic()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(sql) as cur:
                columns = [d[0] for d in (cur.description or [])]
                rows = [list(r) for r in await cur.fetchall()]
        return QueryResult(columns=columns, rows=rows, row_count=len(rows),
                           execution_time_ms=int((time.monotonic() - t0) * 1000))

    async def execute_preview(self, table: str, schema: str = "main", limit: int = 100) -> QueryResult:
        return await self.execute_query(f'SELECT * FROM "{table}" LIMIT {limit}')
