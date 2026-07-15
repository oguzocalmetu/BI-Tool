from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.session import get_db
from app.models.user import User
from app.models.semantic import BiSemanticMetric, BiSemanticDimension
from app.dependencies import get_current_user
from app.schemas.dashboard import SemanticMetricCreate, SemanticMetricResponse, SemanticDimensionCreate, SemanticDimensionResponse

router = APIRouter(prefix="/datasets", tags=["semantic"])

@router.get("/{dataset_id}/semantic")
async def get_semantic(dataset_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    metrics = await db.execute(select(BiSemanticMetric).where(BiSemanticMetric.dataset_id == dataset_id))
    dims = await db.execute(select(BiSemanticDimension).where(BiSemanticDimension.dataset_id == dataset_id))
    return {
        "metrics": [m.__dict__ for m in metrics.scalars().all()],
        "dimensions": [d.__dict__ for d in dims.scalars().all()]
    }

@router.post("/{dataset_id}/metrics", response_model=SemanticMetricResponse, status_code=201)
async def create_metric(
    dataset_id: int,
    data: SemanticMetricCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    metric = BiSemanticMetric(
        dataset_id=dataset_id,
        metric_name=data.metric_name,
        display_name=data.display_name,
        expression=data.expression,
        aggregation_type=data.aggregation_type,
        format_type=data.format_type,
        description=data.description,
        created_by=current_user.id,
    )
    db.add(metric)
    await db.flush()
    await db.refresh(metric)
    return metric

@router.delete("/{dataset_id}/metrics/{metric_id}", status_code=204)
async def delete_metric(dataset_id: int, metric_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(BiSemanticMetric).where(BiSemanticMetric.id == metric_id))

@router.post("/{dataset_id}/dimensions", response_model=SemanticDimensionResponse, status_code=201)
async def create_dimension(
    dataset_id: int,
    data: SemanticDimensionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dim = BiSemanticDimension(
        dataset_id=dataset_id,
        dimension_name=data.dimension_name,
        display_name=data.display_name,
        column_name=data.column_name,
        data_type=data.data_type,
        is_time_dimension=data.is_time_dimension,
        time_grain=data.time_grain,
        description=data.description,
    )
    db.add(dim)
    await db.flush()
    await db.refresh(dim)
    return dim
