"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/services/project_inspector.py
CAPA ARQUITECTÓNICA: Services (Fase 1 del Motor REA — Inspector Estático)
DESCRIPCIÓN:
    Inspecciona paquetes .zip en memoria y repositorios de GitHub para detectar
    lenguajes de programación, frameworks web/backend, motores de base de datos,
    contenedores Docker y manifiestos de configuración sin escribir en disco.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: analyzerService.ts (evaluate-zip y evaluate-github)
    - Base de Datos: Columna JSONB `technical_evidence` en `proposal_rea_evaluations`
    - Referencia Contexto: context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md
===============================================================================
"""

import io
import os
import zipfile
from typing import Any, Dict, List, Optional, Set
import httpx

from app.core.config import settings


# ==========================================================
# 1. CONSTANTES DE FILTRADO Y DETECCIÓN ESTÁTICA
# ==========================================================
# [REGLA DE NEGOCIO - INSPECTOR ZIP]:
# Se ignoran directorios pesados de dependencias, compilados y control de versiones
# para acelerar el análisis en memoria y evitar falsos positivos.
IGNORED_DIRECTORIES: List[str] = [
    "node_modules/",
    ".git/",
    "venv/",
    ".venv/",
    "dist/",
    "build/",
    "__pycache__/",
]

CONFIG_MANIFEST_NAMES: Set[str] = {
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "pom.xml",
    ".env.example",
}


class ProjectInspectionError(RuntimeError):
    """Indica que no fue posible obtener evidencia real del proyecto."""


# ==========================================================
# 2. INSPECCIÓN DE PAQUETES .ZIP EN MEMORIA
# ==========================================================
def inspect_zip_bytes(zip_bytes: bytes) -> Dict[str, Any]:
    """
    Recorre un archivo `.zip` directamente en memoria RAM (`io.BytesIO`) y
    extrae las señales técnicas necesarias para el Motor REA.

    Parámetros:
        zip_bytes: Contenido binario del archivo .zip subido por el usuario.

    Retorna:
        Diccionario con `languages`, `frameworks`, `databases`, `has_docker`,
        `total_files` y `detected_configs`.

    Lanza:
        zipfile.BadZipFile: Si el archivo no es un contenedor ZIP válido.
    """
    languages: Set[str] = set()
    frameworks: Set[str] = set()
    databases: Set[str] = set()
    detected_configs: List[str] = []
    has_docker: bool = False
    total_files: int = 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            fname = info.filename.lower()

            # Ignorar carpetas de dependencias y artefactos de compilación
            if any(ignored in fname for ignored in IGNORED_DIRECTORIES):
                continue

            total_files += 1
            base = os.path.basename(fname)

            # Registrar archivos de manifiesto detectados
            if base in CONFIG_MANIFEST_NAMES:
                if base not in detected_configs:
                    detected_configs.append(base)

            # Detectar presencia de contenedores Docker
            if base == "dockerfile" or "docker-compose" in base:
                has_docker = True

            # Clasificación de lenguajes por extensión de archivo
            if fname.endswith((".ts", ".tsx")):
                languages.add("TypeScript")
            elif fname.endswith((".js", ".jsx")):
                languages.add("JavaScript")
            elif fname.endswith(".py"):
                languages.add("Python")
            elif fname.endswith(".java"):
                languages.add("Java")
            elif fname.endswith(".sql"):
                languages.add("SQL")

            # [REGLA DE SEGURIDAD - PROTECCIÓN ZIP BOMB]:
            # Solo se leen en memoria manifiestos de texto menores a 250 KB.
            if base in CONFIG_MANIFEST_NAMES and info.file_size < 250_000:
                try:
                    content = zf.read(info.filename).decode("utf-8", errors="ignore").lower()
                    _extract_dependencies_from_text(content, frameworks, databases)
                except Exception:
                    pass

    return {
        "languages": sorted(list(languages)),
        "frameworks": sorted(list(frameworks)),
        "databases": sorted(list(databases)),
        "has_docker": has_docker,
        "total_files": total_files,
        "detected_configs": detected_configs,
    }


def _extract_dependencies_from_text(
    content: str,
    frameworks: Set[str],
    databases: Set[str],
) -> None:
    """
    Analiza el contenido de `package.json`, `requirements.txt`, `pyproject.toml`
    o `docker-compose.yml` para identificar frameworks y bases de datos.
    """
    # Detección de Frameworks Frontend y Backend
    if "react" in content:
        frameworks.add("React")
    if "next" in content:
        frameworks.add("Next.js")
    if "vue" in content:
        frameworks.add("Vue.js")
    if "express" in content or "@nestjs/core" in content or "fastify" in content:
        frameworks.add("Node.js API")
    if "fastapi" in content:
        frameworks.add("FastAPI")
    if "django" in content:
        frameworks.add("Django")
    if "flask" in content:
        frameworks.add("Flask")

    # Detección de Motores de Persistencia Relacional, NoSQL y Caché
    if any(k in content for k in ["postgres", "psycopg", "pg", "prisma", "typeorm", "sqlalchemy"]):
        databases.add("PostgreSQL (Amazon RDS)")
    if "mysql" in content or "mariadb" in content:
        databases.add("MySQL (Amazon RDS)")
    if any(k in content for k in ["mongo", "mongoose", "pymongo", "dynamodb"]):
        databases.add("NoSQL (Amazon DynamoDB)")
    if any(k in content for k in ["redis", "ioredis", "celery", "bullmq"]):
        databases.add("Redis (Amazon ElastiCache)")


def inspect_document_text(content: str) -> Dict[str, Any]:
    """Extrae evidencia técnica de un documento sin ejecutar heurísticas en React."""
    normalized = content.lower()
    languages: Set[str] = set()
    frameworks: Set[str] = set()
    databases: Set[str] = set()
    detected_configs: List[str] = []

    if any(token in normalized for token in ["typescript", "tsx", "react", "vite"]):
        languages.add("TypeScript")
    if any(token in normalized for token in ["javascript", "node.js", "nodejs"]):
        languages.add("JavaScript")
    if any(token in normalized for token in ["python", "fastapi", "django", "flask"]):
        languages.add("Python")
    if "sql" in normalized or "postgres" in normalized or "mysql" in normalized:
        languages.add("SQL")

    _extract_dependencies_from_text(normalized, frameworks, databases)
    if "docker" in normalized:
        detected_configs.append("Dockerfile")
    for manifest in CONFIG_MANIFEST_NAMES:
        if manifest in normalized and manifest not in detected_configs:
            detected_configs.append(manifest)

    return {
        "languages": sorted(languages),
        "frameworks": sorted(frameworks),
        "databases": sorted(databases),
        "has_docker": "docker" in normalized,
        "total_files": 1,
        "detected_configs": detected_configs,
    }


# ==========================================================
# 3. INSPECCIÓN DE REPOSITORIOS DE GITHUB
# ==========================================================
async def inspect_github_repository(
    repo_url: str,
    github_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Inspecciona un repositorio de GitHub vía API REST para extraer evidencia
    técnica real. No fabrica lenguajes, bases de datos ni archivos si GitHub no
    responde: en ese caso se informa al endpoint para que el frontend muestre un
    error y no una evaluación simulada.
    """
    clean_url = repo_url.strip().rstrip("/")
    parts = clean_url.replace("https://github.com/", "").replace("http://github.com/", "").split("/")
    owner_repo = "/".join(parts[:2]) if len(parts) >= 2 else clean_url

    token = github_token or settings.GITHUB_API_TOKEN
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if len(parts) < 2 or "github.com" not in clean_url.lower():
        raise ProjectInspectionError("La URL de GitHub no tiene el formato usuario/repositorio.")

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            repo_response = await client.get(f"https://api.github.com/repos/{owner_repo}", headers=headers)
            if repo_response.status_code != 200:
                raise ProjectInspectionError(f"GitHub no pudo consultar el repositorio ({repo_response.status_code}).")
            repo_data = repo_response.json()
            branch = repo_data.get("default_branch") or "main"

            tree_response = await client.get(
                f"https://api.github.com/repos/{owner_repo}/git/trees/{branch}?recursive=1",
                headers=headers,
            )
            tree_items = tree_response.json().get("tree", []) if tree_response.status_code == 200 else []
            files = [item for item in tree_items if item.get("type") == "blob"]

            root_response = await client.get(f"https://api.github.com/repos/{owner_repo}/contents", headers=headers)
            root_items = root_response.json() if root_response.status_code == 200 and isinstance(root_response.json(), list) else []
            if not files:
                files = [item for item in root_items if item.get("type") == "file"]

            languages: Set[str] = set()
            frameworks: Set[str] = set()
            databases: Set[str] = set()
            detected_configs: List[str] = []
            has_docker = False

            for item in files:
                path = str(item.get("path") or item.get("name") or "")
                lower_path = path.lower()
                base = os.path.basename(lower_path)
                if any(ignored in f"{lower_path}/" for ignored in IGNORED_DIRECTORIES):
                    continue
                if base in CONFIG_MANIFEST_NAMES and base not in detected_configs:
                    detected_configs.append(base)
                if base == "dockerfile" or "docker-compose" in base:
                    has_docker = True
                if lower_path.endswith((".ts", ".tsx")):
                    languages.add("TypeScript")
                elif lower_path.endswith((".js", ".jsx")):
                    languages.add("JavaScript")
                elif lower_path.endswith(".py"):
                    languages.add("Python")
                elif lower_path.endswith(".java"):
                    languages.add("Java")
                elif lower_path.endswith(".sql"):
                    languages.add("SQL")

            for item in root_items:
                base = os.path.basename(str(item.get("name", "")).lower())
                if base not in CONFIG_MANIFEST_NAMES or not item.get("download_url"):
                    continue
                manifest_response = await client.get(item["download_url"], headers=headers)
                if manifest_response.status_code == 200 and len(manifest_response.text) <= 250_000:
                    _extract_dependencies_from_text(manifest_response.text.lower(), frameworks, databases)

            return {
                "languages": sorted(languages),
                "frameworks": sorted(frameworks),
                "databases": sorted(databases),
                "has_docker": has_docker,
                "total_files": len(files),
                "detected_configs": sorted(detected_configs),
            }
    except ProjectInspectionError:
        raise
    except Exception as exc:
        raise ProjectInspectionError(f"No se pudo inspeccionar GitHub: {exc}") from exc

