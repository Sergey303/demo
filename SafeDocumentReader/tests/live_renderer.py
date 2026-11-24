"""Explicit synthetic live acceptance; never takes an arbitrary document."""
from pathlib import Path
import subprocess
import sys
import tempfile
from generate_fixtures import generate

ROOT=Path(__file__).resolve().parents[1]

def run():
    with tempfile.TemporaryDirectory(prefix="sdr-render-accept-") as tmp:
        root=Path(tmp)
        generate(root/"fixtures")
        for filename,count in [("first.pdf",2),("second.pdf",1),("office.docx",1)]:
            out=root/(filename+".review")
            result=subprocess.run([sys.executable,str(ROOT/"safe_read.py"),
                str(root/"fixtures"/filename),"--out",str(out),"--render-only"],
                timeout=1900,check=False)
            if result.returncode:
                assert not out.exists(),"Failed render published output"
                raise SystemExit("BLOCKED/FAIL: "+filename)
            assert len(list((out/"pages").glob("*.png")))==count
            assert (out/"safe.pdf").is_file()
            assert not subprocess.check_output(["pdftotext",str(out/"safe.pdf"),"-"]).strip()
            print("PASS",filename,count,"pages, no searchable text",flush=True)
        # Hidden text is never supposed to become a visible mark.
        # Independent human visual review of the page PNGs remains necessary.
        print("PASS structural acceptance; not a security certification")
if __name__=="__main__":
    run()
