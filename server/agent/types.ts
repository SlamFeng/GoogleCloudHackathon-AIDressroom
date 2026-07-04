import { z } from "zod";
import {
  agentChatSchema,
  confirmPayloadSchema,
  feedbackPayloadSchema,
  previewStatusPayloadSchema,
  previewTryonSchema,
  startAgentSessionSchema
} from "./contracts.js";

export type StartAgentSessionInput = z.infer<typeof startAgentSessionSchema>;
export type AgentChatInput = z.infer<typeof agentChatSchema>;
export type FeedbackPayloadInput = z.infer<typeof feedbackPayloadSchema>;
export type PreviewTryonInput = z.infer<typeof previewTryonSchema>;
export type PreviewStatusPayloadInput = z.infer<typeof previewStatusPayloadSchema>;
export type ConfirmPayloadInput = z.infer<typeof confirmPayloadSchema>;

export interface AgentRequestContext {
  origin?: string;
}
