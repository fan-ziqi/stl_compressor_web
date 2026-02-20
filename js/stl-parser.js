/**
 * STL Parser - Parse ASCII and Binary STL files
 */
class STLParser {
    /**
     * Parse STL file from ArrayBuffer
     * @param {ArrayBuffer} buffer - The file buffer
     * @param {string} filename - The filename
     * @returns {Object} Parsed mesh data
     */
    static parse(buffer, filename) {
        const uint8 = new Uint8Array(buffer);

        // Check if it's ASCII or Binary STL
        const isASCII = STLParser.isASCII(uint8);

        if (isASCII) {
            return STLParser.parseASCII(buffer, filename);
        } else {
            return STLParser.parseBinary(buffer, filename);
        }
    }

    /**
     * Check if the STL file is ASCII format
     * @param {Uint8Array} data - File data
     * @returns {boolean}
     */
    static isASCII(data) {
        // ASCII STL starts with "solid"
        const header = String.fromCharCode.apply(null, data.slice(0, 80).subarray(0, 5));
        return header.toLowerCase().startsWith('solid');
    }

    /**
     * Parse ASCII STL format
     * @param {ArrayBuffer} buffer
     * @param {string} filename
     * @returns {Object}
     */
    static parseASCII(buffer, filename) {
        const text = new TextDecoder('utf-8').decode(buffer);
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);

        const vertices = [];
        const normals = [];
        let currentNormal = [0, 0, 1];
        let currentFacet = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();

