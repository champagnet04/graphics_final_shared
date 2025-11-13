import * as THREE from 'three';
import { setupOutdoorScene } from './outdoor-scene.js';

// Initialize the scene
const { scene, camera } = setupOutdoorScene();

// Add a test cube to verify rendering is working
const testGeometry = new THREE.BoxGeometry(2, 2, 2);
const testMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const testCube = new THREE.Mesh(testGeometry, testMaterial);
testCube.position.set(0, 1, 0);
scene.add(testCube);

// Update camera aspect ratio to match window
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

console.log('Renderer created, canvas added to DOM');
console.log('Scene objects:', scene.children.length);
console.log('Camera position:', camera.position);
console.log('Camera looking at:', camera.getWorldDirection(new THREE.Vector3()));

// Update camera aspect ratio when window resizes
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Start the animation loop
animate();

