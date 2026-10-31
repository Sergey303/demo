import pytest
from evaluate import classification_metrics


def test_classification_metrics_perfect():
    result = classification_metrics([0, 1, 2], [0, 1, 2])
    assert result['macro_f1'] == 1
    assert result['accuracy'] == 1


def test_classification_metrics_bad_labels():
    with pytest.raises(ValueError):
        classification_metrics([3], [0])
