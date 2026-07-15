from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime

class WidgetPosition(BaseModel):
    x: int
    y: int
    w: int
    h: int

class WidgetCreate(BaseModel):
    widget_type: str
    title: str
    description: Optional[str] = None
    query_sql: str
    chart_config: Optional[dict] = {}
    position_json: dict
    ai_explanation: Optional[str] = None

class WidgetResponse(BaseModel):
    id: int
    dashboard_id: int
    widget_type: str
    title: Optional[str]
    description: Optional[str]
    query_sql: str
    chart_config: Optional[dict]
    position_json: dict
    ai_explanation: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class FilterCreate(BaseModel):
    filter_name: str
    filter_type: str  # date_range, dropdown, numeric_range
    column_name: str
    default_value: Optional[Any] = None
    config: Optional[dict] = {}
    affected_widgets: Optional[List[int]] = []

class FilterResponse(BaseModel):
    id: int
    dashboard_id: int
    filter_name: Optional[str]
    filter_type: Optional[str]
    column_name: Optional[str]
    default_value: Optional[Any]
    config: Optional[dict]

    class Config:
        from_attributes = True

class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    dataset_id: int
    widgets: Optional[List[WidgetCreate]] = []
    filters: Optional[List[FilterCreate]] = []

class DashboardResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    dataset_id: int
    is_public: bool
    is_ai_generated: bool
    version: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class DashboardDetail(DashboardResponse):
    widgets: List[WidgetResponse] = []
    filters: List[FilterResponse] = []

class SemanticMetricCreate(BaseModel):
    metric_name: str
    display_name: str
    expression: str
    aggregation_type: Optional[str] = None
    format_type: Optional[str] = "number"
    description: Optional[str] = None

class SemanticMetricResponse(SemanticMetricCreate):
    id: int
    dataset_id: int
    is_ai_suggested: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SemanticDimensionCreate(BaseModel):
    dimension_name: str
    display_name: str
    column_name: str
    data_type: Optional[str] = None
    is_time_dimension: bool = False
    time_grain: Optional[str] = None
    description: Optional[str] = None

class SemanticDimensionResponse(SemanticDimensionCreate):
    id: int
    dataset_id: int
    is_ai_suggested: bool
    created_at: datetime

    class Config:
        from_attributes = True
