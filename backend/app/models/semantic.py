from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class BiSemanticMetric(Base):
    __tablename__ = "bi_semantic_metrics"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id", ondelete="CASCADE"))
    metric_name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    expression = Column(Text, nullable=False)
    aggregation_type = Column(String(50))  # sum, count, avg, min, max, count_distinct
    format_type = Column(String(50), default="number")  # currency, percent, number, duration
    description = Column(Text)
    is_ai_suggested = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BiSemanticDimension(Base):
    __tablename__ = "bi_semantic_dimensions"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id", ondelete="CASCADE"))
    dimension_name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    column_name = Column(String(255), nullable=False)
    data_type = Column(String(100))
    is_time_dimension = Column(Boolean, default=False)
    time_grain = Column(String(50))  # day, week, month, quarter, year
    description = Column(Text)
    is_ai_suggested = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
