"""002_document_import_schema

Revision ID: 002_document_import_schema
Revises: 001_auth_schema
Create Date: 2026-09-19 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '002_document_import_schema'
down_revision: Union[str, None] = '001_auth_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create ENUM types idempotently
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_status') THEN
                CREATE TYPE import_status AS ENUM ('importing', 'extracting', 'extracted', 'failed');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_type') THEN
                CREATE TYPE file_type AS ENUM ('pdf', 'docx');
            END IF;
        END $$;
    """)

    # 2. Create documents table
    op.create_table(
        'documents',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('google_drive_id', sa.String(length=255), nullable=False),
        sa.Column('file_name', sa.String(length=500), nullable=False),
        sa.Column('file_type', postgresql.ENUM('pdf', 'docx', name='file_type', create_type=False), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('drive_modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('drive_md5_checksum', sa.String(length=64), nullable=True),
        sa.Column('import_status', postgresql.ENUM('importing', 'extracting', 'extracted', 'failed', name='import_status', create_type=False), server_default='importing', nullable=False),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('imported_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('extracted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('researcher_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['researcher_id'], ['researchers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. Create extracted_texts table
    op.create_table(
        'extracted_texts',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('full_text', sa.Text(), nullable=False),
        sa.Column('total_pages', sa.Integer(), nullable=False),
        sa.Column('extracted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id', name='uq_extracted_texts_document')
    )

    # 4. Create extracted_pages table
    op.create_table(
        'extracted_pages',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('extracted_text_id', sa.UUID(), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['extracted_text_id'], ['extracted_texts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. Create indexes
    op.create_index('uq_documents_drive_id_researcher', 'documents', ['google_drive_id', 'researcher_id'], unique=True)
    op.create_index('idx_documents_researcher_id', 'documents', ['researcher_id'], unique=False)
    op.create_index('idx_documents_import_status', 'documents', ['import_status'], unique=False)
    op.create_index('idx_extracted_pages_text_id', 'extracted_pages', ['extracted_text_id'], unique=False)
    op.create_index('uq_extracted_pages_number', 'extracted_pages', ['extracted_text_id', 'page_number'], unique=True)


def downgrade() -> None:
    op.drop_index('uq_extracted_pages_number', table_name='extracted_pages')
    op.drop_index('idx_extracted_pages_text_id', table_name='extracted_pages')
    op.drop_table('extracted_pages')

    op.drop_constraint('uq_extracted_texts_document', 'extracted_texts', type_='unique')
    op.drop_table('extracted_texts')

    op.drop_index('idx_documents_import_status', table_name='documents')
    op.drop_index('idx_documents_researcher_id', table_name='documents')
    op.drop_index('uq_documents_drive_id_researcher', table_name='documents')
    op.drop_table('documents')

    op.execute("DROP TYPE IF EXISTS import_status")
    op.execute("DROP TYPE IF EXISTS file_type")
