/**
 * 3D Viewer - Three.js based STL viewer
 */
class STLViewer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.mesh = null;
        this.wireframe = false;
        this.gridVisible = true;
        this.axisVisible = false;

        this.init();
    }

    /**
     * Initialize Three.js scene
     */
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.updateTheme('light');

        // Camera

        // Camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
        this.camera.position.set(100, 100, 100);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        this.setupLighting();

        // Grid
        this.grid = new THREE.GridHelper(200, 20, 0xcccccc, 0xdddddd);
        this.scene.add(this.grid);

        // Axis helper
        this.axis = new THREE.AxesHelper(100);
        this.axis.visible = this.axisVisible;
        this.scene.add(this.axis);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 5000;

        // Handle resize
        this.handleResize();

        // Start render loop
        this.animate();
    }

    /**
     * Setup scene lighting
     */
    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(100, 200, 100);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 500;
        mainLight.shadow.camera.left = -200;
        mainLight.shadow.camera.right = 200;
        mainLight.shadow.camera.top = 200;
        mainLight.shadow.camera.bottom = -200;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-100, 50, -100);
        this.scene.add(fillLight);

        // Back light
        const backLight = new THREE.DirectionalLight(0xff8888, 0.2);
        backLight.position.set(0, -50, -100);
        this.scene.add(backLight);
    }

    /**
     * Update theme colors
     */
    updateTheme(theme) {
        if (theme === 'dark') {
            this.scene.background = new THREE.Color(0x0a0a0f);
            this.grid.material.color.setHex(0x333333);
            this.grid.material.secondaryColor.setHex(0x222222);
        } else {
            this.scene.background = new THREE.Color(0xe8e8ed);
            this.grid.material.color.setHex(0xcccccc);
            this.grid.material.secondaryColor.setHex(0xdddddd);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Load and display STL mesh
     * @param {Object} meshData - Parsed STL mesh data
     * @param {boolean} resetView - Whether to reset camera to fit mesh (default: true)
     */
    loadMesh(meshData, resetView = true) {
        // Remove existing mesh completely
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }

        const { vertices, normals } = meshData;

        // Create geometry
        const geometry = new THREE.BufferGeometry();

        // Set positions
        const positions = new Float32Array(vertices);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Set normals
        if (normals && normals.length > 0) {
            const normalArray = new Float32Array(normals);
            geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
        } else {
            geometry.computeVertexNormals();
        }

        // Create material
        const material = new THREE.MeshStandardMaterial({
            color: 0x6a6a7a,
            metalness: 0.2,
            roughness: 0.5,
            flatShading: false,
            side: THREE.DoubleSide
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        if (this.wireframe) {
            material.wireframe = true;
        }

        this.scene.add(this.mesh);

        // Fit camera to mesh only if requested
        if (resetView) {
            this.fitCameraToMesh(meshData.boundingBox);
        }
    }

    /**
     * Fit camera to mesh bounding box
     * @param {Object} boundingBox
     */
    fitCameraToMesh(boundingBox) {
        if (!boundingBox) return;

        const { size, center } = boundingBox;
        const maxDim = Math.max(size[0], size[1], size[2]);

        // Position camera at distance based on mesh size
        const distance = maxDim * 2;
        this.camera.position.set(
            center[0] + distance,
            center[1] + distance * 0.5,
            center[2] + distance
        );

        // Update controls target to mesh center
        this.controls.target.set(center[0], center[1], center[2]);

        // Adjust grid size
        const gridSize = Math.max(100, maxDim * 3);
        this.grid.scale.set(gridSize / 200, 1, gridSize / 200);

        this.controls.update();
    }

    /**
     * Reset camera to initial position
     */
    resetView() {
        if (this.mesh && this.mesh.geometry) {
            this.fitCameraToMesh(STLParser.calculateBoundingBox(
                Array.from(this.mesh.geometry.attributes.position.array)
            ));
        } else {
            this.camera.position.set(100, 100, 100);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    /**
     * Toggle wireframe mode
     */
    toggleWireframe() {
        this.wireframe = !this.wireframe;
        if (this.mesh) {
            this.mesh.material.wireframe = this.wireframe;
        }
        return this.wireframe;
    }

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        this.grid.visible = this.gridVisible;
        return this.gridVisible;
    }

    /**
     * Toggle axis helper
     */
    toggleAxis() {
        this.axisVisible = !this.axisVisible;
        this.axis.visible = this.axisVisible;
        return this.axisVisible;
    }

    /**
     * Clear the viewer
     */
    clear() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }

    /**
     * Dispose of viewer resources
     */
    dispose() {
        this.clear();
        this.renderer.dispose();
        this.controls.dispose();
    }
}

// Export for use in other modules
window.STLViewer = STLViewer;
