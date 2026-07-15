from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.services.dataset_service import create_dataset, get_dataset, list_datasets, get_dataset_columns, get_latest_profile
from app.services.query_service import preview_dataset
from app.services.profiling_service import run_profiling
from app.models.connection import BiConnection
from sqlalchemy import select
from app.schemas.dataset import DatasetCreate, DatasetResponse, ColumnProfileResponse

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("", response_model=list[DatasetResponse])
async def list_ds(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await list_datasets(db)

@router.post("", response_model=DatasetResponse, status_code=201)
async def create_ds(
    data: DatasetCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ds = await create_dataset(data, current_user.id, db)
    # Trigger profiling in background
    background_tasks.add_task(run_profiling_bg, ds.id)
    return ds

async def run_profiling_bg(dataset_id: int):
    """Run profiling in background with its own session."""
    from app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        try:
            await run_profiling(dataset_id, session)
            await session.commit()
        except Exception as e:
            await session.rollback()

@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_ds(dataset_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_dataset(dataset_id, db)

@router.get("/{dataset_id}/columns", response_model=list[ColumnProfileResponse])
async def get_cols(dataset_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_dataset_columns(dataset_id, db)

@router.post("/{dataset_id}/preview")
async def preview_ds(
    dataset_id: int,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ds = await get_dataset(dataset_id, db)
    result = await db.execute(select(BiConnection).where(BiConnection.id == ds.connection_id))
    connection = result.scalar_one_or_none()
    preview = await preview_dataset(ds, connection, limit=min(limit, 500))
    return preview

@router.post("/{dataset_id}/profile")
async def profile_ds(
    dataset_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    background_tasks.add_task(run_profiling_bg, dataset_id)
    return {"message": "Profiling started", "dataset_id": dataset_id}

@router.get("/{dataset_id}/profile")
async def get_profile(dataset_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    profile = await get_latest_profile(dataset_id, db)
    if not profile:
        return {"message": "No profile available. Run profiling first.", "dataset_id": dataset_id}
    return {
        "dataset_id": dataset_id,
        "row_count": profile.row_count,
        "column_count": profile.column_count,
        "quality_score": float(profile.quality_score) if profile.quality_score else None,
        "profiled_at": profile.profiled_at,
        "profile": profile.profile_json,
    }
