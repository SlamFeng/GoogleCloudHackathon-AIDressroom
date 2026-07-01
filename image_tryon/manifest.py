"""底图库 manifest:加载面向匹配的结构化模特库。

数据文件 data/base_models.json 由 scripts/build_manifest.py 从
assets/try-on-preview/base-models-v3 生成(每个模特一条 + 结构化属性 + 相对路径)。
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

# 仓库根 = 本文件的上上层目录 (tryon_preview/ 的父级)
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = Path(__file__).resolve().parent / "data" / "base_models.json"


@dataclass(frozen=True)
class BaseModel:
    """一个模特底图条目(含三视图)。"""

    base_id: str
    gender_presentation: str
    body_shape: str
    body_size: str
    views: dict[str, str]            # {"front": rel_path, "side": ..., "back": ...}
    image_size: tuple[int, int] = (0, 0)
    qa_status: str = "unknown"       # pass / warn / fail
    proportions: dict[str, str] = field(default_factory=dict)

    def view_path(self, view: str, root: Path | None = None) -> Path:
        """返回某视图图片的绝对路径。"""
        root = root or REPO_ROOT
        return (root / self.views[view]).resolve()

    def exists(self, root: Path | None = None) -> bool:
        """三视图文件是否都存在。"""
        return all(self.view_path(v, root).is_file() for v in self.views)


@dataclass(frozen=True)
class ModelLibrary:
    """模特库:一组 BaseModel + 查询辅助。"""

    models: tuple[BaseModel, ...]
    version: str = "1.0"
    source: str = ""

    def __len__(self) -> int:
        return len(self.models)

    def by_id(self, base_id: str) -> BaseModel | None:
        for m in self.models:
            if m.base_id == base_id:
                return m
        return None

    def for_gender(self, gender_presentation: str) -> list[BaseModel]:
        """按性别过滤候选;neutral 返回全部。"""
        if gender_presentation in ("female", "male"):
            return [m for m in self.models if m.gender_presentation == gender_presentation]
        return list(self.models)


def load_library(manifest_path: str | Path | None = None) -> ModelLibrary:
    """从 manifest JSON 加载模特库。"""
    path = Path(manifest_path) if manifest_path else DEFAULT_MANIFEST
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    models = []
    for rec in data["models"]:
        size = rec.get("image_size") or [0, 0]
        models.append(
            BaseModel(
                base_id=rec["base_id"],
                gender_presentation=rec["gender_presentation"],
                body_shape=rec["body_shape"],
                body_size=rec["body_size"],
                views=dict(rec["views"]),
                image_size=(int(size[0]), int(size[1])),
                qa_status=rec.get("qa_status", "unknown"),
                proportions=dict(rec.get("proportions", {})),
            )
        )
    return ModelLibrary(
        models=tuple(models),
        version=str(data.get("version", "1.0")),
        source=str(data.get("source", "")),
    )
