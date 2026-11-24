"""Bounded length-prefixed PNG transport; never unpack paths from untrusted input."""
import struct
from pathlib import Path

MAX_RASTER = 256 * 1024 * 1024
MAX_PAGE = 32 * 1024 * 1024
PNG = b"\x89PNG\r\n\x1a\n"

def pack(pages, stream):
    paths = sorted(pages.glob("*.png"))
    if not 1 <= len(paths) <= 40:
        raise ValueError("Invalid page count")
    stream.write(struct.pack(">I",len(paths)))
    total = 0
    for i,p in enumerate(paths,1):
        if p.name != f"{i:04d}.png" or p.is_symlink():
            raise ValueError("Unexpected page name")
        with p.open("rb") as f:
            data = f.read(MAX_PAGE+1)
        total += len(data)
        if len(data)>MAX_PAGE or total>MAX_RASTER or not data.startswith(PNG):
            raise ValueError("Invalid page payload")
        stream.write(struct.pack(">I",len(data)))
        stream.write(data)

def exact(stream,n):
    data = stream.read(n)
    if len(data)!=n:
        raise ValueError("Truncated input")
    return data

def unpack(stream, root):
    count = struct.unpack(">I",exact(stream,4))[0]
    if not 1 <= count <= 40:
        raise ValueError("Invalid page count")
    paths=[]
    total=0
    for i in range(1,count+1):
        size=struct.unpack(">I",exact(stream,4))[0]
        total += size
        if not 8 <= size <= MAX_PAGE or total>MAX_RASTER:
            raise ValueError("Page payload exceeds bounds")
        data=exact(stream,size)
        if not data.startswith(PNG):
            raise ValueError("Invalid PNG")
        dest=root/f"{i:04d}.png"
        with dest.open("xb") as f:
            f.write(data)
        dest.chmod(0o400)
        paths.append(dest)
    if stream.read(1):
        raise ValueError("Trailing input")
    return paths
