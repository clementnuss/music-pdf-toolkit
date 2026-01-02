/**
 * PDF Assembler - Main application logic
 */

import { PDFDocument } from 'pdf-lib';

// State
let uploadedPDFs = []; // [{name, pdfDoc, pageCount, replicas}]

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processing = document.getElementById('processing');
const previewSection = document.getElementById('previewSection');
const pdfList = document.getElementById('pdfList');
const assembleBtn = document.getElementById('assembleBtn');
const errorMessage = document.getElementById('errorMessage');
const totalPages = document.getElementById('totalPages');

// Setup event listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
assembleBtn.addEventListener('click', assemblePDF);

/**
 * Handle file selection
 */
async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  await processFiles(files);
}

/**
 * Handle drag over
 */
function handleDragOver(event) {
  event.preventDefault();
  uploadArea.classList.add('dragover');
}

/**
 * Handle drag leave
 */
function handleDragLeave(event) {
  event.preventDefault();
  uploadArea.classList.remove('dragover');
}

/**
 * Handle file drop
 */
async function handleDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove('dragover');

  const files = Array.from(event.dataTransfer.files);
  await processFiles(files);
}

/**
 * Process uploaded files (PDFs or ZIP)
 */
async function processFiles(files) {
  try {
    hideError();
    previewSection.classList.remove('active');
    processing.classList.add('active');

    uploadedPDFs = [];

    for (const file of files) {
      if (file.name.endsWith('.zip')) {
        // Handle ZIP file
        const pdfFiles = await extractPDFsFromZip(file);
        for (const pdfFile of pdfFiles) {
          await processPDF(pdfFile);
        }
      } else if (file.type === 'application/pdf') {
        // Handle PDF file
        await processPDF(file);
      }
    }

    if (uploadedPDFs.length === 0) {
      throw new Error('No PDF files found');
    }

    // Sort PDFs alphabetically by name
    uploadedPDFs.sort((a, b) => a.name.localeCompare(b.name));

    displayPreview();

    processing.classList.remove('active');
    previewSection.classList.add('active');

  } catch (error) {
    console.error('Error processing files:', error);
    processing.classList.remove('active');
    showError('Failed to process files: ' + error.message);
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
 * Process a single PDF file
 */
async function processPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  uploadedPDFs.push({
    name: file.name,
    pdfDoc: pdfDoc,
    pageCount: pdfDoc.getPageCount(),
    replicas: 1 // Default to 1 replica
  });
}

/**
 * Display preview of all PDFs with replica controls
 */
function displayPreview() {
  pdfList.innerHTML = '';

  uploadedPDFs.forEach((pdf, index) => {
    const pdfItem = document.createElement('div');
    pdfItem.className = 'pdf-item';

    pdfItem.innerHTML = `
      <div class="pdf-info">
        <div class="pdf-name">${pdf.name}</div>
        <div class="pdf-pages">(${pdf.pageCount} page${pdf.pageCount > 1 ? 's' : ''})</div>
      </div>
      <div class="replica-control">
        <label>Copies:</label>
        <input
          type="number"
          min="0"
          max="99"
          value="1"
          data-index="${index}"
          onchange="window.updateReplicas(${index}, this.value)"
        />
      </div>
    `;

    pdfList.appendChild(pdfItem);
  });

  updateTotalPages();
}

/**
 * Update replica count for a PDF
 */
window.updateReplicas = function(index, value) {
  const replicas = parseInt(value) || 0;
  uploadedPDFs[index].replicas = Math.max(0, Math.min(99, replicas));
  updateTotalPages();
};

/**
 * Update total page count display
 */
function updateTotalPages() {
  const total = uploadedPDFs.reduce((sum, pdf) => {
    return sum + (pdf.pageCount * pdf.replicas);
  }, 0);

  totalPages.textContent = `Total: ${total} page${total !== 1 ? 's' : ''}`;
}

/**
 * Assemble all PDFs into one master PDF
 */
async function assemblePDF() {
  try {
    processing.classList.add('active');
    document.querySelector('#processing p').textContent = 'Assembling PDFs...';

    // Create new PDF document
    const masterPdf = await PDFDocument.create();

    // Add each PDF the specified number of times
    for (const pdf of uploadedPDFs) {
      for (let i = 0; i < pdf.replicas; i++) {
        // Copy all pages from this PDF
        const pages = await masterPdf.copyPages(pdf.pdfDoc, pdf.pdfDoc.getPageIndices());
        pages.forEach(page => masterPdf.addPage(page));
      }
    }

    // Save the master PDF
    const pdfBytes = await masterPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    // Download the file
    const filename = 'assembled-parts.pdf';
    downloadFile(blob, filename);

    processing.classList.remove('active');

  } catch (error) {
    console.error('Error assembling PDF:', error);
    processing.classList.remove('active');
    showError('Failed to assemble PDF: ' + error.message);
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
