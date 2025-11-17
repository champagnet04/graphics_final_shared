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
    directionalLight.position.set(10, 100, 10); // Position the light
    directionalLight.castShadow = true; // Enable shadow casting
    
    // Configure shadow map for directional light
    // The shadow camera needs to cover the area where shadows will be cast
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    // Adjust bounds to cover the ground area where clouds cast shadows
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    
    // Update the shadow camera to look at the scene center
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.target.updateMatrixWorld();
    
    scene.add(directionalLight);
    scene.add(directionalLight.target); // Add target to scene
}

/**
 * Modifies the terrain geometry to create smooth hills
 * Uses sine/cosine functions for natural-looking height variation
 * @param {THREE.BufferGeometry} geometry - The ground geometry to modify
 */
function modifyTerrainHeights(geometry) {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Loop through all vertices
    for (let i = 0; i < positions.count; i++) {
        // Get the current vertex position
        vertex.fromBufferAttribute(positions, i);
        
        // PlaneGeometry is created in XY plane (Z=0), but after -90° rotation around X:
        // - X stays X (width in world space)
        // - Y becomes -Z (depth in world space)
        // - Z becomes Y (height/up in world space)
        // So we use vertex.x and vertex.y to calculate height variation,
        // then set the Z component (which becomes Y/up after rotation)
        const height = Math.sin(vertex.x * 0.05) * Math.cos(vertex.y * 0.05) * 5;
        
        // Modify the Z component (which will become the Y/up direction after rotation)
        positions.setZ(i, height);
    }
    
    // Mark the position attribute as needing an update
    positions.needsUpdate = true;
    
    // Recalculate normals for proper lighting
    geometry.computeVertexNormals();
}

function createGround(){
    // TO DO: make the ground smoother (get rid of the lines and make it smooth)
    const groundGeometry = new THREE.PlaneGeometry(200, 100, 50, 25);
    
    // Modify the terrain to create smooth hills
    modifyTerrainHeights(groundGeometry);

    const snowTexture = loadSnowTexture();
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, // Base color (will be multiplied with texture)
        side: THREE.DoubleSide, // Make it visible from both sides
        map: snowTexture // Diffuse texture map
    });
    
    // Update material when texture loads (in case it loads asynchronously)
    snowTexture.addEventListener('load', () => {
        groundMaterial.needsUpdate = true;
        console.log('Snow texture loaded successfully');
    });

    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    ground.position.y = 0; // Position at ground level
    ground.castShadow = true;
    ground.receiveShadow = true;
    scene.add(ground);
}

function loadSnowTexture(){
    const loader = new THREE.TextureLoader();
    const snowTexture = loader.load(
        '/textures/snow.png',
        // onLoad callback
        (texture) => {
            // Configure texture wrapping and repeat for tiling
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            // Repeat the texture across the ground (adjust these values to control tile size)
            texture.repeat.set(10, 10); // Repeat 10 times in each direction
        },
        // onProgress callback (optional)
        undefined,
        // onError callback
        (error) => {
            console.error('Error loading snow texture:', error);
        }
    );
    
    // Set wrapping and repeat immediately (in case texture loads synchronously)
    snowTexture.wrapS = THREE.RepeatWrapping;
    snowTexture.wrapT = THREE.RepeatWrapping;
    snowTexture.repeat.set(10, 10);
    
    return snowTexture;
}

/**
 * Generates a random position for a cloud in the sky
 * @returns {THREE.Vector3} A random position for a cloud in the sky
 */
function generateCloudPosition(){
    // Keep track of previously generated cloud positions in this session
    if (!generateCloudPosition.pastPositions) {
        generateCloudPosition.pastPositions = [];
    }
    let attempt = 0;
    let cloudPosition;
    do {
        cloudPosition = new THREE.Vector3(
            Math.random() * 200 - 100, // x: -100 to 100
            Math.random() * 50 + 50,   // y: 10 to 20
            Math.random() * 100 - 50   // z: -50 to 50
        );
        // Check whether this candidate is at least 5 units away from all existing
        var tooClose = generateCloudPosition.pastPositions.some(pos => 
            pos.distanceTo(cloudPosition) < 5
        );
        attempt++;
    } while (tooClose && attempt < 100);

    generateCloudPosition.pastPositions.push(cloudPosition);
    
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
        
        // Enable shadows on the group and all its children (meshes)
        // cloud.castShadow = true;
        // cloud.receiveShadow = true;
        cloud.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
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
        elf.scale.setScalar(0.04); // Scale down if needed
        
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
    
    // Ensure ground matrix is up to date
    ground.updateMatrixWorld();
    
    // Cast a ray downward from above to find ground height
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3(x, 1000, z); // start high above the scene
    const direction = new THREE.Vector3(0, -1, 0); // straight down
    raycaster.set(origin, direction);

    // Use intersectObject - try both recursive and non-recursive
    // For a single mesh, recursive shouldn't matter, but let's try it
    const intersects = raycaster.intersectObject(ground, false);

    if (intersects.length > 0) {
        // Return the Y coordinate of the intersection point in world space
        const height = intersects[0].point.y;
        return height;
    } else {
        // Fallback: calculate height using the same formula as modifyTerrainHeights
        // This is a workaround if raycaster fails
        const calculatedHeight = Math.sin(x * 0.05) * Math.cos(-z * 0.05) * 5;
        return calculatedHeight;
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

function createMoon(){
    const moonGeometry = new THREE.SphereGeometry(1, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(0, 50, 0);
    // Create a point light to represent the moon's illumination
    const moonLight = new THREE.PointLight(0xffffff, 1.5, 1000); // (color, intensity, distance)
    moonLight.position.copy(moon.position);
    moonLight.castShadow = true;
    
    // Configure shadow map for the point light
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 1000;
    
    scene.add(moonLight);
    scene.add(moon);
}

async function generateCottage(){
    const loader = new GLTFLoader();
    try {
        // Use the static file path - webpack dev server serves from /models
        // This ensures both .gltf and .bin files are accessible
        const gltf = await loader.loadAsync('/models/winter_house/scene.gltf');
        const cottage = gltf.scene.clone(); // Clone so we can reuse the model
        
        cottage.name = 'cottage';
        
        const groundHeight = getHeightAt(25, 10);
        cottage.position.set(25, (groundHeight + 7) / 2, 10);
        
        cottage.scale.setScalar(0.009); // Scale down if needed
        cottage.rotation.y = Math.PI;
        
        scene.add(cottage);
        return cottage;
    } catch (error) {
        console.error('Cant load model:', error);
    }
}

export async function setupOutdoorScene(){    
    setupLights();
    createGround();
    createMoon();
    await generateClouds();
    await generateElfAtOrigin();
    await generateCottage();
    initKeyboardListeners(); // Initialize keyboard listeners
    return { scene, camera };
}

