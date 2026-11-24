"""Resource and filesystem boundary checks; no FastAPI or model dependency."""
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from app.agent import Agent, Action, MAX_DOCUMENT_CHARS


@unittest.skipUnless(hasattr(os, 'O_NOFOLLOW') and hasattr(os, 'O_DIRECTORY'), 'POSIX only')
class BoundedReadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.agent = Agent(self.root)

    def read(self, name):
        return self.agent.execute(Action('read_document', {'name': name}))['content']

    def test_large_sparse_file_only_prefix(self):
        p = self.root / 'large.txt'
        with p.open('wb') as f:
            f.write(('я' * 5000).encode('utf8'))
            f.truncate(1024**3)
        with patch.object(Path, 'read_text', side_effect=AssertionError('unbounded read')):
            self.assertEqual(self.read('large.txt'), 'я' * MAX_DOCUMENT_CHARS)

    def test_symlink_even_inside_directory(self):
        (self.root / 'safe.txt').write_text('safe')
        (self.root / 'link.txt').symlink_to('safe.txt')
        with self.assertRaises(ValueError):
            self.read('link.txt')
        self.assertNotIn('link.txt', self.agent.execute(Action('list_documents', {}))['documents'])

    def test_fifo_and_directory_rejected(self):
        os.mkfifo(self.root / 'pipe.txt')
        (self.root / 'folder.txt').mkdir()
        for name in ('pipe.txt', 'folder.txt'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.read(name)

    def test_hard_link_and_invalid_utf8_rejected(self):
        (self.root / 'original.txt').write_text('safe')
        os.link(self.root / 'original.txt', self.root / 'hard.txt')
        (self.root / 'invalid.txt').write_bytes(b'\xff')
        for name in ('hard.txt', 'invalid.txt'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.read(name)

    def test_missing_and_traversal(self):
        for name in ('missing.txt', '../secret.txt', '/secret.txt'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.read(name)


if __name__ == '__main__':
    unittest.main()
