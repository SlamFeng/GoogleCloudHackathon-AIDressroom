"""换装 / 多视图 prompt 构建。

设计依据 MODULE_DESIGN.md §6.1/6.2:身份锚定 + 按层级叠穿 + 视角约束 + 负面约束。
"""

from __future__ import annotations

from .garment import Garment

# 槽位 → 穿着语句(英文,喂给模型)
_SLOT_PHRASE = {
    "top_inner":  "as the base top",
    "top_mid":    "as a mid layer over the top",
    "outerwear":  "as an outer jacket/coat, worn open",
    "dress":      "as a dress",
    "bottom":     "as the bottoms",
    "legwear":    "as legwear",
    "belt":       "as a belt",
    "shoes":      "as the shoes",
    "bag":        "carried as a bag",
    "headwear":   "worn on the head",
    "eyewear":    "worn on the face",
    "earrings":   "as earrings",
    "necklace":   "as a necklace",
    "accessories": "as an accessory",
}

_IDENTITY = ("Keep the SAME person — identical face, body shape, height, build and "
             "skin tone as the base image. Do NOT change the body or face.")

_RENDER = ("Full-body shot: the ENTIRE person from the top of the head to the feet must "
           "be fully visible, centered, with clear margins and nothing cropped out of frame. "
           "A-pose, clean light-grey studio background (#E8E8E8), soft even lighting, "
           "photorealistic, ultra detailed, vertical 3:4.")

_NEGATIVE = ("No text, no watermark, no extra garments or accessories beyond those provided, "
             "no change to body shape or identity, no cropped or cut-off head or feet, "
             "not zoomed in, not a close-up.")


def _garment_line(g: Garment) -> str:
    phrase = _SLOT_PHRASE.get(g.category, f"as {g.category}")
    return f"{g.describe()} {phrase}"


def build_dressing_prompt(garments: list[Garment], view: str = "front",
                          is_first: bool = True) -> str:
    """一组叠穿的换装 prompt。garments 已按 layer_order 升序。

    参考图顺序约定:第 1 张=当前人物底图,其后依次为本组各件商品图。
    """
    listed = "; ".join(_garment_line(g) for g in garments)
    if is_first:
        action = (f"Dress this person in the following garments, layered in order "
                  f"(innermost → outermost): {listed}.")
    else:
        action = (f"Keep the person and everything they are already wearing unchanged, "
                  f"then ADD the following on top, in order: {listed}.")
    match = ("Each added garment must match its provided reference image in color, "
             "pattern, cut and material.")
    return f"{_IDENTITY} {action} {match} View: {view}, {_RENDER} {_NEGATIVE}"


def build_view_prompt(view: str) -> str:
    """以正面成片为参考,派生 side/back。"""
    v = "side (90° profile)" if view == "side" else "back (rear, 180°)"
    return (f"Using the provided front-view image as reference, generate the {v} view of "
            f"the exact same person wearing the exact same outfit. {_IDENTITY} "
            f"Identical lighting and background. {_RENDER} {_NEGATIVE}")
