"""003_indexing_schema

Revision ID: 003_indexing_schema
Revises: 002_document_import_schema
Create Date: 2026-09-23 15:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '003_indexing_schema'
down_revision: Union[str, None] = '002_document_import_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Ensure vector extension is enabled
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector";')

    # 1. Table: document_index_versions
    op.create_table(
        'document_index_versions',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', sa.UUID(), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('researcher_id', sa.UUID(), sa.ForeignKey('researchers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='queued'),
        sa.Column('model_name', sa.String(length=255), nullable=False),
        sa.Column('model_version', sa.String(length=100), nullable=False),
        sa.Column('model_commit_hash', sa.String(length=64), nullable=False),
        sa.Column('embedding_dimension', sa.Integer(), nullable=False, server_default=sa.text('768')),
        sa.Column('chunk_size', sa.Integer(), nullable=False, server_default=sa.text('1200')),
        sa.Column('chunk_overlap', sa.Integer(), nullable=False, server_default=sa.text('150')),
        sa.Column('splitter_type', sa.String(length=100), nullable=False, server_default='recursive_character'),
        sa.Column('preprocessing_version', sa.String(length=20), nullable=False, server_default='v1'),
        sa.Column('source_checksum', sa.String(length=64), nullable=False),
        sa.Column('index_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')),
        sa.Column('total_chunks', sa.Integer(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.CheckConstraint(
            "status IN ('queued','cleaning','chunking','embedding','storing','indexed','failed','archived')",
            name='chk_div_status'
        ),
        sa.CheckConstraint(
            "embedding_dimension > 0",
            name='chk_div_embedding_dimension'
        ),
    )
    op.create_index('idx_div_document_id', 'document_index_versions', ['document_id'])
    op.create_index('idx_div_researcher_id', 'document_index_versions', ['researcher_id'])
    op.create_index('idx_div_fingerprint', 'document_index_versions', ['index_fingerprint'], unique=True)
    op.create_index(
        'idx_div_active_per_doc',
        'document_index_versions',
        ['document_id'],
        unique=True,
        postgresql_where=sa.text('is_active = TRUE'),
    )

    # 2. Table: document_chunks
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', sa.UUID(), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('researcher_id', sa.UUID(), sa.ForeignKey('researchers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('index_version_id', sa.UUID(), sa.ForeignKey('document_index_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(768), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('section_name', sa.String(length=255), nullable=True),
        sa.Column('source_metadata', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.CheckConstraint(
            "chunk_index >= 0",
            name='chk_chunk_index_non_negative'
        ),
    )
    op.create_index('idx_chunks_document_id', 'document_chunks', ['document_id'])
    op.create_index('idx_chunks_researcher_version', 'document_chunks', ['researcher_id', 'index_version_id'])
    # HNSW Index on embedding vector
    op.execute(
        "CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks "
        "USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 128);"
    )

    # 3. Table: indexing_jobs
    op.create_table(
        'indexing_jobs',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', sa.UUID(), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('researcher_id', sa.UUID(), sa.ForeignKey('researchers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('index_version_id', sa.UUID(), sa.ForeignKey('document_index_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='queued'),
        sa.Column('current_stage', sa.String(length=30), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('max_retries', sa.Integer(), nullable=False, server_default=sa.text('3')),
        sa.Column('enqueued_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('heartbeat_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_jobs_document_id', 'indexing_jobs', ['document_id'])
    op.create_index('idx_jobs_researcher_id', 'indexing_jobs', ['researcher_id'])
    op.create_index(
        'idx_jobs_heartbeat',
        'indexing_jobs',
        ['heartbeat_at'],
        postgresql_where=sa.text("status NOT IN ('completed', 'failed')"),
    )


def downgrade() -> None:
    op.drop_index('idx_jobs_heartbeat', table_name='indexing_jobs')
    op.drop_index('idx_jobs_researcher_id', table_name='indexing_jobs')
    op.drop_index('idx_jobs_document_id', table_name='indexing_jobs')
    op.drop_table('indexing_jobs')

    op.execute('DROP INDEX IF EXISTS idx_chunks_embedding_hnsw;')
    op.drop_index('idx_chunks_researcher_version', table_name='document_chunks')
    op.drop_index('idx_chunks_document_id', table_name='document_chunks')
    op.drop_table('document_chunks')

    op.drop_index('idx_div_active_per_doc', table_name='document_index_versions')
    op.drop_index('idx_div_fingerprint', table_name='document_index_versions')
    op.drop_index('idx_div_researcher_id', table_name='document_index_versions')
    op.drop_index('idx_div_document_id', table_name='document_index_versions')
    op.drop_table('document_index_versions')
