import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.dashboard import BiDashboard, BiDashboardWidget, BiDashboardFilter, BiDashboardVersion
from app.models.dataset import BiDataset, BiDatasetColumn
from app.models.connection import BiConnection
from app.models.ai_log import BiAiPrompt
from app.models.semantic import BiSemanticMetric, BiSemanticDimension
from app.core.exceptions import NotFoundException
from app.schemas.dashboard import DashboardCreate
from app.config import settings
from app.schemas.ai import AIGenerateRequest, AIDashboardDraft, AISaveRequest
from app.services.query_service import execute_widget_query
import json

async def create_dashboard(data: DashboardCreate, user_id: int, db: AsyncSession) -> BiDashboard:
    dash = BiDashboard(
        name=data.name,
        description=data.description,
        dataset_id=data.dataset_id,
        created_by=user_id,
    )
    db.add(dash)
    await db.flush()
    
    for w in data.widgets:
        widget = BiDashboardWidget(
            dashboard_id=dash.id,
            widget_type=w.widget_type,
            title=w.title,
            description=w.description,
            query_sql=w.query_sql,
            chart_config=w.chart_config or {},
            position_json=w.position_json,
            ai_explanation=w.ai_explanation,
        )
        db.add(widget)
    
    for f in data.filters:
        filt = BiDashboardFilter(
            dashboard_id=dash.id,
            filter_name=f.filter_name,
            filter_type=f.filter_type,
            column_name=f.column_name,
            default_value=f.default_value,
            config=f.config or {},
        )
        db.add(filt)
    
    await db.flush()
    await db.refresh(dash)
    return dash

async def get_dashboard(dashboard_id: int, db: AsyncSession) -> BiDashboard:
    result = await db.execute(select(BiDashboard).where(BiDashboard.id == dashboard_id, BiDashboard.is_active == True))
    dash = result.scalar_one_or_none()
    if not dash:
        raise NotFoundException("Dashboard")
    return dash

async def get_dashboard_detail(dashboard_id: int, db: AsyncSession) -> dict:
    dash = await get_dashboard(dashboard_id, db)
    
    widgets_result = await db.execute(select(BiDashboardWidget).where(BiDashboardWidget.dashboard_id == dashboard_id))
    widgets = widgets_result.scalars().all()
    
    filters_result = await db.execute(select(BiDashboardFilter).where(BiDashboardFilter.dashboard_id == dashboard_id))
    filters = filters_result.scalars().all()
    
    return {"dashboard": dash, "widgets": widgets, "filters": filters}

async def list_dashboards(db: AsyncSession) -> list[BiDashboard]:
    result = await db.execute(select(BiDashboard).where(BiDashboard.is_active == True).order_by(BiDashboard.created_at.desc()))
    return result.scalars().all()

async def save_ai_dashboard(draft: AIDashboardDraft, dataset_id: int, user_id: int, db: AsyncSession) -> BiDashboard:
    """Save an AI-generated dashboard draft to the database."""
    dash = BiDashboard(
        name=draft.dashboard_name,
        description=draft.dashboard_description,
        dataset_id=dataset_id,
        is_ai_generated=True,
        created_by=user_id,
    )
    db.add(dash)
    await db.flush()
    
    for w in draft.widgets:
        widget = BiDashboardWidget(
            dashboard_id=dash.id,
            widget_type=w.type,
            title=w.title,
            description=w.description,
            query_sql=w.query_sql,
            chart_config=w.chart_config or {},
            position_json=w.position,
            ai_explanation=w.ai_explanation,
        )
        db.add(widget)
    
    for f in draft.filters:
        filt = BiDashboardFilter(
            dashboard_id=dash.id,
            filter_name=f.label,
            filter_type=f.type,
            column_name=f.column,
            default_value=None,
            config={"affects_all": f.affects_all},
        )
        db.add(filt)
    
    # Save version snapshot
    version = BiDashboardVersion(
        dashboard_id=dash.id,
        version_number=1,
        snapshot_json=draft.model_dump(),
        change_summary="AI tarafından oluşturuldu.",
        created_by=user_id,
    )
    db.add(version)
    
    await db.flush()
    await db.refresh(dash)
    return dash

