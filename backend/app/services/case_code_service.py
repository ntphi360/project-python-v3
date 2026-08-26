import re

from app.extensions import db
from app.models.case import Case


CASE_CODE_PREFIX = "H29.259"
MAX_DAILY_SEQUENCE = 9999


class CaseCodeSequenceExhaustedError(Exception):
    pass


def generate_case_code(created_at):
    date_part = created_at.strftime("%Y%m%d")
    daily_prefix = f"{CASE_CODE_PREFIX}-{date_part}-"
    code_pattern = re.compile(
        rf"^{re.escape(daily_prefix)}(\d{{4}})$"
    )

    rows = (
        db.session.query(Case.external_case_code)
        .filter(Case.external_case_code.like(f"{daily_prefix}%"))
        .all()
    )

    last_sequence = 0

    for row in rows:
        match = code_pattern.fullmatch(row.external_case_code)

        if match:
            last_sequence = max(last_sequence, int(match.group(1)))

    next_sequence = last_sequence + 1

    if next_sequence > MAX_DAILY_SEQUENCE:
        raise CaseCodeSequenceExhaustedError

    return f"{daily_prefix}{next_sequence:04d}"
