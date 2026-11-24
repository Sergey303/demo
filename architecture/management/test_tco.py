import unittest
from decimal import Decimal as D
from tco import Assumptions, compare, single_worker_break_even


class TcoTests(unittest.TestCase):
    def test_unit_cost_and_crossover(self):
        a=Assumptions()
        self.assertEqual(a.managed_variable,D("0.875"))
        n=single_worker_break_even(a)
        self.assertEqual(n,43709)
        self.assertGreater(compare(n-1,D(0),a)["local"],compare(n-1,D(0),a)["managed"])
        self.assertLessEqual(compare(n,D(0),a)["local"],compare(n,D(0),a)["managed"])

    def test_capacity_step_and_private_routing(self):
        a=compare(100000,D("0.2"))
        self.assertIsNone(a["managed"])
        self.assertEqual(a["local_workers"],2)
        self.assertEqual(a["hybrid_workers"],1)
        self.assertEqual(a["private_requests"],20000)

    def test_only_one_path_does_not_charge_unused_stack(self):
        self.assertEqual(compare(1000,D(0))["hybrid"],compare(1000,D(0))["managed"])
        self.assertEqual(compare(1000,D(1))["hybrid"],compare(1000,D(1))["local"])

    def test_invalid_input(self):
        for n, f in [(0,D(0)),(1,D("-0.1")),(1,D("1.1"))]:
            with self.assertRaises(ValueError):
                compare(n,f)


if __name__=="__main__":
    unittest.main()
