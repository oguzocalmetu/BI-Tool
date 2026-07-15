from pydantic import BaseModel
from typing import Optional, List, Any

class AIGenerateRequest(BaseModel):
    prompt: str
    audience: Optional[str] = "analyst"  # executive, manager, analyst, operations
    detail_level: Optional[str] = "detailed"  # summary, detailed, strategic

class AIWidgetDraft(BaseModel):
    widget_id: str
    type: str
    title: str
    description: Optional[str] = None
    query_sql: str
    chart_config: Optional[dict] = {}
    position: dict
    ai_explanation: Optional[str] = None
    x_key: Optional[str] = None
    y_key: Optional[str] = None
    value_key: Optional[str] = None
    format_type: Optional[str] = "number"

class AIFilterDraft(BaseModel):
    filter_id: str
    type: str
    label: str
    column: str
    default_value: Optional[Any] = None
    affects_all: bool = True

class AIDashboardDraft(BaseModel):
    dashboard_name: str
    dashboard_description: str
    audience: str
    detail_level: str
    widgets: List[AIWidgetDraft]
    filters: List[AIFilterDraft]
    ai_summary: str

class AIDashboardResponse(BaseModel):
    draft: AIDashboardDraft
    validation_errors: List[str] = []
    warnings: List[str] = []

class AISaveRequest(BaseModel):
    draft: AIDashboardDraft

class AISuggestMetricsResponse(BaseModel):
    metrics: List[dict]
    dimensions: List[dict]
    dashboard_suggestions: List[dict]
