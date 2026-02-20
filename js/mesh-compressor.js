/**
 * Mesh Compressor - Simplify STL meshes
 * Uses vertex clustering and random sampling for fast mesh simplification
 */

// Wait for STLParser to be available
function getSTLParser() {
    if (typeof STLParser === 'undefined') {
        throw new Error('STLParser not loaded');
    }
    return STLParser;
}

class MeshCompressor {
    /**
     * Compress mesh to target quality
     * @param {Object} meshData - Original mesh data
     * @param {number} quality - Target quality (10-100)
     * @param {Object} options - Compression options
     * @returns {Object} Compressed mesh data
     */
    static compress(meshData, quality, options = {}) {
        const { vertices, normals, triangleCount, filename, fileSize, boundingBox, originalVertices, originalNormals, originalTriangleCount } = meshData;

        // Get the actual original data (may be compressed before)
        const srcVertices = originalVertices || vertices;
        const srcNormals = originalNormals || normals;
        const srcTriangleCount = originalTriangleCount || triangleCount;

        // Calculate target triangle count based on quality
        const targetCount = Math.max(10, Math.floor(srcTriangleCount * (quality / 100)));

        if (targetCount >= srcTriangleCount) {
            // No compression needed - return original data
            return {
                ...meshData,
                vertices: srcVertices,
                normals: srcNormals,
                triangleCount: srcTriangleCount,
                fileSize: fileSize,
                boundingBox: getSTLParser().calculateBoundingBox(Array.from(srcVertices)),
                isCompressed: false
            };
        }

        // Use vertex clustering for fast simplification
        const result = MeshCompressor.vertexClusteringSimplify(
            srcVertices,
            srcNormals,
            srcTriangleCount,
            targetCount,
            boundingBox
        );

        // Calculate new file size (approximate)
        const newFileSize = 84 + result.triangleCount * 50;

        return {
            filename,
            fileSize: newFileSize,
            triangleCount: result.triangleCount,
            vertices: result.vertices,
            normals: result.normals,
            boundingBox: getSTLParser().calculateBoundingBox(Array.from(result.vertices)),
            isCompressed: true,
            originalTriangleCount: srcTriangleCount,
            originalFileSize: fileSize,
            originalVertices: srcVertices,
            originalNormals: srcNormals,
            compressionRatio: (1 - result.triangleCount / srcTriangleCount) * 100
        };
    }

    /**
     * Vertex clustering simplification - fast and effective
     */
    static vertexClusteringSimplify(vertices, normals, triangleCount, targetCount, boundingBox) {
        const { size, min } = boundingBox;

        // Calculate grid cell size based on target count
        const cellCount = Math.cbrt(targetCount);
        const cellSizeX = size[0] / cellCount;
        const cellSizeY = size[1] / cellCount;
        const cellSizeZ = size[2] / cellCount;

        // Assign vertices to clusters
        const clusterMap = new Map();
        const clusterCentroids = [];
        const clusterNormals = [];

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];

            // Calculate cluster index
            const cx = Math.floor((x - min[0]) / cellSizeX);
            const cy = Math.floor((y - min[1]) / cellSizeY);
            const cz = Math.floor((z - min[2]) / cellSizeZ);
            const key = `${cx},${cy},${cz}`;

            if (!clusterMap.has(key)) {
                const idx = clusterCentroids.length;
                clusterMap.set(key, idx);
                clusterCentroids.push([x, y, z, 1]); // [x, y, z, count]
                clusterNormals.push([0, 0, 0]);
            } else {
                const idx = clusterMap.get(key);
                clusterCentroids[idx][0] += x;
                clusterCentroids[idx][1] += y;
                clusterCentroids[idx][2] += z;
                clusterCentroids[idx][3] += 1;
            }

