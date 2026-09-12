"""Create two deliberately fictional, text-selectable import fixtures, never real reports."""
import sys
from pathlib import Path
from reportlab.pdfgen import canvas

target = Path(sys.argv[1])
target.mkdir(parents=True, exist_ok=True)
for suffix, date, glucose, hemoglobin in [('a', '2026-01-10', '5.0', '140'), ('b', '2026-01-17', '4.8', '135')]:
    output = target / f'study-lab-{suffix}.pdf'
    pdf = canvas.Canvas(str(output), pagesize=(595, 842), invariant=1)
    pdf.setTitle(f'Educational fiction - sample {suffix.upper()}')
    pdf.setAuthor('NEIROPROFI educational fixtures')
    pdf.setFillColorRGB(.55, .12, .32)
    pdf.rect(36, 722, 523, 80, fill=1, stroke=0)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont('Helvetica-Bold', 17)
    pdf.drawString(52, 773, 'EDUCATIONAL FICTION')
    pdf.setFont('Helvetica', 12)
    pdf.drawString(52, 748, 'NOT A MEDICAL DOCUMENT - TEST DATA ONLY')
    pdf.setFillColorRGB(.12, .12, .12)
    pdf.setFont('Helvetica-Bold', 18)
    pdf.drawString(36, 676, f'Import sample {suffix.upper()}')
    pdf.setFont('Helvetica', 12)
    pdf.drawString(36, 644, date)
    pdf.drawString(36, 619, f'Fictional profile: demo-parent-{suffix}')
    pdf.setFont('Helvetica', 13)
    # Keep the original healthtablo importer's plain text pipe format.
    pdf.drawString(36, 555, f'Glucose | {glucose} | mmol/L | 3.9 - 6.1')
    pdf.drawString(36, 521, f'Hemoglobin | {hemoglobin} | g/L | 120 - 160')
    pdf.setFont('Helvetica', 11)
    for i, line in enumerate([
        'Values and ranges are fictional fixtures for software testing.',
        'They are not medical reference ranges or treatment advice.',
        'Expected import: exactly 2 values, units unchanged.',
        'Import the same file twice: do not create a duplicate document.',
        'Do not infer a diagnosis or send real health records to an AI service.',
    ]): pdf.drawString(36, 439 - i * 23, line)
    pdf.setFillColorRGB(.55, .12, .32)
    pdf.drawString(36, 48, 'NEIROPROFI / data / 2026-09-11.1 / FICTIONAL')
    pdf.save()
print('Created two fictional PDF import fixtures')
