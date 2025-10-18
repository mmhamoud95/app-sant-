from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.base import Base
from app.db.session import engine
from app.infra.logging_config import configure_logging
from app.middleware.request_logging import RequestLoggingMiddleware
from app.services.bootstrap import seed_reference_data
from app.routers import stats
from app.routers import (
    health,
    auth,
    directory,
    patients,
    doctors,
    admin,
    metrics,
    messages,
    documents,
    family,
    two_factor,
    websocket,
    notifications,
)


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title=settings.project_name, openapi_url=f"{settings.api_v1_prefix}/openapi.json")

    # Create all tables
    Base.metadata.create_all(bind=engine)
    seed_reference_data()

    # CORS
    origins = [o.strip() for o in settings.backend_cors_origins.split(',') if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(RequestLoggingMiddleware)

    # Routes
    app.include_router(health.router, prefix=settings.api_v1_prefix)
    app.include_router(auth.router, prefix=settings.api_v1_prefix)
    app.include_router(directory.router, prefix=settings.api_v1_prefix)
    app.include_router(doctors.router, prefix=settings.api_v1_prefix)
    app.include_router(patients.router, prefix=settings.api_v1_prefix)
    app.include_router(admin.router, prefix=settings.api_v1_prefix)
    app.include_router(metrics.router, prefix=settings.api_v1_prefix)
    app.include_router(messages.router, prefix=settings.api_v1_prefix)
    app.include_router(documents.router, prefix=settings.api_v1_prefix)
    app.include_router(family.router, prefix=settings.api_v1_prefix)
    app.include_router(two_factor.router, prefix=settings.api_v1_prefix)
    app.include_router(notifications.router, prefix=settings.api_v1_prefix)
    app.include_router(stats.router, prefix=settings.api_v1_prefix)
    app.include_router(websocket.router, prefix="")

    @app.get("/")
    def root():
        return {"message": "Backend running", "docs": f"{settings.api_v1_prefix}/docs"}

    return app


app = create_app()
