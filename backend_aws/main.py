"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: main.py (Punto de Entrada Raíz Compatible con Uvicorn)
CAPA ARQUITECTÓNICA: Bootstrap Entrypoint
DESCRIPCIÓN:
    Expone el objeto `app` desde `app.main` en la raíz del proyecto para que
    tanto `uvicorn main:app --host 0.0.0.0 --port 8080 --reload` (como indica
    `05_CODIGO_BASE_ARRANQUE_FASTAPI.md`) como `uvicorn app.main:app` funcionen
    de manera idéntica.
===============================================================================
"""

import uvicorn
from app.core.config import settings
from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

