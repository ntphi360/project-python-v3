from app.extensions import db


class User(db.Model):
    __tablename__ = "Users"

    id = db.Column("Id", db.Integer, primary_key=True)
    username = db.Column("Username", db.String(100))
    full_name = db.Column("FullName", db.String(255))
    email = db.Column("Email", db.String(255))
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