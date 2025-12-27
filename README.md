# Music PDF Toolkit

A browser-based toolkit for splitting brass band sheet music PDFs by instrument.

## Features

- **Automatic instrument detection** - Identifies instrument names in PDF pages using text extraction and fuzzy matching
- **Smart splitting** - Groups consecutive pages by instrument
- **Preview before download** - Review detected splits and page ranges
- **Browser-based** - No server required, runs entirely in your browser
- **Privacy-focused** - Files never leave your computer

## How it works

1. Upload a PDF containing multiple brass band parts
2. The tool analyzes each page, looking for instrument names in the top-left corner
3. Pages are grouped by instrument until a new instrument is detected
4. Preview the detected splits with page ranges
5. **Edit instrument names** if OCR detection was incorrect
6. Download individual PDFs or all at once

## Supported Instruments

The tool recognizes standard brass band instruments including:
- Cornets (Soprano, Solo, Repiano, 2nd, 3rd)
- Horns (Solo Horn, Tenor Horn, 1st/2nd Horn)
- Baritones
- Trombones
- Euphoniums
- Basses (Eb, BBb, Tuba)
- Percussion
- And more...

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the app at http://localhost:3000

### Build

```bash
npm run build
```

Builds for production to the `dist/` folder.

## Technology Stack

- **PDF.js** - PDF parsing and text extraction
- **pdf-lib** - PDF manipulation and generation
- **Fuse.js** - Fuzzy string matching for instrument detection
- **Vite** - Build tool and dev server

## Future Enhancements

- [ ] OCR fallback for scanned PDFs (Tesseract.js)
- [x] Manual instrument name editing
- [ ] Manual split editing (adjust page ranges, merge/split sections)
- [ ] Page thumbnails in preview
- [ ] Batch processing multiple PDFs
- [ ] Custom instrument lists
- [ ] Save/load split configurations
- [ ] Export all as ZIP file

## License

MIT
