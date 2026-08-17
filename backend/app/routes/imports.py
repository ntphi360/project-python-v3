from flask import Blueprint, request

from app.services.import_service import import_case_file

imports_bp = Blueprint(
    "imports",
    __name__
)

@imports_bp.post("/import/cases")
def import_cases():
    file = request.files.get("file")

    if not file:
        return {
            "success": False,
            "message": "Vui lòng chọn file",
            "data": None,
            "errors": None
        }, 400

    try:
        result = import_case_file(file)

        return {
            "success": True,
            "message": "Import dữ liệu thành công",
            "data": result,
            "errors": None
        }, 200

    except ValueError as e:
        return {
            "success": False,
            "message": str(e),
            "data": None,
            "errors": None
        }, 400

    except Exception as e:
        return {
            "success": False,
            "message": "Import dữ liệu thất bại",
            "data": None,
            "errors": str(e)
        }, 500