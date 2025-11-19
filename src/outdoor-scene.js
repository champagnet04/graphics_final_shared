import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

//this file will setup the outdoor scene
//it is incredibly important that we break down EVERYTHING into as many smaller functions as possible
const scene = createScene();
const camera = setupCamera();

// Store references to ground, pond, and elf for later use
let ground = null;
let pond = null;
let elf = null;
export let northernLights = null;
let snowmanGroup = null;
const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: loadSnowTexture()
});
let sceneObjects = [];

//global ground bounds
const groundBounds = {
    xMin: -100,
    xMax: 100,
    zMin: -50,
    zMax: 50,
    yMin: -10,
    yMax: 100
};

const lightColors = [
    0xff0000, // Red
    0xffff00, // Yellow
    0x00ff00, // Green
    0x00ffff, // Cyan
    0x0000ff, // Blue
    0xff00ff, // Magenta / Pink
    0xffffff, // White
    0xffa500  // Orange/gold (for warmth)
];

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

    // Initial 3rd person camera position (behind and above the elf at origin)
    // Elf starts at (0, 0, 0) facing +z direction, so camera should be behind (negative z)
    const cameraDistance = 8;
    const cameraHeight = 5;
    camera.position.set(0, cameraHeight, -cameraDistance);
    camera.lookAt(0, 1, 3); // Look slightly ahead of the elf

    return camera;
}

export function followElf(){
    // Follow the elf with a 3rd person camera perspective
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    
    if (!elf) {
        return;
    }
    
    // Camera settings for 3rd person view
    const cameraDistance = 8; // Distance behind the elf
    const cameraHeight = 5; // Height above the elf
    
    // Get the elf's facing direction from rotation.y
    // rotation.y = 0 means facing +z, Math.PI means facing -z, etc.
    const facingAngle = elf.rotation.y;
    
    // Calculate position behind the elf (opposite to facing direction)
    const cameraX = elf.position.x - Math.sin(facingAngle) * cameraDistance;
    const cameraZ = elf.position.z - Math.cos(facingAngle) * cameraDistance;
    const cameraY = elf.position.y + cameraHeight;
    
    // Update camera position
    camera.position.set(cameraX, cameraY, cameraZ);
    
    // Look at a point slightly ahead of the elf in the direction it's facing
    // Apply camera pitch (up/down look) to the look target
    const lookAheadDistance = 3;
    const lookX = elf.position.x + Math.sin(facingAngle) * lookAheadDistance;
    const lookZ = elf.position.z + Math.cos(facingAngle) * lookAheadDistance;
    const baseLookY = elf.position.y + 1; // Look slightly above the elf's base
    
    // Apply pitch offset (vertical look adjustment)
    const pitchOffset = Math.sin(cameraPitch) * 5; // Scale the pitch effect
    const lookY = baseLookY + pitchOffset;
    
    camera.lookAt(lookX, lookY, lookZ);
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

    ground = new THREE.Mesh(groundGeometry, snowMaterial);
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

// Track camera pitch for looking up/down
let cameraPitch = 0;

export function moveElf(){
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    if (!elf) return;
    
    // Check if any arrow key is pressed
    if (!keysPressed['arrowup'] && !keysPressed['arrowdown'] && 
        !keysPressed['arrowleft'] && !keysPressed['arrowright']) {
        elf.position.y = getHeightAt(elf.position.x, elf.position.z);
        return;
    }
    
    const moveSpeed = 0.1;
    
    // Calculate forward and right based on ELF's rotation, not camera
    const elfRotation = elf.rotation.y;
    
    // Forward direction based on elf's facing
    const forward = new THREE.Vector3(
        Math.sin(elfRotation),
        0,
        Math.cos(elfRotation)
    );
    
    // Right direction (90 degrees from forward)
    const right = new THREE.Vector3(
        Math.sin(elfRotation + Math.PI / 2),
        0,
        Math.cos(elfRotation + Math.PI / 2)
    );
    
    // Move in only ONE direction (use else if to prevent diagonals)
    if (keysPressed['arrowup']) {
        elf.position.x += forward.x * moveSpeed;
        elf.position.z += forward.z * moveSpeed;
    } else if (keysPressed['arrowdown']) {
        elf.position.x -= forward.x * moveSpeed;
        elf.position.z -= forward.z * moveSpeed;
    } else if (keysPressed['arrowleft']) {
        elf.position.x += right.x * moveSpeed;
        elf.position.z += right.z * moveSpeed;
    } else if (keysPressed['arrowright']) {
        elf.position.x -= right.x * moveSpeed;
        elf.position.z -= right.z * moveSpeed;
    }
    
    elf.position.y = getHeightAt(elf.position.x, elf.position.z);
}

export function lookAround(){
    // Find the elf if we don't have a reference yet
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    
    // If elf still doesn't exist, return early
    if (!elf) {
        return;
    }

    // A/D keys: Turn left/right (rotate the elf)
    const turnSpeed = 0.05; // Adjust this value to control turn speed
    if (keysPressed['a']) {
        elf.rotation.y += turnSpeed; // Turn left
    }
    if (keysPressed['d']) {
        elf.rotation.y -= turnSpeed; // Turn right
    }
    
    // W/S keys: Look up/down (adjust camera pitch)
    const lookSpeed = 0.02; // Adjust this value to control look speed
    const maxPitch = Math.PI / 3; // Limit pitch to 60 degrees up/down
    if (keysPressed['w']) {
        cameraPitch = Math.min(cameraPitch + lookSpeed, maxPitch); // Look up
    }
    if (keysPressed['s']) {
        cameraPitch = Math.max(cameraPitch - lookSpeed, -maxPitch); // Look down
    }
}

/**
 * LATER ON YOU NEED TO EXTRACT A HELPER THAT YOU CAN PASS GROUND & POND TO
 * @param {} x 
 * @param {*} z 
 * @returns 
 */
function getHeightAt(x, z){
    let groundHeight = 0;
    let pondHeight = null;
    
    // Check ground height
    if (ground) {
        // Ensure ground matrix is up to date
        ground.updateMatrixWorld();
        
        // Cast a ray downward from above to find ground height
        const raycaster = new THREE.Raycaster();
        const origin = new THREE.Vector3(x, 1000, z); // start high above the scene
        const direction = new THREE.Vector3(0, -1, 0); // straight down
        raycaster.set(origin, direction);

        const intersects = raycaster.intersectObject(ground, false);

        if (intersects.length > 0) {
            groundHeight = intersects[0].point.y;
        } else {
            // Fallback: calculate height using the same formula as modifyTerrainHeights
            groundHeight = Math.sin(x * 0.05) * Math.cos(-z * 0.05) * 5;
        }
    }
    
    // Check pond height if pond exists
    if (pond) {
        // Update pond matrix
        pond.updateMatrixWorld();
        
        // Check if point is within the pond's circle
        const pondCenterX = pond.position.x;
        const pondCenterZ = pond.position.z;
        const pondRadius = 25; // CircleGeometry radius
        
        const distanceFromCenter = Math.sqrt(
            Math.pow(x - pondCenterX, 2) + Math.pow(z - pondCenterZ, 2)
        );
        
        if (distanceFromCenter <= pondRadius) {
            // Point is within the pond, get pond height
            const raycaster = new THREE.Raycaster();
            const origin = new THREE.Vector3(x, 1000, z);
            const direction = new THREE.Vector3(0, -1, 0);
            raycaster.set(origin, direction);
            
            const intersects = raycaster.intersectObject(pond, false);
            if (intersects.length > 0) {
                pondHeight = intersects[0].point.y;
            }
        }
    }
    
    // Return the higher of the two heights (elf walks on top of whichever is higher)
    if (pondHeight !== null) {
        return Math.max(groundHeight, pondHeight);
    }
    
    return groundHeight;
}

// Initialize keyboard listeners once
function initKeyboardListeners(){
    window.addEventListener('keydown', (e) => {
        let key = e.key.toLowerCase();
        // Handle arrow keys
        if (e.key.startsWith('Arrow')) {
            key = 'arrow' + e.key.slice(5).toLowerCase(); // 'ArrowUp' -> 'arrowup'
        }
        switch (key) {
            case 'w':
            case 'a':
            case 's':
            case 'd':
            case 'arrowup':
            case 'arrowdown':
            case 'arrowleft':
            case 'arrowright':
                keysPressed[key] = true;
                e.preventDefault(); // Prevent default behavior
                break;
        }
    });
    window.addEventListener('keyup', (e) => {
        let key = e.key.toLowerCase();
        // Handle arrow keys
        if (e.key.startsWith('Arrow')) {
            key = 'arrow' + e.key.slice(5).toLowerCase(); // 'ArrowUp' -> 'arrowup'
        }
        switch (key) {
            case 'w':
            case 'a':
            case 's':
            case 'd':
            case 'arrowup':
            case 'arrowdown':
            case 'arrowleft':
            case 'arrowright':
                keysPressed[key] = false;
                e.preventDefault(); // Prevent default behavior
                break;
        }
    });
}

async function generateCottage() {
    const loader = new GLTFLoader();
    
    try {
        const gltf = await loader.loadAsync('/models/winter_house/scene.gltf');
        const cottage = gltf.scene.clone();
        cottage.name = 'cottage';
        
        const groundHeight = getHeightAt(25, 10);
        cottage.position.set(25, (groundHeight + 7) / 2, 10);
        cottage.scale.setScalar(0.009);
        cottage.rotation.y = Math.PI;
        
        // Material color mapping from the GLTF file
        const materialColors = {
            'testTile': new THREE.Color(0.0550536, 0.0564653, 0.0649351),     // Dark gray roof
            'panel': new THREE.Color(0.345098, 0.509804, 0.564706),            // Blue siding
            'housePaint': new THREE.Color(0.815686, 0.811765, 0.843137),       // Light gray/white
            'snow': new THREE.Color(1.0, 1.0, 1.0),                            // White snow
            'chimney': new THREE.Color(1.0, 1.0, 1.0),                         // Chimney (has texture)
            'windowFrame': new THREE.Color(0.905882, 0.85098, 0.901961),       // Light window frames
            'windowGlass': new THREE.Color(0.013200, 0.09649, 0.09649)         // Dark teal glass
        };
        
        cottage.traverse((child) => {
            if (child.isMesh && child.material) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                const matName = child.material.name;
                const targetColor = materialColors[matName];
                
                if (targetColor) {
                    // Create new material with correct color
                    child.material = new THREE.MeshStandardMaterial({
                        color: targetColor,
                        map: child.material.map || null,  // Keep texture if exists
                        metalness: 0.0,
                        roughness: 0.6,
                        side: THREE.DoubleSide,
                        transparent: matName === 'windowGlass',
                        opacity: matName === 'windowGlass' ? 0.5 : 1.0
                    });
                    
                    console.log(`Set ${matName} to RGB(${targetColor.r * 255}, ${targetColor.g * 255}, ${targetColor.b * 255})`);
                } else {
                    console.warn(`Unknown material: ${matName}`);
                }
            }
        });
        
        // Create a group for the cottage and its lights
        const cottageGroup = new THREE.Group();
        cottageGroup.name = 'cottageGroup';
        cottageGroup.add(cottage);
        
        // Position the group in the scene
        scene.add(cottageGroup);
        console.log('Cottage loaded with manual material colors');
        return cottageGroup;
    } catch (error) {
        console.error('Can\'t load model:', error);
    }
}

