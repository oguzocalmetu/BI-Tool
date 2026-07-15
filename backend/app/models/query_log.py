from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class BiQueryLog(Base):
    __tablename__ = "bi_query_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id"))
    dashboard_id = Column(Integer, ForeignKey("bi_dashboards.id"))
    widget_id = Column(Integer, ForeignKey("bi_dashboard_widgets.id"))
    query_sql = Column(Text)
    query_hash = Column(String(64))
    execution_time_ms = Column(Integer)
    row_count = Column(Integer)
    status = Column(String(20))  # success, error, timeout
    error_message = Column(Text)
    from_cache = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BiAuditLog(Base):
    __tablename__ = "bi_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100))
    resource_type = Column(String(100))
    resource_id = Column(Integer)
    old_value = Column(JSONB(none_as_null=True))
    new_value = Column(JSONB(none_as_null=True))
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
