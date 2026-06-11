from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.server_queries import (
    create_server,
    delete_server,
    get_server_by_id,
    get_server_stats,
    list_servers,
    rotate_server_key,
    update_server,
)
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/servers", tags=["servers"])

_SOURCE_TYPES = {"nginx", "apache", "caddy", "cloudpanel", "hetzner", "gcp", "syslog", "http"}
_ENVS = {"production", "staging", "dev"}

_AGENT_INSTALL = (
    "curl -O https://raw.githubusercontent.com/your-org/redline/main/agent/redline-agent.py"
)

_SETUP_INSTRUCTIONS: dict[str, dict] = {
    "cloudpanel": {
        "title": "CloudPanel (nginx) Agent Setup",
        "steps": [
            "1. SSH into your CloudPanel server.",
            "2. Download the Redline agent:",
            _AGENT_INSTALL,
            "3. Find your domain log path (replace 'yourdomain.com'):",
            "ls /home/*/logs/nginx/",
            "4. Run the agent — replace LOG_PATH and REDLINE_URL with your values:",
            "REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} REDLINE_LOGS=/home/user/logs/nginx/yourdomain.com_access.log python3 redline-agent.py",
            "5. To run in background permanently:",
            "nohup env REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} REDLINE_LOGS=/home/user/logs/nginx/yourdomain.com_access.log python3 redline-agent.py > /var/log/redline-agent.log 2>&1 &",
        ],
    },
    "nginx": {
        "title": "nginx Agent Setup",
        "steps": [
            "1. SSH into your server and download the Redline agent:",
            _AGENT_INSTALL,
            "2. Run the agent:",
            "REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} REDLINE_LOGS=/var/log/nginx/access.log python3 redline-agent.py",
            "3. To run in background permanently:",
            "nohup env REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} python3 redline-agent.py > /var/log/redline-agent.log 2>&1 &",
        ],
    },
    "apache": {
        "title": "Apache Agent Setup",
        "steps": [
            "1. SSH into your server and download the Redline agent:",
            _AGENT_INSTALL,
            "2. Run the agent:",
            "REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} REDLINE_LOGS=/var/log/apache2/access.log python3 redline-agent.py",
        ],
    },
    "caddy": {
        "title": "Caddy Agent Setup",
        "steps": [
            "1. Add JSON logging to your Caddyfile:",
            "log { output file /var/log/caddy/access.log format json }",
            "2. Download and run the Redline agent:",
            _AGENT_INSTALL,
            "REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} REDLINE_LOGS=/var/log/caddy/access.log python3 redline-agent.py",
        ],
    },
    "hetzner": {
        "title": "Hetzner VPS Agent Setup",
        "steps": [
            "1. SSH into your Hetzner server and download the agent:",
            _AGENT_INSTALL,
            "2. Run the agent (adjust log path for your web server):",
            "REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} REDLINE_LOGS=/var/log/nginx/access.log python3 redline-agent.py",
        ],
    },
    "gcp": {
        "title": "GCP Cloud Logging Setup",
        "steps": [
            "In GCP Console, enable Cloud Logging API and create a Log Sink.",
            "Set destination to a Pub/Sub topic.",
            "Create a service account with roles/pubsub.subscriber.",
            "In Redline environment variables set:",
            "GCP_PROJECT_ID=your-project\nGCP_SUBSCRIPTION=your-subscription\nGCP_CREDENTIALS_JSON=/path/to/sa.json",
            "The server API key for log attribution: {api_key}",
        ],
    },
    "cloudflare": {
        "title": "Cloudflare Logpush Setup",
        "steps": [
            "In Cloudflare Dashboard → Analytics → Logpush, create a new job.",
            "Set destination to HTTP and use this webhook URL:",
            "https://your-redline-host/ingest/webhook/{api_key}",
            "Select fields: ClientIP, ClientRequestMethod, ClientRequestURI, EdgeResponseStatus, OriginResponseTime, ClientCountry",
            "Enable the Logpush job.",
        ],
    },
    "syslog": {
        "title": "Syslog Setup",
        "steps": [
            "Configure your server to forward syslog to Redline:",
            "*.* @your-redline-host:5140",
            "Or via rsyslog: *.* action(type=\"omfwd\" target=\"your-redline-host\" port=\"5140\" protocol=\"udp\")",
            "Server API key for log attribution: {api_key}",
        ],
    },
    "http": {
        "title": "HTTP Ingest Setup",
        "steps": [
            "POST log events directly to the Redline API:",
            "curl -X POST https://your-redline-host/ingest \\",
            "  -H 'X-Api-Key: {api_key}' \\",
            "  -H 'Content-Type: application/json' \\",
            "  -d '{\"timestamp\":\"...\",\"ip\":\"...\",\"method\":\"GET\",\"path\":\"/\",\"status_code\":200,\"response_time_ms\":42}'",
        ],
    },
}


class ServerCreate(BaseModel):
    name: str
    env: str = "production"
    source_type: str


class ServerUpdate(BaseModel):
    name: str | None = None
    env: str | None = None
    source_type: str | None = None


@router.get("", response_model=list[dict])
def get_servers(_: str = Depends(require_auth)) -> list[dict]:
    return list_servers()


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create(body: ServerCreate, _: str = Depends(require_admin)) -> dict:
    if body.source_type not in _SOURCE_TYPES:
        raise HTTPException(status_code=422, detail=f"source_type must be one of: {sorted(_SOURCE_TYPES)}")
    if body.env not in _ENVS:
        raise HTTPException(status_code=422, detail=f"env must be one of: {sorted(_ENVS)}")
    server = create_server({"name": body.name, "env": body.env, "source_type": body.source_type})
    server["setup"] = _build_setup(server["source_type"], server["api_key"])
    return server


@router.get("/{server_id}", response_model=dict)
def get_server(server_id: int, _: str = Depends(require_auth)) -> dict:
    server = get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server["setup"] = _build_setup(server["source_type"], server["api_key"])
    return server


@router.patch("/{server_id}", response_model=dict)
def patch_server(server_id: int, body: ServerUpdate, _: str = Depends(require_admin)) -> dict:
    if not get_server_by_id(server_id):
        raise HTTPException(status_code=404, detail="Server not found")
    updated = update_server(server_id, body.model_dump(exclude_none=True))
    return updated or {}


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_server(server_id: int, _: str = Depends(require_admin)) -> None:
    if not delete_server(server_id):
        raise HTTPException(status_code=404, detail="Server not found")


@router.post("/{server_id}/rotate-key", response_model=dict)
def rotate_key(server_id: int, _: str = Depends(require_admin)) -> dict:
    new_key = rotate_server_key(server_id)
    if not new_key:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"api_key": new_key}


@router.get("/{server_id}/stats", response_model=dict)
def server_stats(server_id: int, _: str = Depends(require_auth)) -> dict:
    if not get_server_by_id(server_id):
        raise HTTPException(status_code=404, detail="Server not found")
    return get_server_stats(server_id)


def _build_setup(source_type: str, api_key: str) -> dict:
    tmpl = _SETUP_INSTRUCTIONS.get(source_type, {"title": "Custom Setup", "steps": []})
    return {
        "title": tmpl["title"],
        "steps": [s.replace("{api_key}", api_key) for s in tmpl["steps"]],
    }