function getCottage(){
    // First try to find the cottage group
    const cottageGroup = scene.children.find(child => child.name === 'cottageGroup');
    if (cottageGroup) {
        // Find the cottage within the group
        const cottage = cottageGroup.children.find(child => child.name === 'cottage');
        if (cottage) {
            return cottage;
        }
    }
    // Fallback: try to find cottage directly in scene (for backwards compatibility)
    const cottage = scene.children.find(child => child.name === 'cottage');
    if (!cottage) {
        console.warn('Cottage not found');
        return null;
    }
    return cottage;
}

function getCottageGroup(){
    const cottageGroup = scene.children.find(child => child.name === 'cottageGroup');
    if (!cottageGroup) {
        console.warn('Cottage group not found');
        return null;
    }
    return cottageGroup;
}

/**
 * Helper function to add lights in a sequence along an axis
 * @param {number} start - Starting position along the axis
 * @param {number} end - Ending position along the axis
 * @param {string} axis - 'x' or 'z' axis to iterate along
 * @param {number|null} fixed1 - Fixed value for the other axis (x when axis is 'z', y when axis is 'x')
 * @param {number|null} fixed2 - Fixed value for z when axis is 'x', or y when axis is 'z'
 * @param {number} baseY - Base Y coordinate for the lights
 * @param {number} spacing - Spacing between lights
 * @param {Array<THREE.Vector3>} points - Array to push the generated points to
 * @param {number} yOffset - Offset to add to baseY (default: 0.6)
 */
