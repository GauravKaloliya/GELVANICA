import re


def sanitize_html(text: str) -> str:
    """Strip dangerous HTML tags and escape special characters."""
    dangerous_tags = re.compile(
        r'<\s*(script|iframe|object|embed|form|input|textarea|select|option|style|link|meta|base|applet|frame|frameset|ilayer|layer|bgsound|audio|video|canvas|svg)\b[^>]*>',
        re.IGNORECASE,
    )
    text = dangerous_tags.sub('', text)
    text = re.sub(r'<\s*/\s*(script|iframe|object|embed|form|style|link|meta|base|applet|frame|frameset)\s*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]*javascript\s*:',
                  '', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]*on\w+\s*=\s*["\'][^"\']*["\']',
                  '', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]*on\w+\s*=\s*\S+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&#x27;')
    return text


def sanitize_text(text: str, max_length: int = 10000) -> str:
    """Strip control characters, limit length, normalize whitespace."""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    if len(text) > max_length:
        text = text[:max_length]
    return text


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """Remove path traversal, null bytes, limit length, keep only safe chars."""
    filename = filename.replace('\x00', '')
    if re.search(r'(^|[/\\])\.\.($|[/\\])', filename):
        raise ValueError("Path traversal detected in filename")
    if filename.strip() in ('.', '..', ''):
        raise ValueError("Invalid filename")
    filename = re.sub(r'[/\\]', '_', filename)
    filename = re.sub(r'[^\w\-.]', '_', filename)
    if len(filename) > max_length:
        parts = filename.rsplit('.', 1)
        name = parts[0]
        ext = parts[1] if len(parts) > 1 else ''
        if ext:
            avail = max(max_length - len(ext) - 1, 1)
            filename = name[:avail] + '.' + ext
        else:
            filename = name[:max_length]
    return filename


DANGEROUS_URL_PROTOCOLS = re.compile(
    r'^\s*(javascript|data|vbscript|file|ftp|dict|gopher|telnet|jar|ldap|ldaps)\s*:',
    re.IGNORECASE,
)


def sanitize_url(url: str, max_length: int = 2048) -> str:
    """Validate URL scheme, strip dangerous protocols, limit length."""
    url = url.strip()
    if DANGEROUS_URL_PROTOCOLS.match(url):
        raise ValueError("Dangerous URL protocol is not allowed")
    if not re.match(r'^https?://', url, re.IGNORECASE):
        raise ValueError("Only http and https URLs are allowed")
    if len(url) > max_length:
        url = url[:max_length]
    return url
