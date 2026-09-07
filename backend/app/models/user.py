from app.extensions import db
from werkzeug.security import check_password_hash, generate_password_hash


class UserRole:
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    OFFICER = "OFFICER"

    ALL = {ADMIN, MANAGER, OFFICER}


class User(db.Model):
    __tablename__ = "Users"
    __table_args__ = (
        db.CheckConstraint(
            "[Role] IS NULL OR [Role] IN ('ADMIN', 'MANAGER', 'OFFICER')",
            name="CK_Users_Role",
        ),
    )

    id = db.Column("Id", db.Integer, primary_key=True)
    username = db.Column("Username", db.Unicode(100))
    full_name = db.Column("FullName", db.Unicode(255))
    email = db.Column("Email", db.String(255))
    password_hash = db.Column("PasswordHash", db.String(255))
    role = db.Column("Role", db.String(20), nullable=True)
    phone_number = db.Column("PhoneNumber", db.String(50))

    department_id = db.Column(
        "DepartmentId",
        db.Integer,
        db.ForeignKey("Departments.Id")
    )

    external_user_code = db.Column(
        "ExternalUserCode",
        db.String(100)
    )

    is_active = db.Column("IsActive", db.Boolean)

    def set_password(self, password):
        if not isinstance(password, str) or not password:
            raise ValueError("Mật khẩu không được để trống")

        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash or not isinstance(password, str):
            return False

        try:
            return check_password_hash(self.password_hash, password)
        except ValueError:
            return False
