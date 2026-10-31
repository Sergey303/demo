"""Bounded planner/executor with tool allowlist and explicit approval gate."""
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Action:
    name: str
    arguments: dict


ALLOWED_TOOLS = {'list_documents', 'read_document', 'draft_note'}


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
            return {'documents': sorted(p.name for p in self.documents.glob('*.txt') if p.is_file())}
        if action.name == 'read_document':
            name = action.arguments['name']
            if Path(name).name != name or not name.endswith('.txt'):
                raise ValueError('Only plain text filenames permitted')
            path = (self.documents / name).resolve()
            if path.parent != self.documents or not path.is_file():
                raise ValueError('Document unavailable')
            return {'name': name, 'content': path.read_text(encoding='utf8')[:4000]}
        if not approved:
            return {'status': 'approval_required', 'action': action.name,
                    'preview': action.arguments['text'][:200]}
        # Demonstrate an approved write but keep it in a controlled local directory.
        target = self.documents / 'agent_draft.txt'
        if target.is_symlink():
            raise ValueError('Draft path must not be a symlink')
        target.write_text(action.arguments['text'], encoding='utf8')
        return {'status': 'written', 'file': target.name}
