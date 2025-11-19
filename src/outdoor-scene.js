import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

//this file will setup the outdoor scene
//it is incredibly important that we break down EVERYTHING into as many smaller functions as possible
const scene = createScene();
const camera = setupCamera();
let cameraPitch = 0;
let ground = null;
let pond = null;
let elf = null;
export let northernLights = null;
let snowmanGroup = null;
let campfireGroup = null;

const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: loadSnowTexture()
});

let sceneObjects = [];
let audioListener = null;
let fireCrackleSound = null;
const keysPressed = {};

const groundBounds = {
    xMin: -100,
    xMax: 100,
    zMin: -50,
    zMax: 50,
    yMin: -10,
    yMax: 100
};

const lightColors = [
    0xff0000,
    0xffff00,
    0x00ff00,
    0x00ffff,
    0x0000ff,
    0xff00ff,
    0xffffff,
    0xffa500
];



/**
 * Creates and initializes the main THREE.js scene.
 * 
 * Sets the scene background to a deep night-sky blue/purple color (hex: 0x181848).
 * This function does not add any objects to the scene.
 *
 * @returns {THREE.Scene} The newly created scene instance.
 */
function createScene(){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181848);
    return scene;
}

/**
 * Creates and configures a PerspectiveCamera for the outdoor scene.
 * 
 * The camera is set up for a third-person view, positioned initially behind and above
 * the expected location of the player character (the elf), looking slightly ahead.
 * 
 * - Field of view: 70 degrees
 * - Aspect ratio: 1 (should be updated to match renderer later)
 * - Near plane: 0.1
 * - Far plane: 2000
 * - Initial position: (0, 5, -8) -- behind and above the elf at (0, 0, 0)
 * - Looks towards: (0, 1, 3) -- slightly ahead of the elf
 * 
 * @returns {THREE.PerspectiveCamera} Configured perspective camera
 */
function setupCamera(){
    const camera = new THREE.PerspectiveCamera(
        70,
        1,
        0.1,
        2000
    );

    const cameraDistance = 8;
    const cameraHeight = 5;
    camera.position.set(0, cameraHeight, -cameraDistance);
    camera.lookAt(0, 1, 3);

    return camera;
}

/**
 * Updates the camera position and orientation to follow the elf character from a third-person perspective.
 *
 * This function positions the camera behind and above the elf, maintaining a fixed distance and height 
 * relative to the elf's current position and facing direction (rotation.y). The camera "looks at" a point 
 * slightly ahead of the elf, with vertical adjustment based on the current camera pitch
 * (controlled elsewhere, e.g. via user input to look up/down).
 *
 * If the elf object is not yet assigned, attempts to find the elf in the scene by name.
 * If the elf cannot be found, the function returns early.
 * 
 * Camera placement:
 *   - The camera is placed behind the elf at a specified distance (cameraDistance) and above (cameraHeight).
 *   - The look direction is calculated by projecting a point ahead of the elf, with pitch applied to the Y axis.
 *
 * Global dependencies:
 *   - Uses `elf`, `scene`, and `camera` objects in global scope.
 *   - Uses `cameraPitch` global variable for vertical look adjustment.
 * 
 * No parameters. Camera is updated in-place (side effect function).
 */
export function followElf(){
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    
    if (!elf) {
        return;
    }
    
    const cameraDistance = 8;
    const cameraHeight = 5;
    
    const facingAngle = elf.rotation.y;
    
    const cameraX = elf.position.x - Math.sin(facingAngle) * cameraDistance;
    const cameraZ = elf.position.z - Math.cos(facingAngle) * cameraDistance;
    const cameraY = elf.position.y + cameraHeight;
    
    camera.position.set(cameraX, cameraY, cameraZ);
    
    const lookAheadDistance = 3;
    const lookX = elf.position.x + Math.sin(facingAngle) * lookAheadDistance;
    const lookZ = elf.position.z + Math.cos(facingAngle) * lookAheadDistance;
    const baseLookY = elf.position.y + 1;
    
    const pitchOffset = Math.sin(cameraPitch) * 5;
    const lookY = baseLookY + pitchOffset;
    
    camera.lookAt(lookX, lookY, lookZ);
}

