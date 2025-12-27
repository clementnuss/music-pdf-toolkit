/**
 * Main application logic
 */

import { loadPDF } from './pdf-processor.js';
import { analyzePDF, generateSplitPDFs } from './pdf-splitter.js';

// State
let currentPDF = null;
let currentFile = null;
let detectedSplits = [];
let generatedPDFs = [];

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processing = document.getElementById('processing');
const previewSection = document.getElementById('previewSection');
const splitsList = document.getElementById('splitsList');
const stats = document.getElementById('stats');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const errorMessage = document.getElementById('errorMessage');
const baseFilenameInput = document.getElementById('baseFilename');

// Setup event listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
downloadAllBtn.addEventListener('click', downloadAll);
baseFilenameInput.addEventListener('change', handleFilenameChange);

/**
 * Handle file selection
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    await processPDF(file);
  }
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
function handleDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove('dragover');

  const file = event.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    fileInput.files = event.dataTransfer.files;
    processPDF(file);
  }
}

/**
 * Process the uploaded PDF
 */
async function processPDF(file) {
  try {
    // Reset state
    hideError();
    previewSection.classList.remove('active');
    processing.classList.add('active');

    currentFile = file;

    // Load PDF
    currentPDF = await loadPDF(file);

    // Analyze and detect instruments
    detectedSplits = await analyzePDF(currentPDF);

    // Generate split PDFs
    generatedPDFs = await generateSplitPDFs(file, detectedSplits);

    // Set default base filename (from original file)
    const defaultFilename = file.name.replace(/\.pdf$/i, '');
    baseFilenameInput.value = defaultFilename;

    // Show preview
    displayPreview();

    processing.classList.remove('active');
    previewSection.classList.add('active');

  } catch (error) {
    console.error('Error processing PDF:', error);
    processing.classList.remove('active');
    showError('Failed to process PDF: ' + error.message);
  }
}

/**
 * Display preview of detected splits
 */
function displayPreview() {
  // Update stats
  stats.innerHTML = `
    Found <strong>${detectedSplits.length}</strong> instrument parts in
    <strong>${currentPDF.numPages}</strong> pages
  `;

  // Clear previous splits
  splitsList.innerHTML = '';

  // Display each split
  detectedSplits.forEach((split, index) => {
    const splitItem = document.createElement('div');
    splitItem.className = 'split-item';

    const pageRange = split.startPage === split.endPage
      ? `Page ${split.startPage}`
      : `Pages ${split.startPage}-${split.endPage}`;

    const pageCount = split.pages.length;
    const pageLabel = pageCount === 1 ? 'page' : 'pages';

    const isFirst = index === 0;
    const isLast = index === detectedSplits.length - 1;

    splitItem.innerHTML = `
      <div class="split-info">
        <div class="split-instrument">
          <input
            type="text"
            value="${split.instrument}"
            data-split-index="${index}"
            placeholder="Instrument name"
          />
        </div>
        <div class="split-pages">${pageRange} (${pageCount} ${pageLabel})</div>
      </div>
      <div class="split-actions">
        <button
          class="btn-small btn-merge"
          onclick="window.mergeWithPrevious(${index})"
          ${isFirst ? 'disabled' : ''}
          title="Merge with previous split"
        >
          ↑ Merge Up
        </button>
        <button
          class="btn-small btn-merge"
          onclick="window.mergeWithNext(${index})"
          ${isLast ? 'disabled' : ''}
          title="Merge with next split"
        >
          ↓ Merge Down
        </button>
        <button class="btn-small btn-secondary" onclick="window.downloadSingle(${index})">
          Download
        </button>
      </div>
    `;

    splitsList.appendChild(splitItem);
  });

  // Add event listeners for input changes
  const inputs = splitsList.querySelectorAll('input[data-split-index]');
  inputs.forEach(input => {
    input.addEventListener('change', handleInstrumentNameChange);
  });
}

/**
 * Handle instrument name change
 */
function handleInstrumentNameChange(event) {
  const index = parseInt(event.target.dataset.splitIndex);
  const newName = event.target.value.trim();

  if (newName) {
    // Update the split
    detectedSplits[index].instrument = newName;

    // Regenerate the PDF with new name
    regeneratePDFForSplit(index);
  }
}

/**
 * Handle base filename change
 */
async function handleFilenameChange() {
  // Regenerate all PDFs with new base filename
  for (let i = 0; i < detectedSplits.length; i++) {
    await regeneratePDFForSplit(i);
  }
}

/**
 * Regenerate a single split PDF with updated instrument name
 */
async function regeneratePDFForSplit(index) {
  try {
    const split = detectedSplits[index];
    const arrayBuffer = await currentFile.arrayBuffer();
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(
      pdfDoc,
      split.pages.map(p => p - 1)
    );

    copiedPages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    const baseFilename = baseFilenameInput.value.trim() || currentFile.name.replace(/\.pdf$/i, '');
    const filename = generateFilename(baseFilename, split.instrument);

    // Update the generated PDF
    generatedPDFs[index] = {
      filename,
      blob,
      split
    };
  } catch (error) {
    console.error('Error regenerating PDF:', error);
  }
}

/**
 * Generate filename from base and instrument name
 */
function generateFilename(base, instrument) {
  // Sanitize but preserve some capitalization
  const sanitized = instrument
    .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');     // Collapse multiple hyphens

  return `${base}-${sanitized}.pdf`;
}

/**
 * Merge split with previous split
 */
window.mergeWithPrevious = async function(index) {
  if (index === 0) return;

  const currentSplit = detectedSplits[index];
  const previousSplit = detectedSplits[index - 1];

  // Combine pages - keep the previous split's name (the upper one)
  previousSplit.pages = [...previousSplit.pages, ...currentSplit.pages];
  previousSplit.endPage = currentSplit.endPage;

  // Remove current split
  detectedSplits.splice(index, 1);
  generatedPDFs.splice(index, 1);

  // Regenerate the merged PDF
  await regeneratePDFForSplit(index - 1);

  // Refresh display
  displayPreview();
};

/**
 * Merge split with next split
 */
window.mergeWithNext = async function(index) {
  if (index === detectedSplits.length - 1) return;

  const currentSplit = detectedSplits[index];
  const nextSplit = detectedSplits[index + 1];

  // Combine pages - keep the next split's name (the lower one)
  currentSplit.pages = [...currentSplit.pages, ...nextSplit.pages];
  currentSplit.endPage = nextSplit.endPage;
  currentSplit.instrument = nextSplit.instrument;

  // Remove next split
  detectedSplits.splice(index + 1, 1);
  generatedPDFs.splice(index + 1, 1);

  // Regenerate the merged PDF
  await regeneratePDFForSplit(index);

  // Refresh display
  displayPreview();
};

/**
 * Download a single split PDF
 */
window.downloadSingle = function(index) {
  const pdf = generatedPDFs[index];
  downloadFile(pdf.blob, pdf.filename);
};

/**
 * Download all split PDFs
 */
async function downloadAll() {
  for (const pdf of generatedPDFs) {
    downloadFile(pdf.blob, pdf.filename);
    // Small delay to avoid browser blocking multiple downloads
    await new Promise(resolve => setTimeout(resolve, 100));
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
