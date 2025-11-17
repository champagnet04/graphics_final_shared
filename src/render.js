import * as THREE from 'three';
import { setupOutdoorScene } from './outdoor-scene.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { moveElf, updateSnow } from './outdoor-scene.js';

// Initialize the scene asynchronously
async function init() {
    const { scene, camera } = await setupOutdoorScene();

    // Update camera aspect ratio to match window
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Enable shadow rendering
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
    document.body.appendChild(renderer.domElement);

    // Initialize OrbitControls after renderer is created
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1; // Minimum zoom distance
    controls.maxDistance = 1000; // Maximum zoom distance
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;

    // Update camera aspect ratio when window resizes
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Update controls
        moveElf();
        updateSnow(); // Update snow particles
        renderer.render(scene, camera);
    }

    // Start the animation loop
    animate();
}

// Start initialization
init();