            if (line.startsWith('facet normal')) {
                const parts = line.split(/\s+/);
                currentNormal = [
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    parseFloat(parts[4])
                ];
            } else if (line.startsWith('vertex')) {
                const parts = line.split(/\s+/);
                currentFacet.push([
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                ]);
            } else if (line.startsWith('endfacet')) {
                if (currentFacet.length === 3) {
                    vertices.push(...currentFacet);
                    normals.push(currentNormal, currentNormal, currentNormal);
                }
                currentFacet = [];
            }
        }

        return STLParser.createMeshData(vertices, normals, filename, buffer.byteLength);
    }

    /**
     * Parse Binary STL format
     * @param {ArrayBuffer} buffer
     * @param {string} filename
     * @returns {Object}
     */
    static parseBinary(buffer, filename) {
        const dataView = new DataView(buffer);
        const vertices = [];
        const normals = [];

        // Skip 80-byte header
        let offset = 80;

        // Read triangle count
        const triangleCount = dataView.getUint32(offset, true);
        offset += 4;

        for (let i = 0; i < triangleCount; i++) {
            // Read normal
            const nx = dataView.getFloat32(offset, true);
            const ny = dataView.getFloat32(offset + 4, true);
            const nz = dataView.getFloat32(offset + 8, true);
            offset += 12;

            // Read 3 vertices
            for (let j = 0; j < 3; j++) {
                const vx = dataView.getFloat32(offset, true);
                const vy = dataView.getFloat32(offset + 4, true);
                const vz = dataView.getFloat32(offset + 8, true);
                vertices.push(vx, vy, vz);
                normals.push(nx, ny, nz);
                offset += 12;
            }

            // Skip 2-byte attribute byte count
            offset += 2;
        }

        return STLParser.createMeshData(vertices, normals, filename, buffer.byteLength);
    }

    /**
     * Create standardized mesh data object
     * @param {Array} vertices
     * @param {Array} normals
     * @param {string} filename
     * @param {number} fileSize
     * @returns {Object}
     */
    static createMeshData(vertices, normals, filename, fileSize) {
        const triangleCount = vertices.length / 9;
        const boundingBox = STLParser.calculateBoundingBox(vertices);

        return {
            filename,
            fileSize,
            triangleCount,
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            boundingBox,
            isCompressed: false,
            originalTriangleCount: triangleCount,
            originalFileSize: fileSize
        };
    }

    /**
     * Calculate bounding box from vertices
     * @param {Array} vertices
     * @returns {Object}
     */
    static calculateBoundingBox(vertices) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }

        return {
            min: [minX, minY, minZ],
            max: [maxX, maxY, maxZ],
            size: [maxX - minX, maxY - minY, maxZ - minZ],
            center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]
        };
    }

    /**
     * Calculate mesh volume (approximate)
     * @param {Object} meshData
     * @returns {number}
     */
    static calculateVolume(meshData) {
        const vertices = meshData.vertices;
        let volume = 0;

        for (let i = 0; i < vertices.length; i += 9) {
            const v1 = [vertices[i], vertices[i + 1], vertices[i + 2]];
            const v2 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
            const v3 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];

            // Signed volume of tetrahedron
            volume += (v1[0] * (v2[1] * v3[2] - v2[2] * v3[1]) +
                       v1[1] * (v2[2] * v3[0] - v2[0] * v3[2]) +
                       v1[2] * (v2[0] * v3[1] - v2[1] * v3[0])) / 6;
        }

        return Math.abs(volume);
    }

    /**
     * Calculate surface area
     * @param {Object} meshData
     * @returns {number}
     */
    static calculateSurfaceArea(meshData) {
        const vertices = meshData.vertices;
        let area = 0;

        for (let i = 0; i < vertices.length; i += 9) {
            const v1 = [vertices[i], vertices[i + 1], vertices[i + 2]];
            const v2 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
            const v3 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];

            // Calculate triangle area using cross product
            const ab = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const ac = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

            const cross = [
                ab[1] * ac[2] - ab[2] * ac[1],
                ab[2] * ac[0] - ab[0] * ac[2],
                ab[0] * ac[1] - ab[1] * ac[0]
            ];

            const crossLength = Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2);
            area += crossLength / 2;
        }

        return area;
    }

    /**
     * Export mesh to STL binary format
     * @param {Object} meshData
     * @returns {ArrayBuffer}
     */
    static toBinarySTL(meshData) {
        const { vertices, triangleCount } = meshData;

        // 80-byte header + 4-byte triangle count + 50 bytes per triangle
        const buffer = new ArrayBuffer(84 + triangleCount * 50);
        const dataView = new DataView(buffer);

        // Write header (80 bytes)
        const header = new TextEncoder().encode(`STL exported from STL Tool`);
        for (let i = 0; i < 80; i++) {
            dataView.setUint8(i, header[i] || 0);
        }

        // Write triangle count
        dataView.setUint32(80, triangleCount, true);
        let offset = 84;

        // Write triangles
        for (let i = 0; i < vertices.length; i += 9) {
            // Calculate normal
            const v1 = [vertices[i], vertices[i + 1], vertices[i + 2]];
            const v2 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
            const v3 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];

            const ab = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const ac = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

            const normal = [
                ab[1] * ac[2] - ab[2] * ac[1],
                ab[2] * ac[0] - ab[0] * ac[2],
                ab[0] * ac[1] - ab[1] * ac[0]
            ];

            const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2) || 1;
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;

            // Write normal
            dataView.setFloat32(offset, normal[0], true);
            dataView.setFloat32(offset + 4, normal[1], true);
            dataView.setFloat32(offset + 8, normal[2], true);
            offset += 12;

            // Write vertices
            for (let j = 0; j < 3; j++) {
                dataView.setFloat32(offset + j * 12, vertices[i + j * 3], true);
                dataView.setFloat32(offset + 4 + j * 12, vertices[i + j * 3 + 1], true);
                dataView.setFloat32(offset + 8 + j * 12, vertices[i + j * 3 + 2], true);
            }
            offset += 36;

            // Skip attribute byte count (2 bytes)
            offset += 2;
        }

        return buffer;
    }

    /**
     * Export mesh to STL ASCII format
     * @param {Object} meshData
     * @returns {string}
     */
    static toASCIISTL(meshData) {
        const { vertices, triangleCount, filename } = meshData;
        let output = `solid ${filename}\n`;

        for (let i = 0; i < vertices.length; i += 9) {
            const v1 = [vertices[i], vertices[i + 1], vertices[i + 2]];
            const v2 = [vertices[i + 3], vertices[i + 4], vertices[i + 5]];
            const v3 = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];

            // Calculate normal
            const ab = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const ac = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

            const normal = [
                ab[1] * ac[2] - ab[2] * ac[1],
                ab[2] * ac[0] - ab[0] * ac[2],
                ab[0] * ac[1] - ab[1] * ac[0]
            ];

            const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2) || 1;
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;

            output += `  facet normal ${normal[0].toExponential(6)} ${normal[1].toExponential(6)} ${normal[2].toExponential(6)}\n`;
            output += '    outer loop\n';
            output += `      vertex ${v1[0].toExponential(6)} ${v1[1].toExponential(6)} ${v1[2].toExponential(6)}\n`;
            output += `      vertex ${v2[0].toExponential(6)} ${v2[1].toExponential(6)} ${v2[2].toExponential(6)}\n`;
            output += `      vertex ${v3[0].toExponential(6)} ${v3[1].toExponential(6)} ${v3[2].toExponential(6)}\n`;
            output += '    endloop\n';
            output += '  endfacet\n';
        }

        output += 'endsolid\n';
        return output;
    }

    /**
     * Export mesh to OBJ format
     * @param {Object} meshData
     * @returns {string}
     */
    static toOBJ(meshData) {
        const { vertices, normals, filename } = meshData;
        let output = `# OBJ exported from STL Tool\n`;
        output += `# ${filename}\n\n`;

        // Write vertices
        for (let i = 0; i < vertices.length; i += 3) {
            output += `v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}\n`;
        }

        output += '\n';

        // Write normals
        for (let i = 0; i < normals.length; i += 3) {
            output += `vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}\n`;
        }

        output += '\n';

        // Write faces
        const triangleCount = vertices.length / 9;
        for (let i = 0; i < triangleCount; i++) {
            const v1 = i * 3 + 1;
            const v2 = i * 3 + 2;
            const v3 = i * 3 + 3;
            output += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
        }

        return output;
    }
}

// Export for use in other modules
window.STLParser = STLParser;