/**
 * Sets up the main lighting for the outdoor scene.
 *
 * This function adds two primary types of lights to the scene:
 *   1. AmbientLight: Provides a soft, uniform white light to brighten all objects and reduce harsh shadows.
 *   2. DirectionalLight: Simulates sunlight by producing parallel light rays from above, casting realistic shadows.
 *
 * Shadow Configuration:
 *   - The DirectionalLight is configured to cast shadows.
 *   - The shadow map size is increased (2048x2048) for higher quality shadows.
 *   - The shadow camera's bounds (near, far, left, right, top, bottom) are set to cover a large area (the whole ground and more).
 *   - The directional light's target is set at the origin to illuminate the scene center.
 *
 * This function assumes global access to the THREE, scene objects.
 * No parameters; lights are added to the global scene as a side effect.
 */
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
 * Modifies the height (Z coordinates) of a ground geometry to create natural rolling hills.
 *
 * The function takes in a THREE.BufferGeometry (typically PlaneGeometry), and for each vertex, uses a combination
 * of sine and cosine functions to perturb the vertex height, producing smooth undulating hills and valleys. 
 *
 * Geometry Orientation Notes:
 *   - PlaneGeometry is in the XY plane (Z=0), but the ground is rotated -90° around X after creation.
 *   - Thus, X remains X (width), Y becomes -Z (depth in world space), Z becomes Y (height/up in world space).
 *
 * Side Effects:
 *   - Alters the given geometry in-place, updating all Z values.
 *   - Flags the geometry to update vertex positions.
 *   - Recomputes vertex normals for proper lighting.
 *
 * @param {THREE.BufferGeometry} geometry - The ground geometry to be modified in-place.
 */
function modifyTerrainHeights(geometry) {
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        
        const height = Math.sin(vertex.x * 0.05) * Math.cos(vertex.y * 0.05) * 5;
        
        positions.setZ(i, height);
    }
    
    positions.needsUpdate = true;
    
    geometry.computeVertexNormals();
}

/**
 * Creates and adds the ground mesh to the scene.
 *
 * - Generates a large plane geometry to represent the snowy ground.
 * - Modifies the plane geometry in-place to create rolling hills using the `modifyTerrainHeights` function,
 *   resulting in smooth, natural undulations.
 * - Applies a snow material with a repeating snow texture.
 * - Rotates the ground mesh so it's horizontal (flat), and positions it at ground level (y = 0).
 * - Enables shadow casting and receiving for realistic lighting effects.
 * - Adds the ground mesh to the global scene.
 *
 * Side effects:
 *   - Updates the global `ground` variable.
 *   - Adds the ground to the global scene.
 */
