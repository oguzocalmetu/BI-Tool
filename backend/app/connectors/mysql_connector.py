import asyncio
import time
from typing import Optional, Any

try:
    import aiomysql
    AIOMYSQL_AVAILABLE = True
except ImportError:
    AIOMYSQL_AVAILABLE = False

from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult


class MySQLConnector(BaseConnector):
    def _cfg(self) -> dict:
        return dict(
            host=self.config.get("host", "localhost"),
            port=int(self.config.get("port", 3306)),
            user=self.config.get("username"),
            password=self.config.get("password", ""),
            db=self.config.get("database_name"),
            charset="utf8mb4",
            autocommit=True,
        )

    async def _execute(self, sql: str, params=None) -> tuple[list[str], list[list[Any]], int]:
        if not AIOMYSQL_AVAILABLE:
            raise RuntimeError("aiomysql not installed. Run: pip install aiomysql")
        conn = await aiomysql.connect(**self._cfg())
        try:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                columns = [d[0] for d in (cur.description or [])]
                rows = [list(row) for row in await cur.fetchall()]
                return columns, rows, len(rows)
        finally:
            conn.close()

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        try:
            await self._execute("SELECT 1 AS ok")
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        _, rows, _ = await self._execute("SHOW DATABASES")
        skip = {"information_schema", "performance_schema", "mysql", "sys"}
        return [r[0] for r in rows if r[0] not in skip]

    async def get_tables(self, schema: str = None) -> list[TableInfo]:
        db = schema or self.config.get("database_name", "")
        sql = ("SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES "
               "WHERE TABLE_SCHEMA = %s ORDER BY TABLE_NAME")
        _, rows, _ = await self._execute(sql, (db,))
        return [TableInfo(name=r[0], schema=db, row_count=r[1]) for r in rows]

    async def get_columns(self, table: str, schema: str = None) -> list[ColumnInfo]:
        db = schema or self.config.get("database_name", "")
        sql = ("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT "
               "FROM information_schema.COLUMNS "
               "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s ORDER BY ORDINAL_POSITION")
        _, rows, _ = await self._execute(sql, (db, table))
        return [ColumnInfo(name=r[0], data_type=r[1],
                           is_nullable=(r[2] == "YES"),
                           default_value=str(r[3]) if r[3] is not None else None)
                for r in rows]

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        t0 = time.monotonic()
        cols, rows, count = await asyncio.wait_for(self._execute(sql), timeout=timeout)
        return QueryResult(columns=cols, rows=rows, row_count=count,
                           execution_time_ms=int((time.monotonic() - t0) * 1000))

    async def execute_preview(self, table: str, schema: str = None, limit: int = 100) -> QueryResult:
        db = schema or self.config.get("database_name", "")
        return await self.execute_query(f"SELECT * FROM `{db}`.`{table}` LIMIT {limit}")
