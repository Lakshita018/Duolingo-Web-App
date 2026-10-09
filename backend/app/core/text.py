import re
import unicodedata

_PUNCTUATION = re.compile(r"[¿?¡!.,;:।॥…\"“”«»()]")
_SPACES = re.compile(r'\s+')
_APOSTROPHES = str.maketrans({'’': "'", '‘': "'", 'ʼ': "'", '`': "'"})


def _is_latin(char: str) -> bool:
    return unicodedata.name(char, '').startswith('LATIN')


def fold(value: object) -> str:
    if value is None:
        return ''
    text = unicodedata.normalize('NFKC', str(value)).casefold().translate(_APOSTROPHES)
    kept: list[str] = []
    base = ''
    for char in unicodedata.normalize('NFD', text):
        if unicodedata.category(char).startswith('M'):
            if base and _is_latin(base):
                continue
        else:
            base = char
        kept.append(char)
    folded = unicodedata.normalize('NFC', ''.join(kept))
    return _SPACES.sub(' ', _PUNCTUATION.sub('', folded)).strip()
