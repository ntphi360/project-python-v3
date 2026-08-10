from flask import Blueprint, jsonify

from app.models.case import Case


cases_bp = Blueprint("cases", __name__)


@cases_bp.get("/cases")
def get_cases():
    cases = Case.query.all()

    data = []

    for case in cases:
        data.append({
            "id": case.id,
            "externalCaseCode": case.external_case_code,

            "procedureId": case.procedure_id,
            "procedureName": (
                case.procedure.name
                if case.procedure
                else None
            ),

            "departmentId": case.department_id,
            "departmentName": (
                case.department.name
                if case.department
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

            "completedAt": (
                case.completed_at.isoformat()
                if case.completed_at
                else None
            ),

            "status": case.status,
            "priority": case.priority,

            "currentAssigneeId": case.current_assignee_id,

            "currentAssigneeName": (
                case.current_assignee.full_name
                if case.current_assignee
                else None
            ),

            "currentStepName": case.current_step_name,
            "sourceType": case.source_type,
            "applicantName": case.applicant_name,
        })

    return jsonify({
        "success": True,
        "data": data,
        "message": "Lấy danh sách hồ sơ thành công",
        "errors": None
    }), 200