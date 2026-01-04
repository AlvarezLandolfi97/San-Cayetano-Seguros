import re


def parse_coverages_markdown(markdown: str, limit: int = 10):
    """
    Normaliza un texto con coberturas (markdown o simple lista).
    Devuelve hasta `limit` líneas limpias sin prefijos como "- ", "• " o "* ".
    """
    if not markdown:
        return []
    entries = []
    for raw in markdown.splitlines():
        if not raw.strip():
            continue
        if raw.lstrip() != raw:
            # skip indented/nested markers to keep top-level entries only
            continue
        cleaned = raw.strip()
        if not cleaned:
            continue
        cleaned = re.sub(r"^[-•*]+\s*", "", cleaned)
        cleaned = cleaned.strip()
        if not cleaned:
            continue
        entries.append(cleaned)
        if len(entries) >= limit:
            break
    return entries
