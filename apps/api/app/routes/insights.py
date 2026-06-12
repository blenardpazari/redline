import asyncio
import json
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from config import get_config

router = APIRouter(prefix="/insights", tags=["insights"])

_retrain_status: dict = {"running": False, "last_exit": None, "last_output": ""}


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


@router.post("/retrain")
async def retrain():
    if _retrain_status["running"]:
        raise HTTPException(status_code=409, detail="Retrain already in progress")

    cfg = get_config()

    async def _run():
        _retrain_status["running"] = True
        _retrain_status["last_exit"] = None
        _retrain_status["last_output"] = ""
        try:
            ml_dir = Path(cfg.ml_artifacts_path).parent
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "train.py",
                cwd=str(ml_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            out, _ = await proc.communicate()
            _retrain_status["last_exit"] = proc.returncode
            _retrain_status["last_output"] = out.decode()[-4000:]
        finally:
            _retrain_status["running"] = False

    asyncio.create_task(_run())
    return {"status": "started"}


@router.get("/retrain/status")
def retrain_status():
    return _retrain_status
