from app.extensions import db


class Department(db.Model):
    __tablename__ = "Departments"

    id = db.Column("Id", db.Integer, primary_key=True)
    code = db.Column("Code", db.String(50))
    name = db.Column("Name", db.String(255))
    parent_id = db.Column("ParentId", db.Integer)
    is_active = db.Column("IsActive", db.Boolean)
    created_at = db.Column("CreatedAt", db.DateTime)