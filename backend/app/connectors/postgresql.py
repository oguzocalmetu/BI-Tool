import asyncio
import time
from typing import Optional
import asyncpg
from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult

class PostgreSQLConnector(BaseConnector):
    def _build_dsn(self) -> str:
        c = self.config
        ssl = "require" if c.get("ssl") else "prefer"
        return f"postgresql://{c['username']}:{c['password']}@{c['host']}:{c.get('port', 5432)}/{c['database_name']}?ssl={ssl}"

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        try:
            start = time.time()
            conn = await asyncpg.connect(self._build_dsn(), timeout=10)
            await conn.fetchval("SELECT 1")
            await conn.close()
            latency = int((time.time() - start) * 1000)
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        conn = await asyncpg.connect(self._build_dsn())
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
        conn = await asyncpg.connect(self._build_dsn())
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
        conn = await asyncpg.connect(self._build_dsn())
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
        conn = await asyncpg.connect(self._build_dsn())
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
