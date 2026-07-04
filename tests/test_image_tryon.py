"""image_tryon 工具层测试(不调用真实 Gemini API)。"""

import tempfile
import unittest
from pathlib import Path

from image_tryon import (
    match_body_template, generate_tryon, get_generation_status,
    select_default_face_template,
)
from image_tryon.garment import resolve_outfit
from image_tryon.jobs import STORE

# 用已存在的底图当"商品参考图"占位(保证 load_bytes 有真实文件)
_REF = "image_tryon/assets/base-models/female/f_hourglass_average/f_hourglass_average_front.png"


def _body_profile(**over):
    p = {
        "gender_presentation": "female", "body_shape": "hourglass", "body_size": "average",
        "height_cm": 168, "weight_kg": 58, "age_range": "26-35",
    }
    p.update(over)
    return p


def _outfit():
    return {"items": {
        "top_inner": {"product_id": "p1", "category": "top_inner", "image_url": _REF},
        "bottom": {"product_id": "p2", "category": "bottom", "image_url": _REF},
        "outerwear": {"product_id": "p3", "category": "outerwear", "image_url": _REF},
    }}


class FakeClient:
    def __init__(self):
        self.calls = 0

    def edit(self, images, prompt):
        self.calls += 1
        return images[0]


class TestMatchTool(unittest.TestCase):
    def test_returns_template_id(self):
        r = match_body_template(_body_profile())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["template_id"], "f_hourglass_average")
        self.assertGreater(r["confidence"], 0.9)

    def test_echoes_body_profile(self):
        bp = _body_profile()
        r = match_body_template(bp)
        self.assertEqual(r["body_profile"], bp)

    def test_male_template(self):
        r = match_body_template(_body_profile(
            gender_presentation="male", body_shape="oval", body_size="plus"))
        self.assertEqual(r["template_id"], "m_oval_plus")


class TestFaceTool(unittest.TestCase):
    def test_shape(self):
        r = select_default_face_template(
            session_id="s1", template_id="f_pear_curvy", style_context=["casual"],
            idempotency_key="s1-face")
        self.assertEqual(r["status"], "success")
        fp = r["face_profile"]
        self.assertEqual(fp["face_mode"], "default_face")
        self.assertFalse(fp["consent_given"])
        self.assertTrue(fp["default_face_template_id"])


class TestOutfit(unittest.TestCase):
    def test_orders_by_layer(self):
        r = resolve_outfit(_outfit())
        self.assertEqual([g.category for g in r.garments],
                         ["top_inner", "bottom", "outerwear"])

    def test_dress_exclusion_warning(self):
        outfit = {"items": {
            "dress": {"category": "dress", "image_url": _REF},
            "top_inner": {"category": "top_inner", "image_url": _REF}}}
        self.assertTrue(any("互斥" in w for w in resolve_outfit(outfit).warnings))


class TestGenerateTool(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        STORE.results_dir = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_async_generate_and_status(self):
        ack = generate_tryon(
            session_id="s1", set_id="set1", template_id="f_hourglass_average",
            outfit=_outfit(), idempotency_key="s1-set1-tryon",
            views=["front", "side"], client=FakeClient(), sync=True,
        )
        self.assertEqual(ack["status"], "success")
        gid = ack["generation_id"]
        self.assertTrue(gid.startswith("gen_"))

        status = get_generation_status(gid)
        self.assertEqual(status["generation_status"], "succeeded")
        self.assertIn("front", status["result_views"])
        self.assertIn("side", status["result_views"])
        self.assertTrue((Path(self._tmp.name) / gid / "front.png").is_file())

    def test_idempotency_dedup(self):
        kw = dict(session_id="s2", set_id="setX", template_id="f_hourglass_average",
                  outfit=_outfit(), idempotency_key="s2-dedup", client=FakeClient(), sync=True)
        a = generate_tryon(**kw)
        b = generate_tryon(**kw)
        self.assertEqual(a["generation_id"], b["generation_id"])

    def test_unknown_generation_id(self):
        r = get_generation_status("does_not_exist")
        self.assertEqual(r["generation_status"], "failed")


if __name__ == "__main__":
    unittest.main()
