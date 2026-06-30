"""身材分类法:枚举、序数、相邻关系表。

与 docs/try-on-preview/BODY_PROFILE_CONTRACT.md 的枚举保持一致。
匹配算法(MODULE_DESIGN.md §5)依赖这里定义的:
  - body_size 的序数(用于算体量差)
  - body_shape 的相邻关系(用于算 shape_mismatch:0 相同 / 1 相邻 / 2 其它)
"""

from __future__ import annotations

# ---- 性别呈现 ----
GENDERS = ("female", "male", "neutral")

# ---- 体量:单一序数轴(体积由小到大)----
# slim < average < curvy < plus
BODY_SIZE_ORDER = {
    "slim": 0,
    "average": 1,
    "curvy": 2,
    "plus": 3,
}
BODY_SIZES = tuple(BODY_SIZE_ORDER.keys())

# ---- 体型枚举(按性别分两套)----
FEMALE_SHAPES = (
    "hourglass",
    "pear",
    "apple",
    "rectangle",
    "inverted_triangle",
)
MALE_SHAPES = (
    "trapezoid",
    "inverted_triangle",
    "rectangle",
    "triangle",
    "oval",
)

# ---- 体型相邻关系(无序对)。在表里=相邻(mismatch=1),否则=2 ----
# 依据轮廓相似度:相邻的体型换装观感接近,可作为退而求其次的匹配。
_FEMALE_ADJACENCY = {
    frozenset({"hourglass", "rectangle"}),
    frozenset({"hourglass", "pear"}),
    frozenset({"hourglass", "inverted_triangle"}),
    frozenset({"rectangle", "pear"}),
    frozenset({"rectangle", "apple"}),
    frozenset({"rectangle", "inverted_triangle"}),
    frozenset({"apple", "inverted_triangle"}),
}
_MALE_ADJACENCY = {
    frozenset({"trapezoid", "inverted_triangle"}),
    frozenset({"trapezoid", "rectangle"}),
    frozenset({"inverted_triangle", "rectangle"}),
    frozenset({"rectangle", "triangle"}),
    frozenset({"rectangle", "oval"}),
    frozenset({"triangle", "oval"}),
}

# ---- proportions 序数(细化匹配 tiebreaker 用)----
PROPORTION_ORDER = {
    "shoulder_width": {"narrow": 0, "average": 1, "broad": 2},
    "waist_definition": {"straight": 0, "moderate": 1, "defined": 2},
    "hip_width": {"narrow": 0, "average": 1, "wide": 2},
    "leg_to_torso": {"short": 0, "balanced": 1, "long": 2},
}


def shapes_for_gender(gender: str) -> tuple[str, ...]:
    """返回该性别允许的体型枚举。neutral 视为两套并集。"""
    if gender == "male":
        return MALE_SHAPES
    if gender == "female":
        return FEMALE_SHAPES
    # neutral / 未知:并集去重
    return tuple(dict.fromkeys(FEMALE_SHAPES + MALE_SHAPES))


def shape_mismatch(shape_a: str, shape_b: str, gender: str) -> int:
    """体型不匹配度:0 相同 / 1 相邻 / 2 其它。"""
    if shape_a == shape_b:
        return 0
    pair = frozenset({shape_a, shape_b})
    table = _MALE_ADJACENCY if gender == "male" else _FEMALE_ADJACENCY
    if gender not in ("male", "female"):
        # neutral:任一表命中即算相邻
        if pair in _MALE_ADJACENCY or pair in _FEMALE_ADJACENCY:
            return 1
        return 2
    return 1 if pair in table else 2


def size_distance(size_a: str, size_b: str) -> int:
    """体量序数距离(缺失值按 average 处理由调用方负责)。"""
    return abs(BODY_SIZE_ORDER[size_a] - BODY_SIZE_ORDER[size_b])
