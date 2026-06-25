"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type DownloadSummaryButtonProps = {
  fileName: string;
  title: string;
  summary: string;
};

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const TITLE_FONT_SIZE = 20;
const BODY_FONT_SIZE = 11;
const LINE_HEIGHT = 16;
const MAX_CHARS_PER_LINE = 78;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim() || "summary";
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxCharsPerLine: number) {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (nextLine.length <= maxCharsPerLine) {
        currentLine = nextLine;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      if (word.length <= maxCharsPerLine) {
        currentLine = word;
        continue;
      }

      for (let index = 0; index < word.length; index += maxCharsPerLine) {
        const chunk = word.slice(index, index + maxCharsPerLine);
        if (chunk.length === maxCharsPerLine) {
          lines.push(chunk);
        } else {
          currentLine = chunk;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function buildPdfContent(title: string, summary: string) {
  const lines = wrapText(summary, MAX_CHARS_PER_LINE);
  const contentStreams: string[] = [];
  const usableHeight = PDF_PAGE_HEIGHT - MARGIN * 2;
  const maxBodyLinesPerPage = Math.floor((usableHeight - 52) / LINE_HEIGHT);

  let currentPageLines: string[] = [];

  for (const line of lines) {
    currentPageLines.push(line);

    if (currentPageLines.length === maxBodyLinesPerPage) {
      contentStreams.push(renderPage(title, currentPageLines));
      currentPageLines = [];
    }
  }

  if (currentPageLines.length === 0) {
    currentPageLines.push(" ");
  }

  contentStreams.push(renderPage(title, currentPageLines));
  return contentStreams;
}

function renderPage(title: string, lines: string[]) {
  const headerY = PDF_PAGE_HEIGHT - MARGIN;
  const bodyStartY = headerY - 38;
  const commands = [
    "BT",
    "/F1 20 Tf",
    `1 0 0 1 ${MARGIN} ${headerY} Tm`,
    `(${escapePdfText(title)}) Tj`,
    "ET",
    "BT",
    "/F1 11 Tf",
  ];

  lines.forEach((line, index) => {
    const y = bodyStartY - index * LINE_HEIGHT;
    commands.push(`1 0 0 1 ${MARGIN} ${y} Tm`);
    commands.push(`(${escapePdfText(line || " ")}) Tj`);
  });

  commands.push("ET");
  return commands.join("\n");
}

function createPdfBlob(title: string, summary: string) {
  const pageStreams = buildPdfContent(title, summary);
  const objects: string[] = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  const pageObjectNumbers = pageStreams.map((_, index) => 4 + index * 2);
  const pagesKids = pageObjectNumbers.map((num) => `${num} 0 R`).join(" ");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pagesKids}] /Count ${pageStreams.length} >>\nendobj`
  );

  objects.push(
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
  );

  pageStreams.forEach((stream, index) => {
    const pageObjectNumber = 4 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;

    objects.push(
      `${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\nendobj`
    );

    objects.push(
      `${contentObjectNumber} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`
    );
  });

  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${object}\n`;
  });

  const xrefStart = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index++) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([encoder.encode(pdf)], { type: "application/pdf" });
}

export default function DownloadSummaryButton({
  fileName,
  title,
  summary,
}: DownloadSummaryButtonProps) {
  const handleDownload = () => {
    const pdfBlob = createPdfBlob(title, summary);
    const objectUrl = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = `${sanitizeFileName(fileName)}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDownload}
      className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
    >
      <Download className="h-4 w-4" />
      Download PDF
    </Button>
  );
}
