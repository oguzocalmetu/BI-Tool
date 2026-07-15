import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Widget, WidgetType, ChartConfig, QueryResult } from '@/types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function toRecords(columns: string[], rows: unknown[][]): Record<string, unknown>[] {
  return rows.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((c, i) => { obj[c] = row[i] })
    return obj
  })
}

function fmt(v: unknown, type?: string, sym = '$'): string {
  const n = Number(v)
  if (isNaN(n)) return String(v ?? '')
  if (type === 'currency') return sym + n.toLocaleString(undefined, { minimumFractionDigits: 0 })
  if (type === 'percent') return n.toFixed(1) + '%'
  return n.toLocaleString()
}

const PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1',
]

const baseGrid = { top: 36, right: 20, bottom: 48, left: 56, containLabel: true }
const baseLegend = { bottom: 4, type: 'scroll' as const, textStyle: { fontSize: 11 } }
const baseTip = { trigger: 'axis' as const }

// ─── option builders ──────────────────────────────────────────────────────────

function buildOption(type: WidgetType, result: QueryResult, cfg: ChartConfig): object {
  const { columns, rows } = result
  const records = toRecords(columns, rows)
  const xk = cfg.x_key || columns[0] || 'x'
  const yk = cfg.y_key || columns[1] || 'y'
  const yk2 = cfg.y_keys || [yk]
  const vk = cfg.value_key || yk
  const lk = cfg.label_key || xk
  const color = cfg.color || PALETTE[0]

  switch (type) {

    // ── column (vertical bar) ──────────────────────────────────────────────
    case 'column':
    case 'bar_chart': {
      const cats = records.map(r => r[xk])
      return {
        color: PALETTE,
        grid: baseGrid,
        tooltip: baseTip,
        xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11, rotate: cats.length > 8 ? 30 : 0 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [{ type: 'bar', data: records.map(r => r[yk]), barMaxWidth: 48, itemStyle: { color, borderRadius: [3,3,0,0] } }],
      }
    }

    // ── stacked column ────────────────────────────────────────────────────
    case 'stacked_column': {
      const cats = records.map(r => r[xk])
      const gk = cfg.color_key || columns[2] || columns[1]
      const groups = [...new Set(records.map(r => String(r[gk])))]
      return {
        color: PALETTE, grid: baseGrid, tooltip: baseTip, legend: baseLegend,
        xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: groups.map((g, i) => ({
          name: g, type: 'bar', stack: 'total',
          itemStyle: { color: PALETTE[i % PALETTE.length] },
          data: cats.map(c => {
            const found = records.find(r => r[xk] === c && String(r[gk]) === g)
            return found ? found[yk] : 0
          }),
        })),
      }
    }

    // ── bar (horizontal) ──────────────────────────────────────────────────
    case 'bar':
    case 'horizontal_bar_chart': {
      const sorted = [...records].sort((a, b) => Number(b[yk]) - Number(a[yk]))
      return {
        color: PALETTE,
        grid: { top: 10, right: 24, bottom: 10, left: 16, containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        yAxis: { type: 'category', data: sorted.map(r => r[xk]), axisLabel: { fontSize: 11, width: 120, overflow: 'truncate' } },
        series: [{ type: 'bar', data: sorted.map(r => r[yk]), barMaxWidth: 32, itemStyle: { color, borderRadius: [0,3,3,0] } }],
      }
    }

    // ── stacked bar (horizontal) ──────────────────────────────────────────
    case 'stacked_bar': {
      const cats = [...new Set(records.map(r => String(r[xk])))]
      const gk = cfg.color_key || columns[2] || columns[1]
      const groups = [...new Set(records.map(r => String(r[gk])))]
      return {
        color: PALETTE, tooltip: baseTip, legend: baseLegend,
        grid: { top: 36, right: 20, bottom: 48, left: 16, containLabel: true },
        xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        yAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
        series: groups.map((g, i) => ({
          name: g, type: 'bar', stack: 'total',
          itemStyle: { color: PALETTE[i % PALETTE.length] },
          data: cats.map(c => {
            const found = records.find(r => r[xk] === c && String(r[gk]) === g)
            return found ? found[yk] : 0
          }),
        })),
      }
    }

    // ── line ──────────────────────────────────────────────────────────────
    case 'line':
    case 'line_chart': {
      const cats = records.map(r => r[xk])
      const series = yk2.map((k, i) => ({
        name: k, type: 'line', smooth: true,
        symbol: 'circle', symbolSize: 5,
        itemStyle: { color: PALETTE[i % PALETTE.length] },
        data: records.map(r => r[k]),
      }))
      return {
        color: PALETTE, grid: baseGrid, tooltip: baseTip,
        legend: yk2.length > 1 ? baseLegend : undefined,
        xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series,
      }
    }

    // ── area ──────────────────────────────────────────────────────────────
    case 'area': {
      const cats = records.map(r => r[xk])
      return {
        color: PALETTE, grid: baseGrid, tooltip: baseTip,
        xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [{
          type: 'line', smooth: true, symbol: 'none',
          areaStyle: { opacity: 0.25 },
          itemStyle: { color },
          data: records.map(r => r[yk]),
        }],
      }
    }

    // ── histogram ─────────────────────────────────────────────────────────
    case 'histogram': {
      const vals = records.map(r => Number(r[yk] ?? r[xk])).filter(n => !isNaN(n))
      const bins = 12
      if (!vals.length) return {}
      const mn = Math.min(...vals), mx = Math.max(...vals)
      const step = (mx - mn) / bins || 1
      const counts = Array(bins).fill(0)
      vals.forEach(v => { const i = Math.min(Math.floor((v - mn) / step), bins - 1); counts[i]++ })
      const cats = counts.map((_, i) => `${(mn + i * step).toFixed(1)}`)
      return {
        color: PALETTE, grid: baseGrid, tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', name: 'count', axisLabel: { fontSize: 11 } },
        series: [{ type: 'bar', data: counts, barWidth: '90%', itemStyle: { color } }],
      }
    }

    // ── combo (bar + line) ────────────────────────────────────────────────
    case 'combo': {
      const cats = records.map(r => r[xk])
      const [barKey, lineKey] = yk2.length >= 2 ? yk2 : [yk2[0], columns[2] || yk2[0]]
      return {
        color: PALETTE, grid: baseGrid, tooltip: baseTip, legend: baseLegend,
        xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
        yAxis: [
          { type: 'value', axisLabel: { fontSize: 11 } },
          { type: 'value', axisLabel: { fontSize: 11 }, splitLine: { show: false } },
        ],
        series: [
          { name: barKey, type: 'bar', data: records.map(r => r[barKey]), barMaxWidth: 40, itemStyle: { color: PALETTE[0], borderRadius: [3,3,0,0] } },
          { name: lineKey, type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 5, itemStyle: { color: PALETTE[1] }, data: records.map(r => r[lineKey]) },
        ],
      }
    }

    // ── pie ───────────────────────────────────────────────────────────────
    case 'pie':
    case 'pie_chart': {
      return {
        color: PALETTE,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { ...baseLegend, orient: 'vertical', right: 8 },
        series: [{
          type: 'pie', radius: '65%', center: ['40%', '50%'],
          data: records.map(r => ({ name: r[lk], value: r[vk] })),
          label: { show: cfg.show_label !== false, fontSize: 11 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
        }],
      }
    }

    // ── donut (alias for pie with inner radius) ───────────────────────────
    case 'donut_chart': {
      return {
        color: PALETTE,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { ...baseLegend, orient: 'vertical', right: 8 },
        series: [{
          type: 'pie', radius: ['40%', '65%'], center: ['40%', '50%'],
          data: records.map(r => ({ name: r[lk], value: r[vk] })),
          label: { show: cfg.show_label !== false, fontSize: 11 },
        }],
      }
    }

    // ── treemap (block) ───────────────────────────────────────────────────
    case 'treemap': {
      return {
        color: PALETTE,
        tooltip: { formatter: (p: any) => `${p.data.name}: ${p.data.value}` },
        series: [{
          type: 'treemap',
          data: records.map(r => ({ name: r[lk], value: Number(r[vk]) })),
          label: { fontSize: 12, fontWeight: 500 },
          breadcrumb: { show: false },
        }],
      }
    }

    // ── sunburst (circle) ─────────────────────────────────────────────────
    case 'sunburst': {
      const pk = cfg.color_key || columns[2] || columns[0]
      const groups: Record<string, { name: string; value?: number; children: { name: string; value: number }[] }> = {}
      records.forEach(r => {
        const p = String(r[pk])
        if (!groups[p]) groups[p] = { name: p, children: [] }
        groups[p].children.push({ name: String(r[lk]), value: Number(r[vk]) })
      })
      return {
        color: PALETTE,
        tooltip: {},
        series: [{
          type: 'sunburst',
          data: Object.values(groups),
          radius: ['15%', '85%'],
          label: { fontSize: 10, rotate: 'tangential' },
          levels: [
            {},
            { r0: '15%', r: '50%', itemStyle: { borderWidth: 2 }, label: { rotate: 'tangential' } },
            { r0: '50%', r: '85%', label: { position: 'outside', padding: 3, silent: false } },
          ],
        }],
      }
    }

    // ── sankey ────────────────────────────────────────────────────────────
    case 'sankey': {
      const sk = cfg.source_key || columns[0]
      const tk = cfg.target_key || columns[1]
      const nodeSet = new Set<string>()
      records.forEach(r => { nodeSet.add(String(r[sk])); nodeSet.add(String(r[tk])) })
      return {
        tooltip: { trigger: 'item' },
        series: [{
          type: 'sankey',
          data: [...nodeSet].map(name => ({ name })),
          links: records.map(r => ({ source: String(r[sk]), target: String(r[tk]), value: Number(r[vk]) })),
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'gradient', curveness: 0.5 },
          label: { fontSize: 11 },
        }],
      }
    }

    // ── scatter ───────────────────────────────────────────────────────────
    case 'scatter': {
      return {
        color: PALETTE, grid: baseGrid,
        tooltip: { formatter: (p: any) => `${xk}: ${p.data[0]}<br/>${yk}: ${p.data[1]}` },
        xAxis: { type: 'value', name: xk, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', name: yk, axisLabel: { fontSize: 11 } },
        series: [{ type: 'scatter', symbolSize: 8, itemStyle: { color, opacity: 0.7 }, data: records.map(r => [r[xk], r[yk]]) }],
      }
    }

    // ── bubble ────────────────────────────────────────────────────────────
    case 'bubble': {
      const sk = cfg.size_key || columns[2] || yk
      const maxSize = Math.max(...records.map(r => Number(r[sk]))) || 1
      return {
        color: PALETTE, grid: baseGrid,
        tooltip: { formatter: (p: any) => `${xk}: ${p.data[0]}<br/>${yk}: ${p.data[1]}<br/>${sk}: ${p.data[2]}` },
        xAxis: { type: 'value', name: xk, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', name: yk, axisLabel: { fontSize: 11 } },
        series: [{
          type: 'scatter', itemStyle: { color, opacity: 0.7 },
          symbolSize: (d: number[]) => Math.max(6, (d[2] / maxSize) * 60),
          data: records.map(r => [r[xk], r[yk], r[sk]]),
        }],
      }
    }

    // ── heatmap ───────────────────────────────────────────────────────────
    case 'heatmap': {
      const ck = cfg.color_key || columns[1]
      const xs = [...new Set(records.map(r => r[xk]))]
      const ys = [...new Set(records.map(r => r[ck]))]
      const data = records.map(r => [xs.indexOf(r[xk]), ys.indexOf(r[ck]), Number(r[vk])])
      return {
        tooltip: { position: 'top', formatter: (p: any) => `${xs[p.data[0]]}, ${ys[p.data[1]]}: ${p.data[2]}` },
        grid: { top: 10, right: 60, bottom: 10, left: 10, containLabel: true },
        xAxis: { type: 'category', data: xs, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: { type: 'category', data: ys, axisLabel: { fontSize: 10 } },
        visualMap: { min: 0, max: Math.max(...data.map(d => d[2] as number), 1), calculable: true, orient: 'vertical', right: 0, top: 'middle', inRange: { color: ['#dbeafe', '#1d4ed8'] } },
        series: [{ type: 'heatmap', data, label: { show: records.length < 50 }, emphasis: { itemStyle: { shadowBlur: 10 } } }],
      }
    }

    // ── radar ─────────────────────────────────────────────────────────────
    case 'radar': {
      const indicators = cfg.radar_indicators || columns.slice(1).map(c => ({ name: c, max: Math.max(...records.map(r => Number(r[c]) || 0)) * 1.2 }))
      return {
        color: PALETTE,
        tooltip: {},
        radar: { indicator: indicators, radius: '65%' },
        series: records.slice(0, 6).map((r, i) => ({
          type: 'radar',
          name: String(r[xk] || r[columns[0]] || `Row ${i + 1}`),
          itemStyle: { color: PALETTE[i % PALETTE.length] },
          data: [{ value: columns.slice(1).map(c => Number(r[c]) || 0), name: String(r[xk] || '') }],
        })),
      }
    }

    // ── gauge ─────────────────────────────────────────────────────────────
    case 'gauge': {
      const val = records.length ? Number(records[0][vk] ?? records[0][yk] ?? 0) : 0
      const min = cfg.gauge_min ?? 0
      const max = cfg.gauge_max ?? 100
      return {
        series: [{
          type: 'gauge',
          min, max,
          progress: { show: true, width: 18 },
          axisLine: { lineStyle: { width: 18 } },
          axisTick: { show: false },
          axisLabel: { fontSize: 11, distance: -40 },
          detail: { valueAnimation: true, fontSize: 24, offsetCenter: [0, '60%'] },
          data: [{ value: val }],
        }],
      }
    }

    // ── map ───────────────────────────────────────────────────────────────
    case 'map': {
      return {
        tooltip: { trigger: 'item' },
        visualMap: { min: 0, max: Math.max(...records.map(r => Number(r[vk]) || 0), 1), left: 'left', top: 'bottom', text: ['High', 'Low'], calculable: true, inRange: { color: ['#dbeafe', '#1d4ed8'] } },
        series: [{
          type: 'map',
          map: cfg.map_type === 'country' ? (cfg.country_code || 'world') : 'world',
          data: records.map(r => ({ name: r[lk], value: r[vk] })),
          emphasis: { label: { show: true } },
        }],
      }
    }

    // ── default fallback (table-like bar) ─────────────────────────────────
    default:
      return {
        color: PALETTE, grid: baseGrid, tooltip: baseTip,
        xAxis: { type: 'category', data: records.map(r => r[columns[0]]), axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: records.map(r => r[columns[1]]), itemStyle: { color } }],
      }
  }
}

// ─── Table renderer ───────────────────────────────────────────────────────────

function DataTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="overflow-auto h-full text-xs">
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            {columns.map(c => (
              <th key={c} className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                  {cell == null ? <span className="text-gray-400 italic">null</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pivot table ──────────────────────────────────────────────────────────────

function PivotTable({ result, cfg }: { result: QueryResult; cfg: ChartConfig }) {
  const { columns, rows } = result
  const rowKey = cfg.pivot_rows?.[0] || columns[0]
  const colKey = cfg.pivot_cols?.[0] || columns[1]
  const valKey = cfg.pivot_value || columns[2] || columns[1]
  const agg = cfg.pivot_agg || 'sum'

  const rowVals = [...new Set(rows.map(r => {
    const idx = columns.indexOf(rowKey)
    return String(r[idx])
  }))]
  const colVals = [...new Set(rows.map(r => {
    const idx = columns.indexOf(colKey)
    return String(r[idx])
  }))]

  const matrix: Record<string, Record<string, number[]>> = {}
  rows.forEach(row => {
    const rk = String(row[columns.indexOf(rowKey)])
    const ck = String(row[columns.indexOf(colKey)])
    const v = Number(row[columns.indexOf(valKey)]) || 0
    if (!matrix[rk]) matrix[rk] = {}
    if (!matrix[rk][ck]) matrix[rk][ck] = []
    matrix[rk][ck].push(v)
  })

  const cell = (vals: number[]) => {
    if (!vals?.length) return '-'
    if (agg === 'sum') return vals.reduce((a, b) => a + b, 0).toLocaleString()
    if (agg === 'avg') return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
    return vals.length.toString()
  }

  return (
    <div className="overflow-auto h-full text-xs">
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600 border-b border-r border-gray-200">{rowKey}</th>
            {colVals.map(c => (
              <th key={c} className="px-3 py-2 text-right font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rowVals.map(rv => (
            <tr key={rv} className="hover:bg-gray-50">
              <td className="px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200">{rv}</td>
              {colVals.map(cv => (
                <td key={cv} className="px-3 py-1.5 text-right text-gray-800">
                  {cell(matrix[rv]?.[cv])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Summary / KPI card ───────────────────────────────────────────────────────

function SummaryCard({ title, result, cfg }: { title?: string; result: QueryResult; cfg: ChartConfig }) {
  const { columns, rows } = result
  if (!rows.length) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>
  const vk = cfg.value_key || cfg.y_key || columns[0]
  const val = rows[0][columns.indexOf(vk)]
  const formatted = fmt(val, cfg.format_type, cfg.currency_symbol)
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <p className="text-3xl font-bold text-gray-900">{formatted}</p>
      {title && <p className="text-sm text-gray-500">{title}</p>}
    </div>
  )
}

// ─── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({ widget, filterParams }: { widget: Widget; filterParams?: Record<string, string> }) {
  const tabs = widget.chart_config?.tabs || []
  const { data: result } = useQuery<QueryResult>({
    queryKey: ['widget', widget.id, filterParams],
    queryFn: () => api.post(`/query/widget/${widget.id}`, { filters: filterParams || {} }).then(r => r.data),
    enabled: !!widget.id,
  })

  const [activeTab, setActiveTab] = useState(0)
  if (!result) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">Loading…</div>

  const activeType = (tabs[activeTab]?.widget_type || 'table') as WidgetType
  const activeCfg = tabs[activeTab]?.chart_config || widget.chart_config || {}

  const isTable = activeType === 'table' || activeType === 'pivot'
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mx-2 mt-2 w-fit">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${i === activeTab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {isTable
          ? <DataTable columns={result.columns} rows={result.rows} />
          : <ReactECharts option={buildOption(activeType, result, activeCfg as ChartConfig)} style={{ height: '100%' }} />
        }
      </div>
    </div>
  )
}

// ─── Main ChartWidget ─────────────────────────────────────────────────────────

import { useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

interface ChartWidgetProps {
  widget: Widget
  filterParams?: Record<string, string>
  /** pre-fetched result — used in builder preview */
  previewResult?: QueryResult
}

export default function ChartWidget({ widget, filterParams, previewResult }: ChartWidgetProps) {
  const type = (widget.widget_type || 'bar') as WidgetType
  const cfg = (widget.chart_config || {}) as ChartConfig

  const { data, isLoading, error } = useQuery<QueryResult>({
    queryKey: ['widget', widget.id, filterParams],
    queryFn: () => api.post(`/query/widget/${widget.id}`, { filters: filterParams || {} }).then(r => r.data),
    enabled: !previewResult && !!widget.id && widget.id > 0,
    staleTime: 60_000,
  })

  const result: QueryResult | undefined = previewResult || data

  if (type === 'tab_panel') return <TabPanel widget={widget} filterParams={filterParams} />

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Loading…</span>
      </div>
    )
  }

  if (error || (!result && !previewResult)) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-red-400">
        <AlertCircle className="w-5 h-5" />
        <span className="text-xs">Query error</span>
      </div>
    )
  }

  if (!result || !result.rows?.length) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-xs">No data</div>
    )
  }

  if (type === 'summary' || type === 'kpi_card') {
    return <SummaryCard title={widget.title} result={result} cfg={cfg} />
  }

  if (type === 'table') {
    return <DataTable columns={result.columns} rows={result.rows} />
  }

  if (type === 'pivot') {
    return <PivotTable result={result} cfg={cfg} />
  }

  const option = buildOption(type, result, cfg)

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge
    />
  )
}