function addEdgeLights(start, end, axis, fixed1, fixed2, baseY, spacing, points, yOffset = 0.6) {
    for (let v = start; v <= end; v += spacing) {
        let point;
        if (axis === 'x') {
            // v is x, fixed2 is z
            point = new THREE.Vector3(v, baseY + yOffset, fixed2);
        } else if (axis === 'z') {
            // fixed1 is x, v is z
            point = new THREE.Vector3(fixed1, baseY + yOffset, v);
        }
        points.push(point);
    }
}

/**
 * Helper function to add lights along a diagonal line between two 3D points
 * @param {THREE.Vector3} startPoint - Starting 3D point
 * @param {THREE.Vector3} endPoint - Ending 3D point
 * @param {number} spacing - Spacing between lights (in world units)
 * @param {Array<THREE.Vector3>} points - Array to push the generated points to
 */
function addDiagonalLights(startPoint, endPoint, spacing, points) {
    // Calculate the direction vector and distance
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    const distance = direction.length();
    
    // Normalize the direction
    direction.normalize();
    
    // Generate points along the line
    for (let t = 0; t < distance - 0.01; t += spacing) {
        const point = new THREE.Vector3().copy(startPoint);
        point.addScaledVector(direction, t);
        points.push(point);
    }
    
    // Always include the end point (this allows segments to connect properly)
    points.push(endPoint.clone());
}

function addLightsToFence(size, center){
    const points = [];
    const spacing = 0.3; // Spacing between lights
    
    // Calculate cottage dimensions in world space
    const width = size.x;
    const height = size.y;
    const depth = size.z;
    
    const baseY = center.y / 2;
    
    // Front edge
    const frontZ = center.z + depth / 2;
    addEdgeLights(center.x - width / 2, (center.x + width / 2) - 12.3, 'x', null, frontZ - 1.7, baseY, spacing, points);
    addEdgeLights((center.x - width / 2) + 12.8, center.x + width / 2, 'x', null, frontZ - 1.7, baseY, spacing, points);

    // Back edge
    const backZ = center.z - depth / 2;
    addEdgeLights(center.x - width / 2, (center.x + width / 2) - 13, 'x', null, backZ + 1.9, baseY, spacing, points);
    addEdgeLights((center.x - width / 2) + 13.3, center.x + width / 2, 'x', null, backZ + 1.9, baseY, spacing, points);

    // Left edge
    const leftX = center.x - width / 2;
    addEdgeLights((center.z - depth / 2) + 2, (center.z + depth / 2) -2, 'z', leftX, null, baseY, spacing, points);

    // Right edge
    const rightX = center.x + width / 2;
    addEdgeLights((center.z - depth / 2) + 2, (center.z + depth / 2) -2, 'z', rightX, null, baseY, spacing, points);
    
    return points;
}

function addLightsToTopFence(size, center){
    const points = [];
    const spacing = 0.3; // Spacing between lights
    
    // Calculate cottage dimensions in world space
    const width = size.x;
    const height = size.y;
    const depth = size.z;
    
    const baseY = center.y / 2;

    //Front edge
    const frontZ = center.z + depth / 2;
    addEdgeLights((center.x - width / 2) + 5.25, (center.x + width / 2) - 5, 'x', null, frontZ - 1.7, baseY + 5.25, spacing, points);

    //left edge
    const leftX = center.x - width / 2;
    addEdgeLights((center.z - depth / 2) + 14, (center.z + depth / 2) - 2, 'z', leftX + 5.3, null, baseY + 5.25, spacing, points);

    //right edge
    const rightX = center.x + width / 2;
    addEdgeLights((center.z - depth / 2) + 14, (center.z + depth / 2) -2, 'z', rightX - 5, null, baseY + 5.25, spacing, points);

    return points;
}

function addLightsToRoofBackEdge(size, center){
    const points = [];
    const spacing = 0.3; // Spacing between lights
    
    // Calculate cottage dimensions in world space
    const width = size.x;
    const height = size.y;
    const depth = size.z;
    
    const baseY = center.y / 2;

    //Front edge
    const backZ = center.z - depth / 2;
    addEdgeLights((center.x - width / 2) + 1.25, (center.x + width / 2) - 1.25, 'x', null, backZ + 5.15, baseY + 3.75, spacing, points);

    return points;
}

function addLightsToRoofEdges(size, center){
    const points = [];
    const spacing = 0.3; // Spacing between lights
    
    // Calculate cottage dimensions in world space
    const width = size.x;
    const height = size.y;
    const depth = size.z;
    
    // Calculate the base height and roof peak height (lowered)
    const baseHeight = center.y + height / 2; // Top of the walls
    const roofPeakHeight = baseHeight - 1.75; // Peak of the roof (lowered)
    
    // Left side roof edge: goes from front edge, up to peak, down to back edge
    const leftX = center.x - width / 2 + 1; // Left edge X position (matching top fence)
    const frontZ = center.z + depth / 2 - 6; // Front edge Z position
    const backZ = center.z - depth / 2 + 6; // Back edge Z position
    
    // Front edge of left roof (lower Y)
    const leftFrontEdge = new THREE.Vector3(
        leftX,
        baseHeight - 8,  // Lower edge of roof (lowered)
        frontZ
    );
    
    // Peak of roof along left side (highest Y, center in Z)
    const leftPeak = new THREE.Vector3(
        leftX,
        roofPeakHeight,   // Peak height
        center.z          // Center of roof in Z
    );
    
    // Back edge of left roof (lower Y)
    const leftBackEdge = new THREE.Vector3(
        leftX,
        baseHeight - 8,  // Lower edge of roof (lowered)
        backZ
    );
    
    // Add lights going up the front-left side of the roof
    addDiagonalLights(leftFrontEdge, leftPeak, spacing, points);
    // Add lights going down the back-left side of the roof
    addDiagonalLights(leftPeak, leftBackEdge, spacing, points);
    
    // Right side roof edge: same pattern
    const rightX = center.x + width / 2 - 0.75; // Right edge X position (matching top fence)
    
    // Front edge of right roof (lower Y)
    const rightFrontEdge = new THREE.Vector3(
        rightX,
        baseHeight - 8,  // Lower edge of roof (lowered)
        frontZ
    );
    
    // Peak of roof along right side (highest Y, center in Z)
    const rightPeak = new THREE.Vector3(
        rightX,
        roofPeakHeight,   // Peak height
        center.z          // Center of roof in Z
    );
    
    // Back edge of right roof (lower Y)
    const rightBackEdge = new THREE.Vector3(
        rightX,
        baseHeight - 8,  // Lower edge of roof (lowered)
        backZ
    );
    
    // Add lights going up the front-right side of the roof
    addDiagonalLights(rightFrontEdge, rightPeak, spacing, points);
    // Add lights going down the back-right side of the roof
    addDiagonalLights(rightPeak, rightBackEdge, spacing, points);
    
    return points;
}

