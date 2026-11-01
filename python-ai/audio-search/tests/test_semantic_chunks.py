from semantic_chunks import split_records

def test_split_preserves_source_and_bounds():
    rows=split_records([{'source':'a.wav','start':10.,'end':16.,'text':'First topic. Second topic.'}])
    assert len(rows)==2
    assert all(r['source']=='a.wav' and 10 <= r['start'] < r['end'] <=16 for r in rows)
    assert [x['text'] for x in rows]==['First topic.', 'Second topic.']
