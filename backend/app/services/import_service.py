import pandas as pd

from app.extensions import db
from app.models.case import Case
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.procedure_field import ProcedureField
from app.models.user import User


# xử lý date
def parse_date(value):
    if pd.isna(value):
        return None

    value = pd.to_datetime(
        value,
        dayfirst=True,
        errors="coerce"
    )

    if pd.isna(value):
        return None

    return value.to_pydatetime()


# xử lý text
def clean_text(value):
    if pd.isna(value):
        return None

    value = str(value).strip()

    if not value:
        return None

    return value


# import file
def import_case_file(file):
    filename = file.filename.lower()

    # đọc file
    if filename.endswith(".csv"):
        df = pd.read_csv(
            file,
            encoding="utf-8-sig"
        )

    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(file)

    else:
        raise ValueError(
            "Chỉ hỗ trợ file CSV, XLSX hoặc XLS"
        )

    # xử lys dòng và cột rỗng
    df = df.dropna(
        axis=1,
        how="all"
    )

    df = df.dropna(
        how="all"
    )

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
    )

    # cột dữ liệu
    required_columns = [
        "Số hồ sơ",
        "Tên thủ tục hành chính",
        "Tên lĩnh vực",
        "Phòng ban",
        "Ngày tiếp nhận",
        "Hạn xử lý",
        "Cán bộ xử lý hiện tại",
        "Trạng thái"
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            "Thiếu các cột bắt buộc: "
            + ", ".join(missing_columns)
        )

    # lấy dữ diệu từ file
    case_codes = {
        clean_text(value)
        for value in df["Số hồ sơ"]
        if clean_text(value)
    }

    field_names = {
        clean_text(value)
        for value in df["Tên lĩnh vực"]
        if clean_text(value)
    }

    procedure_names = {
        clean_text(value)
        for value in df["Tên thủ tục hành chính"]
        if clean_text(value)
    }

    department_names = {
        clean_text(value)
        for value in df["Phòng ban"]
        if clean_text(value)
    }

    assignee_names = {
        clean_text(value)
        for value in df["Cán bộ xử lý hiện tại"]
        if clean_text(value)
    }

    # 5. query dữ liệu có sẵn
    existing_cases = {}

    if case_codes:
        case_records = (
            Case.query
            .filter(
                Case.external_case_code.in_(
                    case_codes
                )
            )
            .all()
        )

        existing_cases = {
            case.external_case_code: case
            for case in case_records
        }

    fields = {}

    if field_names:
        field_records = (
            ProcedureField.query
            .filter(
                ProcedureField.name.in_(
                    field_names
                )
            )
            .all()
        )

        fields = {
            field.name: field
            for field in field_records
        }

    procedures = {}

    if procedure_names:
        procedure_records = (
            Procedure.query
            .filter(
                Procedure.name.in_(
                    procedure_names
                )
            )
            .all()
        )

        procedures = {
            procedure.name: procedure
            for procedure in procedure_records
        }

    departments = {}

    if department_names:
        department_records = (
            Department.query
            .filter(
                Department.name.in_(
                    department_names
                )
            )
            .all()
        )

        departments = {
            department.name: department
            for department in department_records
        }

    users = {}

    if assignee_names:
        user_records = (
            User.query
            .filter(
                User.full_name.in_(
                    assignee_names
                )
            )
            .all()
        )

        users = {
            user.full_name: user
            for user in user_records
        }

    imported = 0
    skipped = 0

    try:
        # duyệt liệu
        for _, row in df.iterrows():

            # MÃ HỒ SƠ
            case_code = clean_text(
                row.get("Số hồ sơ")
            )

            if not case_code:
                skipped += 1
                continue

            # check tồn tại
            if case_code in existing_cases:
                skipped += 1
                continue

            # lĩnh vực
            field_name = clean_text(
                row.get("Tên lĩnh vực")
            )

            procedure_field = None

            if field_name:
                procedure_field = fields.get(
                    field_name
                )

                if not procedure_field:
                    procedure_field = ProcedureField(
                        name=field_name,
                        is_active=True
                    )

                    db.session.add(
                        procedure_field
                    )

                    db.session.flush()

                    fields[
                        field_name
                    ] = procedure_field

            # thủ tục
            procedure_name = clean_text(
                row.get(
                    "Tên thủ tục hành chính"
                )
            )

            procedure = None

            if procedure_name:
                procedure = procedures.get(
                    procedure_name
                )

                if not procedure:
                    procedure = Procedure(
                        name=procedure_name,

                        procedure_field_id=(
                            procedure_field.id
                            if procedure_field
                            else None
                        ),

                        default_processing_hours=0,
                        is_active=True
                    )

                    db.session.add(
                        procedure
                    )

                    db.session.flush()

                    procedures[
                        procedure_name
                    ] = procedure

            # phòng ban
            department_name = clean_text(
                row.get("Phòng ban")
            )

            department = None

            if department_name:
                department = departments.get(
                    department_name
                )

                if not department:
                    department = Department(
                        name=department_name,
                        is_active=True
                    )

                    db.session.add(
                        department
                    )

                    db.session.flush()

                    departments[
                        department_name
                    ] = department

            # cán bộ xử lý
            assignee_name = clean_text(
                row.get(
                    "Cán bộ xử lý hiện tại"
                )
            )

            assignee = None

            if assignee_name:
                assignee = users.get(
                    assignee_name
                )

                if not assignee:
                    assignee = User(
                        full_name=assignee_name,

                        department_id=(
                            department.id
                            if department
                            else None
                        ),

                        is_active=True
                    )

                    db.session.add(
                        assignee
                    )

                    db.session.flush()

                    users[
                        assignee_name
                    ] = assignee

            # tạo hồ sơ
            case = Case(
                external_case_code=case_code,

                procedure_id=(
                    procedure.id
                    if procedure
                    else None
                ),

                department_id=(
                    department.id
                    if department
                    else None
                ),

                current_assignee_id=(
                    assignee.id
                    if assignee
                    else None
                ),

                applicant_name=clean_text(
                    row.get("Chủ hồ sơ")
                ),

                applicant_phone=clean_text(
                    row.get("Số điện thoại")
                ),

                agency_name=clean_text(
                    row.get("Cơ quan/đơn vị")
                ),

                received_at=parse_date(
                    row.get("Ngày tiếp nhận")
                ),

                appointment_date=parse_date(
                    row.get("Ngày hẹn trả")
                ),

                due_at=parse_date(
                    row.get("Hạn xử lý")
                ),

                completed_at=parse_date(
                    row.get(
                        "Ngày kết thúc xử lý"
                    )
                ),

                status=clean_text(
                    row.get("Trạng thái")
                ),

                source_type="IMPORT"
            )

            db.session.add(case)

            # store vào cache tránh bị trùng dữ liệu trong file
            existing_cases[
                case_code
            ] = case

            imported += 1

        # commit -> lưu vào db
        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    return {
        "imported": imported,
        "skipped": skipped
    }