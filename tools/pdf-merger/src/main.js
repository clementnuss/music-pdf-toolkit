/**
 * PDF Merger - Main application logic
 */

import { PDFDocument } from 'pdf-lib';

// State
let commonPDF = null;
let commonFileName = '';
let partsPDFs = [];
let mergedPDFs = [];

// DOM elements
const commonUploadArea = document.getElementById('commonUploadArea');
const commonFileInput = document.getElementById('commonFileInput');
const commonFileInfo = document.getElementById('commonFileInfo');
const partsUploadArea = document.getElementById('partsUploadArea');
const partsFileInput = document.getElementById('partsFileInput');
const processing = document.getElementById('processing');
const previewSection = document.getElementById('previewSection');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const errorMessage = document.getElementById('errorMessage');

// Setup event listeners for common PDF
commonUploadArea.addEventListener('click', () => commonFileInput.click());
commonUploadArea.addEventListener('dragover', (e) => handleDragOver(e, commonUploadArea));
commonUploadArea.addEventListener('dragleave', (e) => handleDragLeave(e, commonUploadArea));
commonUploadArea.addEventListener('drop', (e) => handleCommonDrop(e));
commonFileInput.addEventListener('change', handleCommonFileSelect);

// Setup event listeners for parts PDFs
partsUploadArea.addEventListener('click', () => partsFileInput.click());
partsUploadArea.addEventListener('dragover', (e) => handleDragOver(e, partsUploadArea));
partsUploadArea.addEventListener('dragleave', (e) => handleDragLeave(e, partsUploadArea));
partsUploadArea.addEventListener('drop', (e) => handlePartsDrop(e));
partsFileInput.addEventListener('change', handlePartsFileSelect);

// Download buttons
downloadAllBtn.addEventListener('click', downloadAll);
downloadZipBtn.addEventListener('click', downloadAllAsZip);

/**
 * Handle drag over
 */
function handleDragOver(event, area) {
  event.preventDefault();
  area.classList.add('dragover');
}

/**
 * Handle drag leave
 */
function handleDragLeave(event, area) {
  event.preventDefault();
  area.classList.remove('dragover');
}

/**
 * Handle common PDF file selection
 */
async function handleCommonFileSelect(event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    await loadCommonPDF(file);
  }
}

/**
 * Handle common PDF drop
 */
async function handleCommonDrop(event) {
  event.preventDefault();
  commonUploadArea.classList.remove('dragover');

  const file = event.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    commonFileInput.files = event.dataTransfer.files;
    await loadCommonPDF(file);
  }
}

/**
 * Load common PDF
 */
async function loadCommonPDF(file) {
  try {
    hideError();
    const arrayBuffer = await file.arrayBuffer();
    commonPDF = await PDFDocument.load(arrayBuffer);
    commonFileName = file.name;

    // Update UI
    commonUploadArea.classList.add('has-file');
    commonFileInfo.style.display = 'block';
    commonFileInfo.innerHTML = `<strong>✓ Loaded:</strong> ${file.name} (${commonPDF.getPageCount()} page${commonPDF.getPageCount() > 1 ? 's' : ''})`;

    // If parts are already loaded, trigger merge
    if (partsPDFs.length > 0) {
      await processMerge();
    }
  } catch (error) {
    console.error('Error loading common PDF:', error);
    showError('Failed to load common PDF: ' + error.message);
  }
}

/**
 * Handle parts files selection
 */
async function handlePartsFileSelect(event) {
  const files = Array.from(event.target.files);
  await loadPartsPDFs(files);
}

/**
 * Handle parts drop
 */
async function handlePartsDrop(event) {
  event.preventDefault();
  partsUploadArea.classList.remove('dragover');

  const files = Array.from(event.dataTransfer.files);
  await loadPartsPDFs(files);
}

/**
 * Load parts PDFs (can be PDFs or ZIP)
 */
async function loadPartsPDFs(files) {
  try {
    hideError();
    partsPDFs = [];

    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        // Handle ZIP file
        const pdfFiles = await extractPDFsFromZip(file);
        for (const pdfFile of pdfFiles) {
          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          partsPDFs.push({
            name: pdfFile.name,
            pdfDoc: pdfDoc
          });
        }
      } else if (file.type === 'application/pdf') {
        // Handle PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        partsPDFs.push({
          name: file.name,
          pdfDoc: pdfDoc
        });
      }
    }

    if (partsPDFs.length === 0) {
      throw new Error('No PDF files found');
    }

    // Update UI
    partsUploadArea.classList.add('has-file');
    partsUploadArea.querySelector('p').innerHTML = `<strong>✓ Loaded ${partsPDFs.length} PDF${partsPDFs.length > 1 ? 's' : ''}</strong>`;

    // If common PDF is already loaded, trigger merge
    if (commonPDF) {
      await processMerge();
    }

  } catch (error) {
    console.error('Error loading parts PDFs:', error);
    showError('Failed to load parts PDFs: ' + error.message);
  }
}

/**
 * Extract PDF files from ZIP
 */
async function extractPDFsFromZip(zipFile) {
  const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;

  const zip = await JSZip.loadAsync(zipFile);
  const pdfFiles = [];

  for (const [filename, file] of Object.entries(zip.files)) {
    if (!file.dir && filename.endsWith('.pdf')) {
      const blob = await file.async('blob');
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });
      pdfFiles.push(pdfFile);
    }
  }

  return pdfFiles;
}

/**
 * Process the merge
 */
async function processMerge() {
  try {
    previewSection.classList.remove('active');
    processing.classList.add('active');

    mergedPDFs = [];

    for (const part of partsPDFs) {
      // Create a new PDF
      const mergedPdf = await PDFDocument.create();

      // Copy all pages from the common PDF
      const commonPages = await mergedPdf.copyPages(commonPDF, commonPDF.getPageIndices());
      commonPages.forEach(page => mergedPdf.addPage(page));

      // Copy all pages from the part PDF
      const partPages = await mergedPdf.copyPages(part.pdfDoc, part.pdfDoc.getPageIndices());
      partPages.forEach(page => mergedPdf.addPage(page));

      // Save the merged PDF
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      // Generate filename
      const baseName = part.name.replace(/\.pdf$/i, '');
      const filename = `${baseName}-merged.pdf`;

      mergedPDFs.push({
        filename: filename,
        blob: blob
      });
    }

    // Update UI
    document.getElementById('mergedCount').textContent = mergedPDFs.length;
    processing.classList.remove('active');
    previewSection.classList.add('active');

  } catch (error) {
    console.error('Error merging PDFs:', error);
    processing.classList.remove('active');
    showError('Failed to merge PDFs: ' + error.message);
  }
}

/**
 * Download all merged PDFs
 */
async function downloadAll() {
  for (const pdf of mergedPDFs) {
    downloadFile(pdf.blob, pdf.filename);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Download all merged PDFs as ZIP
 */
async function downloadAllAsZip() {
  try {
    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    const zip = new JSZip();

    for (const pdf of mergedPDFs) {
      zip.file(pdf.filename, pdf.blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadFile(zipBlob, 'merged-pdfs.zip');
  } catch (error) {
    console.error('Error creating ZIP:', error);
    showError('Failed to create ZIP file: ' + error.message);
  }
}

/**
 * Trigger file download
 */
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
}

/**
 * Hide error message
 */
function hideError() {
  errorMessage.classList.remove('active');
}
