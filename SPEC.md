# STL Tool - Pure Frontend Web Application

## 1. Project Overview

**Project Name:** STL Tool
**Project Type:** Single-page Web Application (Pure Frontend)
**Core Functionality:** A browser-based STL file viewer and compressor with additional 3D tools
**Target Users:** 3D printing enthusiasts, designers, engineers who need to view, compress, and manage STL files

## 2. UI/UX Specification

### Layout Structure

```
+--------------------------------------------------+
|  Header (Logo + Navigation)                     |
+--------------------------------------------------+
|  Toolbar (Upload, Compress, Tools, Settings)    |
+--------------------------------------------------+
|                    |                             |
|   File Sidebar     |     3D Viewer Canvas        |
|   (File List)      |                             |
|                    |                             |
|   200-280px        |     Remaining Width         |
|                    |                             |
+--------------------------------------------------+
|  Status Bar (File Info, Compression Ratio)       |
+--------------------------------------------------+
```

### Responsive Breakpoints
- **Desktop:** >= 1024px (sidebar visible, full toolbar)
- **Tablet:** 768px - 1023px (collapsible sidebar, compact toolbar)
- **Mobile:** < 768px (bottom sheet for files, floating action buttons)

### Visual Design

#### Color Palette
- **Background Primary:** #0a0a0f (deep dark)
- **Background Secondary:** #12121a (card background)
- **Background Tertiary:** #1a1a24 (hover states)
- **Accent Primary:** #00d4aa (teal/cyan - main actions)
- **Accent Secondary:** #7c3aed (purple - secondary actions)
- **Text Primary:** #f0f0f5 (headings, important text)
- **Text Secondary:** #8888a0 (body text, labels)
- **Text Muted:** #55556a (placeholders, hints)
- **Border:** #2a2a3a (subtle borders)
- **Success:** #22c55e
- **Warning:** #f59e0b
- **Error:** #ef4444

#### Typography
- **Font Family:** 'JetBrains Mono' for code/numbers, 'Outfit' for UI text
- **Heading 1:** 28px, 700 weight
- **Heading 2:** 20px, 600 weight
- **Heading 3:** 16px, 600 weight
- **Body:** 14px, 400 weight
- **Small:** 12px, 400 weight
- **Mono:** 13px (file sizes, triangle counts)

#### Spacing System
- **Base unit:** 4px
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px

#### Visual Effects
- **Border Radius:** 8px (cards), 6px (buttons), 4px (inputs)
- **Box Shadow:** 0 4px 24px rgba(0, 0, 0, 0.4)
- **Backdrop Blur:** 12px (modals, overlays)
- **Transitions:** 200ms ease-out (all interactions)

### Components

#### Header
- Logo: "STL Tool" with geometric icon
- Navigation tabs: Viewer | Compressor | Tools
- Dark theme (no toggle needed)

#### Toolbar
- **Upload Button:** Primary accent, icon + text "Add Files"
- **Compress Button:** Enabled when file selected
- **Dropdown Menu:** Export, Analyze, Merge, Split
- **View Controls:** Reset, Fit to screen, Wireframe toggle, Grid toggle

#### File Sidebar
- Drag & drop zone at top
- File list with:
  - Thumbnail preview (small 3D icon)
  - Filename (truncated with ellipsis)
  - File size (original → compressed)
  - Triangle count
  - Delete button (on hover)
- Empty state with illustration

#### 3D Viewer Canvas
- Full-size Three.js canvas
- Grid floor (subtle, toggleable)
- Axis helper (toggleable)
- Mouse controls: rotate, zoom, pan
- Touch gestures: pinch zoom, two-finger pan, rotate

#### Status Bar
- Current file info
- Total triangles
- Compression ratio (when applicable)
- Processing indicator

#### Modals
- **Compression Settings Modal:**
  - Quality slider (10% - 100%)
  - Target triangle count
  - Preserve boundaries option
  - Preview before/after
- **Export Modal:**
  - Format selection (STL, OBJ, GLB)
  - Binary/ASCII toggle
  - Download button

## 3. Functionality Specification

### Core Features

#### 1. File Upload
- Single file upload via button
- Multiple file upload via button
- Drag and drop anywhere on page
- Accept: .stl files only
- Max file size: 500MB per file
- Show upload progress

#### 2. STL Parsing
- Parse ASCII STL format
- Parse Binary STL format
- Extract: vertices, normals, triangle count
- Calculate bounding box
- Error handling for malformed files

#### 3. 3D Viewer
- Render STL mesh with Three.js
- Default material: matte gray with slight metallic
- Environment lighting (soft studio)
- Orbit controls (rotate, zoom, pan)
- Auto-fit camera to model
- Reset view button
- Wireframe mode toggle
- Grid display toggle

#### 4. STL Compression
- Mesh simplification algorithm (quadric error metrics approximation)
- Quality levels:
  - High (90%): Minimal reduction
  - Medium (50%): Balanced
  - Low (25%): Maximum reduction
- Custom percentage slider (10-100%)
- Show original vs compressed triangle count
- Show file size reduction percentage
- Preview before applying

#### 5. File Management
- List all loaded files
- Select file to view
- Delete individual files
- Clear all files
- Rename file

#### 6. Export Functions
- Export as STL (binary)
- Export as STL (ASCII)
- Export as OBJ (with normals)
- Export as GLB (compressed)
- Download single file
- Download all as ZIP

#### 7. Additional Tools
- **Analyze:** Show mesh statistics (volume estimate, surface area, dimensions)
- **Center:** Center model at origin
- **Scale:** Scale to fit specific dimensions
- **Merge:** Combine multiple STL files
- **Split:** Separate mesh into individual connected components

### User Interactions & Flows

1. **Upload Flow:**
   - Click "Add Files" or drag-drop → Files parsed → Appear in sidebar → First file auto-selected and displayed

2. **Compression Flow:**
   - Select file → Click "Compress" → Settings modal opens → Adjust quality → Preview → Click "Compress" → File updated with compression info

3. **Export Flow:**
   - Select file → Click "Export" → Choose format → Download starts

### Edge Cases
- Invalid STL file: Show error toast, skip file
- Very large files (>100MB): Show warning, process in chunks
- Zero triangles: Show error
- Overlapping files: Allow, append number

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme with teal accents renders correctly
- [ ] Responsive layout works on 320px - 2560px widths
- [ ] All buttons have hover/active states
- [ ] Loading states show during processing
- [ ] Empty states display when no files

### Functional Checkpoints
- [ ] Can upload single STL file
- [ ] Can upload multiple STL files
- [ ] Can drag and drop files
- [ ] 3D model displays correctly
- [ ] Can rotate/zoom/pan model
- [ ] Compression reduces triangle count
- [ ] Compression shows file size reduction
- [ ] Can export as STL binary
- [ ] Can export as STL ASCII
- [ ] Can export as OBJ
- [ ] File list shows all loaded files
- [ ] Can delete files from list
- [ ] Works on mobile (touch controls)

### Performance Targets
- Initial load: < 2 seconds
- File parse (1MB): < 1 second
- Compression (10k triangles): < 3 seconds
- 60fps during 3D interaction
