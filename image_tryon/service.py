"""FastAPI 服务:把 3 个工具暴露为 HTTP 端点,供 Agent 底座以"工具"形式调用。

  POST /tools/match_body_template
  POST /tools/select_default_face_template
  POST /tools/generate_tryon            -> 立即返回 pending + generation_id
  GET  /tools/generation_status/{id}    -> 轮询;result_url 指向下方静态端点
  GET  /results/{id}/{view}             -> 取生成图
  GET  /health

本地运行:  uvicorn image_tryon.service:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import tools
from .jobs import STORE

app = FastAPI(title="image-tryon", version="0.1.0")


class MatchRequest(BaseModel):
    body_profile: dict


class FaceRequest(BaseModel):
    session_id: str
    template_id: str
    style_context: list[str] = []
    explicit_user_choice: str | None = None
    idempotency_key: str


class GenerateRequest(BaseModel):
    session_id: str
    set_id: str
    template_id: str
    outfit: dict
    idempotency_key: str
    use_own_face: bool = False
    user_face: str | None = None        # URL/路径(real_face 时);默认脸留空
    views: list[str] = ["front"]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/tools/match_body_template")
def match_body_template(req: MatchRequest) -> dict:
    return tools.match_body_template(req.body_profile)


@app.post("/tools/select_default_face_template")
def select_default_face_template(req: FaceRequest) -> dict:
    return tools.select_default_face_template(
        session_id=req.session_id, template_id=req.template_id,
        style_context=req.style_context, explicit_user_choice=req.explicit_user_choice,
        idempotency_key=req.idempotency_key,
    )


@app.post("/tools/generate_tryon")
def generate_tryon(req: GenerateRequest) -> dict:
    return tools.generate_tryon(
        session_id=req.session_id, set_id=req.set_id, template_id=req.template_id,
        outfit=req.outfit, idempotency_key=req.idempotency_key,
        use_own_face=req.use_own_face, user_face=req.user_face, views=req.views,
    )


@app.get("/tools/generation_status/{generation_id}")
def generation_status(generation_id: str, request: Request) -> dict:
    res = tools.get_generation_status(generation_id)
    base = str(request.base_url).rstrip("/")
    views = res.get("result_views") or {}
    if views:
        res["result_views"] = {v: f"{base}/results/{generation_id}/{v}" for v in views}
        res["result_url"] = res["result_views"].get("front")
    return res


@app.get("/results/{generation_id}/{view}")
def result_image(generation_id: str, view: str):
    path = STORE.results_dir / generation_id / f"{view}.png"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="result not found")
    return FileResponse(path, media_type="image/png")
