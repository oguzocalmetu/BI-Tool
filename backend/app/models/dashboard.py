from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.sql import func
from app.db.base import Base

class BiDashboard(Base):
    __tablename__ = "bi_dashboards"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id"))
    is_public = Column(Boolean, default=False)
    is_ai_generated = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    thumbnail_url = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class BiDashboardWidget(Base):
    __tablename__ = "bi_dashboard_widgets"
    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("bi_dashboards.id", ondelete="CASCADE"))
    widget_type = Column(String(100), nullable=False)
    title = Column(String(255))
    description = Column(Text)
    query_sql = Column(Text, nullable=False)
    chart_config = Column(JSONB, default={})
    position_json = Column(JSONB, nullable=False)
    ai_explanation = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class BiDashboardFilter(Base):
    __tablename__ = "bi_dashboard_filters"
    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("bi_dashboards.id", ondelete="CASCADE"))
    filter_name = Column(String(255))
    filter_type = Column(String(50))  # date_range, dropdown, numeric_range
    column_name = Column(String(255))
    default_value = Column(JSONB)
    config = Column(JSONB, default={})
    affected_widgets = Column(ARRAY(Integer))
    position_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BiDashboardVersion(Base):
    __tablename__ = "bi_dashboard_versions"
    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("bi_dashboards.id", ondelete="CASCADE"))
    version_number = Column(Integer, nullable=False)
    snapshot_json = Column(JSONB, nullable=False)
    change_summary = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
