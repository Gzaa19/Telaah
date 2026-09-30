"""004_paper_outlines_schema

Revision ID: 004_paper_outlines_schema
Revises: 003_indexing_schema
Create Date: 2026-09-30 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '004_paper_outlines_schema'
down_revision: Union[str, None] = '003_indexing_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create ENUM types idempotently
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outline_language_enum') THEN
                CREATE TYPE outline_language_enum AS ENUM ('en_ieee', 'id_formal');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_status_enum') THEN
                CREATE TYPE generation_status_enum AS ENUM ('preparing', 'reading', 'generating', 'validating', 'ready', 'failed');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
                CREATE TYPE approval_status_enum AS ENUM ('draft', 'approved');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'section_status_enum') THEN
                CREATE TYPE section_status_enum AS ENUM ('filled', 'needs_input', 'edited');
            END IF;
        END $$;
    """)

    # 2. Table: paper_outlines
    op.create_table(
        'paper_outlines',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('researcher_id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('template_id', sa.String(length=100), nullable=False),
        sa.Column('version_number', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('language_choice', postgresql.ENUM('en_ieee', 'id_formal', name='outline_language_enum', create_type=False), server_default='en_ieee', nullable=False),
        sa.Column('generation_status', postgresql.ENUM('preparing', 'reading', 'generating', 'validating', 'ready', 'failed', name='generation_status_enum', create_type=False), server_default='preparing', nullable=False),
        sa.Column('approval_status', postgresql.ENUM('draft', 'approved', name='approval_status_enum', create_type=False), server_default='draft', nullable=False),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['researcher_id'], ['researchers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_po_researcher_id', 'paper_outlines', ['researcher_id'])
    op.create_index('idx_po_document_id', 'paper_outlines', ['document_id'])
    op.create_index('idx_po_researcher_doc', 'paper_outlines', ['researcher_id', 'document_id'])
    op.create_index('idx_po_doc_version', 'paper_outlines', ['document_id', 'version_number'])

    # 3. Table: outline_sections
    op.create_table(
        'outline_sections',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('outline_id', sa.UUID(), nullable=False),
        sa.Column('section_key', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('is_required', sa.Boolean(), server_default=sa.text('TRUE'), nullable=False),
        sa.Column('section_status', postgresql.ENUM('filled', 'needs_input', 'edited', name='section_status_enum', create_type=False), server_default='needs_input', nullable=False),
        sa.ForeignKeyConstraint(['outline_id'], ['paper_outlines.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_os_outline_id', 'outline_sections', ['outline_id'])
    op.create_index('idx_os_outline_order', 'outline_sections', ['outline_id', 'order_index'])
    op.create_index('idx_os_outline_key', 'outline_sections', ['outline_id', 'section_key'])

    # 4. Table: section_fields
    op.create_table(
        'section_fields',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('section_id', sa.UUID(), nullable=False),
        sa.Column('field_key', sa.String(length=100), nullable=False),
        sa.Column('field_label', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), server_default=sa.text("'[NEEDS INPUT]'"), nullable=False),
        sa.Column('is_needs_input', sa.Boolean(), server_default=sa.text('TRUE'), nullable=False),
        sa.Column('is_edited', sa.Boolean(), server_default=sa.text('FALSE'), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['section_id'], ['outline_sections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_sf_section_id', 'section_fields', ['section_id'])
    op.create_index('idx_sf_section_order', 'section_fields', ['section_id', 'order_index'])

    # 5. Table: source_references
    op.create_table(
        'source_references',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('field_id', sa.UUID(), nullable=False),
        sa.Column('chunk_id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('excerpt_text', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['field_id'], ['section_fields.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chunk_id'], ['document_chunks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_sr_field_id', 'source_references', ['field_id'])
    op.create_index('idx_sr_chunk_id', 'source_references', ['chunk_id'])
    op.create_index('idx_sr_document_id', 'source_references', ['document_id'])


def downgrade() -> None:
    op.drop_index('idx_sr_document_id', table_name='source_references')
    op.drop_index('idx_sr_chunk_id', table_name='source_references')
    op.drop_index('idx_sr_field_id', table_name='source_references')
    op.drop_table('source_references')

    op.drop_index('idx_sf_section_order', table_name='section_fields')
    op.drop_index('idx_sf_section_id', table_name='section_fields')
    op.drop_table('section_fields')

    op.drop_index('idx_os_outline_key', table_name='outline_sections')
    op.drop_index('idx_os_outline_order', table_name='outline_sections')
    op.drop_index('idx_os_outline_id', table_name='outline_sections')
    op.drop_table('outline_sections')

    op.drop_index('idx_po_doc_version', table_name='paper_outlines')
    op.drop_index('idx_po_researcher_doc', table_name='paper_outlines')
    op.drop_index('idx_po_document_id', table_name='paper_outlines')
    op.drop_index('idx_po_researcher_id', table_name='paper_outlines')
    op.drop_table('paper_outlines')

    op.execute("DROP TYPE IF EXISTS section_status_enum;")
    op.execute("DROP TYPE IF EXISTS approval_status_enum;")
    op.execute("DROP TYPE IF EXISTS generation_status_enum;")
    op.execute("DROP TYPE IF EXISTS outline_language_enum;")