function createGround(){
    // TO DO: make the ground smoother (get rid of the lines and make it smooth)
    const groundGeometry = new THREE.PlaneGeometry(200, 100, 50, 25);
    
    modifyTerrainHeights(groundGeometry);

    ground = new THREE.Mesh(groundGeometry, snowMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.castShadow = true;
    ground.receiveShadow = true;
    scene.add(ground);
}

/**
 * Loads and configures the snow texture used for the ground.
 *
 * - Loads the snow texture from '/textures/snow.png' using THREE.TextureLoader.
 * - Sets the texture's wrapping mode to repeat in both S and T (horizontal and vertical) directions.
 * - Repeats the texture 10 times in each direction for proper tiling across the ground mesh.
 * - Handles errors if the texture fails to load and logs them to the console.
 * - Ensures wrapping and repeat settings are applied both in the onLoad callback (for async loads)
 *   and immediately after load (for synchronous loads, e.g., from browser cache).
 *
 * @returns {THREE.Texture} The configured snow texture ready to use in a material.
 */
function loadSnowTexture() {
    const loader = new THREE.TextureLoader();
    const snowTexture = loader.load(
        '/textures/snow.png',
        (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(10, 10);
        },
        undefined,
        (error) => {
            console.error('Error loading snow texture:', error);
        }
    );
    
    snowTexture.wrapS = THREE.RepeatWrapping;
    snowTexture.wrapT = THREE.RepeatWrapping;
    snowTexture.repeat.set(10, 10);
    
    return snowTexture;
}


/**
 * Generates a random position vector for a cloud in the scene sky.
 *
 * - Ensures newly generated position does not overlap closely (within 5 units) with any previously generated cloud positions in the session.
 * - Tries up to 100 times to find a non-overlapping position.
 * - Positions are in world coordinates:
 *   - x: Range from -100 to 100
 *   - y: Range from 50 to 100 (height above ground)
 *   - z: Range from -50 to 50
 * - Records all previous positions statically on the function for future checks.
 *
 * @returns {THREE.Vector3} The generated cloud position in world coordinates.
 */
function generateCloudPosition() {
    if (!generateCloudPosition.pastPositions) {
        generateCloudPosition.pastPositions = [];
    }
    let attempt = 0;
    let cloudPosition;
    do {
        cloudPosition = new THREE.Vector3(
            Math.random() * 200 - 100, // x: -100 to 100
            Math.random() * 50 + 50,   // y: 50 to 100
            Math.random() * 100 - 50   // z: -50 to 50
        );

        var tooClose = generateCloudPosition.pastPositions.some(pos =>
            pos.distanceTo(cloudPosition) < 5
        );
        attempt++;
    } while (tooClose && attempt < 100);

    generateCloudPosition.pastPositions.push(cloudPosition);

    return cloudPosition;
}


/**
 * Asynchronously creates a single cloud object and adds it to the scene.
 *
 * This function loads a GLTF model of a cloud from the /models/clouds/scene.gltf
 * directory, clones it for reuse, scales it down for appropriate scene size, and
 * positions it using a randomly generated, non-overlapping sky position.
 * All mesh children within the model have shadows enabled (cast and receive).
 *
 * @async
 * @function
 * @returns {Promise<THREE.Object3D|undefined>} Returns the created cloud object added to the scene,
 * or undefined if model loading fails.
 */
async function createCloud(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/clouds/scene.gltf');
        const cloud = gltf.scene.clone();
        
        cloud.position.copy(generateCloudPosition());
        
        cloud.scale.setScalar(0.01);
        
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
 * Asynchronously generates and adds multiple cloud objects to the scene.
 *
 * This function creates 50 clouds by calling the createCloud() function for each,
 * ensuring all clouds are created and added asynchronously. Uses Promise.all to
 * await completion of all cloud creation tasks before resolving.
 *
 * @async
 * @function
 * @returns {Promise<void>} Resolves when all cloud objects have been created and added to the scene.
 */
async function generateClouds() {
    const clouds = [];
    for (let i = 0; i < 50; i++) {
        clouds.push(createCloud());
    }
    await Promise.all(clouds);
}

/**
 * Asynchronously loads the Christmas elf 3D model and adds it to the scene at the origin.
 *
 * This function loads the 'christmas_elf' model from the /models directory using GLTFLoader,
 * clones the loaded scene, scales and positions the elf at the world origin (0, 0, 0),
 * and adds it to the global scene. The elf object is referenced globally as 'elf'
 * for future interaction. If loading fails, an error is logged and nothing is returned.
 *
 * @async
 * @function
 * @returns {Promise<THREE.Object3D|undefined>} Resolves to the added elf object, or undefined if loading fails.
 */
async function generateElfAtOrigin(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/christmas_elf/scene.gltf');
        elf = gltf.scene.clone();
        
        elf.name = 'elf';
        elf.position.set(0, 0, 0);
        elf.scale.setScalar(0.04);
        
        scene.add(elf);
        return elf;
    } catch (error) {
        console.error('Cant load model:', error);
    }
}

/**
 * Moves the elf character in the scene based on arrow key inputs.
 *
 * The movement is relative to the elf's current facing direction (its y-rotation),
 * allowing the elf to move forward, backward, or strafe left/right on the XZ plane.
 * Only one direction is allowed at a time (no diagonal movement).
 * Arrow key states are tracked via the keysPressed object:
 *   - 'arrowup'    : Move forward
 *   - 'arrowdown'  : Move backward
 *   - 'arrowleft'  : Strafe left
 *   - 'arrowright' : Strafe right
 * 
 * After moving, the elf's Y position is set to match the ground or pond height at its new location.
 * If no arrow keys are pressed, but the elf exists, its Y position is updated to keep it on the surface.
 * If an elf reference is not available, this function will attempt to find the elf object in the scene.
 *
 * @export
 * @function moveElf
 */
export function moveElf(){
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    if (!elf) return;
    
    if (!keysPressed['arrowup'] && !keysPressed['arrowdown'] && 
        !keysPressed['arrowleft'] && !keysPressed['arrowright']) {
        elf.position.y = getHeightAt(elf.position.x, elf.position.z);
        return;
    }
    
    const moveSpeed = 0.1;
    
    const elfRotation = elf.rotation.y;
    
    const forward = new THREE.Vector3(
        Math.sin(elfRotation),
        0,
        Math.cos(elfRotation)
    );
    
    const right = new THREE.Vector3(
        Math.sin(elfRotation + Math.PI / 2),
        0,
        Math.cos(elfRotation + Math.PI / 2)
    );
    
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

/**
 * Adjusts the elf's rotation and the camera's pitch based on user keyboard input.
 *
 * This function allows the player to look around by:
 *   - Rotating the elf left/right with the A/D keys.
 *   - Adjusting the camera's vertical pitch up/down with the W/S keys.
 *
 * The function will first attempt to obtain a reference to the elf in the scene if one is not already available.
 * If 'elf' is not present in the scene, the function returns early.
 *
 * Controls:
 *   - 'a': Turn the elf left (increase rotation.y)
 *   - 'd': Turn the elf right (decrease rotation.y)
 *   - 'w': Look up (increase cameraPitch, limited by maxPitch)
 *   - 's': Look down (decrease cameraPitch, limited by -maxPitch)
 *
 * Turn and look speeds are adjustable via the turnSpeed and lookSpeed constants below.
 * The camera pitch is clamped between -maxPitch and maxPitch radians.
 *
 * @export
 * @function lookAround
 */
export function lookAround(){
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    
    if (!elf) {
        return;
    }

    const turnSpeed = 0.05;
    if (keysPressed['a']) {
        elf.rotation.y += turnSpeed;
    }
    if (keysPressed['d']) {
        elf.rotation.y -= turnSpeed;
    }
    
    const lookSpeed = 0.02;
    const maxPitch = Math.PI / 3;
    if (keysPressed['w']) {
        cameraPitch = Math.min(cameraPitch + lookSpeed, maxPitch);
    }
    if (keysPressed['s']) {
        cameraPitch = Math.max(cameraPitch - lookSpeed, -maxPitch);
    }
}

/**
 * Helper function to get the height at a given (x, z) position by raycasting against a mesh object.
 * 
 * @param {THREE.Object3D} mesh - The mesh object to raycast against (e.g., ground or pond)
 * @param {number} x - X coordinate in world space
 * @param {number} z - Z coordinate in world space
 * @returns {number|null} The Y coordinate (height) at the given position, or null if no intersection
 */
function getHeightFromMesh(mesh, x, z) {
    if (!mesh) {
        return null;
    }
    
    mesh.updateMatrixWorld();
    
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3(x, 1000, z);
    const direction = new THREE.Vector3(0, -1, 0);
    raycaster.set(origin, direction);
    
    const intersects = raycaster.intersectObject(mesh, false);
    
    if (intersects.length > 0) {
        return intersects[0].point.y;
    }
    
    return null;
}

/**
 * Gets the height at a given (x, z) position by checking both ground and pond surfaces.
 * 
 * For the ground, if raycasting fails, falls back to calculating height using the terrain formula.
 * For the pond, only checks if the point is within the pond's radius.
 * Returns the higher of the two heights (elf walks on top of whichever is higher).
 * 
 * @param {number} x - X coordinate in world space
 * @param {number} z - Z coordinate in world space
 * @returns {number} The Y coordinate (height) at the given position
 */
function getHeightAt(x, z){
    let groundHeight = getHeightFromMesh(ground, x, z);
    
    if (groundHeight === null) {
        groundHeight = Math.sin(x * 0.05) * Math.cos(-z * 0.05) * 5;
    }
    
    let pondHeight = null;
    if (pond) {
        const pondRadius = 25;
        
        const distanceFromCenter = Math.sqrt(
            Math.pow(x - pond.position.x, 2) + Math.pow(z - pond.position.z, 2)
        );
        
        if (distanceFromCenter <= pondRadius) {
            pondHeight = getHeightFromMesh(pond, x, z);
        }
    }
    
    if (pondHeight !== null) {
        return Math.max(groundHeight, pondHeight);
    }
    
    return groundHeight;
}

/**
 * Normalizes a keyboard event key to a consistent format.
 * Converts arrow keys (ArrowUp, ArrowDown, etc.) to lowercase format (arrowup, arrowdown, etc.)
 * and converts other keys to lowercase.
 * 
 * @param {string} key - The key from the keyboard event (e.key)
 * @returns {string} Normalized key string
 */
function normalizeKey(key) {
    if (key.startsWith('Arrow')) {
        return 'arrow' + key.slice(5).toLowerCase();
    }
    return key.toLowerCase();
}

/**
 * Checks if a key is one of the tracked movement/control keys.
 * 
 * @param {string} key - The normalized key string
 * @returns {boolean} True if the key is tracked, false otherwise
 */
function isTrackedKey(key) {
    const trackedKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    return trackedKeys.includes(key);
}

/**
 * Initializes keyboard event listeners to track movement and control key presses.
 * 
 * This function adds 'keydown' and 'keyup' event listeners to the window. 
 * When a tracked key (W, A, S, D, or arrow keys) is pressed or released,
 * it updates the corresponding entry in the `keysPressed` object to reflect 
 * the current state (true for pressed, false for released). It also prevents 
 * the default browser behavior for these keys to avoid unintended scrolling 
 * or other side effects.
 */
function initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
        const key = normalizeKey(e.key);
        if (isTrackedKey(key)) {
            keysPressed[key] = true;
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        const key = normalizeKey(e.key);
        if (isTrackedKey(key)) {
            keysPressed[key] = false;
            e.preventDefault();
        }
    });
}

