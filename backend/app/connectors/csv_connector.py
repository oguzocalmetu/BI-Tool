import time
import io
import os
from typing import Optional
import pandas as pd
from app.connectors.base import BaseConnector, TableInfo, ColumnInfo, QueryResult

class CSVConnector(BaseConnector):
    def _get_file_path(self) -> str:
        return self.config.get("file_path", "")

    def _load_df(self) -> pd.DataFrame:
        path = self._get_file_path()
        delimiter = self.config.get("delimiter", ",")
        encoding = self.config.get("encoding", "utf-8")
        if path.endswith(".xlsx") or path.endswith(".xls"):
            return pd.read_excel(path)
        return pd.read_csv(path, delimiter=delimiter, encoding=encoding)

    async def test_connection(self) -> tuple[bool, Optional[str]]:
        try:
            path = self._get_file_path()
            if not os.path.exists(path):
                return False, f"File not found: {path}"
            self._load_df()
            return True, None
        except Exception as e:
            return False, str(e)

    async def get_schemas(self) -> list[str]:
        return ["default"]

    async def get_tables(self, schema: str = "default") -> list[TableInfo]:
        path = self._get_file_path()
        name = os.path.basename(path).split(".")[0]
        return [TableInfo(name=name, schema="default")]

    async def get_columns(self, table: str, schema: str = "default") -> list[ColumnInfo]:
        df = self._load_df()
        cols = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            data_type = "TEXT"
            if "int" in dtype:
                data_type = "INTEGER"
            elif "float" in dtype:
                data_type = "FLOAT"
            elif "datetime" in dtype:
                data_type = "TIMESTAMP"
            elif "bool" in dtype:
                data_type = "BOOLEAN"
            cols.append(ColumnInfo(name=col, data_type=data_type, is_nullable=True))
        return cols

    async def execute_query(self, sql: str, params: dict = None, timeout: int = 30) -> QueryResult:
        """Execute SQL on CSV using DuckDB for full SQL support"""
        try:
            import duckdb
            df = self._load_df()
            # Register as a table
            table_name = os.path.basename(self._get_file_path()).split(".")[0]
            conn = duckdb.connect(":memory:")
            conn.register(table_name, df)
            start = time.time()
            result = conn.execute(sql).fetchdf()
            elapsed = int((time.time() - start) * 1000)
            columns = list(result.columns)
            rows = result.values.tolist()
            rows = [[str(v) if pd.isna(v) or not isinstance(v, (int, float, str, bool, type(None))) else (None if pd.isna(v) else v) for v in row] for row in rows]
            return QueryResult(columns=columns, rows=rows, row_count=len(rows), execution_time_ms=elapsed)
        except ImportError:
            # Fallback: pandas query
            start = time.time()
            df = self._load_df()
            elapsed = int((time.time() - start) * 1000)
            columns = list(df.columns)
            rows = df.head(1000).values.tolist()
            return QueryResult(columns=columns, rows=rows, row_count=len(rows), execution_time_ms=elapsed)
