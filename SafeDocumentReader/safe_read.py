#!/usr/bin/env python3
"""Trusted Linux controller; never interpret original document text."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import uuid
from contract import validate, MAX_OUTPUT, human_report
from transport import pack

MAX_INPUT = 64 * 1024 * 1024
MAX_RASTER = 256 * 1024 * 1024
EXTENSIONS = {".pdf", ".doc", ".docx", ".docm", ".xls", ".xlsx", ".xlsm",
              ".ppt", ".pptx", ".pptm", ".odt", ".ods", ".odp", ".rtf",
              ".txt", ".csv", ".png", ".jpg", ".jpeg", ".tiff"}

def run(cmd, *, capture=False, timeout=1800, input_file=None):
    env = {k:v for k,v in os.environ.items()
           if not k.startswith("DANGERZONE_") and k != "QUBES_CONVERSION"}
    env["LC_ALL"] = "C"
    with tempfile.TemporaryFile() as out:
        try:
            subprocess.run(cmd, env=env, stdin=input_file if input_file is not None else subprocess.DEVNULL,
                           stdout=out if capture else subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=timeout, check=True)
        except (OSError, subprocess.SubprocessError):
            raise RuntimeError("Command failed or timed out: " + cmd[0]) from None
        if capture:
            out.seek(0)
            data = out.read(MAX_OUTPUT + 1)
            if len(data) > MAX_OUTPUT:
                raise RuntimeError("Output exceeds limit")
            return data
    return b""

def render(source, root, max_pages):
    staged = root / ("source" + source.suffix.lower())
    with source.open("rb") as inp, staged.open("xb") as out:
        data = inp.read(MAX_INPUT + 1)
        if not data or len(data) > MAX_INPUT:
            raise ValueError("Input size outside allowed range")
        out.write(data)
    del data
    pdf = root / "safe.pdf"
    run(["dangerzone-cli", "--output-filename", str(pdf), str(staged)])
    staged.unlink()
    if not pdf.is_file() or pdf.is_symlink() or pdf.stat().st_size > MAX_RASTER:
        raise RuntimeError("Invalid sanitized PDF")
    info = run(["pdfinfo", str(pdf)], capture=True).decode("ascii", errors="replace")
    match = re.search(r"^Pages:\s+(\d+)\s*$", info, re.M)
    if not match or not 1 <= int(match[1]) <= max_pages:
        raise RuntimeError("Missing or excessive page count; no truncation")
    count = int(match[1])
    pages = root / "pages"
    pages.mkdir(mode=0o700)
    run(["pdftoppm", "-png", "-scale-to", "2200", str(pdf), str(pages / "page")])
    found = sorted(pages.glob("page-*.png"), key=lambda p: int(p.stem.rsplit("-",1)[1]))
    if len(found) != count or sum(p.stat().st_size for p in found) > MAX_RASTER:
        raise RuntimeError("Unexpected raster output")
    for i, path in enumerate(found, 1):
        if path.is_symlink() or int(path.stem.rsplit("-",1)[1]) != i:
            raise RuntimeError("Invalid page sequence")
        with path.open("rb") as f:
            if f.read(8) != b"\x89PNG\r\n\x1a\n":
                raise RuntimeError("Not PNG")
        path.rename(pages / f"{i:04d}.png")
    return pdf, pages, count

def docker_args(name, image, engine, model, words):
    return ["docker", "run", "-i", "--rm", "--pull=never", "--name", name,
            "--network", "none", "--read-only", "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges", "--pids-limit", "256",
            "--memory", "16g", "--cpus", "4", "--user", "10001:10001",
            "--tmpfs", "/tmp:rw,nosuid,nodev,size=1g,mode=1777",
            "--log-driver", "none",
            image, "--engine", engine, "--model", model, "--words", str(words)]

def summarize(pages, args):
    name = "sdr-" + uuid.uuid4().hex
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", args.image_id or ""):
        raise ValueError("Trusted local image ID required")
    with tempfile.TemporaryFile(dir=pages.parent) as payload:
        pack(pages, payload)
        payload.seek(0)
        cmd = docker_args(name,args.image_id,args.engine,args.model,args.words)
        if args.backend == "docker":
            try:
                return run(cmd,input_file=payload,capture=True,timeout=args.timeout)
            finally:
                names = run(["docker","ps","-a","--filter","name=^/"+name+"$",
                             "--format","{{.Names}}"],capture=True,timeout=30)
                if name in names.decode("ascii").splitlines():
                    run(["docker","rm","-f",name],timeout=120)
        archive=args.image_archive
        if not archive or not archive.is_file():
            raise ValueError("SBX requires trusted prebuilt docker save archive")
        sbx=["sbx","--no-input"]
        with tempfile.TemporaryDirectory(dir=pages.parent,prefix="transfer-") as transfer:
            frame=Path(transfer)/"pages.bin"
            with frame.open("xb") as f:
                shutil.copyfileobj(payload,f)
            try:
                run(sbx+["create","--name",name,"--skills","off","--static-mcp","none",
                         "--deny-network","**","--pull","never","--memory","20g","shell"])
                run(sbx+["cp",str(archive.resolve()),name+":/tmp/sdr-image.tar"])
                run(sbx+["exec",name,"docker","load","-i","/tmp/sdr-image.tar"])
                run(sbx+["exec",name,"rm","/tmp/sdr-image.tar"])
                run(sbx+["cp",str(frame),name+":/tmp/sdr-pages.bin"])
                # Fixed shell syntax; user-controlled values passed only as argv.
                return run(sbx+["exec",name,"sh","-c",'exec "$@" < /tmp/sdr-pages.bin',"sdr"]+cmd,
                           capture=True,timeout=args.timeout)
            finally:
                run(sbx+["rm","--force",name],timeout=180)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("document", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--render-only", action="store_true")
    p.add_argument("--keep-pages", action="store_true")
    p.add_argument("--backend", choices=["sbx","docker"], default="sbx")
    p.add_argument("--image-id")
    p.add_argument("--image-archive", type=Path)
    p.add_argument("--engine", choices=["codex","ollama"], default="codex")
    p.add_argument("--model", default="qwen3-vl:8b")
    p.add_argument("--words", type=int, default=80)
    p.add_argument("--max-pages", type=int, default=20)
    p.add_argument("--timeout", type=int, default=3600)
    args = p.parse_args()
    os.umask(0o077)
    try:
        if (not args.document.is_file() or args.document.is_symlink()
                or args.document.suffix.lower() not in EXTENSIONS):
            raise ValueError("Unsupported source")
        if not 1 <= args.max_pages <= 40 or not 20 <= args.words <= 300:
            raise ValueError("Invalid limits")
        if args.timeout < 1 or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/-]{0,100}", args.model):
            raise ValueError("Invalid model or timeout")
        if args.out.exists() or args.out.is_symlink():
            raise ValueError("Output directory already exists")
        with tempfile.TemporaryDirectory(prefix="sdr-") as tmp:
            pdf,pages,count = render(args.document.resolve(),Path(tmp),args.max_pages)
            report = None if args.render_only else validate(summarize(pages,args),count)
            args.out.mkdir(mode=0o700)
            try:
                if report is not None:
                    (args.out/"report.json").write_text(json.dumps(
                        {"status":"UNVERIFIED_HUMAN_REVIEW_REQUIRED","pages":report},
                        ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
                    (args.out/"report.txt").write_text(human_report(report),encoding="utf-8")
                if args.keep_pages or args.render_only:
                    shutil.copyfile(pdf,args.out/"safe.pdf")
                    shutil.copytree(pages,args.out/"pages")
            except BaseException:
                shutil.rmtree(args.out)
                raise
        print("Completed; human review required.")
    except (OSError,ValueError,RuntimeError) as exc:
        p.exit(1,"SafeDocumentReader failed: "+(str(exc) if isinstance(exc,RuntimeError)
               else "invalid input, output or configuration")+"\n")

if __name__ == "__main__":
    main()
