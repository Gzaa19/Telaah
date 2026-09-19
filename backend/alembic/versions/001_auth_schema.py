"""001_auth_schema

Revision ID: 001_auth_schema
Revises: 
Create Date: 2026-09-16 15:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_auth_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector";')

    # 2. Table: peneliti
    op.create_table(
        'peneliti',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('nama_lengkap', sa.String(length=255), nullable=False),
        sa.Column('url_avatar', sa.Text(), nullable=True),
        sa.Column('apakah_aktif', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
        sa.Column('login_terakhir_pada', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('dibuat_pada', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('diperbarui_pada', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('email', name='uq_peneliti_email')
    )
    op.create_index('idx_peneliti_email', 'peneliti', ['email'], unique=False)

    # 3. Table: sesi_pengguna
    op.create_table(
        'sesi_pengguna',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('peneliti_id', sa.UUID(), sa.ForeignKey('peneliti.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_sesi', sa.String(length=512), nullable=False),
        sa.Column('kedaluwarsa_pada', sa.DateTime(timezone=True), nullable=False),
        sa.Column('apakah_aktif', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')),
        sa.Column('dibuat_pada', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('token_sesi', name='uq_sesi_pengguna_token_sesi')
    )
    op.create_index('idx_sesi_pengguna_token', 'sesi_pengguna', ['token_sesi'], unique=False)
    op.create_index('idx_sesi_pengguna_peneliti', 'sesi_pengguna', ['peneliti_id'], unique=False)

    # 4. Table: kredensial_oauth
    op.create_table(
        'kredensial_oauth',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('peneliti_id', sa.UUID(), sa.ForeignKey('peneliti.id', ondelete='CASCADE'), nullable=False),
        sa.Column('penyedia', sa.String(length=50), nullable=False, server_default='google'),
        sa.Column('token_akses_terenkripsi', sa.Text(), nullable=False),
        sa.Column('token_penyegaran_terenkripsi', sa.Text(), nullable=True),
        sa.Column('token_kedaluwarsa_pada', sa.DateTime(timezone=True), nullable=False),
        sa.Column('apakah_drive_diizinkan', sa.Boolean(), nullable=False, server_default=sa.text('FALSE')),
        sa.Column('dibuat_pada', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('diperbarui_pada', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('peneliti_id', name='uq_kredensial_oauth_peneliti_id')
    )
    op.create_index('idx_kredensial_oauth_peneliti', 'kredensial_oauth', ['peneliti_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_kredensial_oauth_peneliti', table_name='kredensial_oauth')
    op.drop_table('kredensial_oauth')

    op.drop_index('idx_sesi_pengguna_peneliti', table_name='sesi_pengguna')
    op.drop_index('idx_sesi_pengguna_token', table_name='sesi_pengguna')
    op.drop_table('sesi_pengguna')

    op.drop_index('idx_peneliti_email', table_name='peneliti')
    op.drop_table('peneliti')
