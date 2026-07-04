"""Gemini 2.5 Flash Image(nano banana)REST 客户端,零第三方依赖(urllib)。

edit(images, prompt):多图融合/编辑 —— 第一张通常是人物底图,其后是商品参考图。
返回生成图的 PNG bytes。
"""

from __future__ import annotations

import base64
import json
import time
import urllib.error
import urllib.request

from . import config

_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
_DEFAULT_MODEL = "gemini-2.5-flash-image"
# 这些状态码多为瞬时(高负载/内部错误),自动退避重试
_RETRY_CODES = {429, 500, 503}


class GeminiImageError(RuntimeError):
    pass


class GeminiImageClient:
    def __init__(self, api_key: str | None = None, model: str | None = None,
                 timeout: int = 180, max_retries: int = 4):
        self.api_key = api_key or config.get_gemini_api_key()
        self.model = model or config.get("GEMINI_IMAGE_MODEL") or _DEFAULT_MODEL
        self.timeout = timeout
        self.max_retries = max_retries

    # ---- 公开 API ----
    def edit(self, images: list[bytes], prompt: str) -> bytes:
        """用 prompt + 一组参考图编辑/合成,返回结果图 bytes。"""
        parts = [{"text": prompt}]
        for img in images:
            parts.append({
                "inline_data": {"mime_type": _sniff_mime(img),
                                "data": base64.b64encode(img).decode("ascii")}
            })
        return self._call(parts)

    def generate(self, prompt: str) -> bytes:
        """纯文生图(无参考图)。"""
        return self._call([{"text": prompt}])

    # ---- 内部 ----
    def _call(self, parts: list[dict]) -> bytes:
        body = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"]},
        }
        url = _ENDPOINT.format(model=self.model, key=self.api_key)
        payload = json.dumps(body).encode("utf-8")

        last_err: Exception | None = None
        for attempt in range(self.max_retries):
            req = urllib.request.Request(
                url, data=payload,
                headers={"Content-Type": "application/json"}, method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    return _extract_image(json.load(resp))
            except urllib.error.HTTPError as e:
                last_err = GeminiImageError(f"HTTP {e.code}: {e.read().decode()[:200]}")
                if e.code not in _RETRY_CODES:
                    raise last_err from e
            except urllib.error.URLError as e:
                last_err = GeminiImageError(f"网络错误: {e}")
            # 退避:1s, 2s, 4s, ...
            if attempt < self.max_retries - 1:
                time.sleep(2 ** attempt)

        raise GeminiImageError(f"重试 {self.max_retries} 次仍失败: {last_err}")


def _extract_image(data: dict) -> bytes:
    candidates = data.get("candidates") or []
    for cand in candidates:
        for part in (cand.get("content") or {}).get("parts", []):
            inline = part.get("inline_data") or part.get("inlineData")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    # 没有图片:把可能的文字/拦截原因带出来便于排查
    reason = ""
    if candidates:
        reason = candidates[0].get("finishReason", "")
    raise GeminiImageError(f"响应中无图像 (finishReason={reason!r}); raw={json.dumps(data)[:300]}")


def _sniff_mime(img: bytes) -> str:
    if img[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if img[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if img[:4] == b"RIFF" and img[8:12] == b"WEBP":
        return "image/webp"
    return "image/png"
