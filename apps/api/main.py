import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.connection import get_connection
from app.routes.alert_settings import router as alert_settings_router
from app.routes.alerts import router as alerts_router
from app.routes.analytics import router as analytics_router
from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.clustering import router as clustering_router
from app.routes.explain import router as explain_router
from app.routes.insights import router as insights_router
from app.routes.ingest import router as ingest_router
from app.routes.ip_inspector import router as ip_router
from app.routes.log_explorer import router as log_explorer_router
from app.routes.logs import router as logs_router
from app.routes.servers import router as servers_router
from app.routes.stats import router as stats_router
from app.routes.users import router as users_router
from app.db.queries import purge_old_entries
from app.services.scorer import load_models
from config import get_config
from ws.stream import router as ws_router


async def _retention_loop(retention_days: int) -> None:
    while True:
        await asyncio.sleep(24 * 3600)
        try:
            logs, alerts = purge_old_entries(retention_days)
            if logs or alerts:
                print(f"[retention] purged {logs} log entries, {alerts} alerts older than {retention_days}d")
        except Exception as exc:
            print(f"[retention] error: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    cfg = get_config()
    get_connection()
    models = load_models(cfg.ml_artifacts_path)
    app.state.models = models
    retention_task = asyncio.create_task(_retention_loop(cfg.log_retention_days))
    try:
        yield
    finally:
        retention_task.cancel()
        try:
            await retention_task
        except asyncio.CancelledError:
            pass


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
app.include_router(alert_settings_router)
app.include_router(ingest_router)
app.include_router(servers_router)
app.include_router(users_router)
app.include_router(health_router)
app.include_router(insights_router)
app.include_router(clustering_router)
app.include_router(explain_router)
app.include_router(ws_router)
