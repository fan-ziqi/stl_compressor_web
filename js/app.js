/**
 * STL Tool - Main Application
 */
class STLToolApp {
    constructor() {
        this.files = [];
        this.selectedFileId = null;
        this.viewer = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Initialize viewer
        const canvas = document.getElementById('viewerCanvas');
        this.viewer = new STLViewer(canvas);

        // Setup event listeners
        this.setupEventListeners();

        // Handle resize
        window.addEventListener('resize', () => this.viewer.handleResize());
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');

        // Click on empty area to upload
        const filesEmpty = document.getElementById('filesEmpty');
        if (filesEmpty) {
            filesEmpty.addEventListener('click', () => fileInput.click());
        }

        // Also click on entire app to upload when no files loaded
        const app = document.getElementById('app');
        app.addEventListener('click', (e) => {
            if (this.files.length === 0 && !e.target.closest('button') && !e.target.closest('input')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Download all button
        document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadAll());

        // Full-screen drag and drop handling
        this.setupDragAndDrop();
    }

    /**
     * Setup drag and drop for entire screen
     */
    setupDragAndDrop() {
        const dragOverlay = document.getElementById('dragOverlay');
        let dragCounter = 0;

        // Prevent default drag behaviors on window
        const preventDefault = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            window.addEventListener(eventName, preventDefault);
        });

        // Track drag enter/leave to show/hide overlay
        window.addEventListener('dragenter', (e) => {
            dragCounter++;
            // Only show overlay if dragging files
            if (e.dataTransfer.types.includes('Files')) {
                dragOverlay.classList.add('active');
            }
        });

        window.addEventListener('dragleave', (e) => {
            dragCounter--;
            // Hide overlay when leaving the window
            if (dragCounter === 0 || e.relatedTarget === null) {
                dragOverlay.classList.remove('active');
            }
        });

        window.addEventListener('dragover', (e) => {
            // Keep overlay visible while dragging
            if (e.dataTransfer.types.includes('Files')) {
                dragOverlay.classList.add('active');
            }
        });

        // Handle file drop
        window.addEventListener('drop', (e) => {
            dragCounter = 0;
            dragOverlay.classList.remove('active');

            if (e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // Global simplify slider
        const globalSlider = document.getElementById('globalSlider');
        const globalQualityValue = document.getElementById('globalQualityValue');

        globalSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            globalQualityValue.textContent = `${value}%`;
            this.applyGlobalSimplify(value);
        });

        // View controls
        document.getElementById('resetViewBtn').addEventListener('click', () => this.viewer.resetView());
        document.getElementById('wireframeBtn').addEventListener('click', (e) => {
            const isWireframe = this.viewer.toggleWireframe();
            e.currentTarget.classList.toggle('active', isWireframe);
        });
        document.getElementById('gridBtn').addEventListener('click', (e) => {
            const isGrid = this.viewer.toggleGrid();
            e.currentTarget.classList.toggle('active', isGrid);
        });
    }

    /**
     * Handle file selection
     */
    handleFileSelect(e) {
        this.handleFiles(e.target.files);
        e.target.value = '';
    }

    /**
     * Process uploaded files
     */
    async handleFiles(fileList) {
        const files = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.stl'));

        if (files.length === 0) {
            this.showToast('Please select valid STL files', 'error');
            return;
        }

        this.showLoading(true);

        let idCounter = Date.now();

        for (const file of files) {
            try {
                const buffer = await file.arrayBuffer();
                const meshData = STLParser.parse(buffer, file.name);

                const fileObj = {
                    id: ++idCounter,
                    name: file.name,
                    size: file.size,
                    meshData,
                    quality: 100
                };
                this.files.push(fileObj);
            } catch (error) {
                console.error('Error parsing file:', error);
                this.showToast(`Failed to parse ${file.name}`, 'error');
            }
        }

        // Select the first file if none selected
        if (this.files.length > 0) {
            if (!this.selectedFileId) {
                this.selectFile(this.files[0].id);
            } else {
                this.renderFileCards();
            }
        }

        this.showLoading(false);
        this.renderFileCards();
        this.updateUI();
    }

    /**
     * Render file cards
     */
    renderFileCards() {
        const fileCards = document.getElementById('fileCards');
        const filesEmpty = document.getElementById('filesEmpty');

        if (this.files.length === 0) {
            fileCards.innerHTML = '';
            if (filesEmpty) {
                fileCards.appendChild(filesEmpty);
                filesEmpty.style.display = 'flex';
            }
            return;
        }

        // Hide empty state and render file cards
        if (filesEmpty) {
            filesEmpty.style.display = 'none';
        }

        // Store filesEmpty outside before clearing
        const emptyElement = filesEmpty;

        fileCards.innerHTML = this.files.map(file => {
            const isSelected = file.id === this.selectedFileId;
            const sizeStr = this.formatFileSize(file.meshData.fileSize);
            const triStr = this.formatNumber(file.meshData.triangleCount);

            let compressionInfo = '';
            if (file.meshData.isCompressed) {
                compressionInfo = `<span><strong>${file.meshData.compressionRatio.toFixed(0)}%</strong> reduced</span>`;
            }

            return `
                <div class="file-card ${isSelected ? 'selected' : ''}" data-id="${file.id}">
                    <div class="file-card-header">
                        <div class="file-card-info">
                            <div class="file-card-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                    <path d="M2 17l10 5 10-5"/>
                                    <path d="M2 12l10 5 10-5"/>
                                </svg>
                            </div>
                            <div>
                                <div class="file-card-name" title="${file.name}">${file.name}</div>
                                <div class="file-card-meta">${sizeStr} · ${triStr} tri</div>
                            </div>
                        </div>
                        <div class="file-card-actions">
                            <button class="file-card-download" data-id="${file.id}" title="Download">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            </button>
                            <button class="file-card-delete" data-id="${file.id}" title="Delete">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="file-card-slider">
                        <div class="file-card-slider-header">
                            <span>Simplify</span>
                            <span class="value" id="quality-${file.id}">${file.quality}%</span>
                        </div>
                        <input type="range" class="file-slider" data-id="${file.id}" min="1" max="100" value="${file.quality}">
                    </div>
                    ${compressionInfo ? `<div class="file-card-status">${compressionInfo}</div>` : ''}
                </div>
            `;
        }).join('');

        // Add click handlers for cards
        fileCards.querySelectorAll('.file-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.file-card-delete') && !e.target.closest('.file-slider') && !e.target.closest('.file-card-download')) {
                    this.selectFile(parseFloat(card.dataset.id));
                }
            });
        });

        // Add delete handlers
        fileCards.querySelectorAll('.file-card-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFile(parseFloat(btn.dataset.id));
            });
        });

        // Add download handlers
        fileCards.querySelectorAll('.file-card-download').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.exportFile(parseFloat(btn.dataset.id));
            });
        });

        // Add slider handlers
        fileCards.querySelectorAll('.file-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const fileId = parseFloat(e.target.dataset.id);
                const file = this.files.find(f => f.id === fileId);
                if (file) {
                    file.quality = value;
                    document.getElementById(`quality-${fileId}`).textContent = `${value}%`;
                    this.applySimplifyToFile(file, value);
                }
            });
        });
    }

    /**
     * Select a file and display it
     */
    selectFile(id) {
        if (this.selectedFileId === id) {
            return;
        }

        this.selectedFileId = id;
        const file = this.files.find(f => f.id === id);

        if (file) {
            this.viewer.loadMesh(file.meshData);
            document.getElementById('viewerEmpty').classList.add('hidden');
            this.updateStatusBar(file);
        }

        this.renderFileCards();
        this.updateUI();
    }

    /**
     * Delete a file
     */
    deleteFile(id) {
        const index = this.files.findIndex(f => f.id === id);
        if (index === -1) return;

        this.files.splice(index, 1);

        // If deleted file was selected, select another
        if (this.selectedFileId === id) {
            if (this.files.length > 0) {
                this.selectFile(this.files[0].id);
            } else {
                this.selectedFileId = null;
                this.viewer.clear();
                document.getElementById('viewerEmpty').classList.remove('hidden');
                this.updateStatusBar(null);
            }
        }

        this.renderFileCards();
        this.updateUI();
    }

    /**
     * Apply simplify to a specific file
     */
    applySimplifyToFile(file, quality) {
        try {
            const simplified = MeshCompressor.compress(
                file.meshData,
                quality,
                {}
            );

            file.meshData = simplified;

            // Update viewer if this is the selected file
            if (file.id === this.selectedFileId) {
                this.viewer.loadMesh(file.meshData, false);
                this.updateStatusBar(file);
            }

            // Update compression info display without re-rendering entire list
            this.updateFileCardCompression(file);
        } catch (err) {
            console.error('Simplify error:', err);
        }
    }

    /**
     * Update file card compression info
     */
    updateFileCardCompression(file) {
        const card = document.querySelector(`.file-card[data-id="${file.id}"]`);
        if (!card) return;

        // Update quality value
        const qualityEl = document.getElementById(`quality-${file.id}`);
        if (qualityEl) {
            qualityEl.textContent = `${file.quality}%`;
        }

        // Update slider position
        const sliderEl = card.querySelector('.file-slider');
        if (sliderEl) {
            sliderEl.value = file.quality;
        }

        // Update compression info
        let statusEl = card.querySelector('.file-card-status');
        if (file.meshData.isCompressed) {
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.className = 'file-card-status';
                card.appendChild(statusEl);
            }
            statusEl.innerHTML = `<span><strong>${file.meshData.compressionRatio.toFixed(0)}%</strong> reduced</span>`;
        } else if (statusEl) {
            statusEl.remove();
        }
    }

    /**
     * Apply global simplify to all files
     */
    applyGlobalSimplify(quality) {
        const globalSlider = document.getElementById('globalSlider');
        globalSlider.value = quality;

        // Update all files
        this.files.forEach(file => {
            file.quality = quality;
            this.applySimplifyToFile(file, quality);
        });
    }

    /**
     * Update UI state
     */
    updateUI() {
        const hasFiles = this.files.length > 0;
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const globalSimplify = document.querySelector('.global-simplify');

        downloadAllBtn.disabled = !hasFiles;

        // Show/hide global simplify based on file count
        if (globalSimplify) {
            globalSimplify.style.display = hasFiles ? 'block' : 'none';
        }
    }

    /**
     * Update status bar
     */
    updateStatusBar(file) {
        if (!file) {
            return;
        }
        // Status is shown in file cards now
    }

    /**
     * Show/hide loading
     */
    showLoading(show) {
        document.getElementById('viewerOverlay').classList.toggle('visible', show);
    }

    /**
     * Export current file (or specific file by id)
     */
    exportFile(fileId) {
        const file = fileId ? this.files.find(f => f.id === fileId) : this.files.find(f => f.id === this.selectedFileId);
        if (!file) {
            this.showToast('No file selected', 'error');
            return;
        }

        const blob = new Blob([STLParser.toBinarySTL(file.meshData)], { type: 'application/octet-stream' });
        const filename = file.name;

        this.downloadBlob(blob, filename);
        this.showToast(`Downloaded ${filename}`, 'success');
    }

    /**
     * Download all files as ZIP
     */
    downloadAll() {
        if (this.files.length === 0) {
            this.showToast('No files to download', 'error');
            return;
        }

        if (this.files.length === 1) {
            this.exportFile(this.files[0].id);
            return;
        }

        const zip = new JSZip();

        this.files.forEach(file => {
            const data = STLParser.toBinarySTL(file.meshData);
            zip.file(file.name, data);
        });

        zip.generateAsync({ type: 'blob' }).then(blob => {
            this.downloadBlob(blob, 'stl-files.zip');
            this.showToast('Downloaded all files', 'success');
        });
    }

    /**
     * Download blob
     */
    downloadBlob(blob, filename) {
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
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.success}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new STLToolApp();
});
