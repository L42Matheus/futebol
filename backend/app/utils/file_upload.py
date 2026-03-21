"""Utilitários para validação e manipulação de uploads de arquivo."""

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

# Magic bytes mapeados para extensões permitidas
_MAGIC_BYTES: dict[bytes, set[str]] = {
    b'\xff\xd8\xff': {'.jpg', '.jpeg'},
    b'\x89PNG': {'.png'},
    b'GIF8': {'.gif'},
    b'RIFF': {'.webp'},  # RIFF????WEBP — verificado adicionalmente
}


def validate_image_mime(file_bytes: bytes, ext: str) -> bool:
    """Verifica se os magic bytes do arquivo correspondem à extensão declarada."""
    for magic, exts in _MAGIC_BYTES.items():
        if file_bytes[:len(magic)] == magic:
            if ext == '.webp':
                return len(file_bytes) >= 12 and file_bytes[8:12] == b'WEBP'
            return ext in exts
    return False
