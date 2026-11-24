"""Checks on reconstructed PDF only; not a general-purpose PDF sanitizer."""
import re

def check_pdf(path, run, max_pages):
    info=run(["pdfinfo",str(path)],capture=True).decode("ascii",errors="replace")
    fields=dict((k.strip(),v.strip()) for k,v in
                (line.split(":",1) for line in info.splitlines() if ":" in line))
    if not fields.get("Pages","").isdigit() or not 1<=int(fields["Pages"])<=max_pages:
        raise RuntimeError("Missing or excessive page count; no truncation")
    for key,value in {"Form":"none","JavaScript":"no","Encrypted":"no"}.items():
        if fields.get(key,"").lower()!=value:
            raise RuntimeError("Unexpected PDF active content or encryption")
    if run(["pdftotext",str(path),"-"],capture=True).strip():
        raise RuntimeError("Sanitized PDF still has a text layer")
    if not re.fullmatch(rb"\s*0 embedded files\s*",run(["pdfdetach","-list",str(path)],capture=True)):
        raise RuntimeError("Sanitized PDF has attachments or unknown attachment status")
    links=run(["pdfinfo","-url",str(path)],capture=True).decode("ascii",errors="replace").splitlines()
    if any(line.strip() and not re.fullmatch(r"Page\s+Type\s+URL",line.strip()) for line in links):
        raise RuntimeError("Sanitized PDF has URL annotations or unknown link status")
    count=int(fields["Pages"])
    rows=run(["pdfimages","-list",str(path)],capture=True).decode("ascii",errors="replace").splitlines()
    image_pages={int(m[1]) for line in rows if (m:=re.match(r"^\s*(\d+)\s+\d+\s+image\s+",line))}
    if image_pages!=set(range(1,count+1)):
        raise RuntimeError("Missing raster image on a PDF page")
    return count
