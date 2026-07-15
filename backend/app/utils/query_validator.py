import re
import sqlparse
from dataclasses import dataclass

FORBIDDEN_PATTERNS = [
    r'\bINSERT\b', r'\bUPDATE\b', r'\bDELETE\b', r'\bDROP\b', r'\bALTER\b',
    r'\bCREATE\b', r'\bTRUNCATE\b', r'\bEXEC\b', r'\bEXECUTE\b', r'\bGRANT\b',
    r'\bREVOKE\b', r'\bPRAGMA\b', r'\bATTACH\b',
]

@dataclass
class ValidationResult:
    is_valid: bool
    errors: list
    sanitized_sql: str

def validate_sql(sql: str, max_rows: int = 10000) -> ValidationResult:
    errors = []
    
    if not sql or not sql.strip():
        return ValidationResult(is_valid=False, errors=["SQL is empty"], sanitized_sql=sql)

    # Check forbidden keywords
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, sql, re.IGNORECASE):
            keyword = pattern.replace(r'\b', '').replace('\\b', '')
            errors.append(f"Forbidden SQL keyword: {keyword}")

    # Only SELECT allowed
    try:
        parsed = sqlparse.parse(sql.strip())
        for stmt in parsed:
            stmt_type = stmt.get_type()
            if stmt_type and stmt_type.upper() != 'SELECT':
                errors.append(f"Only SELECT statements are allowed. Got: {stmt_type}")
    except Exception as e:
        errors.append(f"SQL parse error: {str(e)}")

    # Check for multiple statements
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    if len(statements) > 1:
        errors.append("Multiple statements not allowed")

    # Check for comment-based injection
    if '--' in sql or '/*' in sql:
        errors.append("SQL comments not allowed")

    sanitized = sql.strip()
    if not errors:
        # Add limit if missing
        if not re.search(r'\bLIMIT\s+\d+', sanitized, re.IGNORECASE):
            sanitized = f"SELECT * FROM ({sanitized}) AS __q LIMIT {max_rows}"

    return ValidationResult(is_valid=len(errors) == 0, errors=errors, sanitized_sql=sanitized)

def inject_date_filter(sql: str, start_date: str, end_date: str, column: str) -> str:
    """Replace {date_filter} placeholder with actual WHERE condition."""
    condition = f"{column} BETWEEN '{start_date}' AND '{end_date}'"
    return sql.replace("{date_filter}", condition)

def apply_filter_params(sql: str, params: dict) -> str:
    """Replace named placeholders like {param_name}."""
    for key, value in params.items():
        if isinstance(value, str):
            sql = sql.replace(f"{{{key}}}", f"'{value}'")
        elif value is None:
            sql = sql.replace(f"{{{key}}}", "TRUE")
        else:
            sql = sql.replace(f"{{{key}}}", str(value))
    return sql
