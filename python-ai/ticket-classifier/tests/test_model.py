import torch
from app.model import IntentNet, encode, LABELS

def test_encoding_is_stable_and_padded():
    assert encode("Forgot password") == encode("FORGOT PASSWORD")
    assert len(encode("hello")) == 40
    assert encode("")[0] == 0

def test_forward_shape():
    net = IntentNet()
    assert net(torch.tensor([encode("refund"), encode("sign in")])).shape == (2, len(LABELS))

def test_no_nan_on_empty_input():
    with torch.inference_mode():
        assert torch.isfinite(IntentNet()(torch.tensor([encode("")]))).all()