function addChristmasLightsToCottage(){
    // Find the cottage and group
    const cottage = getCottage();
    const cottageGroup = getCottageGroup();
    
    if (!cottage) {
        console.warn('Cottage not found, cannot add lights');
        return null;
    }
    
    // Update matrices to ensure world space calculations are correct
    cottage.updateMatrixWorld(true);
    
    // Calculate the cottage's bounding box to get its dimensions
    const box = new THREE.Box3().setFromObject(cottage);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // The bounding box center is in world space, but since the cottage group
    // is at the origin (0,0,0), world space coordinates = group local space coordinates
    // So we can use the center directly for positioning lights in the group
    
    const points = addLightsToFence(size, center);
    const topPoints = addLightsToTopFence(size, center);
    const roofPoints = addLightsToRoofEdges(size, center);
    const roofBackPoints = addLightsToRoofBackEdge(size, center);
    
    // Combine all points into a single array
    const allPoints = [...points, ...topPoints, ...roofPoints, ...roofBackPoints];
    const colors = new Float32Array(allPoints.length * 3);
    
    // Assign Christmas light colors in sequence
    allPoints.forEach((point, i) => {
        const colorIndex = i % lightColors.length;
        const c = new THREE.Color(lightColors[colorIndex]);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    });
    
    const geom = new THREE.BufferGeometry().setFromPoints(allPoints);
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    
    const material = new THREE.PointsMaterial({
        size: 0.15, // Slightly larger for visibility
        vertexColors: true,
        color: 0xffffff
    });
    
    const christmasLights = new THREE.Points(geom, material);
    christmasLights.name = 'christmasLights';
    
    // Add lights to the cottage group instead of the scene
    if (cottageGroup) {
        cottageGroup.add(christmasLights);
    } else {
        // Fallback: add to scene if group not found
        console.warn('Cottage group not found, adding lights to scene');
        scene.add(christmasLights);
    }
    
    return christmasLights;
}

function setupSnowPoints(){
    const count = 25000;
      
    
    // Create particle positions
    const points = [];
    for (let i = 0; i < count; i++) {
        let particle = new THREE.Vector3(
            Math.random() * (groundBounds.xMax - groundBounds.xMin) + groundBounds.xMin,  // x: -100 to 100
            Math.random() * (groundBounds.yMax - groundBounds.yMin) + groundBounds.yMin,  // y: 0 to 100 (falling from above)
            Math.random() * (groundBounds.zMax - groundBounds.zMin) + groundBounds.zMin   // z: -50 to 50
        );
        points.push(particle);
    }
    
    // Create velocity array
    const velocityArray = new Float32Array(count * 2);
    for (let i = 0; i < count * 2; i += 2) {
        velocityArray[i] = ((Math.random() - 0.5) / 5) * 0.1;
        velocityArray[i + 1] = (Math.random() / 5) * 0.1 + 0.01;
    }
    
    // Create geometry
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    geom.setAttribute('velocity', new THREE.BufferAttribute(velocityArray, 2));
    
    // Create material for snow
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8
    });
    
    // Create points object
    const snowPoints = new THREE.Points(geom, material);
    snowPoints.name = 'snow';
    
    return snowPoints;
}

function generateSnow(){
    const snowPoints = setupSnowPoints();
    scene.add(snowPoints);
    return snowPoints;
}

/**
 * Updates snow particle positions based on their velocities
 * Should be called every frame in the render loop
 */
export function updateSnow(){
    const snow = scene.children.find(child => child.name === 'snow');
    if (!snow) {
        return;
    }
    
    const positionArray = snow.geometry.attributes.position.array;
    const velocityArray = snow.geometry.attributes.velocity.array;
    
    for (let i = 0; i < snow.geometry.attributes.position.count; i++) {
        const velocityX = velocityArray[i * 2];
        const velocityY = velocityArray[i * 2 + 1];
        
        // Update positions
        positionArray[i * 3] += velocityX;     // x
        positionArray[i * 3 + 1] -= velocityY; // y (falling down)
        // z doesn't have velocity in the current setup
        
        // Wrap around x boundaries
        if (positionArray[i * 3] < groundBounds.xMin) {
            positionArray[i * 3] = groundBounds.xMax;
        } else if (positionArray[i * 3] > groundBounds.xMax) {
            positionArray[i * 3] = groundBounds.xMin;
        }
        
        // Wrap around y boundaries (when snow falls below ground, reset to top)
        if (positionArray[i * 3 + 1] < groundBounds.yMin) {
            positionArray[i * 3 + 1] = groundBounds.yMax;
            // Also randomize x position when wrapping to create continuous snowfall
            positionArray[i * 3] = Math.random() * (groundBounds.xMax - groundBounds.xMin) + groundBounds.xMin;
        } else if (positionArray[i * 3 + 1] > groundBounds.yMax) {
            positionArray[i * 3 + 1] = groundBounds.yMin;
        }
        
        // Wrap around z boundaries
        if (positionArray[i * 3 + 2] < groundBounds.zMin) {
            positionArray[i * 3 + 2] = groundBounds.zMax;
        } else if (positionArray[i * 3 + 2] > groundBounds.zMax) {
            positionArray[i * 3 + 2] = groundBounds.zMin;
        }
    }
    
    snow.geometry.attributes.position.needsUpdate = true;
}

function createIceMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0xaaddff,
        metalness: 0.0,
        roughness: 0.5,       // Higher roughness = more frosted
        transparent: true,
        opacity: 0.4,
        transmission: 0.7,
        thickness: 0.5,
        clearcoat: 1.0,       // Adds glossy layer
        clearcoatRoughness: 0.3,
        side: THREE.DoubleSide,
        map: loadIceTexture()
    });
}

function createIcyPond(){
    const circle = new THREE.Mesh(
        new THREE.CircleGeometry(25, 64),  // radius, segments
        createIceMaterial()
    );
    circle.rotation.x = -Math.PI / 2;  // Make it horizontal
    circle.position.x = -30;
    circle.position.y = -2.5;
    circle.name = 'pond';
    scene.add(circle);
    pond = circle; // Store reference for height calculations
}

