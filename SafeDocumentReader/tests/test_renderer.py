import sys
import unittest
import tempfile
import subprocess
import shutil
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from renderer_audit import check_pdf
from generate_fixtures import pdf
from safe_read import run, dangerzone_cli
from unittest.mock import patch

INFO=b"Pages: 1\nForm: none\nJavaScript: no\nEncrypted: no\n"
IMAGES=b"page num type width height\n 1 0 image 10 10\n"
class RendererTests(unittest.TestCase):
    def check(self, values):
        return check_pdf(Path("synthetic.pdf"),Mock(side_effect=values),20)
    def test_missing_dangerzone_fails_closed(self):
        with patch("safe_read.shutil.which",return_value=None), patch("safe_read.Path.is_file",return_value=False):
            with self.assertRaisesRegex(RuntimeError,"Dangerzone CLI missing"):
                dangerzone_cli()
    def test_pixel_contract(self):
        self.assertEqual(self.check([INFO,b"\x0c",b"0 embedded files\n",b"Page Type URL\n",IMAGES]),1)
    def test_hidden_text_rejected(self):
        with self.assertRaisesRegex(RuntimeError,"text layer"):
            self.check([INFO,b"hidden"])
    def test_active_rejected(self):
        with self.assertRaisesRegex(RuntimeError,"active"):
            self.check([INFO.replace(b"JavaScript: no",b"JavaScript: yes")])
    def test_attachment_rejected(self):
        with self.assertRaisesRegex(RuntimeError,"attachments"):
            self.check([INFO,b"",b"1 embedded files\n"])
    def test_link_rejected(self):
        with self.assertRaisesRegex(RuntimeError,"URL"):
            self.check([INFO,b"",b"0 embedded files\n",b"Page Type URL\n1 Annotation https://example.invalid"])
    def test_missing_image_rejected(self):
        with self.assertRaisesRegex(RuntimeError,"Missing raster"):
            self.check([INFO,b"",b"0 embedded files\n",b"Page Type URL\n",b""])
    @unittest.skipUnless(all(shutil.which(x) for x in ("pdfinfo","pdftotext","pdfdetach","pdfimages")),"Poppler required")
    def test_real_pdf_with_text_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"fixture.pdf"
            pdf(path,[(["Visible text"],"HIDDEN")])
            with self.assertRaisesRegex(RuntimeError,"text layer"):
                check_pdf(path,run,20)
    @unittest.skipUnless(all(shutil.which(x) for x in ("pdfinfo","pdftotext","pdfdetach","pdfimages")),"Poppler required")
    def test_real_image_only_pdf_accepted(self):
        # Minimal 1x1 RGB image PDF, generated entirely from trusted constants.
        objects=[b"<< /Type /Catalog /Pages 2 0 R >>",b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
          b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
          b"<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\n\xff\xff\xff\nendstream"]
        stream=b"q 100 0 0 100 0 0 cm /Im0 Do Q"
        objects.append(b"<< /Length "+str(len(stream)).encode()+b" >>\nstream\n"+stream+b"\nendstream")
        data=bytearray(b"%PDF-1.4\n"); offsets=[0]
        for i,obj in enumerate(objects,1):
            offsets.append(len(data)); data.extend(f"{i} 0 obj\n".encode()+obj+b"\nendobj\n")
        xref=len(data); data.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
        for off in offsets[1:]:
            data.extend(f"{off:010} 00000 n \n".encode())
        data.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"pixel.pdf"; path.write_bytes(data)
            self.assertEqual(check_pdf(path,run,20),1)
