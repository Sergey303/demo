import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from semantic_contract_eval import CASES, assess, parse_response, payload_for, validate_cases


class SemanticContractTests(unittest.TestCase):
    def setUp(self):
        self.cases = {c["id"]: c for c in json.loads(CASES.read_text())}

    def test_fixture_and_no_gold_in_prompt(self):
        validate_cases(list(self.cases.values()))
        for c in self.cases.values():
            self.assertEqual(set(payload_for(c)), {"question", "options", "evidence"})
        self.assertEqual(len(self.cases), 12)

    def test_same_source_can_be_correct_wrong_or_insufficient(self):
        c = self.cases["negation-allowed"]
        self.assertEqual(assess(c, {"choice": 1, "citations": ["export-policy"]}), "correct_supported_answer")
        self.assertEqual(assess(c, {"choice": 0, "citations": ["export-policy"]}), "wrong_answer")
        self.assertEqual(assess(self.cases["missing-field"], {"choice": 0, "citations": ["export-policy"]}), "unsupported_answer")

    def test_joint_support(self):
        c = self.cases["joint-evidence"]
        self.assertEqual(assess(c, {"choice": 0, "citations": ["shipment-r"]}), "wrong_support")
        self.assertEqual(assess(c, {"choice": 0, "citations": ["shipment-r", "requirements"]}), "correct_supported_answer")

    def test_abstention_and_invalid_not_conflated(self):
        c = self.cases["missing-field"]
        self.assertEqual(assess(c, {"choice": None, "citations": []}), "correct_abstention")
        self.assertEqual(assess(c, None), "invalid_or_unavailable")
        self.assertEqual(assess(self.cases["negation-role"], {"choice": None, "citations": []}), "false_abstention")

    def test_reject_malformed_output(self):
        c = self.cases["negation-role"]
        invalid = [
            '{"choice":0,"citations":["foreign"]}',
            '{"choice":true,"citations":["export-policy"]}',
            '{"choice":0,"choice":1,"citations":["export-policy"]}',
            '{"choice":null,"citations":["export-policy"]}',
            '{"choice":0,"citations":[]}',
            '{"choice":0,"citations":["export-policy","export-policy"]}',
            '{"choice":0,"citations":["export-policy"],"extra":0}'
        ]
        for content in invalid:
            with self.subTest(content=content), self.assertRaises(ValueError):
                parse_response({"done": True, "done_reason": "stop", "response": content}, c)
        with self.assertRaises(ValueError):
            parse_response({"done": True, "done_reason": "length", "response": "{}"}, c)


if __name__ == "__main__":
    unittest.main()
