# STL Compressor Web

A pure frontend web application for viewing and compressing STL 3D files directly in the browser.

## Features

- **Drag & Drop** - Drop STL files anywhere on the screen
- **3D Viewer** - Interactive 3D view with orbit controls (rotate, zoom, pan)
- **Mesh Compression** - Reduce triangle count while preserving geometry
- **Batch Processing** - Load and process multiple files at once
- **Export** - Download compressed files as STL

## Usage

1. Open `index.html` in a modern web browser
2. Drag and drop STL files onto the page (or click to upload)
3. Adjust the simplification slider to reduce mesh density
4. Download the compressed files

## Tech Stack

- Pure HTML/CSS/JavaScript (no build step required)
- Three.js for 3D rendering
- Custom STL parser
- Mesh simplification algorithm

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