function createNorthernLights() {
    // Create a wide, curved geometry for the aurora
    const width = 3000;  // Very wide to span the horizon
    const height = 1000;  // Height of the aurora curtain
    const geometry = new THREE.PlaneGeometry(width, height, 64, 32);
    
    // Curve the geometry to follow the sky dome
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        
        // Curve it backward (away from viewer)
        const curveFactor = 0.0003;
        positions[i + 2] = -Math.abs(x) * curveFactor * 100;
        
        // Also curve it upward slightly
        positions[i + 1] = y + Math.abs(x) * 0.05;
    }
    
    geometry.computeVertexNormals();
    
    // STEP 2: Create the Shader Material
    // This is where the magic happens - animating colors
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            color1: { value: new THREE.Color(0x00ff88) }, // Green
            color2: { value: new THREE.Color(0x0088ff) }, // Blue
            color3: { value: new THREE.Color(0x8800ff) }, // Purple
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            
            varying vec2 vUv;
            varying vec3 vPosition;
            
            // Noise function for organic movement
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            void main() {
                // Create flowing waves
                float wave1 = sin(vUv.x * 3.0 + time * 0.5) * 0.5 + 0.5;
                float wave2 = sin(vUv.x * 5.0 - time * 0.3) * 0.5 + 0.5;
                float wave3 = sin(vUv.x * 7.0 + time * 0.7) * 0.5 + 0.5;
                
                // Combine waves for complex pattern
                float pattern = wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2;
                
                // Fade out at edges (top and bottom)
                float verticalFade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
                
                // Fade out at horizontal edges
                float horizontalFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
                
                // Mix colors based on pattern
                vec3 finalColor = mix(color1, color2, pattern);
                finalColor = mix(finalColor, color3, wave3);
                
                // Calculate opacity with fading
                float opacity = pattern * verticalFade * horizontalFade * 0.6;
                
                gl_FragColor = vec4(finalColor, opacity);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending // Makes it glow!
    });
    
    const aurora = new THREE.Mesh(geometry, material);
    
    // STEP 3: Position the aurora in the sky
    aurora.position.set(0, 600, -1000); // Far back, high up
    aurora.rotation.x = Math.PI / 6; // Tilt downward slightly
    
    northernLights = aurora;
    scene.add(northernLights);
}

function loadIceTexture(){
    const loader = new THREE.TextureLoader();
    const iceTexture = loader.load(
        '/textures/ice.png',
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
            console.error('Error loading ice texture:', error);
        }
    );
    
    // Set wrapping and repeat immediately (in case texture loads synchronously)
    // iceTexture.wrapS = THREE.RepeatWrapping;
    // iceTexture.wrapT = THREE.RepeatWrapping;
    // iceTexture.repeat.set(10, 10);
    
    return iceTexture;
}

function createSnowmanBottom() {
    const snowmanGeometry = new THREE.SphereGeometry(2, 32, 32);
    const snowmanBottom = new THREE.Mesh(snowmanGeometry, snowMaterial);
    // Position relative to group (group will be at ground level)
    snowmanBottom.position.set(0, 1, 0); // 1 unit above group base
    snowmanBottom.castShadow = true;
    snowmanBottom.receiveShadow = true;
    return snowmanBottom;
}

function createSnowmanMiddle(){
    const snowmanGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const snowmanMiddle = new THREE.Mesh(snowmanGeometry, snowMaterial);
    // Position relative to group
    snowmanMiddle.position.set(0, 3, 0); // 3 units above group base
    snowmanMiddle.castShadow = true;
    snowmanMiddle.receiveShadow = true;
    return snowmanMiddle;
}

function createSnowmanTop(){
    const snowmanGeometry = new THREE.SphereGeometry(1, 32, 32);
    const snowmanTop = new THREE.Mesh(snowmanGeometry, snowMaterial);
    // Position relative to group
    snowmanTop.position.set(0, 5, 0); // 5 units above group base
    snowmanTop.castShadow = true;
    snowmanTop.receiveShadow = true;
    return snowmanTop;
}

function createSnowmanHat(){
    const snowmanHat = new THREE.Group();
    snowmanHat.add(createSnowmanHatBottom());
    snowmanHat.add(createSnowmanHatTop());
    snowmanHat.position.set(0, 0, 0);
    snowmanHat.castShadow = true;
    snowmanHat.receiveShadow = true;
    return snowmanHat;
}

function createSnowmanHatBottom(){
    const hatGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
    const hatMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
    });
    const snowmanHatBottom = new THREE.Mesh(hatGeometry, hatMaterial);
    snowmanHatBottom.position.set(0, 6, 0);
    snowmanHatBottom.castShadow = true;
    snowmanHatBottom.receiveShadow = true;
    return snowmanHatBottom;
}

function createSnowmanHatTop(){
    const hatGeometry = new THREE.CylinderGeometry(0.75, 0.75, 1, 32);
    const hatMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
    });
    const snowmanHatTop = new THREE.Mesh(hatGeometry, hatMaterial);
    snowmanHatTop.position.set(0, 6.5, 0);
    snowmanHatTop.castShadow = true;
    snowmanHatTop.receiveShadow = true;
    return snowmanHatTop;
}

function createCoalPiece(){
    const coalGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const coalMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
    });
    const coalPiece = new THREE.Mesh(coalGeometry, coalMaterial);
    coalPiece.castShadow = true;
    coalPiece.receiveShadow = true;
    return coalPiece;
}

function createSnowmanEyes(){
    const eyesGroup = new THREE.Group();
    const snowmanEye1 = createCoalPiece();
    const snowmanEye2 = createCoalPiece();
    snowmanEye1.position.set(0.5, 5.25, 0.8);
    snowmanEye2.position.set(-0.5, 5.25, 0.8);
    eyesGroup.add(snowmanEye1);
    eyesGroup.add(snowmanEye2);
    return eyesGroup;
}

function createSnowmanNose(){
    const noseGeometry = new THREE.ConeGeometry(0.15, 0.5, 32);
    const noseMaterial = new THREE.MeshStandardMaterial({
        color: 0xffa500,
        side: THREE.DoubleSide
    });
    const snowmanNose = new THREE.Mesh(noseGeometry, noseMaterial);
    snowmanNose.position.set(0, 5, 1.25);
    snowmanNose.rotation.x = Math.PI / 2;
    return snowmanNose;
}

function createSnowmanSmile(){
    const smileGroup = new THREE.Group();
    const piece1 = createCoalPiece();
    const piece2 = createCoalPiece();
    const piece3 = createCoalPiece();
    const piece4 = createCoalPiece();
    const piece5 = createCoalPiece();
    piece1.position.set(0.5, 4.75, 0.8);
    piece2.position.set(-0.5, 4.75, 0.8);
    piece3.position.set(0, 4.5, 0.85);
    piece4.position.set(0.3, 4.57, 0.85);
    piece5.position.set(-0.3, 4.57, 0.85);
    
    smileGroup.add(piece1);
    smileGroup.add(piece2);
    smileGroup.add(piece3);
    smileGroup.add(piece4);
    smileGroup.add(piece5);
    
    return smileGroup;
}

