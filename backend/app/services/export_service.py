import json
import os

try:
    from weasyprint import HTML
    HAS_WEASYPRINT = True
except OSError:
    HAS_WEASYPRINT = False

from pptx import Presentation
from pptx.util import Inches, Pt


EXPORT_DIR = "exports"
os.makedirs(EXPORT_DIR, exist_ok=True)


def export_to_pdf(transcription, analyses, output_path: str):
    """Export transcription + analyses to PDF via WeasyPrint."""
    html_parts = [
        f"<h1>{transcription.filename}</h1>",
        f"<p><strong>Language:</strong> {transcription.language or 'N/A'} | "
        f"<strong>Duration:</strong> {transcription.duration or 0:.0f}s</p>",
        f"<h2>Transcription</h2><p>{transcription.text}</p>",
    ]
    for a in analyses:
        html_parts.append(f"<h2>{a.type.title()}</h2>")
        html_parts.append(f"<pre>{json.dumps(a.content, indent=2, ensure_ascii=False)}</pre>")

    html = f"<html><body style='font-family:sans-serif;max-width:800px;margin:auto;padding:20px'>{''.join(html_parts)}</body></html>"
    if not HAS_WEASYPRINT:
        raise RuntimeError("PDF export requires WeasyPrint + GTK. Install GTK: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html")
    HTML(string=html).write_pdf(output_path)


def export_to_srt(transcription, output_path: str):
    """Export transcription segments to SRT subtitle format."""
    lines = []
    for i, seg in enumerate(transcription.segments or [], 1):
        start = _format_srt_time(seg["start"])
        end = _format_srt_time(seg["end"])
        lines.append(f"{i}")
        lines.append(f"{start} --> {end}")
        lines.append(seg["text"])
        lines.append("")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def export_to_vtt(transcription, output_path: str):
    """Export transcription segments to WebVTT format."""
    lines = ["WEBVTT", ""]
    for seg in transcription.segments or []:
        start = _format_vtt_time(seg["start"])
        end = _format_vtt_time(seg["end"])
        lines.append(f"{start} --> {end}")
        lines.append(seg["text"])
        lines.append("")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def export_to_txt(transcription, output_path: str):
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(transcription.text)


def export_to_json(transcription, analyses, output_path: str):
    data = {
        "id": transcription.id,
        "filename": transcription.filename,
        "language": transcription.language,
        "duration": transcription.duration,
        "text": transcription.text,
        "segments": transcription.segments,
        "analyses": {a.type: a.content for a in analyses},
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def export_to_md(transcription, analyses, output_path: str):
    lines = [
        f"# {transcription.filename}",
        f"**Language:** {transcription.language or 'N/A'} | **Duration:** {transcription.duration or 0:.0f}s",
        "", "## Transcription", "", transcription.text, "",
    ]
    for a in analyses:
        lines.append(f"## {a.type.title()}")
        lines.append(f"```json\n{json.dumps(a.content, indent=2, ensure_ascii=False)}\n```")
        lines.append("")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def export_to_pptx(analyses, output_path: str):
    """Export slides analysis to PowerPoint."""
    prs = Presentation()
    slides_data = None
    for a in analyses:
        if a.type == "slides":
            slides_data = a.content
            break
    if not slides_data or "slides" not in slides_data:
        return
    for slide_data in slides_data["slides"]:
        slide = prs.slides.add_slide(prs.slide_layouts[1])
        slide.shapes.title.text = slide_data.get("title", "")
        body = slide.placeholders[1]
        body.text = "\n".join(slide_data.get("bullets", []))
    prs.save(output_path)


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_vtt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
