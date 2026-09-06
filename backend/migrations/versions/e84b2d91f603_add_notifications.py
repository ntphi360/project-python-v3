"""add notifications

Revision ID: e84b2d91f603
Revises: c41b7e9a6d20
Create Date: 2026-09-06 15:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e84b2d91f603"
down_revision = "c41b7e9a6d20"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "Notifications",
        sa.Column("Id", sa.Integer(), nullable=False),
        sa.Column("ReceiverUserId", sa.Integer(), nullable=False),
        sa.Column("SenderUserId", sa.Integer(), nullable=True),
        sa.Column("CaseId", sa.Integer(), nullable=False),
        sa.Column("Type", sa.String(length=50), nullable=False),
        sa.Column("Title", sa.Unicode(length=255), nullable=False),
        sa.Column("Message", sa.Unicode(length=2000), nullable=False),
        sa.Column("IsRead", sa.Boolean(), nullable=False),
        sa.Column("CreatedAt", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["CaseId"], ["Cases.Id"]),
        sa.ForeignKeyConstraint(["ReceiverUserId"], ["Users.Id"]),
        sa.ForeignKeyConstraint(["SenderUserId"], ["Users.Id"]),
        sa.PrimaryKeyConstraint("Id"),
    )
    op.create_index(
        "IX_Notifications_ReceiverUserId_CreatedAt",
        "Notifications",
        ["ReceiverUserId", "CreatedAt"],
    )


def downgrade():
    op.drop_index(
        "IX_Notifications_ReceiverUserId_CreatedAt",
        table_name="Notifications",
    )
    op.drop_table("Notifications")