function createSnowmanFace(){
    const faceGroup = new THREE.Group();
    faceGroup.add(createSnowmanEyes());
    faceGroup.add(createSnowmanNose());
    faceGroup.add(createSnowmanSmile());
    return faceGroup;
}

function createSnowmanButtons(){
    const buttonsGroup = new THREE.Group();
    const button1 = createCoalPiece();
    const button2 = createCoalPiece();
    const button3 = createCoalPiece();
    button1.scale.set(1.5, 1.5, 1.5);
    button2.scale.set(1.5, 1.5, 1.5);
    button3.scale.set(1.5, 1.5, 1.5);
    button1.position.set(0, 3.85, 1.25);
    button2.position.set(0, 3, 1.5);
    button3.position.set(0, 1.75, 1.85);
    buttonsGroup.add(button1);
    buttonsGroup.add(button2);
    buttonsGroup.add(button3);
    return buttonsGroup;
}

function createSnowman(x, z) {
    snowmanGroup = new THREE.Group();
    snowmanGroup.add(createSnowmanBottom());
    snowmanGroup.add(createSnowmanMiddle());
    snowmanGroup.add(createSnowmanTop());
    snowmanGroup.add(createSnowmanHat());
    snowmanGroup.add(createSnowmanFace());
    snowmanGroup.add(createSnowmanButtons());
    snowmanGroup.position.set(x, getHeightAt(x, z), z);
    scene.add(snowmanGroup);
    //sceneObjects.push({ x, z });
    return snowmanGroup;
}

function createTreeTrunk(){
    const trunkGeometry = new THREE.CylinderGeometry(1, 1, 2, 32);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x654321, // a deeper brown
        side: THREE.DoubleSide
    });
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.set(0, 0.5, 0);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    return trunkMesh;
}

function createTreeBottom(){
    const bottomGeom = new THREE.CylinderGeometry(1.5, 3, 2.25, 32);
    const bottomMaterial = new THREE.MeshStandardMaterial({
        color: 0x023020, // dark green
        side: THREE.DoubleSide
    });
    const bottomMesh = new THREE.Mesh(bottomGeom, bottomMaterial);
    bottomMesh.position.set(0, 2, 0);
    bottomMesh.castShadow = true;
    bottomMesh.receiveShadow = true;
    return bottomMesh;
}

function createTreeMiddle(){
    const middleGeom = new THREE.CylinderGeometry(1, 2.25, 2.25, 32);
    const middleMaterial = new THREE.MeshStandardMaterial({
        color: 0x023020, // dark green
        side: THREE.DoubleSide
    });
    const middleMesh = new THREE.Mesh(middleGeom, middleMaterial);
    middleMesh.position.set(0, 4.25, 0);
    middleMesh.castShadow = true;
    middleMesh.receiveShadow = true;
    return middleMesh;
}

function createTreeTop(){
    const topGeom = new THREE.ConeGeometry(1.5, 2.25, 32);
    const topMaterial = new THREE.MeshStandardMaterial({
        color: 0x023020, // dark green
        side: THREE.DoubleSide
    });
    const topMesh = new THREE.Mesh(topGeom, topMaterial);
    topMesh.position.set(0, 6.5, 0);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    return topMesh;
}

function createBottomTreeSnow(){
    const bottomSnowGeom = new THREE.CylinderGeometry(2.8, 3.1, 0.5, 32);
    const bottomSnowMesh = new THREE.Mesh(bottomSnowGeom, snowMaterial);
    bottomSnowMesh.position.set(0, 1, 0);
    bottomSnowMesh.castShadow = true;
    bottomSnowMesh.receiveShadow = true;
    return bottomSnowMesh;
}

function createMiddleTreeSnow(){
    const middleSnowGeom = new THREE.CylinderGeometry(2.1, 2.35, 0.5, 32);
    const middleSnowMesh = new THREE.Mesh(middleSnowGeom, snowMaterial);
    middleSnowMesh.position.set(0, 3.25, 0);
    middleSnowMesh.castShadow = true;
    middleSnowMesh.receiveShadow = true;
    return middleSnowMesh;
}

function createTopTreeSnow(){
    const topSnowGeom = new THREE.CylinderGeometry(1.45, 1.75, 0.5, 32);
    const topSnowMesh = new THREE.Mesh(topSnowGeom, snowMaterial);
    topSnowMesh.position.set(0, 5.25, 0);
    topSnowMesh.castShadow = true;
    topSnowMesh.receiveShadow = true;
    return topSnowMesh;
}

function createTreeSnow(){
    const snowGroup = new THREE.Group();
    snowGroup.add(createBottomTreeSnow());
    snowGroup.add(createMiddleTreeSnow());
    snowGroup.add(createTopTreeSnow());
    return snowGroup;
}

async function loadTreeStar(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/christmas_star/scene.gltf');
        const star = gltf.scene.clone();
        
        star.position.set(0, 7.95, 0.05);
        star.castShadow = true;
        star.receiveShadow = true;
        star.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Make the star glow by adding emissive properties
                if (child.material) {
                    // Helper function to add emissive glow to a material
                    const addEmissiveGlow = (material) => {
                        if (!material) return material;
                        const newMaterial = material.clone();
                        newMaterial.emissive = new THREE.Color(0xffffaa); // Warm yellow-gold
                        newMaterial.emissiveIntensity = 0.5; // How bright it glows
                        newMaterial.needsUpdate = true;
                        return newMaterial;
                    };
                    
                    // Handle both single materials and arrays
                    child.material = Array.isArray(child.material)
                        ? child.material.map(addEmissiveGlow)
                        : addEmissiveGlow(child.material);
                }
            }
        });
        
        return star;
    } catch (error) {
        console.error('Cant load model:', error);
    }
}

