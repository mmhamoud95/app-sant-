"""add audit logs table

Revision ID: 20251016_0002
Revises: 20251016_0001
Create Date: 2025-10-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251016_0002"
down_revision = "20251016_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auditlog",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("resource", sa.String(length=120), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    sa.ForeignKeyConstraint(["user_id"], ["user.id"], name=op.f("fk_auditlog_user_id_user")),
    )
    op.create_index(op.f("ix_auditlog_id"), "auditlog", ["id"], unique=False)
    op.create_index(op.f("ix_auditlog_user_id"), "auditlog", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_auditlog_user_id"), table_name="auditlog")
    op.drop_index(op.f("ix_auditlog_id"), table_name="auditlog")
    op.drop_table("auditlog")
