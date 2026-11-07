import unittest

from flow_metrics import measure


class FlowTests(unittest.TestCase):
    def sample(self):
        return {"outcomeId": "synthetic journey", "readyAt": "2026-11-07T10:00:00Z", "acceptedAt": None, "intervals": []}

    def interval(self, start, end, phase="review", **kwargs):
        return dict(taskId="review1", attempt=1, phase=phase, start="2026-11-07T10:" + start + ":00Z",
                    end="2026-11-07T10:" + end + ":00Z", result="complete", tokens=None, **kwargs)

    def test_missing_measurements_stay_unknown(self):
        result = measure(self.sample())
        self.assertIsNone(result["readyToAcceptedSeconds"])
        self.assertIsNone(result["recordedSecondsByPhase"]["review"])
        self.assertIsNone(result["measuredTokens"])

    def test_overlaps_do_not_double_count_and_failures_are_included(self):
        sample = self.sample()
        first = self.interval("00", "10")
        first.update(result="failed", tokens=100)
        second = self.interval("05", "15")
        second.update(tokens=100)
        sample["intervals"] = [first, second]
        result = measure(sample)
        self.assertEqual(result["recordedSecondsByPhase"]["review"], 900)
        self.assertEqual(result["measuredTokens"], 100)
        self.assertEqual(result["failedOrInterruptedAttempts"], 1)

    def test_unknown_interval_cannot_become_zero_cost(self):
        sample = self.sample()
        row = self.interval("00", "10", "administration")
        row["end"] = None
        sample["intervals"] = [row]
        result = measure(sample)
        self.assertIsNone(result["recordedSecondsByPhase"]["administration"])
        self.assertEqual(result["unknownIntervalsByPhase"]["administration"], 1)

    def test_reversed_times_and_conflicting_measurements_fail(self):
        sample = self.sample()
        sample["intervals"] = [self.interval("10", "00")]
        with self.assertRaises(ValueError):
            measure(sample)
        first, second = self.interval("00", "10"), self.interval("10", "20")
        first["tokens"], second["tokens"] = 100, 200
        sample["intervals"] = [first, second]
        with self.assertRaisesRegex(ValueError, "conflicting"):
            measure(sample)


if __name__ == "__main__":
    unittest.main()
