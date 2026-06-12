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
from app.services.geoip import lookup_full as geoip_lookup
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/servers", tags=["servers"])

_SOURCE_TYPES = {"cloudpanel", "nginx", "apache", "gce", "aws", "docker"}
_ENVS = {"production", "staging", "dev"}

_SETUP_INSTRUCTIONS: dict[str, dict] = {
    "cloudpanel": {
        "title": "CloudPanel Agent Setup",
        "steps": [
            "1. SSH into your CloudPanel server.",
            "2. Download the agent:",
            "curl -o /root/redline-agent.sh https://app.anomalies.codes/agent/redline-agent.sh && chmod +x /root/redline-agent.sh",
            "3. Install as a systemd service:",
            "REDLINE_WEBHOOK_URL=https://app.anomalies.codes/api/ingest/webhook/{api_key} /root/redline-agent.sh install",
            "4. Verify it's running:",
            "systemctl status redline-agent",
        ],
    },
    "nginx": {
        "title": "Nginx (Linux VPS) Agent Setup",
        "steps": [
            "1. SSH into your server.",
            "2. Download the agent:",
            "curl -o /root/redline-agent.sh https://app.anomalies.codes/agent/redline-agent.sh && chmod +x /root/redline-agent.sh",
            "3. Set your log glob and install:",
            "REDLINE_WEBHOOK_URL=https://app.anomalies.codes/api/ingest/webhook/{api_key} CLOUDPANEL_LOG_GLOB=/var/log/nginx/access.log /root/redline-agent.sh install",
            "4. Verify:",
            "systemctl status redline-agent",
        ],
    },
    "apache": {
        "title": "Apache Agent Setup",
        "steps": [
            "1. SSH into your server.",
            "2. Download the agent:",
            "curl -o /root/redline-agent.sh https://app.anomalies.codes/agent/redline-agent.sh && chmod +x /root/redline-agent.sh",
            "3. Set your log glob and install:",
            "REDLINE_WEBHOOK_URL=https://app.anomalies.codes/api/ingest/webhook/{api_key} CLOUDPANEL_LOG_GLOB=/var/log/apache2/access*.log /root/redline-agent.sh install",
            "4. Verify:",
            "systemctl status redline-agent",
        ],
    },
    "gce": {
        "title": "Google Compute Engine Agent Setup",
        "steps": [
            "1. SSH into your GCE instance via the console or gcloud:",
            "gcloud compute ssh INSTANCE_NAME --zone=ZONE",
            "2. Download the agent:",
            "curl -o /root/redline-agent.sh https://app.anomalies.codes/agent/redline-agent.sh && chmod +x /root/redline-agent.sh",
            "3. Install (adjust log path to match your web server):",
            "REDLINE_WEBHOOK_URL=https://app.anomalies.codes/api/ingest/webhook/{api_key} CLOUDPANEL_LOG_GLOB=/var/log/nginx/access.log /root/redline-agent.sh install",
            "4. Allow outbound HTTPS in your firewall rules if needed, then verify:",
            "systemctl status redline-agent",
        ],
    },
    "aws": {
        "title": "AWS EC2 Agent Setup",
        "steps": [
            "1. SSH into your EC2 instance:",
            "ssh -i your-key.pem ec2-user@YOUR_PUBLIC_IP",
            "2. Download the agent:",
            "curl -o /root/redline-agent.sh https://app.anomalies.codes/agent/redline-agent.sh && chmod +x /root/redline-agent.sh",
            "3. Install (adjust log path for your distro — Amazon Linux uses /var/log/nginx/):",
            "REDLINE_WEBHOOK_URL=https://app.anomalies.codes/api/ingest/webhook/{api_key} CLOUDPANEL_LOG_GLOB=/var/log/nginx/access.log /root/redline-agent.sh install",
            "4. Make sure your Security Group allows outbound HTTPS, then verify:",
            "systemctl status redline-agent",
        ],
    },
    "docker": {
        "title": "Docker Agent Setup",
        "steps": [
            "1. Mount your container log directory into the agent container.",
            "2. Run the agent as a sidecar:",
            "docker run -d --name redline-agent -v /var/log/nginx:/logs -e REDLINE_WEBHOOK_URL=https://app.anomalies.codes/api/ingest/webhook/{api_key} -e CLOUDPANEL_LOG_GLOB=/logs/access.log ghcr.io/your-org/redline-agent:latest",
            "3. Or add to docker-compose.yml:",
            "*.log path: /logs/access.log",
            "4. To run without Docker image, copy the agent script and run with Python 3.10+:",
            "REDLINE_WEBHOOK_URL=https://app.anomalies.codes/api/ingest/webhook/{api_key} CLOUDPANEL_LOG_GLOB=/logs/access.log python3 redline-agent.sh run",
        ],
    },
}


class ServerCreate(BaseModel):
    name: str
    env: str = "production"
    source_type: str
    public_ip: str
    lat: float | None = None
    lon: float | None = None


class ServerUpdate(BaseModel):
    name: str | None = None
    env: str | None = None
    source_type: str | None = None
    public_ip: str | None = None
    lat: float | None = None
    lon: float | None = None


@router.get("", response_model=list[dict])
def get_servers(_: str = Depends(require_auth)) -> list[dict]:
    servers = list_servers()
    for s in servers:
        s["setup"] = _build_setup(s["source_type"], s["api_key"])
    return servers


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create(body: ServerCreate, _: str = Depends(require_admin)) -> dict:
    if body.source_type not in _SOURCE_TYPES:
        raise HTTPException(status_code=422, detail=f"source_type must be one of: {sorted(_SOURCE_TYPES)}")
    if body.env not in _ENVS:
        raise HTTPException(status_code=422, detail=f"env must be one of: {sorted(_ENVS)}")
    lat, lon = body.lat, body.lon
    country, city = None, None
    if lat is None or lon is None:
        country, city, lat, lon = geoip_lookup(body.public_ip)
    server = create_server({"name": body.name, "env": body.env, "source_type": body.source_type,
                            "public_ip": body.public_ip, "lat": lat, "lon": lon,
                            "city": city, "country": country})
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
    patch = body.model_dump(exclude_none=True)
    if "public_ip" in patch and "lat" not in patch:
        country, city, lat, lon = geoip_lookup(patch["public_ip"])
        patch["lat"] = lat
        patch["lon"] = lon
        patch["city"] = city
        patch["country"] = country
    updated = update_server(server_id, patch)
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
