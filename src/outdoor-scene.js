import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

//this file will setup the outdoor scene
//it is incredibly important that we break down EVERYTHING into as many smaller functions as possible
const scene = createScene();
const camera = setupCamera();

// Store references to ground and elf for later use
let ground = null;
let elf = null;

// Track keyboard state
const keysPressed = {};

function createScene(){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181848); // Deep purple-blue night sky
    return scene;
}

function setupCamera(){
    const camera = new THREE.PerspectiveCamera(
        70,
        1,
        0.1,
        2000
    );

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    return camera;
}

function setupLights(){
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // bright white light
    directionalLight.position.set(10, 10, 10); // Position the light
    scene.add(directionalLight);
}

function createGround(){
    const groundGeometry = new THREE.PlaneGeometry(200, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, // White color for ground
        side: THREE.DoubleSide // Make it visible from both sides
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    ground.position.y = 0; // Position at ground level
    scene.add(ground);
}

/**
 * Generates a random position for a cloud in the sky
 * @returns {THREE.Vector3} A random position for a cloud in the sky
 */
function generateCloudPosition(){
    const cloudPosition = new THREE.Vector3(
        Math.random() * 200 - 100,
        Math.random() * 10 + 10,
        Math.random() * 100 - 50
    );
    return cloudPosition;
}

/**
 * Creates a cloud in the sky at a random position
 * @returns {Promise<THREE.Group>} A promise that resolves to the cloud mesh
 */
async function createCloud(){
    const loader = new GLTFLoader();
    try {
        // Use the static file path - webpack dev server serves from /models
        // This ensures both .gltf and .bin files are accessible
        const gltf = await loader.loadAsync('/models/clouds/scene.gltf');
        const cloud = gltf.scene.clone(); // Clone so we can reuse the model
        
        // Scale and position the cloud
        cloud.position.copy(generateCloudPosition());
        
        // The model might be large, so we may need to scale it down
        // Adjust scale as needed based on the model size
        cloud.scale.setScalar(0.01); // Scale down if needed
        
        scene.add(cloud);
        return cloud;
    } catch (error) {
        console.error('Cant load model:', error);
    }
}

/**
 * Generates a bunch of clouds in the sky
 * @returns {Promise<void>}
 */
async function generateClouds(){
    //randomly place a bunch of clouds in the sky
    const clouds = [];
    for (let i = 0; i < 50; i++) {
        clouds.push(createCloud());
    }
    await Promise.all(clouds);
}

async function generateElfAtOrigin(){
    const loader = new GLTFLoader();
    try {
        // Use the static file path - webpack dev server serves from /models
        // This ensures both .gltf and .bin files are accessible
        const gltf = await loader.loadAsync('/models/christmas_elf/scene.gltf');
        elf = gltf.scene.clone(); // Clone so we can reuse the model
        
        // Set a name so we can find it later
        elf.name = 'elf';
        
        // Scale and position the elf
        elf.position.set(0, 0, 0);
        
        // The model might be large, so we may need to scale it down
        // Adjust scale as needed based on the model size
        elf.scale.setScalar(0.01); // Scale down if needed
        
        scene.add(elf);
        return elf;
    } catch (error) {
        console.error('Cant load model:', error);
    }
}

export function moveElf(){
    // Find the elf if we don't have a reference yet
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    
    // If elf still doesn't exist, return early
    if (!elf) {
        return;
    }

    // Move based on keyboard input FIRST
    if (keysPressed['w']) {
        elf.position.z -= 0.1;
        // Make the elf face the -z direction when moving forward ('w')
        if (elf) {
            elf.rotation.y = Math.PI;
        }
    }
    if (keysPressed['a']) {
        elf.position.x -= 0.1;
        // Make the elf face the -x direction when moving forward ('a')
        if (elf) {
            elf.rotation.y = -Math.PI / 2;
        }
    }
    if (keysPressed['s']) {
        elf.position.z += 0.1;
        // Make the elf face the z direction when moving forward ('s')
        if (elf) {
            elf.rotation.y = 0;
        }
    }
    if (keysPressed['d']) {
        elf.position.x += 0.1;
        // Make the elf face the x direction when moving forward ('d')
        if (elf) {
            elf.rotation.y = Math.PI / 2;
        }
    }

    // Then update ground height at the new position
    const groundHeight = getHeightAt(elf.position.x, elf.position.z);
    elf.position.y = groundHeight;
}

function getHeightAt(x, z){
    if (!ground) {
        return 0; // Fallback if ground doesn't exist
    }
    
    // Cast a ray downward from above to find ground height
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3(x, 1000, z); // start high above the scene
    const direction = new THREE.Vector3(0, -1, 0); // straight down
    raycaster.set(origin, direction);

    const intersects = raycaster.intersectObject(ground, false);

    if (intersects.length > 0) {
        return intersects[0].point.y;
    } else {
        // fallback: could not find intersection
        return 0; 
    }
}

// Initialize keyboard listeners once
function initKeyboardListeners(){
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        switch (key) {
            case 'w':
            case 'a':
            case 's':
            case 'd':
                keysPressed[key] = true;
                e.preventDefault(); // Prevent default behavior
                break;
        }
    });
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        switch (key) {
            case 'w':
            case 'a':
            case 's':
            case 'd':
                keysPressed[key] = false;
                e.preventDefault(); // Prevent default behavior
                break;
        }
    });
}

export async function setupOutdoorScene(){    
    setupLights();
    createGround();
    await generateClouds();
    await generateElfAtOrigin();
    initKeyboardListeners(); // Initialize keyboard listeners
    return { scene, camera };
}

