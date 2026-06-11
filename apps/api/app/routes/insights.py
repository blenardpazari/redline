import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from config import get_config

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("")
def get_insights():
    cfg = get_config()
    eval_path = Path(cfg.ml_artifacts_path) / "evaluation.json"
    if not eval_path.exists():
        raise HTTPException(
            status_code=404,
            detail="evaluation.json not found — run train.py to generate it",
        )
    with open(eval_path) as f:
        return json.load(f)
