from datetime import datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.models.case import Case
from app.models.procedure import Procedure


ALERT_LABELS = {
    "NEAR_DUE": "Sắp hạn",
    "DUE_TODAY": "Đến hạn hôm nay",
    "OVERDUE": "Quá hạn",
}

TERMINAL_STATUSES = {
    "Hoàn thành",
    "Đã hoàn thành",
    "Đã trả kết quả",
    "Đóng",
    "Đã đóng",
    "Hủy",
    "Đã hủy",
}
TERMINAL_STATUS_KEYS = {
    status.casefold()
    for status in TERMINAL_STATUSES
}


def current_time():
    return datetime.now()


def active_alert_query(now):
    return (
        Case.query
        .options(
            joinedload(Case.procedure).joinedload(
                Procedure.procedure_field
            ),
            joinedload(Case.department),
            joinedload(Case.current_assignee),
        )
        .filter(
            Case.completed_at.is_(None),
            Case.due_at.isnot(None),
            Case.due_at <= now + timedelta(days=3),
            or_(
                Case.status.is_(None),
                Case.status.notin_(TERMINAL_STATUSES),
            ),
        )
    )


def classify_alert(due_at, now):
    if not due_at:
        return None

    if due_at < now:
        return "OVERDUE"

    end_of_today = now.replace(
        hour=23,
        minute=59,
        second=59,
        microsecond=999999,
    )

    if due_at <= end_of_today:
        return "DUE_TODAY"

    if due_at <= now + timedelta(days=3):
        return "NEAR_DUE"

    return None


def format_remaining_text(remaining_seconds, alert_type):
    total_minutes = abs(remaining_seconds) // 60
    days, remaining_minutes = divmod(total_minutes, 24 * 60)
    hours, minutes = divmod(remaining_minutes, 60)

    parts = []
    if days:
        parts.append(f"{days} ngày")
    if hours:
        parts.append(f"{hours} giờ")
    if minutes or not parts:
        parts.append(f"{minutes} phút")

    duration = " ".join(parts)
    if alert_type == "OVERDUE":
        return f"Quá hạn {duration}"

    return f"Còn {duration}"


def build_alert_item(case, now):
    normalized_status = (
        case.status.strip().casefold()
        if isinstance(case.status, str)
        else None
    )
    if (
        case.completed_at is not None
        or normalized_status in TERMINAL_STATUS_KEYS
    ):
        return None

    alert_type = classify_alert(case.due_at, now)
    if not alert_type:
        return None

    remaining_seconds = int((case.due_at - now).total_seconds())
    assignee = case.current_assignee
    procedure = case.procedure

    return {
        "id": case.id,
        "caseId": case.id,
        "caseCode": case.external_case_code,
        "caseName": case.applicant_name,
        "ownerName": case.applicant_name,
        "applicantName": case.applicant_name,
        "fieldName": (
            procedure.procedure_field.name
            if procedure and procedure.procedure_field
            else None
        ),
        "procedureName": procedure.name if procedure else None,
        "departmentName": (
            case.department.name
            if case.department
            else None
        ),
        "assigneeId": case.current_assignee_id,
        "assigneeName": assignee.full_name if assignee else None,
        "assigneeEmail": assignee.email if assignee else None,
        "assigneePhone": assignee.phone_number if assignee else None,
        "receivedAt": (
            case.received_at.isoformat()
            if case.received_at
            else None
        ),
        "dueAt": case.due_at.isoformat(),
        "appointmentDate": (
            case.appointment_date.isoformat()
            if case.appointment_date
            else None
        ),
        "status": case.status,
        "alertType": alert_type,
        "alertLabel": ALERT_LABELS[alert_type],
        "remainingSeconds": remaining_seconds,
        "remainingText": format_remaining_text(
            remaining_seconds,
            alert_type,
        ),
    }
