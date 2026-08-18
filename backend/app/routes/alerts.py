from datetime import datetime

from flask import Blueprint, jsonify

from app.models.case import Case

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.get("/alerts")
def get_alerts():
    now = datetime.now()

    cases = (
        Case.query
        .filter(
            Case.completed_at.is_(None),
            Case.received_at.isnot(None),
            Case.due_at.isnot(None),
        )
        .order_by(Case.due_at.asc())
        .all()
    )

    items = []

    overdue_count = 0
    upcoming_count = 0

    for case in cases:
        total_time = case.due_at - case.received_at
        # lấy 1 nửa ngày hẹn để thông báo
        warning_time = (
            case.received_at
            + total_time / 2
        )

        if now > case.due_at:
            alert_type = "OVERDUE"
            overdue_count += 1

        elif now >= warning_time:
            alert_type = "UPCOMING"
            upcoming_count += 1

        else:
            continue

        items.append({
            "id": case.id,
            "caseCode": case.external_case_code,

            "applicantName": case.applicant_name,

            "procedureName": (
                case.procedure.name
                if case.procedure
                else None
            ),

            "departmentName": (
                case.department.name
                if case.department
                else None
            ),

            "assigneeName": (
                case.current_assignee.full_name
                if case.current_assignee
                else None
            ),

            "receivedAt": (
                case.received_at.isoformat()
                if case.received_at
                else None
            ),

            "dueAt": (
                case.due_at.isoformat()
                if case.due_at
                else None
            ),

            "warningAt": (
                warning_time.isoformat()
                if warning_time
                else None
            ),

            "status": case.status,
            "priority": case.priority,
            "alertType": alert_type,
        })

    return jsonify({
        "success": True,

        "data": {
            "items": items,

            "summary": {
                "upcoming": upcoming_count,
                "overdue": overdue_count,
                "total": len(items),
            },
        },

        "message":
            "Lấy danh sách cảnh báo thành công",

        "errors": None,
    }), 200