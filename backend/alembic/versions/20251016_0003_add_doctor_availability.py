"""add doctor availability tables

Revision ID: 20251016_0003
Revises: 20251016_0002
Create Date: 2025-10-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251016_0003"
down_revision = "20251016_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "availabilityrule",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctor.user_id"], name=op.f("fk_availabilityrule_doctor_id_doctor")),
        sa.UniqueConstraint("doctor_id", "weekday", "start_time", "end_time", name=op.f("uq_availability_rule_window")),
    )
    op.create_index(op.f("ix_availabilityrule_id"), "availabilityrule", ["id"], unique=False)
    op.create_index(op.f("ix_availabilityrule_doctor_id"), "availabilityrule", ["doctor_id"], unique=False)

    op.create_table(
        "availabilityexception",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctor.user_id"], name=op.f("fk_availabilityexception_doctor_id_doctor")),
        sa.UniqueConstraint("doctor_id", "date", name=op.f("uq_availability_exception_date")),
    )
    op.create_index(op.f("ix_availabilityexception_id"), "availabilityexception", ["id"], unique=False)
    op.create_index(op.f("ix_availabilityexception_doctor_id"), "availabilityexception", ["doctor_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_availabilityexception_doctor_id"), table_name="availabilityexception")
    op.drop_index(op.f("ix_availabilityexception_id"), table_name="availabilityexception")
    op.drop_table("availabilityexception")

    op.drop_index(op.f("ix_availabilityrule_doctor_id"), table_name="availabilityrule")
    op.drop_index(op.f("ix_availabilityrule_id"), table_name="availabilityrule")
    op.drop_table("availabilityrule")
