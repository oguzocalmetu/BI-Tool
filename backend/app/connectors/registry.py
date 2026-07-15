from app.connectors.base import BaseConnector
from app.connectors.postgresql import PostgreSQLConnector
from app.connectors.csv_connector import CSVConnector
from app.connectors.mysql_connector import MySQLConnector
from app.connectors.oracle_connector import OracleConnector
from app.connectors.trino_connector import TrinoConnector
from app.connectors.clickhouse_connector import ClickHouseConnector
from app.connectors.sqlite_connector import SQLiteConnector
from app.connectors.snowflake_connector import SnowflakeConnector
from app.core.security import decrypt_secret

CONNECTOR_MAP: dict[str, type[BaseConnector]] = {
    "postgresql": PostgreSQLConnector,
    "mysql": MySQLConnector,
    "oracle": OracleConnector,
    "trino": TrinoConnector,
    "clickhouse": ClickHouseConnector,
    "sqlite": SQLiteConnector,
    "snowflake": SnowflakeConnector,
    "csv": CSVConnector,
    "excel": CSVConnector,
}

# Human-readable labels for the UI
CONNECTOR_LABELS: dict[str, str] = {
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "oracle": "Oracle",
    "trino": "Trino",
    "clickhouse": "ClickHouse",
    "sqlite": "SQLite",
    "snowflake": "Snowflake",
    "csv": "CSV / TSV",
    "excel": "Excel (.xlsx)",
}

# Default ports per type
CONNECTOR_DEFAULT_PORTS: dict[str, int] = {
    "postgresql": 5432,
    "mysql": 3306,
    "oracle": 1521,
    "trino": 8080,
    "clickhouse": 8123,
    "snowflake": 443,
}


class ConnectorRegistry:
    def get_connector(self, connection_model) -> BaseConnector:
        conn_type = connection_model.type
        cls = CONNECTOR_MAP.get(conn_type)
        if not cls:
            raise ValueError(f"Unsupported connection type: {conn_type}")

        extra = connection_model.extra_config or {}
        config: dict = {
            "host": connection_model.host,
            "port": connection_model.port,
            "database_name": connection_model.database_name,
            "username": connection_model.username,
            "extra_config": extra,
            # CSV / Excel / SQLite specific
            "file_path": extra.get("file_path"),
            "delimiter": extra.get("delimiter", ","),
            "encoding": extra.get("encoding", "utf-8"),
        }
        if connection_model.encrypted_password:
            try:
                config["password"] = decrypt_secret(connection_model.encrypted_password)
            except Exception:
                config["password"] = connection_model.encrypted_password

        return cls(config)

    def list_types(self) -> list[dict]:
        return [
            {"type": k, "label": CONNECTOR_LABELS.get(k, k),
             "default_port": CONNECTOR_DEFAULT_PORTS.get(k)}
            for k in CONNECTOR_MAP
        ]


connector_registry = ConnectorRegistry()
