import json
import re
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.dataset import BiDataset, BiDatasetColumn, BiDataProfile
from app.models.connection import BiConnection
from app.connectors.registry import connector_registry

def infer_semantic_type(col_name: str, data_type: str, unique_count: int, total_count: int) -> str:
    name = col_name.lower()
    dt = data_type.lower() if data_type else ""
    unique_ratio = (unique_count / total_count) if total_count > 0 else 0

    # ID detection
    if name == "id" or name.endswith("_id") or name.startswith("id_"):
        return "id"

    # Date detection
    if any(kw in dt for kw in ["date", "time", "timestamp"]):
        return "date"
    if any(kw in name for kw in ["date", "time", "created", "updated", "at", "_at", "_on"]):
        return "date"

    # Metric detection
    if any(kw in dt for kw in ["int", "float", "numeric", "decimal", "double", "real"]):
        if any(kw in name for kw in ["amount", "price", "revenue", "cost", "count",
                                      "qty", "quantity", "total", "sum", "value",
                                      "sales", "score", "rate", "ratio", "pct", "percent"]):
            return "metric"
        # Generic numeric with low unique ratio could be metric
        if unique_ratio > 0.5:
            return "metric"

    # Dimension detection
    if any(kw in dt for kw in ["varchar", "text", "char", "string"]):
        if unique_ratio < 0.1 and total_count > 10:
            return "dimension"

    # High cardinality text = name/description
    if any(kw in dt for kw in ["varchar", "text"]) and unique_ratio > 0.8:
        return "text"

    # Boolean
    if "bool" in dt:
        return "dimension"

    return "dimension"

async def run_profiling(dataset_id: int, db: AsyncSession) -> dict:
    """Run full data profiling on a dataset."""
    result = await db.execute(select(BiDataset).where(BiDataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        return {"error": "Dataset not found"}

    result = await db.execute(select(BiConnection).where(BiConnection.id == dataset.connection_id))
    connection = result.scalar_one_or_none()
    if not connection:
        return {"error": "Connection not found"}

    connector = connector_registry.get_connector(connection)

    # Get table name / SQL
    if dataset.source_type == "custom_sql":
        base_sql = f"({dataset.custom_sql})"
        table_ref = f"({dataset.custom_sql}) AS __profile_src"
    else:
        schema = dataset.schema_name or "public"
        table_ref = f'"{schema}"."{dataset.table_name}"'
        base_sql = table_ref

    # Get total row count
    try:
        count_result = await connector.execute_query(f"SELECT COUNT(*) AS cnt FROM {table_ref}")
        total_count = int(count_result.rows[0][0]) if count_result.rows else 0
    except Exception:
        total_count = 0

    # Get columns
    if dataset.source_type == "custom_sql":
        col_result = await connector.execute_query(f"SELECT * FROM {table_ref} LIMIT 1")
        columns_raw = col_result.columns
        col_types = {}
        for col in columns_raw:
            col_types[col] = "text"
    else:
        schema = dataset.schema_name or "public"
        cols_info = await connector.get_columns(dataset.table_name, schema)
        columns_raw = [c.name for c in cols_info]
        col_types = {c.name: c.data_type for c in cols_info}

    # Delete existing columns
    await db.execute(delete(BiDatasetColumn).where(BiDatasetColumn.dataset_id == dataset_id))

    profile_columns = []
    for col_name in columns_raw:
        data_type = col_types.get(col_name, "text")
        try:
            stats_sql = f"""
                SELECT
                    COUNT(*) as total,
                    COUNT("{col_name}") as non_null,
                    COUNT(*) - COUNT("{col_name}") as null_cnt,
                    COUNT(DISTINCT "{col_name}") as uniq
                FROM {table_ref}
            """
            stats = await connector.execute_query(stats_sql)
            row = stats.rows[0] if stats.rows else [total_count, total_count, 0, 0]
            total, non_null, null_cnt, uniq = int(row[0] or 0), int(row[1] or 0), int(row[2] or 0), int(row[3] or 0)
            null_pct = round(100.0 * null_cnt / total, 2) if total > 0 else 0

            min_val = max_val = avg_val = None
            dt_lower = data_type.lower()
            if any(kw in dt_lower for kw in ["int", "float", "numeric", "decimal", "double"]):
                try:
                    num_stats = await connector.execute_query(
                        f'SELECT MIN("{col_name}"), MAX("{col_name}"), AVG("{col_name}") FROM {table_ref} WHERE "{col_name}" IS NOT NULL'
                    )
                    if num_stats.rows:
                        min_val = str(num_stats.rows[0][0]) if num_stats.rows[0][0] is not None else None
                        max_val = str(num_stats.rows[0][1]) if num_stats.rows[0][1] is not None else None
                        avg_val = float(num_stats.rows[0][2]) if num_stats.rows[0][2] is not None else None
                except Exception:
                    pass

            # Top sample values
            sample_vals = []
            try:
                sample_sql = f'SELECT DISTINCT "{col_name}" FROM {table_ref} WHERE "{col_name}" IS NOT NULL LIMIT 8'
                sample_result = await connector.execute_query(sample_sql)
                sample_vals = [str(r[0]) for r in sample_result.rows if r[0] is not None]
            except Exception:
                pass

            semantic_type = infer_semantic_type(col_name, data_type, uniq, total)
            quality_score = round(1.0 - (null_pct / 100.0), 2)

            col_obj = BiDatasetColumn(
                dataset_id=dataset_id,
                column_name=col_name,
                data_type=data_type,
                semantic_type=semantic_type,
                display_name=col_name.replace("_", " ").title(),
                is_nullable=null_cnt > 0,
                unique_count=uniq,
                null_count=null_cnt,
                null_pct=null_pct,
                min_value=min_val,
                max_value=max_val,
                avg_value=avg_val,
                sample_values=sample_vals,
                quality_score=quality_score,
            )
            db.add(col_obj)
            profile_columns.append({
                "column_name": col_name,
                "data_type": data_type,
                "semantic_type": semantic_type,
                "null_pct": null_pct,
                "unique_count": uniq,
                "min_value": min_val,
                "max_value": max_val,
                "sample_values": sample_vals,
            })
        except Exception as e:
            # Skip problematic columns but continue
            continue

    # Save profile
    from datetime import datetime, timezone
    profile = BiDataProfile(
        dataset_id=dataset_id,
        profile_json={"columns": profile_columns, "total_rows": total_count},
        row_count=total_count,
        column_count=len(columns_raw),
        quality_score=0.9,
    )
    db.add(profile)

    # Update dataset row count
    dataset.row_count_est = total_count
    dataset.last_profiled_at = datetime.now(timezone.utc)

    await db.flush()
    return {"status": "completed", "columns": len(profile_columns), "rows": total_count}