function createTreeLights(){
    const lightsGroup = new THREE.Group();

    // Parameters for the tree segment locations in Y, approximate radii, and lights per ring
    const segments = [
        { y: 2, r: 3.25, lightsPerRing: 12 },      // bottom third (just above trunk) - most lights
        { y: 4.25, r: 2.35, lightsPerRing: 8 },     // middle triangle - fewer lights
        { y: 6.5, r: 1.25, lightsPerRing: 4 }   // top triangle just under star - even fewer lights
    ];

    // Helper function to create a ring of lights
    function createRing(centerY, radius, angleOffset, lightsPerRing) {
        const ringLights = [];
        const angleStep = (2 * Math.PI) / lightsPerRing;
        
        for (let i = 0; i < lightsPerRing; i++) {
            const angle = i * angleStep + angleOffset;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            
            // Choose random color for each light
            const color = lightColors[Math.floor(Math.random() * lightColors.length)];
            
            const spriteMaterial = new THREE.SpriteMaterial({
                color: color,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(x, centerY, z);
            sprite.scale.set(0.2, 0.2, 1);
            
            ringLights.push(sprite);
        }
        return ringLights;
    }

    // Create two rings for each segment (staggered for zigzag pattern)
    for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        // Stagger offset for zigzag pattern (half the angle between lights)
        const staggerOffset = Math.PI / seg.lightsPerRing;
        
        // Bottom ring: larger radius, positioned lower
        const bottomRingRadius = seg.r * 0.85;
        const bottomRingY = seg.y - 0.3;
        const bottomRingLights = createRing(bottomRingY, bottomRingRadius, 0, seg.lightsPerRing);
        bottomRingLights.forEach(light => lightsGroup.add(light));
        
        // Top ring: smaller radius, positioned higher, staggered for zigzag
        const topRingRadius = seg.r * 0.65;
        const topRingY = seg.y + 0.3;
        const topRingLights = createRing(topRingY, topRingRadius, staggerOffset, seg.lightsPerRing);
        topRingLights.forEach(light => lightsGroup.add(light));
    }

    return lightsGroup;
}

async function createTree(x, z){
    const treeGroup = new THREE.Group();
    treeGroup.add(createTreeTrunk());
    treeGroup.add(createTreeBottom());
    treeGroup.add(createTreeMiddle());
    treeGroup.add(createTreeTop());
    treeGroup.add(createTreeSnow());
    treeGroup.add(createTreeLights());
    
    const star = await loadTreeStar();
    if (star) {
        treeGroup.add(star);
    }
    
    treeGroup.position.set(x, getHeightAt(x, z), z);
    scene.add(treeGroup);
    return treeGroup;
}

/**
 * Checks if a position is valid for placing objects (snowmen, trees, etc.)
 * @param {number} x - X coordinate to check
 * @param {number} z - Z coordinate to check
 * @param {Array<{x: number, z: number, minSpacing: number}>} existingObjects - Array of existing objects with their positions and minimum spacing requirements
 * @param {number} minDistanceFromStructures - Minimum distance from pond/cottage
 * @param {number} newObjectSpacing - Spacing requirement for the new object being placed
 * @param {Array<{x: number, z: number, minSpacing: number}>} excludePositions - Optional array of specific positions to exclude (e.g., manually placed objects)
 * @returns {boolean} True if the position is valid, false otherwise
 */
function isValidPosition(x, z, existingObjects = [], minDistanceFromStructures = 6, newObjectSpacing = 0, excludePositions = []) {
    // Constants for structure positions
    const COTTAGE_CENTER = { x: 25, z: 10 };
    const COTTAGE_EXCLUSION_RADIUS = 12; // About the size of the cottage group
    const POND_CENTER = { x: -30, z: 0 }; // Match actual pond position from createIcyPond()
    const POND_RADIUS = 25;
    
    // Check distance from pond
    const pondDist = Math.sqrt(Math.pow(x - POND_CENTER.x, 2) + Math.pow(z - POND_CENTER.z, 2));
    if (pondDist < POND_RADIUS + minDistanceFromStructures) {
        return false;
    }
    
    // Check distance from cottage
    const cottageDist = Math.sqrt(Math.pow(x - COTTAGE_CENTER.x, 2) + Math.pow(z - COTTAGE_CENTER.z, 2));
    if (cottageDist < COTTAGE_EXCLUSION_RADIUS + minDistanceFromStructures) {
        return false;
    }
    
    // Check distance from exclude positions (e.g., manually placed objects)
    for (const excludePos of excludePositions) {
        const dist = Math.sqrt(Math.pow(x - excludePos.x, 2) + Math.pow(z - excludePos.z, 2));
        // Use maximum of new object spacing and exclude position spacing
        const requiredSpacing = Math.max(newObjectSpacing, excludePos.minSpacing);
        if (dist < requiredSpacing) {
            return false;
        }
    }
    
    // Check distance from all existing objects
    // Use the maximum of the new object's spacing and each existing object's spacing
    for (const existingObj of existingObjects) {
        const dist = Math.sqrt(Math.pow(x - existingObj.x, 2) + Math.pow(z - existingObj.z, 2));
        const requiredSpacing = Math.max(newObjectSpacing, existingObj.minSpacing);
        if (dist < requiredSpacing) {
            return false;
        }
    }
    
    return true;
}

/**
 * Generates items evenly distributed across the scene using a grid-based approach
 * @param {number} count - Number of items to generate
 * @param {number} spacing - Minimum distance between items of this type
 * @param {number} minDistanceFromStructures - Minimum distance from pond/cottage
 * @param {function} createFunction - Function that creates the item, takes (x, z) as parameters (can be async)
 * @param {Array<{x: number, z: number, minSpacing: number}>} existingObjects - Optional array of existing objects to avoid (e.g., other item types)
 * @param {number} edgeClearance - Clearance from ground edges (default: 5)
 * @param {number} maxTriesPerCell - Maximum attempts to place an item in each cell (default: 20)
 * @returns {Promise<Array<{x: number, z: number}>>} Promise that resolves to array of placed item positions
 */
async function generateItem(count, spacing, minDistanceFromStructures, createFunction, existingObjects = [], edgeClearance = 5, maxTriesPerCell = 20) {
    // Calculate available area (excluding edge clearance)
    const availableWidth = (groundBounds.xMax - groundBounds.xMin) - (edgeClearance * 2);
    const availableDepth = (groundBounds.zMax - groundBounds.zMin) - (edgeClearance * 2);
    
    // Calculate grid dimensions for even distribution
    // Try to create a roughly square grid
    const gridCols = Math.ceil(Math.sqrt(count * (availableWidth / availableDepth)));
    const gridRows = Math.ceil(count / gridCols);
    
    const cellWidth = availableWidth / gridCols;
    const cellDepth = availableDepth / gridRows;
    
    // Track positions of placed items
    const placedItems = [];
    let itemIndex = 0;

    // Iterate through grid cells and place items
    for (let row = 0; row < gridRows && itemIndex < count; row++) {
        for (let col = 0; col < gridCols && itemIndex < count; col++) {
            // Calculate the center of this grid cell
            const cellCenterX = groundBounds.xMin + edgeClearance + (col + 0.5) * cellWidth;
            const cellCenterZ = groundBounds.zMin + edgeClearance + (row + 0.5) * cellDepth;
            
            // Try to place an item in this cell with some jitter
            const maxJitter = Math.min(cellWidth, cellDepth) * 0.3; // 30% of cell size
            let tries = 0;
            let placed = false;
            
            while (tries < maxTriesPerCell && !placed) {
                // Add random jitter within the cell
                const jitterX = (Math.random() - 0.5) * maxJitter;
                const jitterZ = (Math.random() - 0.5) * maxJitter;
                const x = cellCenterX + jitterX;
                const z = cellCenterZ + jitterZ;
                
                // Make sure we're still within bounds
                if (x < groundBounds.xMin + edgeClearance || x > groundBounds.xMax - edgeClearance ||
                    z < groundBounds.zMin + edgeClearance || z > groundBounds.zMax - edgeClearance) {
                    tries++;
                    continue;
                }
                
                // Combine existing objects with already placed items of this type
                const allExistingObjects = [
                    ...existingObjects,
                    ...placedItems.map(pos => ({ x: pos.x, z: pos.z, minSpacing: spacing }))
                ];
                
                // Check if position is valid
                // Pass spacing as newObjectSpacing to ensure proper spacing between different object types
                if (isValidPosition(x, z, allExistingObjects, minDistanceFromStructures, spacing)) {
                    await createFunction(x, z);
                    placedItems.push({ x, z });
                    placed = true;
                    itemIndex++;
                } else {
                    tries++;
                }
            }
        }
    }
    
    return placedItems;
}

async function generateSnowmen(){
    const SNOWMAN_COUNT = 7;
    const SNOWMAN_MIN_DIST = 6; // Minimum distance from cottage center and pond/cottage edge
    const SNOWMAN_SPACING = 8; // Minimum distance between snowmen
    
    // Generate snowmen using the general function
    const placedSnowmen = await generateItem(
        SNOWMAN_COUNT,
        SNOWMAN_SPACING,
        SNOWMAN_MIN_DIST,
        createSnowman,
        sceneObjects // Pass existing scene objects to avoid
    );
    
    // Add snowmen positions to sceneObjects so other items can avoid them
    for (const pos of placedSnowmen) {
        sceneObjects.push({ x: pos.x, z: pos.z, minSpacing: SNOWMAN_SPACING });
    }
}

async function generateTrees(){
    const TREE_COUNT = 10;
    const TREE_SPACING = 10;
    const TREE_MIN_DIST = 6;
    const placedTrees = await generateItem(
        TREE_COUNT,
        TREE_SPACING,
        TREE_MIN_DIST,
        createTree,
        sceneObjects // Pass existing scene objects to avoid
    );
    
    // Add trees positions to sceneObjects so other items can avoid them
    for (const pos of placedTrees) {
        sceneObjects.push({ x: pos.x, z: pos.z, minSpacing: TREE_SPACING });
    }
}

async function loadCampfire(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/campfire/scene.gltf');
        const campfire = gltf.scene.clone();
        campfire.name = 'campfire';
        
        // Enable shadows on the group and all its children
        campfire.castShadow = true;
        campfire.receiveShadow = true;
        campfire.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        return campfire;
    } catch (error) {
        console.error('Error details:', error.message, error.stack);
    }
    return null;
}

