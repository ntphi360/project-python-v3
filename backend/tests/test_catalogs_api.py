import unittest

from flask import Flask

from app.extensions import db
from app.models.case import Case
from app.models.department import Department
from app.models.procedure import Procedure
from app.models.procedure_field import ProcedureField
from app.models.user import User
from app.routes.catalogs import catalogs_bp


class CatalogsApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = Flask(__name__)
        cls.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(cls.app)
        cls.app.register_blueprint(catalogs_bp, url_prefix="/api/v1")

    def setUp(self):
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

        db.session.add_all([
            Department(id=1, name="Văn phòng HĐND&UBND"),
            Department(id=2, name="Phòng Kinh tế"),
            ProcedureField(id=1, name="Hộ tịch"),
            ProcedureField(id=2, name="Hộ kinh doanh"),
            Procedure(
                id=1,
                name="Đăng ký khai sinh",
                procedure_field_id=1,
            ),
            Procedure(
                id=2,
                name="Cấp bản sao",
                procedure_field_id=None,
            ),
            User(
                id=1,
                full_name="Trần Thị Yến Nhung",
                department_id=1,
            ),
            User(
                id=2,
                full_name="Dương Thị Đào",
                department_id=2,
            ),
            User(
                id=3,
                full_name="Nguyễn Quang Hoàn",
                department_id=1,
            ),
            Case(
                external_case_code="HS-AGENCY-1",
                agency_name="UBND",
            ),
            Case(
                external_case_code="HS-AGENCY-2",
                agency_name="UBND",
            ),
            Case(
                external_case_code="HS-AGENCY-3",
                agency_name="Trung tâm phục vụ hành chính công",
            ),
            Case(
                external_case_code="HS-AGENCY-4",
                agency_name="   ",
            ),
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

    def assert_success_response(self, response, expected_message):
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["success"])
        self.assertEqual(response.json["message"], expected_message)
        self.assertIsNone(response.json["errors"])

    def test_procedures_include_field_and_are_sorted_by_name(self):
        response = self.client.get("/api/v1/procedures")

        self.assert_success_response(
            response,
            "Lấy danh sách thủ tục thành công",
        )
        self.assertEqual(
            response.json["data"],
            [
                {
                    "id": 2,
                    "name": "Cấp bản sao",
                    "fieldId": None,
                    "fieldName": None,
                },
                {
                    "id": 1,
                    "name": "Đăng ký khai sinh",
                    "fieldId": 1,
                    "fieldName": "Hộ tịch",
                },
            ],
        )

    def test_procedure_fields_and_departments_are_sorted_by_name(self):
        fields_response = self.client.get("/api/v1/procedure-fields")
        departments_response = self.client.get("/api/v1/departments")

        self.assert_success_response(
            fields_response,
            "Lấy danh sách lĩnh vực thành công",
        )
        self.assertEqual(
            [item["name"] for item in fields_response.json["data"]],
            ["Hộ kinh doanh", "Hộ tịch"],
        )

        self.assert_success_response(
            departments_response,
            "Lấy danh sách phòng ban thành công",
        )
        self.assertEqual(
            [item["name"] for item in departments_response.json["data"]],
            ["Phòng Kinh tế", "Văn phòng HĐND&UBND"],
        )

    def test_users_include_department_and_are_sorted_by_name(self):
        response = self.client.get("/api/v1/users")

        self.assert_success_response(
            response,
            "Lấy danh sách cán bộ thành công",
        )
        self.assertEqual(
            [item["fullName"] for item in response.json["data"]],
            ["Dương Thị Đào", "Nguyễn Quang Hoàn", "Trần Thị Yến Nhung"],
        )
        self.assertEqual(
            response.json["data"][0],
            {
                "id": 2,
                "fullName": "Dương Thị Đào",
                "departmentId": 2,
                "departmentName": "Phòng Kinh tế",
            },
        )

    def test_agencies_are_distinct_sorted_and_ignore_blank_values(self):
        response = self.client.get("/api/v1/agencies")

        self.assert_success_response(
            response,
            "Lấy danh sách đơn vị thành công",
        )
        self.assertEqual(
            response.json["data"],
            [
                {"name": "Trung tâm phục vụ hành chính công"},
                {"name": "UBND"},
            ],
        )

    def test_users_can_be_filtered_by_department(self):
        response = self.client.get("/api/v1/users?department_id=1")

        self.assert_success_response(
            response,
            "Lấy danh sách cán bộ thành công",
        )
        self.assertEqual(
            [item["id"] for item in response.json["data"]],
            [3, 1],
        )
        self.assertTrue(
            all(item["departmentId"] == 1 for item in response.json["data"])
        )

    def test_users_reject_invalid_department_id(self):
        for value in ("abc", "0", "-1"):
            with self.subTest(value=value):
                response = self.client.get(
                    f"/api/v1/users?department_id={value}"
                )
                self.assertEqual(response.status_code, 400)
                self.assertFalse(response.json["success"])
                self.assertIsNone(response.json["data"])
                self.assertIn("department_id", response.json["errors"])

    def test_users_return_404_for_missing_department(self):
        response = self.client.get("/api/v1/users?department_id=999")

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json["success"])
        self.assertEqual(response.json["message"], "Không tìm thấy phòng ban")
        self.assertEqual(response.json["errors"], {"department_id": 999})


if __name__ == "__main__":
    unittest.main()
