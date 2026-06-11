from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.connection import get_connection
from app.routes.alert_settings import router as alert_settings_router
from app.routes.alerts import router as alerts_router
from app.routes.analytics import router as analytics_router
from app.routes.auth import router as auth_router
from app.routes.connectors import router as connectors_router
from app.routes.ingest import router as ingest_router
from app.routes.ip_inspector import router as ip_router
from app.routes.log_explorer import router as log_explorer_router
from app.routes.logs import router as logs_router
from app.routes.stats import router as stats_router
from app.services.scorer import load_models
from config import get_config
from ws.stream import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    cfg = get_config()
    get_connection()
    app.state.models = load_models(cfg.ml_artifacts_path)
    yield


app = FastAPI(title="Redline API", lifespan=lifespan)

cfg = get_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[cfg.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(log_explorer_router)
app.include_router(logs_router)
app.include_router(alerts_router)
app.include_router(analytics_router)
app.include_router(ip_router)
app.include_router(stats_router)
app.include_router(connectors_router)
app.include_router(alert_settings_router)
app.include_router(ingest_router)
app.include_router(ws_router)
