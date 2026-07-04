#!/usr/bin/env python3
"""Run the local Agent foundation demo loop."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agent_foundation import AgentWorkflow  # noqa: E402


def main() -> None:
    text = sys.argv[1] if len(sys.argv) > 1 else "没想法，你推荐一套适合我的"
    workflow = AgentWorkflow()
    result = workflow.run_demo(text=text)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
