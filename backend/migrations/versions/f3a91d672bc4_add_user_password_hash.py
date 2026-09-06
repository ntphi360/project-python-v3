"""add user password hash

Revision ID: f3a91d672bc4
Revises: e84b2d91f603
Create Date: 2026-09-06 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f3a91d672bc4"
down_revision = "e84b2d91f603"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "Users",
        sa.Column("PasswordHash", sa.String(length=255), nullable=True),
    )


def downgrade():
    op.drop_column("Users", "PasswordHash")
