from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, BigInteger, Numeric
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.sql import func
from app.db.base import Base

class BiDataset(Base):
    __tablename__ = "bi_datasets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    connection_id = Column(Integer, ForeignKey("bi_connections.id"))
    source_type = Column(String(50), nullable=False)  # table, view, custom_sql, csv
    schema_name = Column(String(255))
    table_name = Column(String(255))
    custom_sql = Column(Text)
    row_count_est = Column(BigInteger)
    last_profiled_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class BiDatasetColumn(Base):
    __tablename__ = "bi_dataset_columns"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id", ondelete="CASCADE"))
    column_name = Column(String(255), nullable=False)
    data_type = Column(String(100))
    semantic_type = Column(String(50))  # metric, dimension, date, id, text
    display_name = Column(String(255))
    is_nullable = Column(Boolean)
    unique_count = Column(BigInteger)
    null_count = Column(BigInteger)
    null_pct = Column(Numeric(5, 2))
    min_value = Column(Text)
    max_value = Column(Text)
    avg_value = Column(Numeric)
    sample_values = Column(JSONB)
    quality_score = Column(Numeric(3, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BiDataProfile(Base):
    __tablename__ = "bi_data_profiles"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id", ondelete="CASCADE"))
    profile_json = Column(JSONB, nullable=False)
    row_count = Column(BigInteger)
    column_count = Column(Integer)
    quality_score = Column(Numeric(3, 2))
    duplicate_count = Column(BigInteger)
    profiled_at = Column(DateTime(timezone=True), server_default=func.now())