async def generate_ai_dashboard(
    dataset_id: int,
    request: AIGenerateRequest,
    user_id: int,
    db: AsyncSession
) -> dict:
    from app.ai.chains.dashboard_generator import generate_dashboard
    from app.utils.query_validator import validate_sql
    import time
    
    # Load dataset
    ds_result = await db.execute(select(BiDataset).where(BiDataset.id == dataset_id))
    dataset = ds_result.scalar_one_or_none()
    if not dataset:
        raise NotFoundException("Dataset")
    
    conn_result = await db.execute(select(BiConnection).where(BiConnection.id == dataset.connection_id))
    connection = conn_result.scalar_one_or_none()
    if not connection:
        raise NotFoundException("Connection")
    
    # Get columns
    cols_result = await db.execute(select(BiDatasetColumn).where(BiDatasetColumn.dataset_id == dataset_id))
    columns = cols_result.scalars().all()
    
    cols_dicts = [{
        "column_name": c.column_name,
        "data_type": c.data_type or "text",
        "semantic_type": c.semantic_type or "unknown",
        "unique_count": c.unique_count,
        "null_pct": float(c.null_pct) if c.null_pct else 0,
        "sample_values": c.sample_values or [],
    } for c in columns]
    
    # Get table reference
    if dataset.source_type == "custom_sql":
        table_ref = f"({dataset.custom_sql}) AS data_source"
    else:
        schema = dataset.schema_name or "public"
        table_ref = f'"{schema}"."{dataset.table_name}"' if connection.type == "postgresql" else dataset.table_name
    
    # Get sample data
    sample_rows = []
    try:
        from app.services.query_service import preview_dataset
        preview = await preview_dataset(dataset, connection, limit=3)
        if preview["columns"] and preview["rows"]:
            for row in preview["rows"][:3]:
                sample_rows.append(dict(zip(preview["columns"], row)))
    except Exception:
        pass
    
    # Generate with AI
    start = time.time()
    draft_json, tokens = await generate_dashboard(
        user_prompt=request.prompt,
        table_ref=table_ref,
        conn_type=connection.type,
        columns=cols_dicts,
        sample_rows=sample_rows,
        audience=request.audience,
        detail_level=request.detail_level,
    )
    elapsed = int((time.time() - start) * 1000)
    
    # Validate SQL in widgets
    errors = []
    warnings = []
    valid_widgets = []
    for w in draft_json.get("widgets", []):
        sql = w.get("query_sql", "")
        if sql:
            val = validate_sql(sql)
            if not val.is_valid:
                warnings.append(f"Widget '{w.get('title')}': {'; '.join(val.errors)}")
            else:
                # Try test execution
                try:
                    from app.connectors.registry import connector_registry
                    connector = connector_registry.get_connector(connection)
                    test_sql = val.sanitized_sql.replace("{start_date}", "2020-01-01").replace("{end_date}", "2099-12-31")
                    # Strip existing LIMIT then add test limit
                    clean_sql = re.sub(r"\bLIMIT\s+\d+\b", "", test_sql, flags=re.IGNORECASE).strip()
                    result = await connector.execute_query(clean_sql + " LIMIT 1", timeout=10)
                    valid_widgets.append(w)
                except Exception as e:
                    warnings.append(f"Widget '{w.get('title')}' query warning: {str(e)[:100]}")
                    valid_widgets.append(w)  # Still include but with warning
        else:
            warnings.append(f"Widget '{w.get('title')}' has no SQL")
    
    draft_json["widgets"] = valid_widgets if valid_widgets else draft_json.get("widgets", [])
    
    # Log AI prompt
    ai_log = BiAiPrompt(
        dataset_id=dataset_id,
        prompt_type="generate",
        user_prompt=request.prompt,
        model_used=settings.AI_MODEL,
        tokens_used=tokens,
        response_json=draft_json,
        validation_errors={"warnings": warnings, "errors": errors},
        duration_ms=elapsed,
        created_by=user_id,
    )
    db.add(ai_log)
    await db.flush()
    
    return {
        "draft": draft_json,
        "validation_errors": errors,
        "warnings": warnings,
        "tokens_used": tokens,
        "duration_ms": elapsed,
    }

async def get_semantic_layer(dataset_id: int, db: AsyncSession) -> dict:
    metrics_result = await db.execute(select(BiSemanticMetric).where(BiSemanticMetric.dataset_id == dataset_id))
    dims_result = await db.execute(select(BiSemanticDimension).where(BiSemanticDimension.dataset_id == dataset_id))
    return {
        "metrics": metrics_result.scalars().all(),
        "dimensions": dims_result.scalars().all()
    }
