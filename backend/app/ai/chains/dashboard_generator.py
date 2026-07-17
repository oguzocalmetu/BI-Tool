"""
Dashboard generator — Groq (free Llama 3) + rule-based fallback.
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
Priority:
  1. Groq API  (set GROQ_API_KEY in env)
  2. Rule-based  (always works, no key needed)
"""
<<<<<<< Updated upstream
import json, re, uuid, os
from typing import Optional
=======

import json
import re
import uuid
import os
from typing import Optional


# ─── JSON extractor ───────────────────────────────────────────────────────────
>>>>>>> Stashed changes

def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    return json.loads(text.strip())

<<<<<<< Updated upstream
async def _call_groq(system: str, user: str) -> str:
=======

# ─── Groq API call ────────────────────────────────────────────────────────────

async def _call_groq(system: str, user: str) -> str:
    """Call Groq's free Llama 3 API. Raises on failure."""
>>>>>>> Stashed changes
    import httpx
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
<<<<<<< Updated upstream
            json={"model": "llama-3.3-70b-versatile",
                  "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                  "temperature": 0.3, "max_tokens": 3000},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

def _rule_based_dashboard(user_prompt, table_ref, columns):
    metrics    = [c for c in columns if c.get("semantic_type") == "metric"]
    dimensions = [c for c in columns if c.get("semantic_type") == "dimension"]
    dates      = [c for c in columns if c.get("semantic_type") == "date"]
    if not metrics and not dimensions:
        numerics = [c for c in columns if any(t in c.get("data_type","").lower() for t in ("int","float","numeric","decimal","double","real","bigint","money"))]
        texts    = [c for c in columns if any(t in c.get("data_type","").lower() for t in ("char","text","varchar","string"))]
        metrics = numerics[:3]; dimensions = texts[:2]
    widgets = []; x = y = 0
    def _wid(): return str(uuid.uuid4())[:8]
    def _add(wt, title, sql, cfg=None, w=6, h=4):
        nonlocal x, y
        widgets.append({"widget_id": _wid(), "type": wt, "title": title, "query_sql": sql,
                        "chart_config": cfg or {}, "position": {"x": x, "y": y, "w": w, "h": h},
                        "ai_explanation": f"Otomatik: {title}"})
        x += w
        if x >= 12: x = 0; y += h
    for m in metrics[:4]:
        mc = m["column_name"]
        _add("summary", f"Toplam {mc}", f"SELECT SUM({mc}) AS {mc} FROM {table_ref}", w=3, h=2)
    if dates and metrics:
        dc = dates[0]["column_name"]; mc = metrics[0]["column_name"]
        _add("line", f"{mc} Trendi", f"SELECT {dc}, SUM({mc}) AS {mc} FROM {table_ref} GROUP BY {dc} ORDER BY {dc}", cfg={"x_key": dc, "y_key": mc})
    if dimensions and metrics:
        dc = dimensions[0]["column_name"]; mc = metrics[0]["column_name"]
        _add("column", f"{dc} Bazında {mc}", f"SELECT {dc}, SUM({mc}) AS {mc} FROM {table_ref} GROUP BY {dc} ORDER BY {mc} DESC LIMIT 10", cfg={"x_key": dc, "y_key": mc})
    if len(dimensions) > 0 and metrics:
        dc = dimensions[0]["column_name"]; mc = metrics[0]["column_name"]
        _add("pie", f"{dc} Payları", f"SELECT {dc}, SUM({mc}) AS {mc} FROM {table_ref} GROUP BY {dc} ORDER BY {mc} DESC LIMIT 8", cfg={"label_key": dc, "value_key": mc})
    top_cols = (dates + dimensions + metrics)[:6]
    col_str = ", ".join(c["column_name"] for c in top_cols) if top_cols else "*"
    _add("table", "Veri Tablosu", f"SELECT {col_str} FROM {table_ref} LIMIT 50", w=12, h=5)
    return {"dashboard_name": f"{table_ref.split('.')[-1].title()} Dashboard",
            "dashboard_description": user_prompt or "Otomatik oluşturulmuş dashboard",
            "audience": "analyst", "detail_level": "detailed",
            "ai_summary": "Kolon türleri analiz edilerek otomatik oluşturuldu.",
            "widgets": widgets, "filters": []}

async def generate_dashboard(user_prompt, table_ref, conn_type, columns, sample_rows, audience="analyst", detail_level="detailed"):
    try:
        cols_text = "\n".join([f"- {c['column_name']} ({c['data_type']}) [semantic: {c.get('semantic_type','?')}]" for c in columns])
        sample_text = json.dumps(sample_rows[:3], default=str, indent=2) if sample_rows else "—"
        system = f"""Sen bir BI dashboard tasarımcısısın. Kullanıcının veri seti ve isteğine göre dashboard JSON'ı oluştur.
SADECE geçerli JSON döndür. Tablo adı: {table_ref}
Format:
{{
  "dashboard_name": "...", "dashboard_description": "...", "audience": "...", "detail_level": "...", "ai_summary": "...",
  "widgets": [{{"widget_id": "w1", "type": "column|bar|line|area|pie|summary|table", "title": "...",
    "query_sql": "SELECT ... FROM {table_ref} ...", "chart_config": {{"x_key": "col", "y_key": "col"}},
    "position": {{"x": 0, "y": 0, "w": 6, "h": 4}}, "ai_explanation": "..."}}],
  "filters": []
}}
Kurallar: Yalnızca gerçek kolon adları, geçerli SQL (GROUP BY, ORDER BY, LIMIT), 4-8 widget."""
        user_msg = f"İstek: {user_prompt}\nHedef: {audience} | Detay: {detail_level}\n\nKolonlar:\n{cols_text}\n\nÖrnek:\n{sample_text}"
        content = await _call_groq(system, user_msg)
        draft = _extract_json(content)
        return draft, 0
    except Exception as e:
        print(f"[AI] Groq unavailable ({e}), rule-based fallback")
        return _rule_based_dashboard(user_prompt, table_ref, columns), 0

async def suggest_metrics_and_dimensions(columns, row_count):
    return {"metrics": [c["column_name"] for c in columns if c.get("semantic_type") == "metric"],
            "dimensions": [c["column_name"] for c in columns if c.get("semantic_type") == "dimension"],
            "dates": [c["column_name"] for c in columns if c.get("semantic_type") == "date"],
            "row_count": row_count}, 0
=======
            json={
                "model": "llama3-70b-8192",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.3,
                "max_tokens": 3000,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


# ─── Rule-based fallback ──────────────────────────────────────────────────────

def _rule_based_dashboard(
    user_prompt: str,
    table_ref: str,
    columns: list[dict],
) -> dict:
    """Generate a sensible dashboard purely from column metadata."""
    metrics    = [c for c in columns if c.get("semantic_type") == "metric"]
    dimensions = [c for c in columns if c.get("semantic_type") == "dimension"]
    dates      = [c for c in columns if c.get("semantic_type") == "date"]
    others     = [c for c in columns if c.get("semantic_type") not in ("metric", "dimension", "date")]

    # Fall back gracefully if classification is missing
    if not metrics and not dimensions:
        numerics = [c for c in columns if any(t in c.get("data_type","").lower()
                    for t in ("int","float","numeric","decimal","double","real","bigint","money"))]
        texts    = [c for c in columns if any(t in c.get("data_type","").lower()
                    for t in ("char","text","varchar","string"))]
        metrics    = numerics[:3]
        dimensions = texts[:2]

    widgets = []
    x = y = 0

    def _wid():
        return str(uuid.uuid4())[:8]

    def _add(w_type, title, sql, cfg=None, w=6, h=4):
        nonlocal x, y
        widgets.append({
            "widget_id": _wid(),
            "type": w_type,
            "title": title,
            "query_sql": sql,
            "chart_config": cfg or {},
            "position": {"x": x, "y": y, "w": w, "h": h},
            "ai_explanation": f"Otomatik oluşturuldu: {title}",
        })
        x += w
        if x >= 12:
            x = 0
            y += h

    # KPI cards (one per metric, small)
    for m in metrics[:4]:
        mc = m["column_name"]
        _add("summary", f"Toplam {mc}", f"SELECT SUM({mc}) AS {mc} FROM {table_ref}", w=3, h=2)

    # Line chart: date × first metric
    if dates and metrics:
        dc = dates[0]["column_name"]
        mc = metrics[0]["column_name"]
        _add("line", f"{mc} Trendi",
             f"SELECT {dc}, SUM({mc}) AS {mc} FROM {table_ref} GROUP BY {dc} ORDER BY {dc}",
             cfg={"x_key": dc, "y_key": mc})

    # Bar chart: first dimension × first metric
    if dimensions and metrics:
        dc = dimensions[0]["column_name"]
        mc = metrics[0]["column_name"]
        _add("column", f"{dc} Bazında {mc}",
             f"SELECT {dc}, SUM({mc}) AS {mc} FROM {table_ref} GROUP BY {dc} ORDER BY {mc} DESC LIMIT 10",
             cfg={"x_key": dc, "y_key": mc})

    # Second dimension × metric  (if available)
    if len(dimensions) > 1 and metrics:
        dc = dimensions[1]["column_name"]
        mc = metrics[0]["column_name"]
        _add("bar", f"{dc} Dağılımı",
             f"SELECT {dc}, SUM({mc}) AS {mc} FROM {table_ref} GROUP BY {dc} ORDER BY {mc} DESC LIMIT 10",
             cfg={"x_key": dc, "y_key": mc})

    # Pie for third dimension
    if len(dimensions) > 0 and metrics:
        dc = dimensions[0]["column_name"]
        mc = metrics[0]["column_name"]
        _add("pie", f"{dc} Payları",
             f"SELECT {dc}, SUM({mc}) AS {mc} FROM {table_ref} GROUP BY {dc} ORDER BY {mc} DESC LIMIT 8",
             cfg={"label_key": dc, "value_key": mc})

    # Always add a table
    top_cols = (dates + dimensions + metrics)[:6]
    col_str = ", ".join(c["column_name"] for c in top_cols) if top_cols else "*"
    _add("table", "Veri Tablosu",
         f"SELECT {col_str} FROM {table_ref} LIMIT 50",
         w=12, h=5)

    return {
        "dashboard_name": f"{table_ref.split('.')[-1].title()} Dashboard",
        "dashboard_description": user_prompt or "Otomatik oluşturulmuş dashboard",
        "audience": "analyst",
        "detail_level": "detailed",
        "ai_summary": "Kolon türleri analiz edilerek otomatik oluşturuldu.",
        "widgets": widgets,
        "filters": [],
    }


# ─── Public API ───────────────────────────────────────────────────────────────

async def generate_dashboard(
    user_prompt: str,
    table_ref: str,
    conn_type: str,
    columns: list[dict],
    sample_rows: list[dict],
    audience: str = "analyst",
    detail_level: str = "detailed",
) -> tuple[dict, int]:

    # ── Try Groq first ──────────────────────────────────────────────────────
    try:
        cols_text = "\n".join([
            f"- {c['column_name']} ({c['data_type']}) [semantic: {c.get('semantic_type','?')}]"
            f"{'  sample: ' + str(c.get('sample_values', [])[:3]) if c.get('sample_values') else ''}"
            for c in columns
        ])
        sample_text = json.dumps(sample_rows[:3], default=str, indent=2) if sample_rows else "—"

        system = """Sen bir BI dashboard tasarımcısısın. Kullanıcının veri seti ve isteğine göre dashboard JSON'ı oluştur.
SADECE geçerli JSON döndür, başka bir şey yazma.

Çıktı formatı:
{
  "dashboard_name": "...",
  "dashboard_description": "...",
  "audience": "...",
  "detail_level": "...",
  "ai_summary": "...",
  "widgets": [
    {
      "widget_id": "w1",
      "type": "column|bar|line|area|pie|summary|table|histogram|scatter",
      "title": "...",
      "query_sql": "SELECT ... FROM table GROUP BY ...",
      "chart_config": {"x_key": "col", "y_key": "col"},
      "position": {"x": 0, "y": 0, "w": 6, "h": 4},
      "ai_explanation": "Neden bu grafik seçildi"
    }
  ],
  "filters": []
}

Kurallar:
- Tablo adı: """ + table_ref + """
- Yalnızca gerçek kolon adlarını kullan
- Her widget için geçerli SQL yaz (GROUP BY, ORDER BY, LIMIT dahil)
- summary widget: SELECT SUM(col) AS col FROM table
- 4–8 arası widget oluştur
- position: x (0-11), y (satır), w (genişlik 3-12), h (yükseklik 2-6)"""

        user_msg = f"""İstek: {user_prompt}
Hedef kitle: {audience} | Detay: {detail_level}

Kolonlar:
{cols_text}

Örnek veri:
{sample_text}

Dashboard JSON'ını oluştur:"""

        content = await _call_groq(system, user_msg)
        draft = _extract_json(content)

        # Normalise widget keys
        for w in draft.get("widgets", []):
            if "position_json" not in w and "position" in w:
                w["position_json"] = w["position"]

        return draft, 0

    except Exception as groq_err:
        # ── Groq failed → rule-based fallback ──────────────────────────────
        print(f"[AI] Groq unavailable ({groq_err}), using rule-based generator")
        draft = _rule_based_dashboard(user_prompt, table_ref, columns)
        return draft, 0


async def suggest_metrics_and_dimensions(
    columns: list[dict],
    row_count: int,
) -> tuple[dict, int]:
    """Simple rule-based metric/dimension suggestion (no AI required)."""
    metrics    = [c["column_name"] for c in columns if c.get("semantic_type") == "metric"]
    dimensions = [c["column_name"] for c in columns if c.get("semantic_type") == "dimension"]
    dates      = [c["column_name"] for c in columns if c.get("semantic_type") == "date"]
    return {
        "metrics": metrics,
        "dimensions": dimensions,
        "dates": dates,
        "row_count": row_count,
    }, 0
>>>>>>> Stashed changes
