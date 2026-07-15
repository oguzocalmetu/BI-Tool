from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from app.db.base import Base

class BiPermission(Base):
    __tablename__ = "bi_permissions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role_id = Column(Integer, ForeignKey("roles.id"))
    resource_type = Column(String(50))  # dashboard, dataset, connection
    resource_id = Column(Integer)
    permission = Column(String(50))  # view, edit, delete, share
    granted_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BiRowFilter(Base):
    __tablename__ = "bi_row_filters"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id"))
    role_id = Column(Integer, ForeignKey("roles.id"))
    filter_sql = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
