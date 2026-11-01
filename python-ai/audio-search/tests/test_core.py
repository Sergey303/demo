import pytest
from core import Segment, passages, validate_segments


def test_time_attribution():
    rows = passages([Segment(0, 2.5, 'hello'), Segment(2.5, 3.1, ' goodbye ')], 'meeting.wav')
    assert rows == [{'source':'meeting.wav','start':0,'end':2.5,'text':'hello'},
                    {'source':'meeting.wav','start':2.5,'end':3.1,'text':'goodbye'}]


def test_reject_bad_timestamps():
    with pytest.raises(ValueError):
        validate_segments([Segment(2, 4, 'a'), Segment(3, 5, 'overlap')])
    with pytest.raises(ValueError):
        validate_segments([Segment(float('nan'), 4, 'bad')])
