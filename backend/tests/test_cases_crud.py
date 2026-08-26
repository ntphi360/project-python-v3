import unittest
from datetime import datetime
from io import BytesIO
from unittest.mock import patch

from flask import Flask
from sqlalchemy.exc import IntegrityError
from werkzeug.datastructures import FileStorage

from app.extensions import db
from app.models.case import Case
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.procedure_field import ProcedureField
from app.models.user import User
from app.routes.cases import cases_bp
from app.services.import_service import import_case_file


class CaseCrudApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = Flask(__name__)
        cls.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(cls.app)
        cls.app.register_blueprint(cases_bp, url_prefix="/api/v1")

    def setUp(self):
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

        department = Department(id=1, name="Phòng thử nghiệm")
        procedure_field = ProcedureField(id=1, name="Lĩnh vực thử nghiệm")
        procedure = Procedure(
            id=1,
            name="Thủ tục thử nghiệm",
            procedure_field_id=1,
        )
        user = User(
            id=1,
            full_name="Người xử lý thử nghiệm",
            department_id=1,
        )
        db.session.add_all([
            department,
            procedure_field,
            procedure,
            user,
        ])
        db.session.commit()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.session.remove()
            db.engine.dispose()

    def create_case(self, case_code="HS-001", **overrides):
        payload = {
            "caseCode": case_code,
            "procedureId": 1,
            "departmentId": 1,
            "assigneeId": 1,
            "applicantName": "Nguyễn Văn A",
            "applicantPhone": "0901234567",
            "agencyName": "Phường 1",
            "receivedAt": "2026-08-25T09:00:00",
            "appointmentDate": "2026-08-30T09:00:00",
            "dueAt": "2026-08-30T09:00:00",
            "completedAt": None,
            "status": "Đang xử lý",
            "priority": "Bình thường",
            "currentStepName": "Tiếp nhận",
            "sourceType": "MANUAL",
        }
        payload.update(overrides)
        return self.client.post("/api/v1/cases", json=payload)

    def test_post_creates_case_and_trims_case_code(self):
        response = self.create_case("  HS-001  ")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json["success"])
        self.assertEqual(response.json["data"]["caseCode"], "HS-001")

        case = Case.query.one()
        self.assertEqual(case.external_case_code, "HS-001")
        self.assertEqual(case.procedure_id, 1)
        self.assertEqual(case.department_id, 1)
        self.assertEqual(case.current_assignee_id, 1)
        self.assertEqual(case.applicant_phone, "0901234567")
        self.assertEqual(case.agency_name, "Phường 1")
        self.assertEqual(case.priority, "Bình thường")
        self.assertEqual(case.current_step_name, "Tiếp nhận")
        self.assertEqual(case.source_type, "MANUAL")
        self.assertIsInstance(case.created_at, datetime)
        self.assertIsInstance(case.updated_at, datetime)
        self.assertIsNone(case.completed_at)

    def test_post_accepts_missing_optional_fields(self):
        response = self.client.post(
            "/api/v1/cases",
            json={"caseCode": "HS-MINIMAL"},
        )

        self.assertEqual(response.status_code, 201)
        case = Case.query.one()
        self.assertEqual(case.external_case_code, "HS-MINIMAL")
        self.assertIsNone(case.procedure_id)
        self.assertIsNone(case.received_at)

    def test_post_generates_daily_case_codes_in_sequence(self):
        fixed_now = datetime(2026, 8, 26, 8, 30, 0)

        with patch("app.routes.cases.datetime") as mocked_datetime:
            mocked_datetime.now.return_value = fixed_now
            first_response = self.client.post("/api/v1/cases", json={})
            second_response = self.client.post("/api/v1/cases", json={})

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 201)
        self.assertEqual(
            first_response.json["data"]["caseCode"],
            "H29.259-20260826-0001",
        )
        self.assertEqual(
            second_response.json["data"]["caseCode"],
            "H29.259-20260826-0002",
        )

    def test_generated_code_uses_largest_sequence_and_resets_each_day(self):
        db.session.add(Case(
            external_case_code="H29.259-20260826-0017",
        ))
        db.session.commit()

        with patch("app.routes.cases.datetime") as mocked_datetime:
            mocked_datetime.now.return_value = datetime(2026, 8, 26, 23, 59)
            same_day_response = self.client.post("/api/v1/cases", json={})
            mocked_datetime.now.return_value = datetime(2026, 8, 27, 0, 1)
            next_day_response = self.client.post("/api/v1/cases", json={})

        self.assertEqual(
            same_day_response.json["data"]["caseCode"],
            "H29.259-20260826-0018",
        )
        self.assertEqual(
            next_day_response.json["data"]["caseCode"],
            "H29.259-20260827-0001",
        )

    def test_generated_code_retries_after_unique_collision(self):
        real_commit = db.session.commit
        real_rollback = db.session.rollback
        commit_attempts = 0

        def commit_with_first_attempt_collision():
            nonlocal commit_attempts
            commit_attempts += 1

            if commit_attempts == 1:
                raise IntegrityError("INSERT", {}, Exception("duplicate"))

            return real_commit()

        with (
            patch(
                "app.routes.cases.generate_case_code",
                side_effect=[
                    "H29.259-20260826-0001",
                    "H29.259-20260826-0002",
                ],
            ),
            patch.object(
                db.session,
                "commit",
                side_effect=commit_with_first_attempt_collision,
            ),
            patch.object(
                db.session,
                "rollback",
                wraps=real_rollback,
            ) as rollback,
        ):
            response = self.client.post("/api/v1/cases", json={})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json["data"]["caseCode"],
            "H29.259-20260826-0002",
        )
        rollback.assert_called_once()

    def test_put_without_case_code_preserves_generated_code(self):
        with patch("app.routes.cases.datetime") as mocked_datetime:
            mocked_datetime.now.return_value = datetime(2026, 8, 26, 9, 0)
            create_response = self.client.post("/api/v1/cases", json={})

        case_id = create_response.json["data"]["id"]
        case_code = create_response.json["data"]["caseCode"]
        update_response = self.client.put(
            f"/api/v1/cases/{case_id}",
            json={"status": "Đang xử lý"},
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json["data"]["caseCode"], case_code)
        self.assertEqual(db.session.get(Case, case_id).external_case_code, case_code)

    def test_import_keeps_original_case_code(self):
        csv_content = (
            "Số hồ sơ,Tên thủ tục hành chính,Tên lĩnh vực,Phòng ban,"
            "Ngày tiếp nhận,Hạn xử lý,Cán bộ xử lý hiện tại,Trạng thái\n"
            "IMPORT-ORIGINAL,Thủ tục thử nghiệm,Lĩnh vực thử nghiệm,"
            "Phòng thử nghiệm,25/08/2026,30/08/2026,"
            "Người xử lý thử nghiệm,Đang xử lý\n"
        )
        upload = FileStorage(
            stream=BytesIO(csv_content.encode("utf-8-sig")),
            filename="cases.csv",
        )

        result = import_case_file(upload)

        self.assertEqual(result["imported"], 1)
        imported_case = Case.query.filter_by(
            external_case_code="IMPORT-ORIGINAL"
        ).one()
        self.assertEqual(imported_case.source_type, "IMPORT")

    def test_post_validates_required_duplicate_datetime_and_foreign_key(self):
        empty_code = self.client.post("/api/v1/cases", json={"caseCode": "   "})
        self.assertEqual(empty_code.status_code, 400)
        self.assertIn("caseCode", empty_code.json["errors"])

        self.create_case()
        duplicate = self.create_case("HS-001")
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("caseCode", duplicate.json["errors"])

        invalid = self.create_case(
            "HS-002",
            procedureId=999,
            receivedAt="không-phải-datetime",
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("procedureId", invalid.json["errors"])
        self.assertIn("receivedAt", invalid.json["errors"])
        self.assertIsNone(Case.query.filter_by(external_case_code="HS-002").first())

    def test_put_updates_only_supplied_fields_and_accepts_null(self):
        case_id = self.create_case(
            completedAt="2026-08-29T15:00:00"
        ).json["data"]["id"]

        response = self.client.put(
            f"/api/v1/cases/{case_id}",
            json={
                "caseCode": "  HS-UPDATED  ",
                "procedureId": None,
                "departmentId": None,
                "assigneeId": None,
                "completedAt": None,
                "priority": "Cao",
            },
        )

        self.assertEqual(response.status_code, 200)
        case = db.session.get(Case, case_id)
        self.assertEqual(case.external_case_code, "HS-UPDATED")
        self.assertEqual(case.applicant_name, "Nguyễn Văn A")
        self.assertEqual(case.priority, "Cao")
        self.assertIsNone(case.procedure_id)
        self.assertIsNone(case.department_id)
        self.assertIsNone(case.current_assignee_id)
        self.assertIsNone(case.completed_at)

    def test_put_rejects_invalid_data_without_changing_case(self):
        first_id = self.create_case("HS-001").json["data"]["id"]
        self.create_case("HS-002")

        response = self.client.put(
            f"/api/v1/cases/{first_id}",
            json={
                "caseCode": "HS-002",
                "departmentId": 999,
                "completedAt": "invalid",
            },
        )

        self.assertEqual(response.status_code, 400)
        db.session.expire_all()
        case = db.session.get(Case, first_id)
        self.assertEqual(case.external_case_code, "HS-001")
        self.assertEqual(case.department_id, 1)
        self.assertIsNone(case.completed_at)

    def test_put_and_delete_return_404_for_missing_case(self):
        update_response = self.client.put("/api/v1/cases/999", json={"status": "Hoàn thành"})
        delete_response = self.client.delete("/api/v1/cases/999")

        self.assertEqual(update_response.status_code, 404)
        self.assertEqual(delete_response.status_code, 404)

    def test_delete_removes_existing_case(self):
        case_id = self.create_case().json["data"]["id"]

        response = self.client.delete(f"/api/v1/cases/{case_id}")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["success"])
        self.assertIsNone(db.session.get(Case, case_id))

    def test_get_endpoints_still_return_created_case(self):
        case_id = self.create_case().json["data"]["id"]

        list_response = self.client.get("/api/v1/cases")
        detail_response = self.client.get(f"/api/v1/cases/{case_id}")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json["data"]["pagination"]["total"], 1)
        self.assertEqual(list_response.json["data"]["items"][0]["caseCode"], "HS-001")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json["data"]["caseCode"], "HS-001")

    def test_database_error_rolls_back_and_hides_exception(self):
        with (
            patch.object(db.session, "commit", side_effect=RuntimeError("sensitive database detail")),
            patch.object(db.session, "rollback") as rollback,
        ):
            response = self.create_case()

        self.assertEqual(response.status_code, 500)
        self.assertFalse(response.json["success"])
        self.assertNotIn("sensitive database detail", response.get_data(as_text=True))
        rollback.assert_called_once()


if __name__ == "__main__":
    unittest.main()
