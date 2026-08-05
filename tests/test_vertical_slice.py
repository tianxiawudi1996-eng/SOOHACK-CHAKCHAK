from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps" / "web"


class VerticalSliceTests(unittest.TestCase):
    def test_required_files_exist(self) -> None:
        required = [
            WEB / "index.html",
            WEB / "styles.css",
            WEB / "app.js",
            WEB / "data" / "unit-equation-basics.json",
            ROOT / "contracts" / "openapi.yaml",
            ROOT / "contracts" / "schema.sql",
            ROOT / "docs" / "product" / "MVP_v0.1_SCOPE.md",
        ]
        self.assertEqual([], [str(path) for path in required if not path.exists()])

    def test_unit_contract(self) -> None:
        data = json.loads((WEB / "data" / "unit-equation-basics.json").read_text(encoding="utf-8"))
        self.assertEqual("ALG-EQ-001", data["id"])
        self.assertEqual(5, len(data["steps"]))
        self.assertEqual(["understand", "connect", "recall", "apply", "explain"], [step["type"] for step in data["steps"]])
        self.assertEqual("5", data["steps"][3]["answer"])

    def test_accessibility_hooks(self) -> None:
        html = (WEB / "index.html").read_text(encoding="utf-8")
        self.assertIn('lang="ko"', html)
        self.assertIn('aria-live="polite"', html)
        self.assertIn('class="skip-link"', html)
        self.assertIn('id="character-toggle"', html)

    def test_design_tokens_are_applied(self) -> None:
        css = (WEB / "styles.css").read_text(encoding="utf-8")
        for token in ["#2F5BFF", "#20BFA9", "#FFB84D", "#172033", "#F6F8FF"]:
            self.assertIn(token, css)
        self.assertIn("prefers-reduced-motion", css)
        self.assertRegex(css, re.compile(r"min-height:\s*44px"))

    def test_privacy_and_state_contract(self) -> None:
        js = (WEB / "app.js").read_text(encoding="utf-8")
        self.assertIn("localStorage", js)
        self.assertIn("mathchackchack:v0.1:session", js)
        for state in ["Welcome", "Guide", "Think", "Praise", "Retry", "Listen", "Complete"]:
            self.assertIn(state, js)
        for forbidden in ["email", "phone", "schoolName", "birthDate"]:
            self.assertNotIn(forbidden, js)

    def test_api_and_db_contracts(self) -> None:
        openapi = (ROOT / "contracts" / "openapi.yaml").read_text(encoding="utf-8")
        schema = (ROOT / "contracts" / "schema.sql").read_text(encoding="utf-8")
        self.assertIn("openapi: 3.1.0", openapi)
        self.assertIn("/v1/sessions", openapi)
        for table in ["learning_units", "learning_sessions", "learner_responses", "mastery_snapshots", "parent_summaries", "telemetry_events"]:
            self.assertIn(f"create table {table}", schema)


if __name__ == "__main__":
    unittest.main()
