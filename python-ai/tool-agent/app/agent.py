"""Bounded planner/executor with tool allowlist and explicit approval gate."""
from dataclasses import dataclass
from pathlib import Path
import os
import stat


@dataclass(frozen=True)
class Action:
    name: str
    arguments: dict


ALLOWED_TOOLS = {'list_documents', 'read_document', 'draft_note'}
MAX_DOCUMENT_CHARS = 4000


def read_document_prefix(directory: Path, name: str) -> str:
    # Linux/POSIX demo: open the directory and the file relative to its descriptor.
    # Reject symlinks and special files without ever blocking on a FIFO.
    try:
        directory_fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory_fd)
            try:
                info = os.fstat(fd)
                if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                    raise ValueError('Document unavailable')
                # TextIOWrapper performs bounded buffered reads, not read-to-end.
                with os.fdopen(fd, 'r', encoding='utf8', closefd=False) as stream:
                    return stream.read(MAX_DOCUMENT_CHARS)
            finally:
                os.close(fd)
        finally:
            os.close(directory_fd)
    except (OSError, UnicodeError) as exc:
        raise ValueError('Document unavailable') from exc


def validate(action: Action) -> None:
    if action.name not in ALLOWED_TOOLS:
        raise ValueError('Tool not permitted')
    if not isinstance(action.arguments, dict):
        raise ValueError('Tool arguments must be an object')
    keys = {'list_documents': set(), 'read_document': {'name'}, 'draft_note': {'text'}}
    if set(action.arguments) != keys[action.name]:
        raise ValueError('Invalid tool arguments')
    if any(not isinstance(v, str) or len(v) > 2000 for v in action.arguments.values()):
        raise ValueError('Invalid tool values')


class Agent:
    def __init__(self, documents: Path):
        self.documents = documents.resolve()
        self.documents.mkdir(parents=True, exist_ok=True)

    def execute(self, action: Action, approved: bool = False) -> dict:
        validate(action)
        if action.name == 'list_documents':
            return {'documents': sorted(p.name for p in self.documents.glob('*.txt') if not p.is_symlink() and p.is_file())}
        if action.name == 'read_document':
            name = action.arguments['name']
            if Path(name).name != name or not name.endswith('.txt'):
                raise ValueError('Only plain text filenames permitted')
            return {'name': name, 'content': read_document_prefix(self.documents, name)}
        if not approved:
            return {'status': 'approval_required', 'action': action.name,
                    'preview': action.arguments['text'][:200]}
        # Demonstrate an approved write but keep it in a controlled local directory.
        target = self.documents / 'agent_draft.txt'
        if target.is_symlink():
            raise ValueError('Draft path must not be a symlink')
        target.write_text(action.arguments['text'], encoding='utf8')
        return {'status': 'written', 'file': target.name}
