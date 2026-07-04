import unittest

from agent_foundation.contracts import (
    FaceMode,
    FeedbackDimension,
    FeedbackPayload,
    FeedbackType,
    InputSource,
    Route,
)
from agent_foundation.parsers import parse_need, route_intent
from agent_foundation.workflow import AgentWorkflow


class AgentFoundationTests(unittest.TestCase):
    def test_route_recommendation_when_customer_has_no_idea(self):
        self.assertEqual(route_intent("没想法，你推荐"), Route.RECOMMENDATION)

    def test_route_explicit_when_customer_mentions_item_and_budget(self):
        self.assertEqual(route_intent("我想要黑色外套，预算一万以内"), Route.EXPLICIT)

    def test_route_unclear_for_vague_short_input(self):
        self.assertEqual(route_intent("换个感觉"), Route.UNCLEAR)

    def test_parse_need_extracts_budget_occasion_and_avoid(self):
        need = parse_need("下周去海边，不喜欢露腿，预算两万日元")
        self.assertEqual(need.occasion, "beach")
        self.assertIsNotNone(need.budget_range)
        self.assertEqual(need.budget_range.max, 20000)
        self.assertTrue(any(item.value == "leg_exposure" for item in need.avoid))

    def test_feedback_updates_color_avoid_and_refines(self):
        workflow = AgentWorkflow()
        state = workflow.start_session(session_id="s_test")
        first = workflow.handle_customer_input(state, "没想法，你推荐")
        set_id = first.output["recommendation"]["sets"][0]["set_id"]

        feedback = FeedbackPayload(
            session_id=state.session_id,
            set_id=set_id,
            feedback_type=FeedbackType.PARTIAL_ADJUST,
            source=InputSource.QUICK_TAG,
            dimension=FeedbackDimension.COLOR,
            dimension_value="red",
        )
        refined = workflow.apply_feedback(state, feedback)

        self.assertEqual(refined.output["type"], "recommendations_refined")
        self.assertTrue(
            any(
                item.dimension == "color" and item.value == "red"
                for item in state.user_need.avoid
            )
        )
        self.assertEqual(workflow.tools.log.calls[-1]["tool"], "refine_recommendations")

    def test_confirm_and_handoff_uses_default_face_without_consent(self):
        workflow = AgentWorkflow()
        state = workflow.start_session(session_id="s_face")
        first = workflow.handle_customer_input(state, "没想法，你推荐")
        set_id = first.output["recommendation"]["sets"][0]["set_id"]

        result = workflow.confirm_and_handoff(state, set_id=set_id, consent_given=False)

        self.assertEqual(result.output["type"], "tryon_handoff")
        self.assertEqual(state.consent.face_mode, FaceMode.DEFAULT_FACE)
        self.assertIsNotNone(state.consent.default_face_template_id)
        self.assertEqual(result.output["handoff"]["generation_status"], "pending")

    def test_demo_loop_records_agent_evidence(self):
        workflow = AgentWorkflow()
        result = workflow.run_demo()
        tools = [call["tool"] for call in result["tool_calls"]]

        self.assertIn("get_recommendations", tools)
        self.assertIn("record_feedback", tools)
        self.assertIn("refine_recommendations", tools)
        self.assertIn("select_default_face_template", tools)
        self.assertIn("handoff_tryon_generation", tools)
        self.assertEqual(result["state"]["recommendation_round"], 2)


if __name__ == "__main__":
    unittest.main()
