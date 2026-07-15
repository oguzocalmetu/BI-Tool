from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class BiAiPrompt(Base):
    __tablename__ = "bi_ai_prompts"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("bi_datasets.id"))
    dashboard_id = Column(Integer, ForeignKey("bi_dashboards.id"))
    prompt_type = Column(String(50))  # generate, edit, suggest, insight
    user_prompt = Column(Text)
    interpreted_goal = Column(Text)
    model_used = Column(String(100))
    tokens_used = Column(Integer)
    response_json = Column(JSONB)
    validation_errors = Column(JSONB)
    duration_ms = Column(Integer)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
