"""add case history

Revision ID: c41b7e9a6d20
Revises: 7391ae438a78
Create Date: 2026-08-26 23:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c41b7e9a6d20"
down_revision = "7391ae438a78"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "CaseHistory",
        sa.Column("Id", sa.Integer(), nullable=False),
        sa.Column("CaseId", sa.Integer(), nullable=False),
        sa.Column("Action", sa.String(length=50), nullable=False),
        sa.Column("OldValue", sa.Unicode(length=255), nullable=True),
        sa.Column("NewValue", sa.Unicode(length=255), nullable=True),
        sa.Column("Note", sa.Unicode(length=1000), nullable=True),
        sa.Column("CreatedAt", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["CaseId"],
            ["Cases.Id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("Id"),
    )


def downgrade():
    op.drop_table("CaseHistory")
