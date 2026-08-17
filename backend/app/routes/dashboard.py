from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from sqlalchemy import func

from app.extensions import db
from app.models.case import Case


dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/dashboard")
def get_dashboard():
    now = datetime.now()
    upcoming_limit = now + timedelta(days=3)

    total_cases = Case.query.count()

    completed_cases = Case.query.filter(
        Case.completed_at.isnot(None)
    ).count()

    overdue_cases = Case.query.filter(
        Case.completed_at.is_(None),
        Case.due_at.isnot(None),
        Case.due_at < now
    ).count()

    upcoming_cases = Case.query.filter(
        Case.completed_at.is_(None),
        Case.due_at.isnot(None),
        Case.due_at >= now,
        Case.due_at <= upcoming_limit
    ).count()

    # thống kê theo trạng thái
    status_rows = (
        db.session.query(
            Case.status,
            func.count(Case.id)
        )
        .group_by(Case.status)
        .all()
    )

    status_data = [
        {
            "name": status or "Chưa xác định",
            "value": count
        }
        for status, count in status_rows
    ]

    # hồ sơ cần chú ý: quá hạn hoặc sắp hạn
    attention_cases = (
        Case.query
        .filter(
            Case.completed_at.is_(None),
            Case.due_at.isnot(None),
            Case.due_at <= upcoming_limit
        )
        .order_by(Case.due_at.asc())
        .limit(5)
        .all()
    )

    attention_data = []

    for case in attention_cases:
        attention_data.append({
            "id": case.id,
            "caseCode": case.external_case_code,
            "applicantName": case.applicant_name,

            "procedureName": (
                case.procedure.name
                if case.procedure
                else None
            ),

            "appointmentDate": (
                case.appointment_date.isoformat()
                if case.appointment_date
                else None
            ),

            "assigneeName": (
                case.current_assignee.full_name
                if case.current_assignee
                else None
            ),

            "status": case.status,
        })

    return jsonify({
        "success": True,
        "data": {
            "summary": {
                "total": total_cases,
                "upcoming": upcoming_cases,
                "overdue": overdue_cases,
                "completed": completed_cases,
            },
            "statusData": status_data,
            "attentionCases": attention_data,
        },
        "message": "Lấy dữ liệu dashboard thành công",
        "errors": None
    }), 200