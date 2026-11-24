"""Executable numeric examples for EP12G's external (not deployed) alert spec."""
import unittest


def ratio_alert(total, failures, threshold):
    return total is not None and failures is not None and total >= 100 and failures / total > threshold


def registry_alert(failures):
    return failures is not None and failures >= 3


def held(samples, seconds):
    # Every 30s evaluation including both ends must be true; unknown resets hold.
    needed = seconds // 30 + 1
    return len(samples) >= needed and all(value is True for value in samples[-needed:])


class AlertSpecTests(unittest.TestCase):
    def test_ratio_boundaries_and_traffic_minimum(self):
        for threshold in (0.20, 0.10):
            self.assertFalse(ratio_alert(99, 99, threshold))
            self.assertFalse(ratio_alert(100, 100 * threshold, threshold))
            self.assertTrue(ratio_alert(100, 100 * threshold + 0.01, threshold))
            self.assertFalse(ratio_alert(None, 30, threshold))
            self.assertFalse(ratio_alert(100, None, threshold))
            self.assertFalse(ratio_alert(0, 0, threshold))

    def test_registry_absolute_minimum(self):
        self.assertFalse(registry_alert(None))
        self.assertFalse(registry_alert(2.99))
        self.assertTrue(registry_alert(3))

    def test_continuous_holds(self):
        self.assertFalse(held([True] * 4, 120))
        self.assertTrue(held([True] * 5, 120))
        self.assertFalse(held([True, True, None, True, True], 120))
        self.assertFalse(held([True, False, True, True, True], 120))
        self.assertTrue(held([True] * 3, 60))
        self.assertFalse(held([True] * 2, 60))


if __name__ == '__main__':
    unittest.main()
