import * as THREE from 'three';
import { setupOutdoorScene } from './outdoor-scene.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { moveElf, updateSnow, northernLights, followElf, lookAround, checkCampfireProximity } from './outdoor-scene.js';

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
    
    // Zoom settings
    controls.minDistance = 5; // Minimum zoom distance
    controls.maxDistance = 500; // Maximum zoom distance
    controls.zoomSpeed = 1.2; // Faster zoom
    
    // Rotation settings
    controls.rotateSpeed = 0.8; // Slower, more controlled rotation
    controls.enableRotate = true;
    
    // Pan settings
    controls.panSpeed = 1.0; // Pan speed
    controls.screenSpacePanning = true; // Pan parallel to screen instead of ground
    
    // Vertical rotation limits (prevent flipping)
    controls.minPolarAngle = 0; // Can look straight up
    controls.maxPolarAngle = Math.PI; // Can look straight down
    
    // Smooth camera movement
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.1; // Higher damping for smoother feel
    
    // Set initial target to scene center
    controls.target.set(0, 0, 0);
    controls.update();

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
        // Temporarily disabled for path work - allows OrbitControls to work
        // lookAround(); // Handle A/D turning and W/S looking up/down
        // moveElf(); // Handle arrow key movement
        // followElf(); // Update camera to follow elf
        checkCampfireProximity(); // Check if elf is near campfire and resume audio
        updateSnow(); // Update snow particles
        if (northernLights) {
            northernLights.material.uniforms.time.value += 0.01;
        }
        renderer.render(scene, camera);
    }

    // Start the animation loop
    animate();
}

// Start initialization
init();

