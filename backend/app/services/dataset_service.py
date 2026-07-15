from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.dataset import BiDataset, BiDatasetColumn, BiDataProfile
from app.core.exceptions import NotFoundException
from app.schemas.dataset import DatasetCreate

async def create_dataset(data: DatasetCreate, user_id: int, db: AsyncSession) -> BiDataset:
    ds = BiDataset(
        name=data.name,
        description=data.description,
        connection_id=data.connection_id,
        source_type=data.source_type,
        schema_name=data.schema_name,
        table_name=data.table_name,
        custom_sql=data.custom_sql,
        created_by=user_id,
    )
    db.add(ds)
    await db.flush()
    await db.refresh(ds)
    return ds

async def get_dataset(dataset_id: int, db: AsyncSession) -> BiDataset:
    result = await db.execute(select(BiDataset).where(BiDataset.id == dataset_id, BiDataset.is_active == True))
    ds = result.scalar_one_or_none()
    if not ds:
        raise NotFoundException("Dataset")
    return ds

async def list_datasets(db: AsyncSession) -> list[BiDataset]:
    result = await db.execute(select(BiDataset).where(BiDataset.is_active == True).order_by(BiDataset.created_at.desc()))
    return result.scalars().all()

async def get_dataset_columns(dataset_id: int, db: AsyncSession) -> list[BiDatasetColumn]:
    result = await db.execute(select(BiDatasetColumn).where(BiDatasetColumn.dataset_id == dataset_id))
    return result.scalars().all()

async def get_latest_profile(dataset_id: int, db: AsyncSession):
    result = await db.execute(
        select(BiDataProfile)
        .where(BiDataProfile.dataset_id == dataset_id)
        .order_by(BiDataProfile.profiled_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
