export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
}

// ─── Connection ───────────────────────────────────────────────────────────────

export type ConnectionType =
  | 'postgresql' | 'mysql' | 'oracle' | 'trino'
  | 'clickhouse' | 'sqlite' | 'snowflake'
  | 'csv' | 'excel'

export interface Connection {
  id: number
  name: string
  type: ConnectionType
  host?: string
  port?: number
  database_name?: string
  username?: string
  extra_config?: Record<string, unknown>
  is_active: boolean
  last_tested_at?: string
  last_test_success?: boolean
  created_at: string
}

// ─── Dataset ──────────────────────────────────────────────────────────────────

export interface Dataset {
  id: number
  name: string
  description?: string
  connection_id: number
  source_type: string
  schema_name?: string
  table_name?: string
  custom_sql?: string
  row_count_est?: number
  last_profiled_at?: string
  is_active: boolean
  created_at: string
}

export interface ColumnProfile {
  id: number
  column_name: string
  data_type?: string
  semantic_type?: string  // metric | dimension | date | id | text
  display_name?: string
  unique_count?: number
  null_count?: number
  null_pct?: number
  min_value?: string
  max_value?: string
  avg_value?: number
  sample_values?: string[]
}

// ─── Widget types ─────────────────────────────────────────────────────────────

export type WidgetType =
  // Cartesian
  | 'column'          // vertical bar
  | 'stacked_column'  // stacked vertical bar
  | 'bar'             // horizontal bar
  | 'stacked_bar'     // stacked horizontal bar
  | 'line'
  | 'area'
  | 'histogram'
  | 'combo'           // bar + line mix
  // Part-of-whole
  | 'pie'
  | 'treemap'         // block / treemap
  | 'sunburst'        // circle / sunburst
  | 'sankey'
  // Statistical
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'radar'
  // Single-value
  | 'gauge'
  | 'summary'         // KPI card
  // Tabular
  | 'table'
  | 'pivot'
  // Composite
  | 'tab_panel'
  | 'map'
  // Legacy aliases (kept for backward compat)
  | 'kpi_card' | 'bar_chart' | 'horizontal_bar_chart' | 'line_chart' | 'pie_chart' | 'donut_chart'

export interface ChartConfig {
  x_key?: string
  y_key?: string
  y_keys?: string[]        // multiple series for combo/stacked
  size_key?: string        // bubble
  color_key?: string       // group-by dimension
  value_key?: string       // pie, treemap, sunburst, sankey
  label_key?: string       // pie, treemap, sunburst, sankey
  format_type?: 'number' | 'currency' | 'percent'
  currency_symbol?: string
  color?: string
  colors?: string[]
  series_names?: string[]
  source_key?: string      // sankey
  target_key?: string      // sankey
  tabs?: TabConfig[]       // tab_panel
  map_type?: 'world' | 'country'
  country_code?: string
  radar_indicators?: { name: string; max: number }[]
  gauge_min?: number
  gauge_max?: number
  sort?: 'asc' | 'desc' | 'none'
  show_legend?: boolean
  show_label?: boolean
  pivot_rows?: string[]
  pivot_cols?: string[]
  pivot_value?: string
  pivot_agg?: 'sum' | 'avg' | 'count'
  [key: string]: unknown
}

export interface TabConfig {
  label: string
  widget_type: WidgetType
  chart_config?: ChartConfig
}

// ─── Widget / Dashboard ───────────────────────────────────────────────────────

export interface Widget {
  id: number
  dashboard_id: number
  widget_type: WidgetType
  title?: string
  description?: string
  query_sql: string
  chart_config?: ChartConfig
  position_json: { x: number; y: number; w: number; h: number }
  ai_explanation?: string
}

export interface DashboardFilter {
  id: number
  dashboard_id: number
  filter_name?: string
  filter_type?: 'date_range' | 'dropdown' | 'numeric_range'
  column_name?: string
  default_value?: unknown
  config?: Record<string, unknown>
}

export interface Dashboard {
  id: number
  name: string
  description?: string
  dataset_id: number
  is_ai_generated: boolean
  is_public: boolean
  version: number
  created_at: string
}

export interface DashboardDetail {
  dashboard: Dashboard
  widgets: Widget[]
  filters: DashboardFilter[]
}

// ─── Builder types ────────────────────────────────────────────────────────────

export interface BuilderWidget {
  id: string            // local uuid
  widget_type: WidgetType
  title: string
  query_sql: string
  chart_config: ChartConfig
  position: { x: number; y: number; w: number; h: number }
}

// ─── AI Generator ────────────────────────────────────────────────────────────

export interface AIWidgetDraft {
  widget_id: string
  type: WidgetType
  title: string
  description?: string
  query_sql: string
  chart_config?: ChartConfig
  position: { x: number; y: number; w: number; h: number }
  ai_explanation?: string
}

export interface AIFilterDraft {
  filter_id: string
  type: string
  label: string
  column: string
  affects_all: boolean
}

export interface AIDashboardDraft {
  dashboard_name: string
  dashboard_description: string
  audience: string
  detail_level: string
  ai_summary: string
  widgets: AIWidgetDraft[]
  filters: AIFilterDraft[]
}

// ─── Query result ─────────────────────────────────────────────────────────────

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  row_count: number
  execution_time_ms: number
}
