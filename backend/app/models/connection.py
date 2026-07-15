from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class BiConnection(Base):
    __tablename__ = "bi_connections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # postgresql, mysql, csv, excel
    host = Column(String(255))
    port = Column(Integer)
    database_name = Column(String(255))
    username = Column(String(255))
    encrypted_password = Column(Text)
    extra_config = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    last_tested_at = Column(DateTime(timezone=True))
    last_test_success = Column(Boolean)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
