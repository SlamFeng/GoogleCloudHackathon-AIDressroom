import unittest

from fastapi.testclient import TestClient

from agent_foundation.api import app, sessions, workflow


class AgentApiTests(unittest.TestCase):
    def setUp(self):
        sessions.clear()
        workflow.tools.log.calls.clear()

    def test_health(self):
        client = TestClient(app)
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_full_api_flow_without_real_face_consent(self):
        client = TestClient(app)
        start = client.post(
            "/session/start",
            json={
                "session_id": "s_api_test",
                "scene_type": "mirror",
                "store_id": "store_001",
            },
        )
        self.assertEqual(start.status_code, 200)

        chat = client.post(
            "/chat",
            json={"session_id": "s_api_test", "text": "没想法，你推荐一套适合我的"},
        )
        self.assertEqual(chat.status_code, 200)
        first_set = chat.json()["output"]["recommendation"]["sets"][0]["set_id"]

        feedback = client.post(
            "/feedback",
            json={
                "session_id": "s_api_test",
                "set_id": first_set,
                "feedback_type": "partial_adjust",
                "source": "quick_tag",
                "dimension": "color",
                "dimension_value": "red",
            },
        )
        self.assertEqual(feedback.status_code, 200)
        self.assertEqual(feedback.json()["output"]["type"], "recommendations_refined")
        refined_set = feedback.json()["output"]["recommendation"]["sets"][0]["set_id"]

        confirm = client.post(
            "/confirm",
            json={
                "session_id": "s_api_test",
                "set_id": refined_set,
                "consent_given": False,
            },
        )
        self.assertEqual(confirm.status_code, 200)
        self.assertEqual(confirm.json()["output"]["type"], "tryon_handoff")

        calls = client.get("/tool-calls").json()["tool_calls"]
        tools = [call["tool"] for call in calls]
        self.assertIn("get_recommendations", tools)
        self.assertIn("refine_recommendations", tools)
        self.assertIn("handoff_tryon_generation", tools)

    def test_missing_session_returns_404(self):
        client = TestClient(app)
        response = client.post(
            "/chat",
            json={"session_id": "missing", "text": "没想法"},
        )
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
