# Music PDF Toolkit - Development Notes

## Project Overview

A browser-based toolkit for splitting brass band sheet music PDFs by instrument. Built collaboratively with Claude (Sonnet 4.5) in December 2024.

## Version 0.1 - Initial Release

### Key Features Implemented

1. **Automatic Instrument Detection**
   - Extracts text from top region of each PDF page
   - Detects instrument names using keyword matching and fuzzy search
   - Handles both left-aligned and centered instrument names
   - Supports standard brass band instruments (cornets, horns, trombones, euphoniums, basses, percussion)

2. **OCR Error Correction**
   - Automatically corrects common OCR errors: "ist" → "1st", "lst" → "1st", "znd" → "2nd"
   - Handles punctuation attached to instrument names (e.g., "Cornet!")
   - Normalizes multiple consecutive whitespaces

3. **Smart Text Extraction**
   - Uses absolute threshold (100 units from top) instead of percentage-based
   - Groups text items by Y-coordinate with 5-unit tolerance for same-line detection
   - Prioritizes instrument keywords when multiple text items exist
   - Stops extraction at punctuation to avoid capturing musical notation

4. **Manual Editing Capabilities**
   - Editable instrument names in preview
   - Editable base filename for output PDFs
   - Merge splits up or down with appropriate name retention
   - Real-time PDF regeneration on changes

5. **User Interface**
   - Drag-and-drop or click to upload PDF
   - Preview of all detected splits with page ranges
   - Individual download per instrument
   - Download all splits at once
   - Clean, modern design with visual feedback

### Technical Architecture

**Frontend Stack:**
- Vanilla JavaScript (ES6 modules)
- PDF.js for PDF parsing and text extraction
- pdf-lib for PDF manipulation and generation
- Fuse.js for fuzzy string matching
- Vite for development and building

**Core Modules:**
- `pdf-processor.js` - PDF loading, text extraction, coordinate handling
- `instrument-detector.js` - Instrument name detection and normalization
- `pdf-splitter.js` - Split analysis and PDF generation logic
- `instruments.js` - Brass band instrument definitions
- `main.js` - UI orchestration and state management

### Key Technical Challenges Solved

1. **Coordinate System Handling**
   - PDF.js Y-coordinates are measured from bottom of page
   - After margin trimming (via sejda.com), text coordinates can extend beyond viewport
   - Solution: Use actual text coordinate range instead of viewport dimensions

2. **Instrument Name Positioning**
   - First pages: Instrument names typically left-aligned with "Written for..." text
   - Continuation pages: Instrument names often centered
   - Solution: Search for instrument keywords across full width, not just left side

3. **OCR Inconsistencies**
   - Scanned PDFs processed with OCRmyPDF/Tesseract contain errors
   - Numbers read as letters ("1st" → "ist", "1st" → "lst")
   - Punctuation baked into words ("Cornet!")
   - Solution: Pattern-based correction and punctuation stripping

4. **Variable Text Layouts**
   - Some pages: "1st Euphonium Written for..."
   - Others: "Written for... Championships 2nd Cornet Better..."
   - Solution: Dual-pattern matching with fallback strategies

### File Naming Convention

Generated PDFs follow the pattern: `[base-filename]-[instrument-name].pdf`

Example: `Better-1st-Euphonium.pdf`, `Better-Solo-Cornet-I.pdf`

Capitalization is preserved, special characters removed, spaces converted to hyphens.

### Known Limitations

1. **No OCR Fallback Yet**
   - Currently relies on existing text layer in PDFs
   - Scanned PDFs without OCR won't work
   - Future: Add Tesseract.js for client-side OCR

2. **Fixed Instrument List**
   - Limited to predefined brass band instruments
   - Future: Allow custom instrument lists

3. **Manual Page Range Editing Not Supported**
   - Can only merge splits, not split them or adjust boundaries
   - Future: Add drag-and-drop page reordering

4. **Single File Processing**
   - Can only process one PDF at a time
   - Future: Batch processing support

### Browser Compatibility

- Modern browsers with ES6 module support
- Tested on Chrome/Edge (Chromium-based)
- Requires support for: FileReader API, Canvas API, Web Workers (for PDF.js)

### Development Workflow

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Testing Approach

Tested with real brass band scores:
- "Better" by Liam Shortall (48 pages)
- Various OCR qualities and layouts
- Margin-trimmed PDFs from sejda.com
- Mixed left-aligned and centered instrument names

### Future Enhancements

Priority order based on user needs:

1. **OCR Support** - Tesseract.js integration for scanned PDFs
2. **Manual Split Editing** - Adjust page ranges, split/merge with more control
3. **Page Thumbnails** - Visual preview of each page in splits
4. **ZIP Export** - Download all splits as single archive
5. **Batch Processing** - Process multiple PDFs in sequence
6. **Custom Instrument Lists** - User-defined instrument names
7. **Split Configuration Save/Load** - Remember and reuse split patterns
8. **Auto-rotation Detection** - Handle landscape vs portrait pages

### Lessons Learned

1. **PDF Coordinate Systems Are Tricky**
   - Always check actual text coordinates vs viewport
   - Use absolute thresholds when dealing with variable content density

2. **OCR Errors Are Predictable**
   - Pattern-based correction works well for common digit/letter confusions
   - Stripping punctuation before keyword matching improves reliability

3. **User Feedback Is Essential**
   - Preview with manual editing caught many edge cases
   - Merge functionality much more useful than expected

4. **Browser-Based Processing Works Well**
   - No server needed = better privacy and lower latency
   - PDF.js and pdf-lib are mature and reliable
   - File size limits haven't been an issue (<10MB typical)

### Credits

- **Development**: Claude (Anthropic Sonnet 4.5) + Human collaboration
- **Libraries**: PDF.js (Mozilla), pdf-lib, Fuse.js
- **Test Data**: "Better" by Liam Shortall, arranged by Daniel Hall

---

*Last updated: December 27, 2024*
*Version: 0.1.0*
