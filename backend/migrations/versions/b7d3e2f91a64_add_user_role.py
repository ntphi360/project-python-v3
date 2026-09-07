"""add user role

Revision ID: b7d3e2f91a64
Revises: f3a91d672bc4
Create Date: 2026-09-07 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b7d3e2f91a64"
down_revision = "f3a91d672bc4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "Users",
        sa.Column("Role", sa.String(length=20), nullable=True),
    )
    op.create_check_constraint(
        "CK_Users_Role",
        "Users",
        "[Role] IS NULL OR [Role] IN ('ADMIN', 'MANAGER', 'OFFICER')",
    )


def downgrade():
    op.drop_constraint("CK_Users_Role", "Users", type_="check")
    op.drop_column("Users", "Role")
