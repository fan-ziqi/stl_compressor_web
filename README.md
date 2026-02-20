# STL Compressor Web

[![Version](https://img.shields.io/badge/version-v1.0.0-blue.svg)](https://github.com/fan-ziqi/stl_compressor_web)
[![License](https://img.shields.io/badge/license-Apache--2.0-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-web-orange.svg)](https://github.com/fan-ziqi/stl_compressor_web)

**STL Compressor Web** is a pure frontend web application for viewing and compressing STL 3D files directly in the browser. Built on top of [Three.js](https://threejs.org/), it provides an intuitive interface for visualizing and simplifying 3D meshes without any installation required. All processing happens locally in your browser - your files never leave your device.

## Key Features

- **Drag & Drop**: Drop STL files anywhere on the screen to instantly load them
- **3D Viewer**: Interactive 3D view with orbit controls (rotate, zoom, pan)
- **Mesh Compression**: Reduce triangle count while preserving geometry with adjustable quality slider
- **Batch Processing**: Load and process multiple files at once
- **Export**: Download compressed files as STL (binary format)
- **Theme Support**: Switch between light and dark modes

## Getting Started

Simply open `index.html` in a modern web browser:

1. Drag and drop STL files onto the page (or click to upload)
2. Adjust the simplification slider to reduce mesh density
3. Download the compressed files

No build step or server required - just open the HTML file directly in your browser.

## Tech Stack

- Pure HTML/CSS/JavaScript (no build step required)
- [Three.js](https://threejs.org/) for 3D rendering
- Custom STL parser (supports both ASCII and Binary formats)
- Mesh simplification algorithm based on quadric error metrics

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Author

Developed by [Ziqi Fan](https://github.com/fan-ziqi).
