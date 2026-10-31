"""Dependency-light multiclass metrics; call against a held-out sample only."""
from app.model import LABELS


def classification_metrics(y_true: list[int], y_pred: list[int]) -> dict:
    if not y_true or len(y_true) != len(y_pred):
        raise ValueError('Expected nonempty matched labels')
    if any(y not in range(len(LABELS)) for y in y_true + y_pred):
        raise ValueError('Unknown label')
    matrix = [[0] * len(LABELS) for _ in LABELS]
    for truth, prediction in zip(y_true, y_pred):
        matrix[truth][prediction] += 1
    f1 = []
    for label in range(len(LABELS)):
        tp = matrix[label][label]
        fp = sum(matrix[other][label] for other in range(len(LABELS)) if other != label)
        fn = sum(matrix[label][other] for other in range(len(LABELS)) if other != label)
        f1.append(2 * tp / (2 * tp + fp + fn) if (2 * tp + fp + fn) else 0.)
    return {'accuracy': sum(a == b for a, b in zip(y_true, y_pred)) / len(y_true),
            'macro_f1': sum(f1) / len(f1), 'per_class_f1': dict(zip(LABELS, f1)),
            'confusion_matrix': matrix, 'sample_count': len(y_true)}