/**
 * Loads the cottage GLTF model and applies custom material colors.
 * 
 * This function loads the winter house model, clones it, applies custom colors to materials
 * based on their names, and enables shadows.
 * 
 * @async
 * @returns {Promise<THREE.Object3D|null>} The loaded and configured cottage object, or null if loading fails
 */
async function loadCottage() {
    const loader = new GLTFLoader();
    
    try {
        const gltf = await loader.loadAsync('/models/winter_house/scene.gltf');
        const cottage = gltf.scene.clone();
        cottage.name = 'cottage';
        
        const materialColors = {
            'testTile': new THREE.Color(0.0550536, 0.0564653, 0.0649351),
            'panel': new THREE.Color(0.345098, 0.509804, 0.564706),
            'housePaint': new THREE.Color(0.815686, 0.811765, 0.843137),
            'snow': new THREE.Color(1.0, 1.0, 1.0),
            'chimney': new THREE.Color(1.0, 1.0, 1.0), 
            'windowFrame': new THREE.Color(0.905882, 0.85098, 0.901961),
            'windowGlass': new THREE.Color(0.013200, 0.09649, 0.09649)
        };
        
        cottage.traverse((child) => {
            if (child.isMesh && child.material) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                const matName = child.material.name;
                const targetColor = materialColors[matName];
                
                if (targetColor) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: targetColor,
                        map: child.material.map || null,
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
        
        console.log('Cottage loaded with manual material colors');
        return cottage;
    } catch (error) {
        console.error('Can\'t load model:', error);
        return null;
    }
}

/**
 * Generates and positions the cottage in the scene.
 * 
 * This function loads the cottage model, creates a group for it (and future lights),
 * positions it at the specified location, and adds it to the scene.
 * 
 * @async
 * @returns {Promise<THREE.Group|null>} The cottage group added to the scene, or null if loading fails
 */
async function generateCottage() {
    const cottage = await loadCottage();
    
    if (!cottage) {
        return null;
    }
    
    const groundHeight = getHeightAt(25, 10);
    cottage.position.set(25, (groundHeight + 7) / 2, 10);
    cottage.scale.setScalar(0.009);
    cottage.rotation.y = Math.PI;
    
    const cottageGroup = new THREE.Group();
    cottageGroup.name = 'cottageGroup';
    cottageGroup.add(cottage);
    
    scene.add(cottageGroup);
    return cottageGroup;
}

/**
 * Retrieves the cottage mesh from the scene.
 *
 * Searches the scene for a group named 'cottageGroup', then looks
 * for a child mesh named 'cottage' within that group. Returns the
 * mesh if found, otherwise returns undefined.
 *
 * @returns {THREE.Object3D|undefined} The cottage mesh, or undefined if not found.
 */
function getCottage() {
    const cottageGroup = scene.children.find(child => child.name === 'cottageGroup');
    if (cottageGroup) {
        const cottage = cottageGroup.children.find(child => child.name === 'cottage');
        if (cottage) {
            return cottage;
        }
    }
}

/**
 * Retrieves the group representing the cottage from the scene.
 *
 * Searches the scene's immediate children for an Object3D named 'cottageGroup'.
 * If found, returns the group. If not found, logs a warning and returns null.
 *
 * @returns {THREE.Group|null} The cottage group if present, otherwise null.
 */
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
            point = new THREE.Vector3(v, baseY + yOffset, fixed2);
        } else if (axis === 'z') {
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
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    const distance = direction.length();
    
    direction.normalize();
    
    for (let t = 0; t < distance - 0.01; t += spacing) {
        const point = new THREE.Vector3().copy(startPoint);
        point.addScaledVector(direction, t);
        points.push(point);
    }
    
    points.push(endPoint.clone());
}

/**
 * Generates positions for decorative lights to be placed along the edges of a fence structure.
 *
 * The function calculates arrays of 3D positions (THREE.Vector3) corresponding to locations
 * around the perimeter of a rectangular fence, suitable for distributing point lights or similar objects.
 * 
 * The positions are created along the front, back, left, and right edges of the fence, with customizable
 * gaps at certain locations to allow for gates or features, as specified by manual offsets in the call to
 * addEdgeLights.
 *
 * @param {THREE.Vector3} size - The size of the fence (width = x, height = y, depth = z)
 * @param {THREE.Vector3} center - The center position of the fence in world coordinates
 * @returns {THREE.Vector3[]} Array of points where lights should be placed along the fence edges
 */
function addLightsToFence(size, center){
    const points = [];
    const spacing = 0.3;
    
    const width = size.x;
    const depth = size.z;
    
    const baseY = center.y / 2;
    
    const frontZ = center.z + depth / 2;
    addEdgeLights(center.x - width / 2, (center.x + width / 2) - 12.3, 'x', null, frontZ - 1.7, baseY, spacing, points);
    addEdgeLights((center.x - width / 2) + 12.8, center.x + width / 2, 'x', null, frontZ - 1.7, baseY, spacing, points);

    const backZ = center.z - depth / 2;
    addEdgeLights(center.x - width / 2, (center.x + width / 2) - 13, 'x', null, backZ + 1.9, baseY, spacing, points);
    addEdgeLights((center.x - width / 2) + 13.3, center.x + width / 2, 'x', null, backZ + 1.9, baseY, spacing, points);

    const leftX = center.x - width / 2;
    addEdgeLights((center.z - depth / 2) + 2, (center.z + depth / 2) -2, 'z', leftX, null, baseY, spacing, points);

    const rightX = center.x + width / 2;
    addEdgeLights((center.z - depth / 2) + 2, (center.z + depth / 2) -2, 'z', rightX, null, baseY, spacing, points);
    
    return points;
}

/**
 * Generates positions for decorative lights to be placed along the top "rail" or elevated section of a fence structure.
 *
 * This function determines arrays of 3D positions (THREE.Vector3) for placing lights along the upper edge of a fence.
 * The lights are distributed along the front, left, and right upper edges of the fence, offset both laterally and vertically
 * to create a visually appealing line of lights above the main fence structure.
 *
 * The spacing and edge offsets are fine-tuned to skip certain sections (such as openings, posts, or gates),
 * and to maintain consistent elevation and distribution of the lights along the topmost rails.
 *
 * @param {THREE.Vector3} size - The overall size of the fence (width = x, height = y, depth = z)
 * @param {THREE.Vector3} center - The center position of the fence in world coordinates
 * @returns {THREE.Vector3[]} Array of points along the top fence sections for attaching lights
 */
function addLightsToTopFence(size, center){
    const points = [];
    const spacing = 0.3;
    
    const width = size.x;
    const depth = size.z;
    
    const baseY = center.y / 2;

    const frontZ = center.z + depth / 2;
    addEdgeLights((center.x - width / 2) + 5.25, (center.x + width / 2) - 5, 'x', null, frontZ - 1.7, baseY + 5.25, spacing, points);

    const leftX = center.x - width / 2;
    addEdgeLights((center.z - depth / 2) + 14, (center.z + depth / 2) - 2, 'z', leftX + 5.3, null, baseY + 5.25, spacing, points);

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
    // Create a half dome (hemisphere) geometry
    const radius = 2000;  // Large radius to cover the whole sky
    const widthSegments = 64;  // Horizontal segments
    const heightSegments = 32;  // Vertical segments
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // The geometry is already a hemisphere (top half of sphere)
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
                
                // Fade out at top (zenith) - keep it visible at the top
                float topFade = smoothstep(0.0, 0.2, vUv.y);
                
                // Fade out at bottom (horizon) - make it fade more aggressively so midnight color shows
                // vUv.y goes from 0 (bottom/horizon) to 1 (top/zenith) for a hemisphere
                float bottomFade = smoothstep(0.0, 0.5, vUv.y); // Fade from 0 to 0.5, so bottom half fades out
                
                // Fade out at horizontal edges
                float horizontalFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
                
                // Mix colors based on pattern
                vec3 finalColor = mix(color1, color2, pattern);
                finalColor = mix(finalColor, color3, wave3);
                
                // Calculate opacity with fading - stronger fade at bottom to show midnight color
                float opacity = pattern * topFade * bottomFade * horizontalFade * 0.6;
                
                gl_FragColor = vec4(finalColor, opacity);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending // Makes it glow!
    });
    
    const aurora = new THREE.Mesh(geometry, material);
    
    // Position the hemisphere so its bottom edge is at ground level (y=0)
    // The hemisphere is the top half of a sphere, so position it at y=0
    // This makes the bottom edge of the hemisphere at y=0 (ground level)
    aurora.position.set(0, 0, 0);
    
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

