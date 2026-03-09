import json
import os

from pptx import Presentation
from pptx.util import Inches, Pt


EXPORT_DIR = "exports"
os.makedirs(EXPORT_DIR, exist_ok=True)


def export_to_pdf(transcription, analyses, output_path: str):
    """Export transcription + analyses to PDF via fpdf2."""
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Use built-in fonts with latin-1 fallback for accented chars
    pdf.set_font("Helvetica", "B", 18)
    title = transcription.filename or "Transcription"
    pdf.cell(0, 12, _sanitize_latin1(title), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Metadata line
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120, 120, 120)
    lang = transcription.language or "N/A"
    dur = f"{transcription.duration or 0:.0f}s" if transcription.duration else "N/A"
    pdf.cell(0, 6, _sanitize_latin1(f"Langue : {lang}  |  Duree : {dur}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Transcription text
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 8, "Transcription", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5.5, _sanitize_latin1(transcription.text or ""))
    pdf.ln(6)

    # Analyses
    for a in analyses:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, _sanitize_latin1(a.type.replace("_", " ").title()), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)
        pdf.set_font("Courier", "", 8)
        content_str = json.dumps(a.content, indent=2, ensure_ascii=False)
        pdf.multi_cell(0, 4, _sanitize_latin1(content_str))

    pdf.output(output_path)


def _sanitize_latin1(text: str) -> str:
    """Replace characters that can't be encoded in latin-1 for fpdf built-in fonts."""
    replacements = {
        "\u2019": "'", "\u2018": "'", "\u201c": '"', "\u201d": '"',
        "\u2013": "-", "\u2014": "-", "\u2026": "...", "\u00a0": " ",
        "\u2022": "-", "\u25cf": "-", "\u2023": ">",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("latin-1", errors="replace").decode("latin-1")


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
