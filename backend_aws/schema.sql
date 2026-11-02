-- =============================================================================
-- PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
-- ARCHIVO: schema.sql (DDL Oficial PostgreSQL 16 + Modelo Freemium)
-- REFERENCIA: context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md y plan_suscripcion.txt
-- DESCRIPCIÓN:
--   Define las 7 tablas relacionales y columnas JSONB para persistir:
--   1. users (Autenticación JWT + MFA TOTP RFC 6238 + Cuota Freemium 2 intentos)
--   2. cloud_proposals (Propuestas de Arquitectura AWS)
--   3. proposal_rea_evaluations (Ficha Técnica del Motor REA y 3 escenarios)
--   4. proposal_security_controls (Matriz de 6 controles IAM y puntaje 0-100)
--   5. cost_simulation_items (Desglose FinOps sobre 730 horas/mes)
--   6. architecture_diagrams (Diagramas Draw.io mxgraph.aws4 y React Flow)
--   7. region_migrations_log (Bitácora de migración entre regiones para Globo 3D)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- 1. TABLA DE USUARIOS, SEGURIDAD TOTP (MFA) Y CUOTA FREEMIUM
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(160) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(60) NOT NULL DEFAULT 'Cloud Architect',
    totp_secret VARCHAR(64) NOT NULL DEFAULT 'JBSWY3DPEHPK3PXP',
    totp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    theme_preference VARCHAR(16) NOT NULL DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
    password_changed_at TIMESTAMPTZ NULL,
    token_version INTEGER NOT NULL DEFAULT 0,
    -- [REGLA DE NEGOCIO - FREEMIUM (plan_suscripcion.txt)]:
    -- intentos_usados inicia en 0 (máximo 2 intentos gratuitos en plan 'free').
    -- plan_actual controla si el usuario está en 'free' o 'premium'.
    intentos_usados INTEGER NOT NULL DEFAULT 0 CHECK (intentos_usados >= 0),
    plan_actual VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan_actual IN ('free', 'premium')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 1.1 TOKENS TEMPORALES DE RECUPERACIÓN DE CONTRASEÑA
-- =========================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    requested_ip VARCHAR(64) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- =========================================================
-- 1.2 CÓDIGOS TEMPORALES DE VERIFICACIÓN POR CORREO
-- =========================================================
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(40) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    requested_ip VARCHAR(64) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_code_user_purpose ON email_verification_codes(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_email_code_expires ON email_verification_codes(expires_at);

-- =========================================================
-- 2. TABLA DE PROPUESTAS DE ARQUITECTURA CLOUD
-- =========================================================
CREATE TABLE IF NOT EXISTS cloud_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    solution_name VARCHAR(200) NOT NULL,
    app_type VARCHAR(80) NOT NULL CHECK (
        app_type IN (
            'E-commerce & Retail',
            'API REST / Backend',
            'Microservicios Cloud',
            'Data Lake & Analítica',
            'Portal Web Empresarial'
        )
    ),
    description TEXT NOT NULL,
    region VARCHAR(40) NOT NULL DEFAULT 'sa-east-1',
    estimated_users INTEGER NOT NULL DEFAULT 5000 CHECK (estimated_users > 0),
    availability_level VARCHAR(80) NOT NULL CHECK (
        availability_level IN (
            '99.9% (Básico Multi-AZ)',
            '99.95% (Alta Disponibilidad)',
            '99.99% (Misión Crítica Multi-Región)'
        )
    ),
    selected_services JSONB NOT NULL DEFAULT '["EC2", "RDS", "S3", "VPC", "IAM"]'::jsonb,
    migration_goal VARCHAR(100) NOT NULL CHECK (
        migration_goal IN (
            'Modernización de Aplicación',
            'Reducción de Costos',
            'Escalabilidad Elástica',
            'Continuidad de Negocio y DR'
        )
    ),
    monthly_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    annual_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(40) NOT NULL DEFAULT 'Aprobada' CHECK (
        status IN ('Aprobada', 'En Revisión', 'Borrador', 'Rechazada', 'Requiere Ajustes')
    ),
    applied_scenario VARCHAR(80) DEFAULT 'Recommended-Production',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_user ON cloud_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_region ON cloud_proposals(region);

-- =========================================================
-- 3. TABLA DE EVALUACIÓN TÉCNICA REA (FICHA TÉCNICA)
-- =========================================================
CREATE TABLE IF NOT EXISTS proposal_rea_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID UNIQUE NOT NULL REFERENCES cloud_proposals(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    origin_detected VARCHAR(160) NOT NULL,
    detected_configs JSONB NOT NULL DEFAULT '[]'::jsonb,
    system_analysis TEXT NOT NULL,
    architecture_pattern VARCHAR(180) NOT NULL,
    migration_strategy VARCHAR(120) NOT NULL,
    well_architected_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    technical_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 4. TABLA DE POSTURA DE SEGURIDAD E IAM POR MIGRACIÓN
-- =========================================================
CREATE TABLE IF NOT EXISTS proposal_security_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID UNIQUE NOT NULL REFERENCES cloud_proposals(id) ON DELETE CASCADE,
    root_blocked BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_enforced BOOLEAN NOT NULL DEFAULT TRUE,
    ec2_roles BOOLEAN NOT NULL DEFAULT TRUE,
    tls_13 BOOLEAN NOT NULL DEFAULT TRUE,
    s3_encryption_and_versioning BOOLEAN NOT NULL DEFAULT TRUE,
    compliance_audits BOOLEAN NOT NULL DEFAULT TRUE,
    security_score INTEGER NOT NULL DEFAULT 100 CHECK (security_score BETWEEN 0 AND 100),
    posture_label VARCHAR(40) NOT NULL DEFAULT 'Postura Robusta',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 5. TABLA DE ÍTEMS DE SIMULACIÓN DE COSTOS (FINOPS)
-- =========================================================
CREATE TABLE IF NOT EXISTS cost_simulation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES cloud_proposals(id) ON DELETE CASCADE,
    service_id VARCHAR(60) NOT NULL,
    service_name VARCHAR(160) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    category VARCHAR(80) NOT NULL,
    instance_type_or_tier VARCHAR(160) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    hours_per_month INTEGER NOT NULL DEFAULT 730,
    unit VARCHAR(40) DEFAULT 'hour',
    unit_price NUMERIC(12, 4) DEFAULT 0.0000,
    cost_per_hour NUMERIC(12, 4) DEFAULT 0.0000,
    monthly_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    annual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_items_proposal ON cost_simulation_items(proposal_id);

-- =========================================================
-- 6. TABLA DE DIAGRAMAS DE ARQUITECTURA (DRAW.IO AWS4 & REACT FLOW)
-- =========================================================
CREATE TABLE IF NOT EXISTS architecture_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES cloud_proposals(id) ON DELETE CASCADE,
    diagram_type VARCHAR(30) NOT NULL DEFAULT 'drawio_aws4' CHECK (diagram_type IN ('drawio_aws4', 'reactflow')),
    drawio_xml TEXT,
    reactflow_graph JSONB,
    region_snapshot VARCHAR(40) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (proposal_id, diagram_type)
);

-- =========================================================
-- 7. BITÁCORA DE MIGRACIONES ENTRE REGIONES AWS (GLOBO 3D)
-- =========================================================
CREATE TABLE IF NOT EXISTS region_migrations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES cloud_proposals(id) ON DELETE CASCADE,
    from_region VARCHAR(40) NOT NULL,
    to_region VARCHAR(40) NOT NULL,
    migrated_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