async function createCampfire(){
    const campfireGroup = new THREE.Group();
    campfireGroup.name = 'campfireGroup';
    
    const campfireModel = await loadCampfire();
    if (campfireModel) {
        // Calculate bounding box to understand model size
        const box = new THREE.Box3().setFromObject(campfireModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Scale the model UP since it's very small (0.036 units)
        // Scale to make it about 1-2 units tall for visibility
        const targetHeight = 3; // Desired height in world units
        const scaleFactor = targetHeight / size.y;
        campfireModel.scale.setScalar(scaleFactor);
        
        // Center the model at origin (in case it's offset)
        campfireModel.position.sub(center);
        
        campfireGroup.add(campfireModel);
        
        // Position the campfire at ground height
        const groundHeight = getHeightAt(-75, -3);
        campfireGroup.position.set(-75, groundHeight, -3);
        
    } else {
        console.warn('Campfire model failed to load');
    }
    
    sceneObjects.push(campfireGroup);
    scene.add(campfireGroup);
    return campfireGroup;
}

async function loadLog(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/log/scene.gltf');
        const log = gltf.scene.clone();
        log.name = 'log';
        
        // Enable shadows on the group and all its children
        log.castShadow = true;
        log.receiveShadow = true;
        log.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        log.scale.setScalar(0.2);
        
        return log;
    } catch (error) {
        console.error('Error details:', error.message, error.stack);
    }
    return null;
}

async function addLogsAroundCampfire(){
    const logGroup = new THREE.Group();
    
    // Load all logs
    const log1 = await loadLog();
    const log2 = await loadLog();
    const log3 = await loadLog();
    const log4 = await loadLog();
    
    log1.position.set(-80, getHeightAt(-80, -3), -3);
    log2.position.set(-70, getHeightAt(-70, -3), -3);
    log3.position.set(-75, getHeightAt(-75, -8), -8);
    log4.position.set(-75, getHeightAt(-75, 2), 2);

    log1.rotation.y = Math.PI / 2;
    log2.rotation.y = Math.PI / 2;

    logGroup.add(log1);
    logGroup.add(log2);
    logGroup.add(log3);
    logGroup.add(log4);
    
    scene.add(logGroup);
    sceneObjects.push(logGroup);
    return logGroup;
}

function makeFireCrackle(){
    //use spacial sound to make fire crackle as you get closer to the campfire
}

function createPath(){
    //I want to create a path that makes a loop around the scene (outside of the cottage [the path should lead to the frontdoor], around the capfire, and around the pond)
    //I want it to be made up of a bunch of stones (reuse the same geometry and transform as needed)
    //generate the needed code below
    const path = new THREE.Group();
    for (let i = 0; i < 10; i++) {
        const stone = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        stone.position.set(Math.random() * 10 - 5, 0, Math.random() * 10 - 5);
        path.add(stone);
    }
    scene.add(path);
}

export async function setupOutdoorScene(){    
    setupLights();
    createGround();
    //createMoon();
    //await generateClouds();
    await generateElfAtOrigin();
    //followElf();
    await generateCottage();
    addChristmasLightsToCottage();
    generateSnow();
    createIcyPond();
    await createCampfire();
    await addLogsAroundCampfire();
    await generateSnowmen();
    //generateTestBoxes();
    await generateTrees();   
    initKeyboardListeners();
    createNorthernLights();
    //createPath();
    console.log('Scene setup complete');
    return { scene, camera };
}

