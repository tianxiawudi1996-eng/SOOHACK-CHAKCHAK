"""Remove non-pixel metadata chunks from approved presentation images."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TARGETS = (
    ROOT / "outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0",
    ROOT / "docs/stage8/evidence/2d-pet/v1.0/review",
)
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
PIXEL_CHUNKS = {b"IHDR", b"IDAT", b"IEND"}


def strip_png(path: Path) -> list[str]:
    source = path.read_bytes()
    if not source.startswith(PNG_SIGNATURE):
        raise ValueError(f"invalid PNG: {path}")
    offset = len(PNG_SIGNATURE)
    output = bytearray(PNG_SIGNATURE)
    removed: list[str] = []
    while offset + 12 <= len(source):
        size = int.from_bytes(source[offset:offset + 4], "big")
        chunk_end = offset + 12 + size
        if chunk_end > len(source):
            raise ValueError(f"truncated PNG: {path}")
        chunk_type = source[offset + 4:offset + 8]
        if chunk_type in PIXEL_CHUNKS:
            output.extend(source[offset:chunk_end])
        else:
            removed.append(chunk_type.decode("ascii", errors="replace"))
        offset = chunk_end
        if chunk_type == b"IEND":
            break
    if removed:
        temporary = path.with_suffix(path.suffix + ".metadata-clean")
        temporary.write_bytes(output)
        temporary.replace(path)
    return removed


def main() -> None:
    files = sorted({path for target in TARGETS for path in target.rglob("*.png")})
    changed = []
    for path in files:
        removed = strip_png(path)
        if removed:
            changed.append((path.relative_to(ROOT), removed))
    print("PRESENTATION_IMAGE_METADATA_STRIPPED")
    print(f"scanned={len(files)}")
    print(f"changed={len(changed)}")
    for path, chunks in changed:
        print(f"{path}: {','.join(chunks)}")


if __name__ == "__main__":
    main()
