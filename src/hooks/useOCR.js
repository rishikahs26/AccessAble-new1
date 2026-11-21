import { useState } from 'react';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const useOCR = (language = 'eng') => {
  const [loading, setLoading] = useState(false);

  // Render PDF pages to canvas
  // ocrScale=2 gives Tesseract a high-res image for better accuracy
  // exportScale=1 gives a 1:1 pixel image for accurate bbox → PDF coordinate mapping
  const renderPdfToCanvas = async (pdfFile, scale = 2) => {
    const buffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const pageCanvases = [];
    let totalHeight = 0;
    let maxWidth = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      pageCanvases.push(canvas);
      totalHeight += viewport.height;
      if (viewport.width > maxWidth) maxWidth = viewport.width;
    }

    // Stitch pages vertically
    const combined = document.createElement('canvas');
    combined.width = maxWidth;
    combined.height = totalHeight;
    const ctx = combined.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, maxWidth, totalHeight);
    let y = 0;
    for (const c of pageCanvases) {
      ctx.drawImage(c, 0, y);
      y += c.height;
    }

    return combined;
  };

  const getImageDimensions = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 800, height: 1131 });
      img.src = src;
    });

  const blobUrlToDataUrl = (blobUrl) =>
    new Promise((resolve, reject) => {
      fetch(blobUrl)
        .then(r => r.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });

  // Returns { text, lines, width, height, renderedImage }
  // width/height match the renderedImage dimensions exactly —
  // VoiceForm uses these to scale bbox coords → PDF mm coords
  const scanImage = async (file) => {
    if (!file) throw new Error('No file selected for OCR.');

    const isImage = file.type?.startsWith('image/');
    const isPdf   = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      throw new Error('Only image files (JPG, PNG, etc.) and PDF files are supported.');
    }

    setLoading(true);
    try {
      let ocrSource;      // high-res source fed to Tesseract
      let renderedImage;  // image embedded in output PDF (same canvas as OCR source)
      let width, height;

      if (isPdf) {
        // Render PDF pages to canvas at 2x scale for OCR accuracy
        const canvas = await renderPdfToCanvas(file, 2);
        ocrSource = canvas.toDataURL('image/png');
        renderedImage = ocrSource;
        width = canvas.width;
        height = canvas.height;
      } else {
        // For images: draw onto a canvas so we get a data URL usable by
        // both Tesseract AND jsPDF — no blob URL lifetime issues
        const blobUrl = URL.createObjectURL(file);
        const dims = await getImageDimensions(blobUrl);
        width = dims.width;
        height = dims.height;

        // Draw image onto canvas → data URL
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            canvas.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(blobUrl); // safe to revoke now — already drawn
            resolve();
          };
          img.onerror = reject;
          img.src = blobUrl;
        });
        ocrSource = canvas.toDataURL('image/png');
        renderedImage = ocrSource;
      }

      const { data } = await Tesseract.recognize(ocrSource, language, {
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      });

      const text  = data?.text?.trim() || '';
      let   lines = data?.lines || [];
      const words = data?.words  || [];

      // Build lines with REAL bboxes from the words array.
      // Tesseract words always have accurate bbox; data.lines bbox is often null/0.
      // Group words that share the same vertical position into lines.
      if (words.length > 0) {
        const lineGroups = [];
        words.forEach(word => {
          if (!word.text?.trim()) return;
          const wy0 = word.bbox.y0;
          const existing = lineGroups.find(lg => Math.abs(lg.y - wy0) < 14);
          if (existing) {
            existing.words.push(word);
            existing.bbox.x1 = Math.max(existing.bbox.x1, word.bbox.x1);
            existing.bbox.y0 = Math.min(existing.bbox.y0, word.bbox.y0);
            existing.bbox.y1 = Math.max(existing.bbox.y1, word.bbox.y1);
          } else {
            lineGroups.push({
              y: wy0,
              words: [word],
              bbox: { x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1 },
            });
          }
        });
        lineGroups.sort((a, b) => a.y - b.y);
        lines = lineGroups.map(lg => ({
          text: lg.words.map(w => w.text).join(' '),
          bbox: lg.bbox,
        }));
      } else if (lines.length === 0 && text.length > 0) {
        // Last resort fallback — no words, no lines
        lines = text.split('\n')
          .filter(t => t.trim().length > 0)
          .map((t, idx) => ({
            text: t,
            bbox: { x0: 20, y0: 40 + idx * 30, x1: 200, y1: 60 + idx * 30 },
          }));
      }

      return { text, lines, width, height, renderedImage };
    } finally {
      setLoading(false);
    }
  };

  return { scanImage, loading };
};
