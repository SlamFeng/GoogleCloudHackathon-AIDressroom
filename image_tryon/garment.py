"""穿搭解析:契约的槽位式 outfit → 有序叠穿清单(供生图)。

入参 outfit(契约 OutfitPayload),槽位式:
  {"items": {"top_inner": {"product_id","category","image_url"}, "bottom": {...}, ...}}
每件至少要有 image_url(商品图,可为 http(s) URL 或本地路径)+ category(缺省取槽位名)。
"""

from __future__ import annotations

import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from .manifest import REPO_ROOT

# 默认叠穿层级(数字大=更外层),与测试商品集一致
DEFAULT_LAYER_ORDER = {
    "legwear": 11, "top_inner": 12, "bottom": 13, "belt": 14, "dress": 15,
    "top_mid": 20, "outerwear": 30, "shoes": 40, "bag": 50,
    "headwear": 60, "eyewear": 61, "earrings": 62, "necklace": 63, "accessories": 64,
}
_EXCLUSIVE_WITH_DRESS = {"top_inner", "top_mid", "bottom"}


@dataclass(frozen=True)
class Garment:
    product_id: str
    category: str
    image_url: str = ""          # http(s) URL 或仓库相对路径
    name: str = ""
    color: str = ""
    layer_order: int = 99

    def describe(self) -> str:
        return " ".join(p for p in (self.color, self.name or self.category) if p).strip()

    def load_bytes(self) -> bytes | None:
        """读取商品图字节(URL 或本地路径)。"""
        if not self.image_url:
            return None
        if self.image_url.startswith(("http://", "https://")):
            with urllib.request.urlopen(self.image_url, timeout=30) as r:
                return r.read()
        p = Path(self.image_url)
        if not p.is_absolute():
            p = REPO_ROOT / p
        return p.read_bytes() if p.is_file() else None


@dataclass(frozen=True)
class ResolvedOutfit:
    garments: tuple[Garment, ...]
    warnings: tuple[str, ...] = ()

    def groups(self, max_per_group: int = 3) -> list[list[Garment]]:
        return [list(self.garments[i:i + max_per_group])
                for i in range(0, len(self.garments), max_per_group)]


def _iter_items(items: dict):
    for slot, val in items.items():
        if val is None:
            continue
        if isinstance(val, list):
            for v in val:
                if v:
                    yield slot, v
        else:
            yield slot, val


def resolve_outfit(outfit: dict) -> ResolvedOutfit:
    items = (outfit or {}).get("items", {}) or {}
    garments: list[Garment] = []
    warnings: list[str] = []
    present_slots = set()

    for slot, item in _iter_items(items):
        present_slots.add(slot)
        if not isinstance(item, dict):
            warnings.append(f"槽位 {slot} 商品格式非法,跳过")
            continue
        category = item.get("category") or slot
        image_url = item.get("image_url") or item.get("image") or ""
        if not image_url:
            warnings.append(f"商品 {item.get('product_id','?')} 缺 image_url,跳过")
            continue
        garments.append(Garment(
            product_id=item.get("product_id", ""),
            category=category,
            image_url=image_url,
            name=item.get("name", ""),
            color=item.get("color", ""),
            layer_order=int(item.get("layer_order", DEFAULT_LAYER_ORDER.get(category, 99))),
        ))

    if "dress" in present_slots and present_slots & _EXCLUSIVE_WITH_DRESS:
        warnings.append("dress 与 top/bottom 同时出现(互斥),请检查搭配")

    garments.sort(key=lambda g: (g.layer_order, g.category))
    return ResolvedOutfit(tuple(garments), tuple(warnings))
