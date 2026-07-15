from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.dashboard import BiDashboard, BiDashboardWidget, BiDashboardFilter
from app.models.dataset import BiDataset
from app.models.connection import BiConnection
from app.dependencies import get_current_user
from app.services.dashboard_service import create_dashboard, get_dashboard, list_dashboards, get_dashboard_detail, save_ai_dashboard, generate_ai_dashboard
from app.services.query_service import execute_widget_query
from app.schemas.dashboard import DashboardCreate, DashboardResponse
from app.schemas.ai import AIGenerateRequest, AIDashboardDraft
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

@router.get("", response_model=list[DashboardResponse])
async def list_dash(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await list_dashboards(db)

@router.post("", response_model=DashboardResponse, status_code=201)
async def create_dash(data: DashboardCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await create_dashboard(data, current_user.id, db)

@router.get("/{dashboard_id}")
async def get_dash(dashboard_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_dashboard_detail(dashboard_id, db)

@router.delete("/{dashboard_id}", status_code=204)
async def delete_dash(dashboard_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    dash = await get_dashboard(dashboard_id, db)
    dash.is_active = False
    await db.flush()

router_ai = APIRouter(prefix="/ai", tags=["ai"])

@router_ai.post("/datasets/{dataset_id}/generate-dashboard")
async def ai_generate(
    dataset_id: int,
    request: AIGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await generate_ai_dashboard(dataset_id, request, current_user.id, db)

@router_ai.post("/datasets/{dataset_id}/suggest-metrics")
async def ai_suggest_metrics(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.ai.chains.dashboard_generator import suggest_metrics_and_dimensions
    from app.services.dataset_service import get_dataset, get_dataset_columns
    from app.services.dashboard_service import get_semantic_layer
    
    dataset = await get_dataset(dataset_id, db)
    columns = await get_dataset_columns(dataset_id, db)
    cols_dicts = [{"column_name": c.column_name, "data_type": c.data_type, "semantic_type": c.semantic_type, "sample_values": c.sample_values} for c in columns]
    
    result, tokens = await suggest_metrics_and_dimensions(cols_dicts, dataset.row_count_est or 0)
    return result

@router_ai.post("/datasets/{dataset_id}/save-dashboard")
async def ai_save_dashboard(
    dataset_id: int,
    draft: AIDashboardDraft,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dash = await save_ai_dashboard(draft, dataset_id, current_user.id, db)
    return {"dashboard_id": dash.id, "message": "Dashboard saved successfully"}

router_query = APIRouter(prefix="/query", tags=["query"])

@router_query.post("/execute")
async def execute_query(
    dataset_id: int,
    sql: str,
    params: dict = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.dataset_service import get_dataset
    dataset = await get_dataset(dataset_id, db)
    result = await db.execute(select(BiConnection).where(BiConnection.id == dataset.connection_id))
    connection = result.scalar_one_or_none()
    return await execute_widget_query(sql, connection, params)

@router_query.post("/widget/{widget_id}")
async def widget_query(
    widget_id: int,
    params: dict = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    widget_result = await db.execute(select(BiDashboardWidget).where(BiDashboardWidget.id == widget_id))
    widget = widget_result.scalar_one_or_none()
    if not widget:
        raise NotFoundException("Widget")
    
    dash_result = await db.execute(select(BiDashboard).where(BiDashboard.id == widget.dashboard_id))
    dashboard = dash_result.scalar_one_or_none()
    
    ds_result = await db.execute(select(BiDataset).where(BiDataset.id == dashboard.dataset_id))
    dataset = ds_result.scalar_one_or_none()
    
    conn_result = await db.execute(select(BiConnection).where(BiConnection.id == dataset.connection_id))
    connection = conn_result.scalar_one_or_none()
    
    return await execute_widget_query(widget.query_sql, connection, params or {})


@router_query.post("/sql")
async def execute_raw_sql(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Execute arbitrary SQL against a dataset's connection (used by the dashboard builder)."""
    from app.utils.query_validator import validate_sql
    from app.services.query_service import execute_widget_query
    from app.models.dataset import BiDataset
    
    sql: str = body.get("sql", "")
    dataset_id: int = body.get("dataset_id")
    
    if not sql.strip():
        raise HTTPException(status_code=400, detail="SQL is required")
    
    validated_sql = validate_sql(sql)
    
    if dataset_id:
        ds_result = await db.execute(select(BiDataset).where(BiDataset.id == dataset_id))
        dataset = ds_result.scalar_one_or_none()
        if not dataset:
            raise NotFoundException("Dataset")
        conn_result = await db.execute(select(BiConnection).where(BiConnection.id == dataset.connection_id))
        connection = conn_result.scalar_one_or_none()
    else:
        # Fallback: use first active connection
        conn_result = await db.execute(
            select(BiConnection).where(BiConnection.is_active == True).limit(1)
        )
        connection = conn_result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=400, detail="No connection found")
    
    return await execute_widget_query(validated_sql, connection, {})