            // Accumulate normals
            const idx = clusterMap.get(key);
            clusterNormals[idx][0] += normals[i];
            clusterNormals[idx][1] += normals[i + 1];
            clusterNormals[idx][2] += normals[i + 2];
        }

        // Calculate centroids and average normals
        const clusterCount = clusterCentroids.length;
        for (let i = 0; i < clusterCount; i++) {
            const count = clusterCentroids[i][3];
            clusterCentroids[i][0] /= count;
            clusterCentroids[i][1] /= count;
            clusterCentroids[i][2] /= count;

            const len = Math.sqrt(
                clusterNormals[i][0] ** 2 +
                clusterNormals[i][1] ** 2 +
                clusterNormals[i][2] ** 2
            ) || 1;
            clusterNormals[i][0] /= len;
            clusterNormals[i][1] /= len;
            clusterNormals[i][2] /= len;
        }

        // Rebuild triangles using cluster indices
        const newVertices = [];
        const newNormals = [];

        for (let i = 0; i < vertices.length; i += 9) {
            const indices = [];
            for (let j = 0; j < 3; j++) {
                const x = vertices[i + j * 3];
                const y = vertices[i + j * 3 + 1];
                const z = vertices[i + j * 3 + 2];

                const cx = Math.floor((x - min[0]) / cellSizeX);
                const cy = Math.floor((y - min[1]) / cellSizeY);
                const cz = Math.floor((z - min[2]) / cellSizeZ);
                const key = `${cx},${cy},${cz}`;

                indices.push(clusterMap.get(key));
            }

            // Check for degenerate triangle
            if (indices[0] === indices[1] || indices[1] === indices[2] || indices[0] === indices[2]) {
                continue;
            }

            // Add triangle vertices
            for (let j = 0; j < 3; j++) {
                const idx = indices[j];
                newVertices.push(
                    clusterCentroids[idx][0],
                    clusterCentroids[idx][1],
                    clusterCentroids[idx][2]
                );
                newNormals.push(
                    clusterNormals[idx][0],
                    clusterNormals[idx][1],
                    clusterNormals[idx][2]
                );
            }
        }

        return {
            vertices: new Float32Array(newVertices),
            normals: new Float32Array(newNormals),
            triangleCount: newVertices.length / 9
        };
    }

    /**
     * Scale mesh to target dimensions
     * @param {Object} meshData
     * @param {Object} targetSize - { x, y, z } in mm
     * @returns {Object}
     */
    static scale(meshData, targetSize) {
        const { vertices, boundingBox, ...rest } = meshData;
        const currentSize = boundingBox.size;

        const scaleX = targetSize.x / currentSize[0];
        const scaleY = targetSize.y / currentSize[1];
        const scaleZ = targetSize.z / currentSize[2];

        const newVertices = new Float32Array(vertices.length);
        for (let i = 0; i < vertices.length; i += 3) {
            newVertices[i] = vertices[i] * scaleX;
            newVertices[i + 1] = vertices[i + 1] * scaleY;
            newVertices[i + 2] = vertices[i + 2] * scaleZ;
        }

        return {
            ...rest,
            vertices: newVertices,
            boundingBox: getSTLParser().calculateBoundingBox(Array.from(newVertices))
        };
    }

    /**
     * Center mesh at origin
     * @param {Object} meshData
     * @returns {Object}
     */
    static center(meshData) {
        const { vertices, boundingBox, ...rest } = meshData;
        const center = boundingBox.center;

        const newVertices = new Float32Array(vertices.length);
        for (let i = 0; i < vertices.length; i += 3) {
            newVertices[i] = vertices[i] - center[0];
            newVertices[i + 1] = vertices[i + 1] - center[1];
            newVertices[i + 2] = vertices[i + 2] - center[2];
        }

        return {
            ...rest,
            vertices: newVertices,
            boundingBox: getSTLParser().calculateBoundingBox(Array.from(newVertices))
        };
    }

    /**
     * Merge multiple meshes
     * @param {Array} meshDataArray
     * @returns {Object}
     */
    static merge(meshDataArray) {
        if (meshDataArray.length === 0) return null;
        if (meshDataArray.length === 1) return meshDataArray[0];

        let totalVertices = 0;
        let totalTriangles = 0;

        for (const mesh of meshDataArray) {
            totalVertices += mesh.vertices.length;
            totalTriangles += mesh.triangleCount;
        }

        const newVertices = new Float32Array(totalVertices);
        const newNormals = new Float32Array(totalVertices);
        let vOffset = 0;
        let nOffset = 0;

        for (const mesh of meshDataArray) {
            newVertices.set(mesh.vertices, vOffset);
            newNormals.set(mesh.normals, nOffset);
            vOffset += mesh.vertices.length;
            nOffset += mesh.normals.length;
        }

        const merged = {
            filename: 'merged.stl',
            fileSize: 84 + totalTriangles * 50,
            triangleCount: totalTriangles,
            vertices: newVertices,
            normals: newNormals,
            boundingBox: getSTLParser().calculateBoundingBox(Array.from(newVertices)),
            isCompressed: false,
            originalTriangleCount: totalTriangles,
            originalFileSize: 84 + totalTriangles * 50
        };

        return merged;
    }
}

// Export for use in other modules
window.MeshCompressor = MeshCompressor;
