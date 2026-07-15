import json
import re
import time
from typing import Optional
from anthropic import AsyncAnthropic
from app.config import settings
from app.ai.prompts.dashboard_generation import SYSTEM_PROMPT, HUMAN_PROMPT, SUGGEST_METRICS_PROMPT

client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

def _extract_json(text: str) -> dict:
    """Extract JSON from AI response, handling markdown code blocks."""
    text = text.strip()
    # Remove markdown code blocks
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    text = text.strip()
    return json.loads(text)

async def generate_dashboard(
    user_prompt: str,
    table_ref: str,
    conn_type: str,
    columns: list[dict],
    sample_rows: list[dict],
    audience: str = "analyst",
    detail_level: str = "detailed"
) -> tuple[dict, int]:
    """
    Generate a dashboard draft using Claude.
    Returns (dashboard_draft, tokens_used)
    """
    # Format columns info
    cols_text = "\n".join([
        f"- {c['column_name']} ({c['data_type']}) [semantic: {c.get('semantic_type','?')}] "
        f"| unique: {c.get('unique_count','?')} | null%: {c.get('null_pct','?')}"
        f"{'| sample: ' + str(c.get('sample_values','')[:3]) if c.get('sample_values') else ''}"
        for c in columns
    ])
    
    # Format sample data
    sample_text = json.dumps(sample_rows[:3], default=str, indent=2) if sample_rows else "No sample data"
    
    human_msg = HUMAN_PROMPT.format(
        user_prompt=user_prompt,
        audience=audience,
        detail_level=detail_level,
        table_ref=table_ref,
        conn_type=conn_type,
        columns_info=cols_text,
        sample_data=sample_text,
    )
    
    start = time.time()
    response = await client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=settings.AI_MAX_TOKENS,
        temperature=settings.AI_TEMPERATURE,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": human_msg}]
    )
    elapsed = int((time.time() - start) * 1000)
    
    content = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens
    
    draft = _extract_json(content)
    return draft, tokens

async def suggest_metrics_and_dimensions(
    columns: list[dict],
    row_count: int
) -> tuple[dict, int]:
    """Suggest semantic metrics and dimensions for a dataset."""
    cols_text = "\n".join([
        f"- {c['column_name']} ({c['data_type']}) [semantic: {c.get('semantic_type','?')}]"
        f"{'| sample: ' + str(c.get('sample_values','')[:3]) if c.get('sample_values') else ''}"
        for c in columns
    ])
    
    prompt = SUGGEST_METRICS_PROMPT.format(
        columns_info=cols_text,
        row_count=row_count
    )
    
    response = await client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=2048,
        temperature=0.0,
        messages=[{"role": "user", "content": prompt}]
    )
    
    content = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens
    result = _extract_json(content)
    return result, tokens

async def edit_dashboard(
    edit_prompt: str,
    current_dashboard: dict,
    columns: list[dict]
) -> tuple[dict, int]:
    """Edit an existing dashboard based on natural language instruction."""
    cols_text = "\n".join([f"- {c['column_name']} ({c['data_type']})" for c in columns])
    
    edit_system = """Sen bir BI dashboard editörüsün. Kullanıcının isteğine göre mevcut dashboard JSON'ını güncelle.
    SADECE JSON döndür. Format: mevcut dashboard ile aynı format, ancak değişiklikler uygulanmış."""
    
    edit_human = f"""## DÜZENLEME İSTEĞİ
{edit_prompt}

## MEVCUT DASHBOARD
{json.dumps(current_dashboard, ensure_ascii=False, indent=2)}

## KULLANILABILIR KOLONLAR
{cols_text}

Güncellenmiş dashboard JSON'ını döndür."""
    
    response = await client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=settings.AI_MAX_TOKENS,
        temperature=0.0,
        system=edit_system,
        messages=[{"role": "user", "content": edit_human}]
    )
    
    content = response.content[0].text
    tokens = response.usage.input_tokens + response.usage.output_tokens
    updated = _extract_json(content)
    return updated, tokens
