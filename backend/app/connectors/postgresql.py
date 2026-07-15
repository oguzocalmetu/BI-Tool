import asyncio
import time
from typing import Optional
import asyncpg
from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult

class PostgreSQLConnector(BaseConnector):
    def _conn_kwargs(self) -> dict:
        """Build asyncpg kwargs — avoids DSN ssl= parameter bug."""
        c = self.config
        ssl_val = c.get("ssl") or (c.get("extra_config") or {}).get("ssl")
        kwargs = dict(
            host=c.get("host", "localhost"),
            port=int(c.get("port", 5432)),
            database=c.get("database_name", c.get("database", "postgres")),
            user=c.get("username", "postgres"),
            password=c.get("password", ""),
            timeout=10,
        )
        if ssl_val and str(ssl_val).lower() not in ("disable", "false", "0", ""):
            kwargs["ssl"] = ssl_val
        return kwargs

    async def _connect(self):
        return await asyncpg.connect(**self._conn_kwargs())

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        try:
            start = time.time()
            conn = await self._connect()
            await conn.fetchval("SELECT 1")
            await conn.close()
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        conn = await self._connect()
        try:
            rows = await conn.fetch("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                ORDER BY schema_name
            """)
            return [r["schema_name"] for r in rows]
        finally:
            await conn.close()

    async def get_tables(self, schema: str = "public") -> list[TableInfo]:
        conn = await self._connect()
        try:
            rows = await conn.fetch("""
                SELECT table_name, table_type
                FROM information_schema.tables
                WHERE table_schema = $1
                ORDER BY table_name
            """, schema)
            return [TableInfo(name=r["table_name"], schema=schema) for r in rows]
        finally:
            await conn.close()

    async def get_columns(self, table: str, schema: str = "public") -> list[ColumnInfo]:
        conn = await self._connect()
        try:
            rows = await conn.fetch("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name = $2
                ORDER BY ordinal_position
            """, schema, table)
            return [ColumnInfo(
                name=r["column_name"],
                data_type=r["data_type"],
                is_nullable=r["is_nullable"] == "YES",
                default_value=r["column_default"]
            ) for r in rows]
        finally:
            await conn.close()

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        conn = await self._connect()
        start = time.time()
        try:
            async with asyncio.timeout(timeout):
                rows = await conn.fetch(sql)
                elapsed = int((time.time() - start) * 1000)
                if not rows:
                    # Try to get columns from the statement
                    stmt = await conn.prepare(sql)
                    cols = [a.name for a in stmt.get_attributes()]
                    return QueryResult(columns=cols, rows=[], row_count=0, execution_time_ms=elapsed)
                columns = list(rows[0].keys())
                data = [[row[col] for col in columns] for row in rows]
                # Convert non-serializable types
                serialized = []
                for row in data:
                    serialized.append([str(v) if not isinstance(v, (int, float, str, bool, type(None))) else v for v in row])
                return QueryResult(columns=columns, rows=serialized, row_count=len(serialized), execution_time_ms=elapsed)
        except asyncio.TimeoutError:
            raise TimeoutError(f"Query timed out after {timeout}s")
        finally:
            await conn.close()
