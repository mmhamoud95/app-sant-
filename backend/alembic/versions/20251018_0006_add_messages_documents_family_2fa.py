"""add messages documents family 2fa

Revision ID: 20251018_0006
Revises: 20251016_0005
Create Date: 2025-10-18 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251018_0006'
down_revision: Union[str, None] = '20251016_0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create DocumentType enum
    op.execute("CREATE TYPE documenttype AS ENUM ('prescription', 'test_result', 'certificate', 'report')")
    
    # Create Message table
    op.create_table(
        'message',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('receiver_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.String(length=2000), nullable=False),
        sa.Column('attachment_url', sa.String(length=500), nullable=True),
        sa.Column('read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['sender_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['receiver_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_id'), 'message', ['id'], unique=False)
    op.create_index(op.f('ix_message_sender_id'), 'message', ['sender_id'], unique=False)
    op.create_index(op.f('ix_message_receiver_id'), 'message', ['receiver_id'], unique=False)

    # Create MedicalDocument table
    op.create_table(
        'medicaldocument',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('doctor_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.Enum('prescription', 'test_result', 'certificate', 'report', name='documenttype'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['patient_id'], ['patient.user_id'], ),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctor.user_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_medicaldocument_id'), 'medicaldocument', ['id'], unique=False)
    op.create_index(op.f('ix_medicaldocument_patient_id'), 'medicaldocument', ['patient_id'], unique=False)
    op.create_index(op.f('ix_medicaldocument_doctor_id'), 'medicaldocument', ['doctor_id'], unique=False)

    # Create FamilyProfile table
    op.create_table(
        'familyprofile',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('relationship', sa.String(length=50), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['patient_id'], ['patient.user_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_familyprofile_id'), 'familyprofile', ['id'], unique=False)
    op.create_index(op.f('ix_familyprofile_patient_id'), 'familyprofile', ['patient_id'], unique=False)

    # Create TwoFactorAuth table
    op.create_table(
        'twofactorauth',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('secret', sa.String(length=255), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('backup_codes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_twofactorauth_id'), 'twofactorauth', ['id'], unique=False)
    op.create_index(op.f('ix_twofactorauth_user_id'), 'twofactorauth', ['user_id'], unique=True)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_twofactorauth_user_id'), table_name='twofactorauth')
    op.drop_index(op.f('ix_twofactorauth_id'), table_name='twofactorauth')
    op.drop_table('twofactorauth')
    
    op.drop_index(op.f('ix_familyprofile_patient_id'), table_name='familyprofile')
    op.drop_index(op.f('ix_familyprofile_id'), table_name='familyprofile')
    op.drop_table('familyprofile')
    
    op.drop_index(op.f('ix_medicaldocument_doctor_id'), table_name='medicaldocument')
    op.drop_index(op.f('ix_medicaldocument_patient_id'), table_name='medicaldocument')
    op.drop_index(op.f('ix_medicaldocument_id'), table_name='medicaldocument')
    op.drop_table('medicaldocument')
    
    op.drop_index(op.f('ix_message_receiver_id'), table_name='message')
    op.drop_index(op.f('ix_message_sender_id'), table_name='message')
    op.drop_index(op.f('ix_message_id'), table_name='message')
    op.drop_table('message')
    
    # Drop enum type
    op.execute("DROP TYPE documenttype")