// Function to resume audio context (required by browsers after user interaction)
export function resumeAudioContext() {
    if (audioListener && audioListener.context) {
        if (audioListener.context.state === 'suspended') {
            audioListener.context.resume().then(() => {
                console.log('Audio context resumed');
            }).catch((err) => {
                console.error('Error resuming audio context:', err);
            });
        }
    }
}

// Check if elf is near campfire and control audio playback
export function checkCampfireProximity() {
    if (!elf || !audioListener || !fireCrackleSound) {
        return;
    }
    
    // Find campfire if not stored
    if (!campfireGroup) {
        campfireGroup = scene.children.find(child => child.name === 'campfireGroup');
    }
    
    if (!campfireGroup) {
        return;
    }
    
    // Calculate distance between elf and campfire
    const distance = elf.position.distanceTo(campfireGroup.position);
    const proximityRadius = 20;
    
    // Control audio based on proximity
    if (distance <= proximityRadius) {
        // Within radius: resume audio context and play sound
        resumeAudioContext();
        if (!fireCrackleSound.isPlaying) {
            fireCrackleSound.play();
        }
    } else {
        // Outside radius: pause/stop the sound
        if (fireCrackleSound.isPlaying) {
            fireCrackleSound.pause();
        }
    }
}

function makeFireCrackle(fire){
    // Use spatial sound to make fire crackle as you get closer to the campfire
    // Create audio listener once and add to camera
    if (!audioListener) {
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
        console.log('Audio listener created and added to camera');
    }
    
    const posSound1 = new THREE.PositionalAudio(audioListener);
    const audioLoader = new THREE.AudioLoader();
    
    // Store global reference to the sound
    fireCrackleSound = posSound1;
    
    // Position the sound at the campfire location (relative to the fire group)
    posSound1.position.set(0, 0, 0); // At the center of the fire group
    
    audioLoader.load(
        '/sounds/fire-crackle.mp3',
        function(buffer) {
            posSound1.setBuffer(buffer);
            posSound1.setRefDistance(5); // Distance at which volume is 100%
            posSound1.setMaxDistance(50); // Maximum distance at which sound can be heard
            posSound1.setRolloffFactor(1); // How quickly sound fades (lower = slower fade)
            posSound1.setLoop(true);
            posSound1.setVolume(0.5); // Set volume (0 to 1)
            
            // Add sound to the fire object
            fire.add(posSound1);
            
            // Don't play immediately - wait for proximity check
            // posSound1.play() will be called in checkCampfireProximity()
            
            console.log('Fire crackle sound loaded at position:', fire.position);
        },
        function(progress) {
            // Progress callback (optional)
        },
        function(error) {
            console.error('Error loading fire crackle sound:', error);
        }
    );
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
    campfireGroup = await createCampfire();
    makeFireCrackle(campfireGroup);
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

