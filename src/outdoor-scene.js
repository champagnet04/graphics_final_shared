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
let elfGroup = new THREE.Group();
export let northernLights = null;
let snowmanGroup = null;
let campfireGroup = null;

let ballGeometry = new THREE.SphereGeometry(1, 32, 32);
const snowballGeometry = new THREE.SphereGeometry(0.3, 16, 16);
const noseGeometry = new THREE.ConeGeometry(0.15, 0.5, 32);
const bottomHatGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
const topHatGeometry = new THREE.CylinderGeometry(0.75, 0.75, 1, 32);

const trunkGeometry = new THREE.CylinderGeometry(1, 1, 2, 32);
const treeBottomGeometry = new THREE.CylinderGeometry(1.5, 3, 2.25, 32);
const treeMiddleGeometry = new THREE.CylinderGeometry(1, 2.25, 2.25, 32);
const treeTopGeometry = new THREE.ConeGeometry(1.5, 2.25, 32);
const bottomSnowGeometry = new THREE.CylinderGeometry(2.8, 3.1, 0.5, 32);
const middleSnowGeometry = new THREE.CylinderGeometry(2.1, 2.35, 0.5, 32);
const topSnowGeometry = new THREE.CylinderGeometry(1.45, 1.75, 0.5, 32);



const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: loadSnowTexture()
});

const noseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa500,
    side: THREE.DoubleSide
});

const blackMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    side: THREE.DoubleSide
});

const treeMaterial = new THREE.MeshStandardMaterial({
    color: 0x023020,
    side: THREE.DoubleSide
});

const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x654321,
    side: THREE.DoubleSide
});

const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    map: loadWallTexture(),
    transparent: true,
    opacity: 0.7
});

let sceneObjects = [];
let audioListener = null;
let fireCrackleSound = null;
let jazzMusicSound = null;
const keysPressed = {};
let snowballThrowAnimation = null; // { snowball, path, impactT, currentT, speed }

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

const holidayGreetings = [
    "Happy Holidays!",
    "Season's Greetings!",
    "Warmest Wishes!",
    "'Tis the Season!",
    "Peace and Love to You!",
    "Merry Christmas!",
    "Happy New Year!",
    "Have a Holly Jolly Christmas!",
    "It's the Most Wonderful Time of the Year!",
    "Hello, my name is Frosty!"
]



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
    
    if (!elfGroup || elfGroup.children.length === 0) {
        elfGroup = elf.parent;
    }
    if (!elfGroup) {
        return;
    }
    
    const cameraDistance = 8;
    const cameraHeight = 5;
    
    const facingAngle = elfGroup.rotation.y;
    
    const cameraX = elfGroup.position.x - Math.sin(facingAngle) * cameraDistance;
    const cameraZ = elfGroup.position.z - Math.cos(facingAngle) * cameraDistance;
    const cameraY = elfGroup.position.y + cameraHeight;
    
    camera.position.set(cameraX, cameraY, cameraZ);
    
    const lookAheadDistance = 3;
    const lookX = elfGroup.position.x + Math.sin(facingAngle) * lookAheadDistance;
    const lookZ = elfGroup.position.z + Math.cos(facingAngle) * lookAheadDistance;
    const baseLookY = elfGroup.position.y + 1;
    
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 100, 10);
    directionalLight.castShadow = true;
    
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.target.updateMatrixWorld();
    
    scene.add(directionalLight);
    scene.add(directionalLight.target);
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
    const groundGeometry = new THREE.PlaneGeometry(200, 100, 50, 25);
    
    modifyTerrainHeights(groundGeometry);

    ground = new THREE.Mesh(groundGeometry, snowMaterial);
    ground.name = 'ground';
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.castShadow = true;
    ground.receiveShadow = true;
    ground.visible = true;
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
        undefined
    );
    
    snowTexture.wrapS = THREE.RepeatWrapping;
    snowTexture.wrapT = THREE.RepeatWrapping;
    snowTexture.repeat.set(10, 10);
    
    return snowTexture;
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
        
        elf.castShadow = true;
        elf.receiveShadow = true;
        elf.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        elfGroup.add(elf);
        elfGroup.castShadow = true;
        elfGroup.receiveShadow = true;
        scene.add(elfGroup);
        
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
/**
 * Checks if a position (x, z) is within the ground bounds.
 * Accounts for the elf's collision radius to prevent going partially off the edge.
 * 
 * @param {number} x - The X coordinate to check
 * @param {number} z - The Z coordinate to check
 * @returns {boolean} True if the position is within bounds, false otherwise
 */
function checkGroundBounds(x, z) {
    const collisionRadius = 0.5;
    
    if (x - collisionRadius < groundBounds.xMin || x + collisionRadius > groundBounds.xMax) {
        return false;
    }
    if (z - collisionRadius < groundBounds.zMin || z + collisionRadius > groundBounds.zMax) {
        return false;
    }
    
    return true;
}

/**
 * Checks if a position (x, z) would collide with any scene objects.
 * Excludes ground and pond.
 * 
 * @param {number} x - The X coordinate to check
 * @param {number} z - The Z coordinate to check
 * @returns {boolean} True if there would be a collision, false otherwise
 */
function checkElfCollision(x, z) {
    try {
        const collisionRadius = 0.5;
        
        const objectsToCheck = sceneObjects.filter(obj => obj instanceof THREE.Object3D);
        
        scene.traverse((child) => {
            if (child instanceof THREE.Group) {
                if (child.name === 'cottageGroup' || 
                    child.name === 'snowmanGroup' || 
                    (child.name && child.name.startsWith('treeGroup')) ||
                    child.name === 'campfireGroup' ||
                    child.name === 'logGroup') {
                    if (!objectsToCheck.includes(child)) {
                        objectsToCheck.push(child);
                    }
                }
            }
        });
        
        for (const obj of objectsToCheck) {
            if (!obj || obj.name === 'elfGroup' || obj.name === 'snowballPile' || 
                obj.name === 'ground' || obj === ground || obj === pond || obj === elfGroup) {
                continue;
            }
            
            if (obj.visible === false) {
                continue;
            }
            
            try {
                const box = new THREE.Box3();
                box.setFromObject(obj);
                
                if (box.isEmpty()) {
                    continue;
                }
                
                const boxSize = box.getSize(new THREE.Vector3());
                if (boxSize.x > 100 || boxSize.z > 100 || boxSize.y > 100) {
                    continue;
                }
                
                const boxCenter = box.getCenter(new THREE.Vector3());
                const distanceToCenter = Math.sqrt(
                    Math.pow(x - boxCenter.x, 2) + Math.pow(z - boxCenter.z, 2)
                );
                const maxObjectRadius = Math.max(boxSize.x, boxSize.z) / 2;
                if (distanceToCenter > maxObjectRadius + collisionRadius + 20) {
                    continue;
                }
                
                const expandedMinX = box.min.x - collisionRadius;
                const expandedMaxX = box.max.x + collisionRadius;
                const expandedMinZ = box.min.z - collisionRadius;
                const expandedMaxZ = box.max.z + collisionRadius;
                
                if (x >= expandedMinX && x <= expandedMaxX &&
                    z >= expandedMinZ && z <= expandedMaxZ) {
                    return true;
                }
            } catch (error) {
                continue;
            }
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Moves the elf character in the scene based on arrow key input.
 *
 * This function checks the keysPressed object to determine which directional
 * keys (arrowup, arrowdown, arrowleft, arrowright) are currently pressed and
 * adjusts the elf's position accordingly. The movement takes into account the
 * elf's current rotation so that movement directions are relative to where the
 * elf is facing.
 *
 * The function performs the following steps:
 *   - Attempts to obtain references to the elf and elfGroup if they are not already set.
 *   - Returns early if the elf or elfGroup is missing.
 *   - If no movement keys are pressed, only updates the elf's vertical position
 *     based on terrain height at the current position.
 *   - If a movement key is pressed, computes the proposed new (x, z) position
 *     according to the key and the elf's orientation.
 *   - Checks for collisions at the proposed new position using checkElfCollision.
 *   - If no collision is detected, updates the elf's position in the scene.
 *   - Always updates the elf's y-coordinate to match the height of the terrain
 *     at the new (x, z) position.
 *
 * If an error occurs during collision checking, the function logs the error
 * and allows the move.
 *
 * @export
 * @function moveElf
 */
export function moveElf(){
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
    }
    if (!elf) return;
    
    if (!elfGroup || elfGroup.children.length === 0) {
        elfGroup = elf.parent;
    }
    if (!elfGroup) return;
    
    if (!keysPressed['arrowup'] && !keysPressed['arrowdown'] && 
        !keysPressed['arrowleft'] && !keysPressed['arrowright']) {
        elfGroup.position.y = getHeightAt(elfGroup.position.x, elfGroup.position.z);
        return;
    }

    const moveSpeed = 0.3;
    
    const currentX = elfGroup.position.x;
    const currentZ = elfGroup.position.z;
    
    const elfRotation = elfGroup.rotation.y;
    
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
    
    let newX = currentX;
    let newZ = currentZ;
    
    if (keysPressed['arrowup']) {
        newX = currentX + forward.x * moveSpeed;
        newZ = currentZ + forward.z * moveSpeed;
    } else if (keysPressed['arrowdown']) {
        newX = currentX - forward.x * moveSpeed;
        newZ = currentZ - forward.z * moveSpeed;
    } else if (keysPressed['arrowleft']) {
        newX = currentX + right.x * moveSpeed;
        newZ = currentZ + right.z * moveSpeed;
    } else if (keysPressed['arrowright']) {
        newX = currentX - right.x * moveSpeed;
        newZ = currentZ - right.z * moveSpeed;
    }
    
    try {
        if (!checkGroundBounds(newX, newZ)) {
            return;
        }
        
        if (!checkElfCollision(newX, newZ)) {
            elfGroup.position.x = newX;
            elfGroup.position.z = newZ;
        }
    } catch (error) {
        if (checkGroundBounds(newX, newZ)) {
            elfGroup.position.x = newX;
            elfGroup.position.z = newZ;
        }
    }
    
    elfGroup.position.y = getHeightAt(elfGroup.position.x, elfGroup.position.z);
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
        elfGroup.rotation.y += turnSpeed;
    }
    if (keysPressed['d']) {
        elfGroup.rotation.y -= turnSpeed;
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
 * Assigns colors to an array of light points by cycling through a color palette.
 * 
 * This function takes an array of 3D points and fills a Float32Array with RGB color values
 * for each point. Colors are assigned by cycling through the provided color palette array,
 * creating a repeating pattern of colors across all lights.
 * 
 * @param {Array<THREE.Vector3>} points - Array of 3D points representing light positions
 * @param {Array<number>} colorPalette - Array of hex color values to cycle through (defaults to global lightColors)
 * @returns {Float32Array} Float32Array of RGB values (length = points.length * 3)
 */
function addColorToLights(points, colorPalette = lightColors) {
    const colors = new Float32Array(points.length * 3);
    
    points.forEach((point, i) => {
        const colorIndex = i % colorPalette.length;
        const c = new THREE.Color(colorPalette[colorIndex]);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    });
    
    return colors;
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

/**
 * Generates positions for decorative lights to be placed along the back edge of the cottage roof.
 *
 * This function creates an array of 3D positions (THREE.Vector3) evenly spaced along the back horizontal edge
 * of the roof, suitable for placing a string of lights or other decorations. The position and size parameters
 * determine the exact coordinates, ensuring lights are positioned just above and behind the main roof edge.
 *
 * @param {THREE.Vector3} size - The overall size of the roof (width = x, height = y, depth = z)
 * @param {THREE.Vector3} center - The center position of the roof in world coordinates
 * @returns {THREE.Vector3[]} Array of points along the back roof edge for attaching lights
 */
function addLightsToRoofBackEdge(size, center){
    const points = [];
    const spacing = 0.3;
    
    const width = size.x;
    const depth = size.z;
    
    const baseY = center.y / 2;

    const backZ = center.z - depth / 2;
    addEdgeLights((center.x - width / 2) + 1.25, (center.x + width / 2) - 1.25, 'x', null, backZ + 5.15, baseY + 3.75, spacing, points);

    return points;
}

/**
 * Generates an array of THREE.Vector3 positions for placing decorative lights along
 * the left and right front roof edges of the cottage, following the diagonal edges from
 * the lower corners up to the roof peak and then back down to the opposing lower corners
 * (i.e., forming a "V" on each roof side in the Y/Z plane).
 *
 * The function calculates these positions based on the provided size and center position
 * of the roof/cottage, taking into account offsets to align with the sloped roof edges and
 * the roof peak. Lights are placed along both the left and right roof edges to give a festive
 * outlined appearance to the roof's silhouette.
 *
 * @param {THREE.Vector3} size - The overall size of the roof (width = x, height = y, depth = z)
 * @param {THREE.Vector3} center - The center position of the roof in world coordinates
 * @returns {THREE.Vector3[]} Array of points along the left and right front roof diagonal edges for attaching lights
 */
function addLightsToRoofEdges(size, center){
    const points = [];
    const spacing = 0.3;
    
    const width = size.x;
    const height = size.y;
    const depth = size.z;
    
    const baseHeight = center.y + height / 2;
    const roofPeakHeight = baseHeight - 1.75;
    
    const leftX = center.x - width / 2 + 1;
    const frontZ = center.z + depth / 2 - 6;
    const backZ = center.z - depth / 2 + 6;
    
    const leftFrontEdge = new THREE.Vector3(
        leftX,
        baseHeight - 8,
        frontZ
    );
    
    const leftPeak = new THREE.Vector3(
        leftX,
        roofPeakHeight,
        center.z
    );
    
    const leftBackEdge = new THREE.Vector3(
        leftX,
        baseHeight - 8,
        backZ
    );
    
    addDiagonalLights(leftFrontEdge, leftPeak, spacing, points);
    addDiagonalLights(leftPeak, leftBackEdge, spacing, points);
    
    const rightX = center.x + width / 2 - 0.75;
    
    const rightFrontEdge = new THREE.Vector3(
        rightX,
        baseHeight - 8,
        frontZ
    );
    
    const rightPeak = new THREE.Vector3(
        rightX,
        roofPeakHeight,
        center.z
    );
    
    const rightBackEdge = new THREE.Vector3(
        rightX,
        baseHeight - 8,
        backZ
    );
    
    addDiagonalLights(rightFrontEdge, rightPeak, spacing, points);
    addDiagonalLights(rightPeak, rightBackEdge, spacing, points);
    
    return points;
}

/**
 * Adds animated Christmas lights to the cottage in the scene.
 *
 * This function retrieves the cottage and its group, calculates positions for lights
 * along fences and roof edges, and generates colored points for decoration. The generated
 * lights use a THREE.Points object with per-vertex color, giving the appearance of
 * multi-color Christmas lights strung around the cottage. The lights are grouped with the
 * cottage if the group exists, otherwise they are added directly to the scene.
 *
 * Prerequisites:
 * - `getCottage()`: should return the cottage mesh or object3d.
 * - `getCottageGroup()`: should return the group for the cottage, if any.
 * - Functions `addLightsToFence`, `addLightsToTopFence`, `addLightsToRoofEdges`, and
 *   `addLightsToRoofBackEdge` should generate arrays of THREE.Vector3s specifying
 *   where the lights go.
 * - Function `addColorToLights` should take an array of points and return an array of
 *   RGB colors for each point.
 *
 * Returns:
 *   undefined if lights added successfully,
 *   null if the cottage is not found.
 */
function addChristmasLightsToCottage(){
    const cottage = getCottage();
    const cottageGroup = getCottageGroup();
    
    if (!cottage) {
        return null;
    }
    
    cottage.updateMatrixWorld(true);
    
    const box = new THREE.Box3().setFromObject(cottage);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const points = addLightsToFence(size, center);
    const topPoints = addLightsToTopFence(size, center);
    const roofPoints = addLightsToRoofEdges(size, center);
    const roofBackPoints = addLightsToRoofBackEdge(size, center);
    
    const allPoints = [...points, ...topPoints, ...roofPoints, ...roofBackPoints];
    const colors = addColorToLights(allPoints);
    
    const geom = new THREE.BufferGeometry().setFromPoints(allPoints);
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    
    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        color: 0xffffff
    });
    
    const christmasLights = new THREE.Points(geom, material);
    christmasLights.name = 'christmasLights';
    
    if (cottageGroup) {
        cottageGroup.add(christmasLights);
    } else {
    scene.add(christmasLights);
    }
}

/**
 * Creates and returns a THREE.Points object representing falling snow particles.
 *
 * This function generates a specified number of snow particles (default: 25,000),
 * randomly positions them within the specified world bounds (groundBounds), and
 * assigns each a random velocity in the x and y directions to simulate snowfall.
 *
 * Each particle's position is stored in a THREE.BufferGeometry, and a custom
 * 'velocity' attribute is added (each velocity has 2 components: x and y).
 *
 * The material is configured as semi-transparent white points.
 *
 * @returns {THREE.Points} A THREE.Points object representing all the snow particles,
 *                         ready to be added to the scene.
 */
function setupSnowPoints() {
    const count = 25000;
      
    const points = [];
    for (let i = 0; i < count; i++) {
        let particle = new THREE.Vector3(
            Math.random() * (groundBounds.xMax - groundBounds.xMin) + groundBounds.xMin,  // x: -100 to 100
            Math.random() * (groundBounds.yMax - groundBounds.yMin) + groundBounds.yMin,  // y: 0 to 100 (falling from above)
            Math.random() * (groundBounds.zMax - groundBounds.zMin) + groundBounds.zMin   // z: -50 to 50
        );
        points.push(particle);
    }
    
    const velocityArray = new Float32Array(count * 2);
    for (let i = 0; i < count * 2; i += 2) {
        velocityArray[i] = ((Math.random() - 0.5) / 5) * 0.1;
        velocityArray[i + 1] = (Math.random() / 5) * 0.1 + 0.01;
    }
    
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    geom.setAttribute('velocity', new THREE.BufferAttribute(velocityArray, 2));
    
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8
    });
    
    const snowPoints = new THREE.Points(geom, material);
    snowPoints.name = 'snow';
    
    return snowPoints;
}

/**
 * Adds a snow particle system to the scene.
 *
 * This function initializes the falling snow effect by creating a
 * THREE.Points object with randomly positioned snow particles using
 * the setupSnowPoints() helper function, then adds it to the Three.js scene.
 * 
 * Should be called once during scene setup to enable continuous snow.
 */
function generateSnow(){
    const snowPoints = setupSnowPoints();
    scene.add(snowPoints);
}

/**
 * Wraps a value around boundaries, returning the opposite boundary when exceeded.
 * 
 * @param {number} value - The value to wrap
 * @param {number} min - Minimum boundary
 * @param {number} max - Maximum boundary
 * @returns {number} The wrapped value (min if value > max, max if value < min, otherwise value)
 */
const wrapBoundary = (value, min, max) => value < min ? max : value > max ? min : value;

/**
 * Updates the snow particle system by animating the position of snowflakes.
 *
 * This function should be called on each animation frame. It finds the snow THREE.Points
 * object by name in the scene, then updates the position of each snow particle based
 * on its velocity, creating the effect of falling snow. When a snowflake passes the
 * ground boundary (below yMin), it is wrapped back to the top boundary (yMax) and
 * assigned a new random x-position, making the snow appear continuous.
 *
 * Particle positions are also wrapped around the scene boundaries on the x and z axes.
 * The geometry is marked to update so Three.js will redraw the updated particles.
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
        
        positionArray[i * 3] += velocityX;
        positionArray[i * 3 + 1] -= velocityY;
        
        positionArray[i * 3] = wrapBoundary(positionArray[i * 3], groundBounds.xMin, groundBounds.xMax);
        
        const oldY = positionArray[i * 3 + 1];
        positionArray[i * 3 + 1] = wrapBoundary(positionArray[i * 3 + 1], groundBounds.yMin, groundBounds.yMax);
        if (oldY !== positionArray[i * 3 + 1] && positionArray[i * 3 + 1] === groundBounds.yMax) {
            positionArray[i * 3] = Math.random() * (groundBounds.xMax - groundBounds.xMin) + groundBounds.xMin;
        }
        
        positionArray[i * 3 + 2] = wrapBoundary(positionArray[i * 3 + 2], groundBounds.zMin, groundBounds.zMax);
    }
    
    snow.geometry.attributes.position.needsUpdate = true;
}

/**
 * Creates and returns a THREE.MeshPhysicalMaterial configured to simulate the appearance of ice.
 *
 * The material uses light blue coloring, partial transparency, and transmission,
 * with clearcoat and a custom ice texture for extra realism. It is double-sided
 * to look good from above and below, and is suitable for meshes representing icy surfaces
 * such as ponds or lakes.
 * 
 * @returns {THREE.MeshPhysicalMaterial} The ice material for use in Three.js meshes.
 */
function createIceMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0xaaddff,
        metalness: 0.0,
        roughness: 0.5,
        transparent: true,
        opacity: 0.4,
        transmission: 0.7,
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.3,
        side: THREE.DoubleSide,
        map: loadIceTexture()
    });
}

/**
 * Creates an icy pond mesh and adds it to the scene.
 *
 * The pond is a large circular mesh with an ice material, placed slightly below
 * the ground level to simulate an icy pond in the outdoor scene. The created mesh
 * is given the name "pond", added to the Three.js scene, and stored in the global
 * variable `pond` for later reference.
 *
 * Geometry:
 *   - Uses a CircleGeometry with radius 25 and 64 segments for smoothness.
 *   - Oriented flat on the ground (rotated -90 degrees on the X axis).
 *   - Positioned at x = -30, y = -2.5.
 *
 * Dependencies:
 *   - Requires a global `scene` object (Three.js Scene).
 *   - Requires the helper function `createIceMaterial()` to exist and provide a suitable ice-like material.
 *   - Modifies the global variable `pond`.
 */
function createIcyPond() {
    const circle = new THREE.Mesh(
        new THREE.CircleGeometry(25, 64),
        createIceMaterial()
    );
    circle.rotation.x = -Math.PI / 2;
    circle.position.x = -30;
    circle.position.y = -2.5;
    circle.name = 'pond';
    scene.add(circle);
    pond = circle;
}

/**
 * Creates and returns the geometry for the northern lights (aurora) effect.
 * 
 * The geometry is a hemisphere (half-sphere) that covers the sky above the scene.
 * It uses a large radius to create a dome effect, with sufficient segments for
 * smooth rendering. Vertex normals are computed for proper lighting calculations.
 * 
 * @returns {THREE.SphereGeometry} The hemisphere geometry for the northern lights
 */
function createAuroraGeom() {
    const radius = 2000;
    const widthSegments = 64;
    const heightSegments = 32;
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments, 0, Math.PI * 2, 0, Math.PI / 2);
    
    geometry.computeVertexNormals();
    
    return geometry;
}

/**
 * Creates and returns the shader material for the northern lights (aurora) effect.
 * 
 * The material uses custom vertex and fragment shaders to create an animated,
 * flowing aurora effect with multiple color layers. It includes uniforms for time
 * (for animation) and three color values that blend together to create the aurora
 * appearance. The material is transparent with additive blending to create a glowing effect.
 * 
 * @returns {THREE.ShaderMaterial} The shader material configured for the northern lights
 */
function createAuroraMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            color1: { value: new THREE.Color(0x00ff88) },
            color2: { value: new THREE.Color(0x0088ff) },
            color3: { value: new THREE.Color(0x8800ff) },
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
            
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            void main() {
                float wave1 = sin(vUv.x * 3.0 + time * 0.5) * 0.5 + 0.5;
                float wave2 = sin(vUv.x * 5.0 - time * 0.3) * 0.5 + 0.5;
                float wave3 = sin(vUv.x * 7.0 + time * 0.7) * 0.5 + 0.5;
                
                float pattern = wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2;
                
                float topFade = smoothstep(0.0, 0.2, vUv.y);
                float bottomFade = smoothstep(0.0, 0.5, vUv.y);
                float horizontalFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
                
                vec3 finalColor = mix(color1, color2, pattern);
                finalColor = mix(finalColor, color3, wave3);
                
                float opacity = pattern * topFade * bottomFade * horizontalFade * 0.6;
                
                gl_FragColor = vec4(finalColor, opacity);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
}

/**
 * Creates and adds the Northern Lights effect (aurora borealis) mesh to the scene.
 * This function constructs a mesh using a custom geometry and material to simulate
 * the appearance of auroras. The resulting mesh is positioned at the origin and
 * stored in the global `northernLights` variable. The mesh is then added to the `scene`.
 * 
 * Dependencies:
 * - createAuroraGeom(): Returns the geometry for the aurora.
 * - createAuroraMaterial(): Returns the material (shader material) for the aurora.
 * - `scene`: The THREE.Scene instance to which the aurora mesh will be added.
 * - `northernLights`: Global variable to reference the aurora mesh instance.
 */
function createNorthernLights() {
    const geometry = createAuroraGeom();
    const material = createAuroraMaterial();
    
    const aurora = new THREE.Mesh(geometry, material);
    
    aurora.position.set(0, 0, 0);
    
    northernLights = aurora;
    scene.add(northernLights);
}

/**
 * Loads and returns a repeating ice texture.
 * 
 * This function creates a new THREE.TextureLoader to load the ice texture from '/textures/ice.png'.
 * After loading, the texture's wrapping mode is set to RepeatWrapping on both S and T axes,
 * and the repeat is set to (10, 10) to allow the texture to tile seamlessly over larger surfaces.
 * 
 * If there is an error loading the texture, an error is logged to the console.
 * 
 * @returns {THREE.Texture} The loaded and configured ice texture.
 */
function loadIceTexture(){
    const loader = new THREE.TextureLoader();
    const iceTexture = loader.load(
        '/textures/ice.png',
        (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(10, 10);
        },
        undefined,
        (error) => {
            console.error('Error loading ice texture:', error);
        }
    );
        
    return iceTexture;
}

/**
 * Creates the bottom sphere of the snowman.
 *
 * This function constructs the bottom part of the snowman using a sphere geometry
 * with a radius of 2 units, applying the globally defined `snowMaterial`. The
 * sphere is positioned at (0, 1, 0) relative to its parent group, with the group
 * expected to be placed at ground level—thus positioning the bottom of the sphere
 * just above the ground. Shadows are enabled on this mesh so that the snowman
 * can cast and receive shadows in the scene.
 *
 * @returns {THREE.Mesh} The mesh representing the snowman's bottom sphere.
 */
function createSnowmanBottom() {
    const snowmanBottom = new THREE.Mesh(ballGeometry, snowMaterial);
    snowmanBottom.scale.setScalar(2);
    snowmanBottom.position.set(0, 1, 0);
    snowmanBottom.castShadow = true;
    snowmanBottom.receiveShadow = true;
    return snowmanBottom;
}

/**
 * Creates the middle sphere of the snowman.
 *
 * This function constructs the middle part of the snowman using a sphere geometry
 * with a radius of 1.5 units, applying the globally defined `snowMaterial`. The
 * sphere is positioned at (0, 3, 0) relative to its parent group, so that it sits
 * above the bottom sphere when assembling a full snowman. Shadows are enabled on
 * this mesh so that the snowman can cast and receive shadows in the scene.
 *
 * @returns {THREE.Mesh} The mesh representing the snowman's middle sphere.
 */
function createSnowmanMiddle(){
    const snowmanMiddle = new THREE.Mesh(ballGeometry, snowMaterial);
    snowmanMiddle.scale.setScalar(1.5);
    snowmanMiddle.position.set(0, 3, 0);
    snowmanMiddle.castShadow = true;
    snowmanMiddle.receiveShadow = true;
    return snowmanMiddle;
}

/**
 * Creates the top sphere of the snowman.
 *
 * This function constructs the top part of the snowman using a sphere geometry
 * with a radius of 1 unit, applying the globally defined `snowMaterial`. The
 * sphere is positioned at (0, 5, 0) relative to its parent group, so that it
 * sits above the bottom and middle spheres when assembling a full snowman.
 * Shadows are enabled on this mesh so that the snowman can cast and receive
 * shadows in the scene.
 *
 * @returns {THREE.Mesh} The mesh representing the snowman's top sphere.
 */
function createSnowmanTop(){
    const snowmanTop = new THREE.Mesh(ballGeometry, snowMaterial);
    snowmanTop.position.set(0, 5, 0);
    snowmanTop.castShadow = true;
    snowmanTop.receiveShadow = true;
    return snowmanTop;
}

/**
 * Creates the hat for the snowman.
 *
 * This function creates a snowman hat as a THREE.Group consisting of two parts:
 * the hat bottom (a short wide cylinder) and the hat top (a taller, narrower cylinder).
 * Both parts are created using their respective helper functions and positioned
 * to rest atop the snowman's head when the full snowman is assembled.
 * Shadows are enabled on the entire hat group so that it can cast and receive shadows in the scene.
 *
 * @returns {THREE.Group} The group representing the snowman's hat, ready to be added to the snowman or scene.
 */
function createSnowmanHat(){
    const snowmanHat = new THREE.Group();
    snowmanHat.add(createSnowmanHatBottom());
    snowmanHat.add(createSnowmanHatTop());
    snowmanHat.position.set(0, 0, 0);
    snowmanHat.castShadow = true;
    snowmanHat.receiveShadow = true;
    return snowmanHat;
}

/**
 * Creates the bottom part of the snowman's hat.
 *
 * This function constructs the bottom part of a snowman's hat using a cylinder geometry
 * with a radius of 1 unit and a height of 0.2 units. The mesh is created with a black
 * standard material and double-sided faces to ensure it renders correctly in the scene.
 * The hat bottom is positioned at (0, 6, 0) so that it sits atop the snowman's head,
 * and both cast and receive shadows, enabling realistic lighting effects.
 *
 * @returns {THREE.Mesh} The mesh representing the bottom of the snowman's hat.
 */
function createSnowmanHatBottom(){
    const snowmanHatBottom = new THREE.Mesh(bottomHatGeometry, blackMaterial);
    snowmanHatBottom.position.set(0, 6, 0);
    snowmanHatBottom.castShadow = true;
    snowmanHatBottom.receiveShadow = true;
    return snowmanHatBottom;
}

/**
 * Creates the top part of the snowman's hat.
 *
 * This function constructs the top part of a snowman's hat using a cylinder geometry
 * with a radius of 0.75 units and a height of 1 unit. The mesh uses a black
 * standard material with double-sided faces for proper rendering from all angles.
 * The top hat section is positioned at (0, 6.5, 0) so that it sits neatly above
 * the bottom part of the hat and atop the snowman's head when assembled.
 * Shadows are enabled to allow the hat top to cast and receive realistic lighting.
 *
 * @returns {THREE.Mesh} The mesh representing the top cylinder of the snowman's hat.
 */
function createSnowmanHatTop(){
    const snowmanHatTop = new THREE.Mesh(topHatGeometry, blackMaterial);
    snowmanHatTop.position.set(0, 6.5, 0);
    snowmanHatTop.castShadow = true;
    snowmanHatTop.receiveShadow = true;
    return snowmanHatTop;
}

/**
 * Creates a single piece of coal for use in a snowman face (eyes, mouth, buttons, etc.).
 *
 * This function constructs a black sphere mesh by reusing the global `ballGeometry`
 * (which has radius 1) and scaling it to the desired size. The sphere uses
 * MeshStandardMaterial with black color and is set to both cast and receive shadows
 * for realistic appearance in the scene. The mesh is suitable for use as
 * snowman facial features such as eyes, smile components, or buttons.
 *
 * @param {number} [scale=0.1] - The scale factor to apply to the ballGeometry. 
 *                                Defaults to 0.1, which results in a radius of 0.1 units.
 *                                For example, use 0.15 for buttons that should be 1.5x larger than eyes.
 * @returns {THREE.Mesh} The mesh representing a single coal piece.
 */
function createCoalPiece(scale = 0.1){
    const coalPiece = new THREE.Mesh(ballGeometry, blackMaterial);
    coalPiece.scale.setScalar(scale);
    coalPiece.castShadow = true;
    coalPiece.receiveShadow = true;
    return coalPiece;
}

/**
 * Creates the eyes for the snowman using two coal pieces.
 *
 * This function generates a THREE.Group containing two small black spheres,
 * positioned symmetrically to represent the snowman's eyes on its face.
 * Each eye is created using the createCoalPiece() helper function,
 * and placed at (0.5, 5.25, 0.8) and (-0.5, 5.25, 0.8) respectively.
 *
 * @returns {THREE.Group} A group containing the two eye meshes for the snowman face.
 */
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

/**
 * Creates the carrot nose for the snowman.
 *
 * This function constructs a THREE.Mesh shaped like a cone to represent the snowman's nose,
 * resembling a carrot. The cone has a base radius of 0.15 units, height of 0.5 units, and
 * uses 32 radial segments for smoothness. It is colored orange (hex 0xffa500), positioned
 * at (0, 5, 1.25) on the snowman's head, and rotated so it points outward from the face.
 *
 * @returns {THREE.Mesh} The mesh representing the snowman's carrot nose.
 */
function createSnowmanNose(){
    const snowmanNose = new THREE.Mesh(noseGeometry, noseMaterial);
    snowmanNose.position.set(0, 5, 1.25);
    snowmanNose.rotation.x = Math.PI / 2;
    return snowmanNose;
}

/**
 * Creates the smile for the snowman using coal pieces.
 *
 * This function constructs a THREE.Group containing five small black spheres, each created
 * by the createCoalPiece() helper. The pieces are carefully positioned to form an arc beneath
 * the eyes and nose, giving the appearance of a classic coal smile common on snowmen.
 *
 * The coal pieces are positioned at:
 *   (0.5, 4.75, 0.8)
 *   (-0.5, 4.75, 0.8)
 *   (0, 4.5, 0.85)
 *   (0.3, 4.57, 0.85)
 *   (-0.3, 4.57, 0.85)
 *
 * @returns {THREE.Group} A group containing the five meshes forming the snowman's smile.
 */
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

/**
 * Creates the face of the snowman as a THREE.Group.
 *
 * This function constructs a group containing the snowman's eyes, nose, and smile,
 * each created by their respective helper functions: createSnowmanEyes(), createSnowmanNose(),
 * and createSnowmanSmile(). The components are positioned such that, when added to the snowman,
 * they appear in their standard face locations on the head.
 *
 * @returns {THREE.Group} A group containing the snowman's facial features.
 */
function createSnowmanFace(){
    const faceGroup = new THREE.Group();
    faceGroup.add(createSnowmanEyes());
    faceGroup.add(createSnowmanNose());
    faceGroup.add(createSnowmanSmile());
    return faceGroup;
}

/**
 * Creates the buttons for the snowman as a THREE.Group.
 *
 * This function constructs a group containing three coal "button" pieces,
 * each created by the createCoalPiece() helper. The buttons are scaled up
 * for visibility and positioned vertically along the snowman's front torso.
 * Typical use: add the returned group to the snowman mesh.
 *
 * Button positions (in world coordinates, relative to the snowman center):
 *   (0, 3.85, 1.25) - Upper button
 *   (0, 3, 1.5)     - Middle button
 *   (0, 1.75, 1.85) - Lower button
 *
 * @returns {THREE.Group} A group containing the three snowman button meshes.
 */
function createSnowmanButtons(){
    const buttonsGroup = new THREE.Group();
    const button1 = createCoalPiece(0.15);
    const button2 = createCoalPiece(0.15);
    const button3 = createCoalPiece(0.15);
    button1.position.set(0, 3.85, 1.25);
    button2.position.set(0, 3, 1.5);
    button3.position.set(0, 1.75, 1.85);
    buttonsGroup.add(button1);
    buttonsGroup.add(button2);
    buttonsGroup.add(button3);
    return buttonsGroup;
}

/**
 * Creates and adds a snowman to the scene at the specified (x, z) coordinates.
 *
 * This function constructs a snowman using helper functions for each part: bottom,
 * middle, top, hat, face, and buttons. The snowman parts are combined into a group,
 * positioned on the terrain according to the ground height at (x, z), and added to the scene.
 *
 * @param {number} x - The X coordinate where the snowman will be placed.
 * @param {number} z - The Z coordinate where the snowman will be placed.
 * @returns {THREE.Group} The group representing the created snowman.
 */
function createSnowman(x, z) {
    snowmanGroup = new THREE.Group();
    snowmanGroup.name = 'snowmanGroup';
    snowmanGroup.add(createSnowmanBottom());
    snowmanGroup.add(createSnowmanMiddle());
    snowmanGroup.add(createSnowmanTop());
    snowmanGroup.add(createSnowmanHat());
    snowmanGroup.add(createSnowmanFace());
    snowmanGroup.add(createSnowmanButtons());
    snowmanGroup.position.set(x, getHeightAt(x, z), z);
    scene.add(snowmanGroup);
    return snowmanGroup;
}

/**
 * Creates the trunk of a pine tree as a THREE.Mesh.
 *
 * This function constructs a brown cylinder to represent the tree trunk,
 * sets its position so it rises above the ground, and enables shadow
 * casting and receiving for realistic lighting interaction.
 *
 * @returns {THREE.Mesh} The mesh representing the tree trunk.
 */
function createTreeTrunk(){
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.set(0, 0.5, 0);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    return trunkMesh;
}

/**
 * Creates the bottom section of a pine tree as a THREE.Mesh.
 *
 * This function constructs the lowest tier of the tree foliage using a cylinder geometry,
 * colored dark green, and sets its position to sit above the trunk. Shadow properties are enabled
 * to allow the bottom tree part to cast and receive shadows, contributing to realistic lighting.
 *
 * @returns {THREE.Mesh} The mesh representing the bottom foliage section of the pine tree.
 */
function createTreeBottom(){
    const bottomMesh = new THREE.Mesh(treeBottomGeometry, treeMaterial);
    bottomMesh.position.set(0, 2, 0);
    bottomMesh.castShadow = true;
    bottomMesh.receiveShadow = true;
    return bottomMesh;
}

/**
 * Creates the middle section of a pine tree as a THREE.Mesh.
 *
 * This function constructs the middle tier of the tree foliage using a cylinder geometry,
 * colored according to treeMaterial, and sets its position to sit above the bottom tier.
 * Shadow casting and receiving are enabled for realistic lighting.
 *
 * @returns {THREE.Mesh} The mesh representing the middle foliage section of the pine tree.
 */
function createTreeMiddle(){
    const middleMesh = new THREE.Mesh(treeMiddleGeometry, treeMaterial);
    middleMesh.position.set(0, 4.25, 0);
    middleMesh.castShadow = true;
    middleMesh.receiveShadow = true;
    return middleMesh;
}

/**
 * Creates the top section of a pine tree as a THREE.Mesh.
 *
 * This function constructs the uppermost tier of the tree foliage using a cone geometry,
 * colored according to the shared treeMaterial, and positions it above the middle tier.
 * Shadow casting and receiving are enabled to enhance visual realism with lighting.
 *
 * @returns {THREE.Mesh} The mesh representing the top foliage section of the pine tree.
 */
function createTreeTop(){
    const topMesh = new THREE.Mesh(treeTopGeometry, treeMaterial);
    topMesh.position.set(0, 6.5, 0);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    return topMesh;
}

/**
 * Creates the bottom layer of snow for a pine tree as a THREE.Mesh.
 *
 * This function constructs a short, wide cylinder representing accumulated snow
 * resting on the lowest foliage tier of the tree. The geometry's radii are slightly
 * larger than the foliage to visually overhang the leaves. The mesh uses the
 * shared snowMaterial for a snowy appearance, is positioned just above the trunk,
 * and can cast and receive shadows for realistic lighting effects.
 *
 * @returns {THREE.Mesh} The mesh representing the bottom snow layer of the tree.
 */
function createBottomTreeSnow(){
    const bottomSnowMesh = new THREE.Mesh(bottomSnowGeometry, snowMaterial);
    bottomSnowMesh.position.set(0, 1, 0);
    bottomSnowMesh.castShadow = true;
    bottomSnowMesh.receiveShadow = true;
    return bottomSnowMesh;
}

/**
 * Creates the middle layer of snow for a pine tree as a THREE.Mesh.
 *
 * This function constructs a short, medium-width cylinder representing
 * accumulated snow resting on the middle foliage tier of the pine tree.
 * The mesh uses the shared snowMaterial to give a snowy appearance, is
 * positioned above the bottom snow layer, and is set to both cast and
 * receive shadows for realistic lighting effects.
 *
 * @returns {THREE.Mesh} The mesh representing the middle snow layer of the tree.
 */
function createMiddleTreeSnow(){
    const middleSnowMesh = new THREE.Mesh(middleSnowGeometry, snowMaterial);
    middleSnowMesh.position.set(0, 3.25, 0);
    middleSnowMesh.castShadow = true;
    middleSnowMesh.receiveShadow = true;
    return middleSnowMesh;
}

/**
 * Creates the top layer of snow for a pine tree as a THREE.Mesh.
 *
 * This function constructs a short, narrow cylinder representing
 * accumulated snow resting on the top foliage tier of the pine tree.
 * The mesh uses the shared snowMaterial to simulate a snowy appearance,
 * is positioned above the middle snow layer, and is set to both cast and
 * receive shadows for realistic lighting effects.
 *
 * @returns {THREE.Mesh} The mesh representing the top snow layer of the tree.
 */
function createTopTreeSnow(){
    const topSnowMesh = new THREE.Mesh(topSnowGeometry, snowMaterial);
    topSnowMesh.position.set(0, 5.25, 0);
    topSnowMesh.castShadow = true;
    topSnowMesh.receiveShadow = true;
    return topSnowMesh;
}

/**
 * Creates a group containing the three snow layers for a pine tree.
 *
 * This function assembles the bottom, middle, and top snow layers—
 * each represented as a THREE.Mesh—into a single THREE.Group. The
 * resulting group accurately positions each snow layer to rest on
 * the corresponding parts of the tree and maintains shadow properties
 * for realistic lighting. Useful for constructing a complete snowy
 * effect on a pine tree model.
 *
 * @returns {THREE.Group} A THREE.Group containing all the snow layers for the tree.
 */
function createTreeSnow(){
    const snowGroup = new THREE.Group();
    snowGroup.add(createBottomTreeSnow());
    snowGroup.add(createMiddleTreeSnow());
    snowGroup.add(createTopTreeSnow());
    return snowGroup;
}

/**
 * Asynchronously loads and prepares a star model for the top of a pine tree.
 *
 * This function utilizes GLTFLoader to load a 3D GLTF model of a Christmas star from the specified path.
 * After loading, it clones the scene and sets its position on top of the tree.
 * The function sets both castShadow and receiveShadow for the star and its mesh children to ensure
 * proper lighting integration into the scene. Additionally, it enhances all mesh materials by cloning them
 * and applying an emissive yellow glow for visual effect.
 *
 * @async
 * @function
 * @returns {Promise<THREE.Object3D | undefined>} A promise that resolves to the cloned and prepared star
 *   Object3D, or undefined if loading fails.
 */
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
                
                if (child.material) {
                    const addEmissiveGlow = (material) => {
                        if (!material) return material;
                        const newMaterial = material.clone();
                        newMaterial.emissive = new THREE.Color(0xffffaa);
                        newMaterial.emissiveIntensity = 0.5;
                        newMaterial.needsUpdate = true;
                        return newMaterial;
                    };
                    
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

/**
 * Creates and arranges decorative sprite-based lights for a Christmas tree.
 *
 * This function generates groups of colored lights, forming concentric rings around 
 * different heights of the pine tree. Each ring's lights are evenly distributed in angle,
 * with their positions staggered on alternating rings for a natural, wrapped look.
 * Colors are randomly chosen from the global `lightColors` array. Lights are implemented 
 * as THREE.Sprite objects using an additive blending material, giving a glowing effect.
 *
 * @function
 * @returns {THREE.Group} A THREE.Group containing sprites representing the tree's lights,
 *   ready to be added to a tree object.
 */
function createTreeLights(){
    const lightsGroup = new THREE.Group();

    const segments = [
        { y: 2, r: 3.25, lightsPerRing: 12 },
        { y: 4.25, r: 2.35, lightsPerRing: 8 },
        { y: 6.5, r: 1.25, lightsPerRing: 4 }
    ];

    /**
     * Creates a single ring of lights as sprites.
     * @param {number} centerY - The Y position for the ring.
     * @param {number} radius - The radius of the ring.
     * @param {number} angleOffset - The starting angle offset (in radians) for staggering lights.
     * @param {number} lightsPerRing - Number of lights to distribute in this ring.
     * @returns {THREE.Sprite[]} Array of THREE.Sprite objects positioned on the ring.
     */
    function createRing(centerY, radius, angleOffset, lightsPerRing) {
        const ringLights = [];
        const angleStep = (2 * Math.PI) / lightsPerRing;
        
        for (let i = 0; i < lightsPerRing; i++) {
            const angle = i * angleStep + angleOffset;
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            
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

    for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        const staggerOffset = Math.PI / seg.lightsPerRing;
        
        const bottomRingRadius = seg.r * 0.85;
        const bottomRingY = seg.y - 0.3;
        const bottomRingLights = createRing(bottomRingY, bottomRingRadius, 0, seg.lightsPerRing);
        bottomRingLights.forEach(light => lightsGroup.add(light));
        
        const topRingRadius = seg.r * 0.65;
        const topRingY = seg.y + 0.3;
        const topRingLights = createRing(topRingY, topRingRadius, staggerOffset, seg.lightsPerRing);
        topRingLights.forEach(light => lightsGroup.add(light));
    }

    return lightsGroup;
}

/**
 * Assembles and places a decorated Christmas tree at the specified world coordinates.
 *
 * This function constructs a tree by creating and grouping together its basic parts:
 * trunk, layered foliage (bottom, middle, top), a layer of snow, and lights.
 * It asynchronously loads a star asset and adds it to the top, if available.
 * The tree is positioned based on the given (x, z) on the ground height at that point,
 * and the whole tree is added to the global scene.
 *
 * @async
 * @param {number} x - The X coordinate for the tree location.
 * @param {number} z - The Z coordinate for the tree location.
 * @returns {Promise<THREE.Group>} The assembled THREE.Group representing the complete tree.
 */
async function createTree(x, z){
    const treeGroup = new THREE.Group();
    treeGroup.name = 'treeGroup';
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
 * Determines whether a given (x, z) position in the scene is suitable for placing a new object—such as a snowman or tree—by enforcing spatial constraints.
 *
 * The function checks that the proposed position:
 *   1. Is sufficiently far from major scene features such as the cottage and pond, respecting their radii plus an extra buffer.
 *   2. Does not violate minimum spacing requirements from any manually excluded locations, comparing both the new object's required spacing and the exclusion's own spacing.
 *   3. Maintains enough distance from all previously placed objects of the same type (provided in `existingObjects`), by using the greater of the new and existing object's minimum spacing values.
 *
 * The position is only considered valid if all distance checks pass.
 * @param {number} x - X coordinate to check
 * @param {number} z - Z coordinate to check
 * @param {Array<{x: number, z: number, minSpacing: number}>} existingObjects - Array of existing objects with their positions and minimum spacing requirements
 * @param {number} minDistanceFromStructures - Minimum distance from pond/cottage
 * @param {number} newObjectSpacing - Spacing requirement for the new object being placed
 * @param {Array<{x: number, z: number, minSpacing: number}>} excludePositions - Optional array of specific positions to exclude (e.g., manually placed objects)
 * @returns {boolean} True if the position is valid, false otherwise
 */
function isValidPosition(x, z, existingObjects = [], minDistanceFromStructures = 6, newObjectSpacing = 0, excludePositions = []) {
    const COTTAGE_CENTER = { x: 25, z: 10 };
    const COTTAGE_EXCLUSION_RADIUS = 12;
    const POND_CENTER = { x: -30, z: 0 };
    const POND_RADIUS = 25;
    
    const pondDist = Math.sqrt(Math.pow(x - POND_CENTER.x, 2) + Math.pow(z - POND_CENTER.z, 2));
    if (pondDist < POND_RADIUS + minDistanceFromStructures) {
        return false;
    }
    
    const cottageDist = Math.sqrt(Math.pow(x - COTTAGE_CENTER.x, 2) + Math.pow(z - COTTAGE_CENTER.z, 2));
    if (cottageDist < COTTAGE_EXCLUSION_RADIUS + minDistanceFromStructures) {
        return false;
    }
    
    for (const excludePos of excludePositions) {
        const dist = Math.sqrt(Math.pow(x - excludePos.x, 2) + Math.pow(z - excludePos.z, 2));
        const requiredSpacing = Math.max(newObjectSpacing, excludePos.minSpacing);
        if (dist < requiredSpacing) {
            return false;
        }
    }
    
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
 *
 * This function distributes items (e.g., snowmen, trees) across the scene in a roughly square grid pattern,
 * ensuring even spacing between each item while respecting minimum distance constraints from major scene features
 * (cottage, pond) and previously placed objects of the same type.
 *
 * The grid is calculated based on the available width and depth of the scene, excluding a specified edge clearance.
 * Items are placed in random positions within each grid cell, with some jitter to avoid exact centering.
 * @param {number} count - Number of items to generate
 * @param {number} spacing - Minimum distance between items of this type
 * @param {number} minDistanceFromStructures - Minimum distance from pond/cottage
 * @param {function} createFunction - Function that creates the item, takes (x, z) as parameters (can be async)
 * @param {Array<{x: number, z: number, minSpacing: number}>} existingObjects - Optional array of existing objects to avoid (e.g., other item types)
 * @param {number} edgeClearance - Clearance from ground edges (default: 5)
 * @param {number} maxTriesPerCell - Maximum attempts to place an item in each cell (default: 20)
 * @returns {Promise<Array<{x: number, z: number}>>} Promise that resolves to array of placed item positions (x, z) coordinates
 */
async function generateItem(count, spacing, minDistanceFromStructures, createFunction, existingObjects = [], edgeClearance = 5, maxTriesPerCell = 20) {
    const availableWidth = (groundBounds.xMax - groundBounds.xMin) - (edgeClearance * 2);
    const availableDepth = (groundBounds.zMax - groundBounds.zMin) - (edgeClearance * 2);
    
    const gridCols = Math.ceil(Math.sqrt(count * (availableWidth / availableDepth)));
    const gridRows = Math.ceil(count / gridCols);
    
    const cellWidth = availableWidth / gridCols;
    const cellDepth = availableDepth / gridRows;
    
    const placedItems = [];
    let itemIndex = 0;

    for (let row = 0; row < gridRows && itemIndex < count; row++) {
        for (let col = 0; col < gridCols && itemIndex < count; col++) {
            const cellCenterX = groundBounds.xMin + edgeClearance + (col + 0.5) * cellWidth;
            const cellCenterZ = groundBounds.zMin + edgeClearance + (row + 0.5) * cellDepth;
            
            const maxJitter = Math.min(cellWidth, cellDepth) * 0.3;
            let tries = 0;
            let placed = false;
            
            while (tries < maxTriesPerCell && !placed) {
                const jitterX = (Math.random() - 0.5) * maxJitter;
                const jitterZ = (Math.random() - 0.5) * maxJitter;
                const x = cellCenterX + jitterX;
                const z = cellCenterZ + jitterZ;
                
                if (x < groundBounds.xMin + edgeClearance || x > groundBounds.xMax - edgeClearance ||
                    z < groundBounds.zMin + edgeClearance || z > groundBounds.zMax - edgeClearance) {
                    tries++;
                    continue;
                }
                
                const allExistingObjects = [
                    ...existingObjects,
                    ...placedItems.map(pos => ({ x: pos.x, z: pos.z, minSpacing: spacing }))
                ];
                
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

/**
 * Asynchronously generates and places snowmen within the scene.
 *
 * This function determines positions for a fixed number of snowmen
 * such that each snowman is spaced a minimum distance apart from others
 * and does not overlap existing scene objects. It uses generateItem for
 * placement logic and then updates the global `sceneObjects` array so
 * other elements can avoid colliding with snowmen.
 *
 * @async
 * @returns {Promise<void>} Resolves when all snowmen have been placed and the sceneObjects array is updated.
 */
async function generateSnowmen(){
    const SNOWMAN_COUNT = 7;
    const SNOWMAN_MIN_DIST = 6;
    const SNOWMAN_SPACING = 8;
    
    const placedSnowmen = await generateItem(
        SNOWMAN_COUNT,
        SNOWMAN_SPACING,
        SNOWMAN_MIN_DIST,
        createSnowman,
        sceneObjects
    );
    
    // Find all snowman groups in the scene and add them to sceneObjects
    scene.traverse((child) => {
        if (child instanceof THREE.Group && child.name === 'snowmanGroup') {
            if (!sceneObjects.includes(child)) {
                sceneObjects.push(child);
            }
        }
    });
    
    for (const pos of placedSnowmen) {
        sceneObjects.push({ x: pos.x, z: pos.z, minSpacing: SNOWMAN_SPACING });
    }
}

/**
 * Asynchronously generates and places trees within the scene.
 *
 * This function determines positions for a fixed number of trees
 * such that each tree is spaced at least a minimum distance apart
 * from others and does not overlap existing scene objects.
 * It utilizes the generateItem function for placement logic and
 * then updates the global `sceneObjects` array so that future
 * placed elements can avoid colliding with trees.
 *
 * @async
 * @returns {Promise<void>} Resolves when all trees have been placed and the sceneObjects array is updated.
 */
async function generateTrees(){
    const TREE_COUNT = 10;
    const TREE_SPACING = 10;
    const TREE_MIN_DIST = 6;
    const placedTrees = await generateItem(
        TREE_COUNT,
        TREE_SPACING,
        TREE_MIN_DIST,
        createTree,
        sceneObjects
    );
    
    // Find all tree groups in the scene and add them to sceneObjects
    scene.traverse((child) => {
        if (child instanceof THREE.Group && child.name === 'treeGroup') {
            if (!sceneObjects.includes(child)) {
                sceneObjects.push(child);
            }
        }
    });
    
    for (const pos of placedTrees) {
        sceneObjects.push({ x: pos.x, z: pos.z, minSpacing: TREE_SPACING });
    }
}

/**
 * Asynchronously loads the campfire 3D model and prepares it for use in the scene.
 *
 * This function uses the GLTFLoader to load the campfire model from the specified path.
 * It clones the loaded model, assigns it the name 'campfire', and enables both casting
 * and receiving of shadows on the model and all its mesh children for proper lighting.
 * If the model loads successfully, the prepared campfire Object3D is returned.
 * In case of an error during loading, the error is logged to the console and the function returns null.
 *
 * @async
 * @function
 * @returns {Promise<THREE.Object3D|null>} A promise that resolves to the campfire Object3D if loaded successfully, otherwise null.
 */
async function loadCampfire(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/campfire/scene.gltf');
        const campfire = gltf.scene.clone();
        campfire.name = 'campfire';
        
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

/**
 * Asynchronously creates and places a campfire in the scene.
 *
 * This function creates a THREE.Group to hold the campfire model, loads and clones the campfire 3D model,
 * scales it to a desired height, centers it, and positions the group at a specific world coordinate.
 * The resulting group is added to both the `sceneObjects` array and the Three.js scene for rendering.
 * If the campfire model fails to load, a warning is logged and an empty group is still created and returned.
 *
 * @async
 * @function
 * @returns {Promise<THREE.Group>} A promise that resolves to the THREE.Group containing the campfire model.
 */
async function createCampfire() {
    const campfireGroup = new THREE.Group();
    campfireGroup.name = 'campfireGroup';
    
    const campfireModel = await loadCampfire();
    if (campfireModel) {
        const box = new THREE.Box3().setFromObject(campfireModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const targetHeight = 3;
        const scaleFactor = targetHeight / size.y;
        campfireModel.scale.setScalar(scaleFactor);
        
        campfireModel.position.sub(center);
        
        campfireGroup.add(campfireModel);
        
        const groundHeight = getHeightAt(-75, -3);
        campfireGroup.position.set(-75, groundHeight, -3);
        
    } else {
        console.warn('Campfire model failed to load');
    }
    
    sceneObjects.push(campfireGroup);
    scene.add(campfireGroup);
    return campfireGroup;
}

/**
 * Asynchronously loads and returns a log 3D model.
 *
 * This function uses GLTFLoader to load a log model from the specified path.
 * The loaded model is cloned, named, and prepared for the scene: it is scaled and
 * configured to both cast and receive shadows. If the model is successfully loaded,
 * it is returned as a THREE.Object3D instance. If loading fails, the error is logged
 * and null is returned.
 *
 * @async
 * @function
 * @returns {Promise<THREE.Object3D|null>} The loaded log object, or null if loading fails.
 */
async function loadLog(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/log/scene.gltf');
        const log = gltf.scene.clone();
        log.name = 'log';
        
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

/**
 * Asynchronously adds logs around the campfire in the scene.
 *
 * This function loads four individual log 3D models, positions them in a circle
 * around the campfire, and rotates two of them to simulate seating logs.
 * The logs are grouped together in a THREE.Group object, which is added to the scene
 * and sceneObjects array for proper rendering and management.
 *
 * @async
 * @function
 * @returns {Promise<THREE.Group>} The group containing all the log objects placed around the campfire.
 */
async function addLogsAroundCampfire(){
    const logGroup = new THREE.Group();
    
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

/**
 * Attempts to resume the audio context if it is suspended.
 *
 * This function checks if the global audioListener and its context exist; 
 * if the audio context's state is 'suspended', it calls the resume() method.
 * This is necessary on some browsers, such as Chrome, where audio playback may 
 * be suspended until user interaction occurs. The function logs success or 
 * error messages accordingly.
 *
 * @function
 * @returns {void}
 */
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

/**
 * Checks the distance between the elf and the campfire and controls the fire crackle sound.
 *
 * This function determines whether the elf is within a certain proximity to the campfire group.
 * If the elf is close enough (within `proximityRadius` units), it ensures the fire crackle
 * sound plays (resuming the audio context if necessary). Otherwise, it pauses the crackle sound.
 * The function performs necessary null checks to ensure all relevant objects are loaded.
 *
 * @function
 * @returns {void}
 */
export function checkCampfireProximity() {
    if (!elf) {
        return;
    }
    
    if (!audioListener) {
        return;
    }
    
    if (!fireCrackleSound) {
        return;
    }
    
    if (!elfGroup) {
        return;
    }
    
    if (!campfireGroup) {
        campfireGroup = scene.children.find(child => child.name === 'campfireGroup');
    }
    
    if (!campfireGroup) {
        return;
    }
    
    const distance = elfGroup.position.distanceTo(campfireGroup.position);
    const proximityRadius = 30;
    
    if (distance <= proximityRadius) {
        resumeAudioContext();
        if (fireCrackleSound.buffer) {
            if (!fireCrackleSound.isPlaying) {
                try {
                    fireCrackleSound.play();
                } catch (err) {
                    console.error('Error playing fire crackle sound:', err);
                }
            }
        }
    } else {
        if (fireCrackleSound.buffer && fireCrackleSound.isPlaying) {
            fireCrackleSound.pause();
        }
    }
}

export function checkCottageProximity() {
    if (!elf || !elfGroup) {
        return;
    }
    
    if (!audioListener || !jazzMusicSound) {
        return;
    }
    
    const cottageGroup = scene.children.find(child => child.name === 'cottageGroup');
    if (!cottageGroup) {
        return;
    }
    
    const distance = elfGroup.position.distanceTo(cottageGroup.position);
    const proximityRadius = 40;
    
    if (distance <= proximityRadius) {
        resumeAudioContext();
        if (jazzMusicSound.buffer) {
            if (!jazzMusicSound.isPlaying) {
                try {
                    jazzMusicSound.play();
                } catch (err) {
                    console.error('Error playing jazz music:', err);
                }
            }
        }
    } else {
        if (jazzMusicSound.buffer && jazzMusicSound.isPlaying) {
            jazzMusicSound.pause();
        }
    }
}

/**
 * Creates and attaches a looping positional fire crackle sound to the provided fire group.
 *
 * Initializes an audio listener (adding it to the camera if necessary), then creates a new
 * THREE.PositionalAudio object using the listener. Loads the fire crackle sound file asynchronously,
 * configures audio properties such as reference distance, max distance, rolloff factor, looping,
 * and volume, and attaches the positional sound to the given fire group object.
 * Also assigns the positional audio to the global fireCrackleSound variable for later access.
 *
 * @param {THREE.Group} fire - The campfire group to which the crackle sound should be attached.
 * @returns {void}
 */
function makeFireCrackle(fire){
    if (!audioListener) {
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
    }
    
    const posSound1 = new THREE.PositionalAudio(audioListener);
    const audioLoader = new THREE.AudioLoader();
    
    fireCrackleSound = posSound1;
    
    posSound1.position.set(0, 0, 0);
    
    audioLoader.load(
        '/sounds/fire-crackle.mp3',
        function(buffer) {
            posSound1.setBuffer(buffer);
            posSound1.setRefDistance(5);
            posSound1.setMaxDistance(50);
            posSound1.setRolloffFactor(8);
            posSound1.setLoop(true);
            posSound1.setVolume(0.8);
            
            fire.add(posSound1);
        },
        undefined, // onProgress callback (optional)
        function(error) {
            console.error('Error loading fire crackle sound:', error);
        }
    );
}

function loadStoneTexture(){
    const loader = new THREE.TextureLoader();
    const stoneTexture = loader.load('/textures/stone.png');
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.repeat.set(10, 10);
    return stoneTexture;
}

async function loadPeppermint(){
    const loader = new GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/peppermint_candy/scene.gltf');
        const log = gltf.scene.clone();
        log.name = 'peppermint';
        
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

/**
 * Creates and returns a closed Catmull-Rom spline path for the scene.
 *
 * This function generates a smooth, continuous loop (using THREE.CatmullRomCurve3)
 * based on the points provided by getPathPoints(). The path is intended to
 * outline a walkable route around the scene, circling major landmarks such as the cottage,
 * campfire, and pond, while maintaining appropriate clearances from obstacles
 * and the scene edges. The resulting path can be used for placing decorative stones,
 * animating objects, or guiding camera movement.
 *
 * @returns {THREE.CatmullRomCurve3} The closed Catmull-Rom curve representing the scene path.
 */
function createPath(){
    const path = new THREE.CatmullRomCurve3(getPathPoints(), true);

    return path;
}

/**
 * Generates an array of THREE.Vector3 points that define a looping path around the scene.
 *
 * The path is constructed to avoid scene objects as defined in sceneObjects, maintaining a minimum clearance,
 * and also ensuring the path stays inside the bounds of the ground (groundBounds), away from the scene edges.
 * The routine employs a configurable number of points to create a smooth loop (via CatmullRomCurve3), and can
 * apply a repulsive force from sceneObjects to keep sufficient distance. The number of points, smoothing passes,
 * and clearances from objects/bounds are all configurable in the function.
 *
 * @returns {THREE.Vector3[]} An array of THREE.Vector3 objects representing the points of the looped path.
 */
function getPathPoints(){
    const PATH_CLEARANCE = 4; // Minimum distance from scene objects
    const EDGE_CLEARANCE = 5; // Distance from scene edges
    const POINT_COUNT = 100; // Number of points to generate for the loop
    const REPULSION_RANGE = 15; // How far objects push the path away
    const SMOOTHING_ITERATIONS = 3; // Number of smoothing passes
    
    // Calculate repulsion force from all scene objects at a given point
    const getRepulsionForce = (x, z) => {
        let forceX = 0;
        let forceZ = 0;
        
        for (const obj of sceneObjects) {
            const dx = x - obj.x;
            const dz = z - obj.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const requiredSpacing = (obj.minSpacing || 0) + PATH_CLEARANCE;
            
            if (dist < REPULSION_RANGE && dist > 0.01) {
                const pushStrength = Math.max(0, (REPULSION_RANGE - dist) / REPULSION_RANGE);
                const pushAmount = (requiredSpacing - dist) * pushStrength;
                
                const dirX = dx / dist;
                const dirZ = dz / dist;
                forceX += dirX * pushAmount * 0.5;
                forceZ += dirZ * pushAmount * 0.5;
            }
        }
        
        return { forceX, forceZ };
    };
    
    // Keep point within bounds
    const clampToBounds = (x, z) => {
        x = Math.max(groundBounds.xMin + EDGE_CLEARANCE, Math.min(groundBounds.xMax - EDGE_CLEARANCE, x));
        z = Math.max(groundBounds.zMin + EDGE_CLEARANCE, Math.min(groundBounds.zMax - EDGE_CLEARANCE, z));
        return { x, z };
    };
    
    const basePoints = [];
    const centerX = (groundBounds.xMin + groundBounds.xMax) / 2;
    const centerZ = (groundBounds.zMin + groundBounds.zMax) / 2;
    const radiusX = (groundBounds.xMax - groundBounds.xMin) / 2 - EDGE_CLEARANCE;
    const radiusZ = (groundBounds.zMax - groundBounds.zMin) / 2 - EDGE_CLEARANCE;
    
    for (let i = 0; i < POINT_COUNT; i++) {
        const angle = (i / POINT_COUNT) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radiusX;
        const z = centerZ + Math.sin(angle) * radiusZ;
        basePoints.push({ x, z });
    }
    
    let currentPoints = basePoints.map(p => ({ ...p }));
    
    for (let iteration = 0; iteration < 10; iteration++) {
        const newPoints = [];
        
        for (let i = 0; i < currentPoints.length; i++) {
            let x = currentPoints[i].x;
            let z = currentPoints[i].z;
            
            const force = getRepulsionForce(x, z);
            x += force.forceX;
            z += force.forceZ;
            
            const clamped = clampToBounds(x, z);
            x = clamped.x;
            z = clamped.z;
            
            newPoints.push({ x, z });
        }
        
        currentPoints = newPoints;
    }
    
    for (let smoothIter = 0; smoothIter < SMOOTHING_ITERATIONS; smoothIter++) {
        const smoothed = [];
        
        for (let i = 0; i < currentPoints.length; i++) {
            const prev = currentPoints[(i - 1 + currentPoints.length) % currentPoints.length];
            const curr = currentPoints[i];
            const next = currentPoints[(i + 1) % currentPoints.length];
            
            let x = (prev.x + curr.x + next.x) / 3;
            let z = (prev.z + curr.z + next.z) / 3;
            
            const force = getRepulsionForce(x, z);
            x += force.forceX * 0.3;
            z += force.forceZ * 0.3;
            
            const clamped = clampToBounds(x, z);
            smoothed.push({ x: clamped.x, z: clamped.z });
        }
        
        currentPoints = smoothed;
    }
    
    const pathPoints = [];
    for (const point of currentPoints) {
        const y = getHeightAt(point.x, point.z);
        pathPoints.push(new THREE.Vector3(point.x, y, point.z));
    }
    
    if (pathPoints.length > 0) {
        pathPoints.push(pathPoints[0].clone());
    }
    
    return pathPoints;
}

/**
 * Asynchronously places peppermint candy models along a given path in the scene.
 *
 * This function loads a peppermint candy 3D model, clones it multiple times, and positions each clone
 * at evenly spaced intervals along the provided THREE.Curve path. All candy models are grouped together in a
 * THREE.Group, which is then added to the scene. If the peppermint model fails to load, a warning is logged
 * and nothing is added to the scene.
 *
 * @async
 * @function
 * @param {THREE.Curve} path - The path along which to distribute the candies. Should support getPoint(t).
 * @returns {Promise<THREE.Group|undefined>} Returns a Promise resolving to the group containing all placed candies, or undefined if the model fails to load.
 */
async function addCandyToPath(path){
    const candies = new THREE.Group();
    const candyCount = 200;
    
    const peppermintTemplate = await loadPeppermint();
    if (!peppermintTemplate) {
        console.warn('Peppermint model failed to load');
        return;
    }
    
    for (let i = 0; i < candyCount; i++) {
        const t = i / candyCount;
        const point = path.getPoint(t);
        const candy = peppermintTemplate.clone();
        candy.scale.setScalar(1);
        candy.position.set(point.x, point.y - 0.2, point.z);
        candies.add(candy);
    }
    
    scene.add(candies);
    return candies;
}

/**
 * Makes a snowman speak a random holiday greeting using the Web Speech API.
 * 
 * This function selects a random greeting from the holidayGreetings array and
 * uses the browser's speech synthesis to speak it. The voice, rate, pitch, and
 * volume are configured for a natural-sounding greeting.
 * 
 * @export
 * @function
 */
export function makeSnowmanSpeak(){
    const greeting = holidayGreetings[Math.floor(Math.random() * holidayGreetings.length)];
    const speech = new SpeechSynthesisUtterance(greeting);
    
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && (voice.name.includes('Male') || voice.name.includes('Fred'))
    ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
    
    if (preferredVoice) {
        speech.voice = preferredVoice;
    }
    
    speech.rate = 0.9;
    speech.pitch = 1.0;
    speech.volume = 1.0;
    
    speechSynthesis.speak(speech);
}

/**
 * Creates a snowball mesh with morph target for squash/stretch animation.
 *
 * This function constructs a sphere geometry to represent a snowball and adds
 * a morph target that flattens and stretches the sphere. The morph target can be used
 * for animation effects such as squashing upon impact or interaction.
 *
 * The snowball's geometry:
 * - Base geometry: sphere of radius 0.3 and 16 width/height segments.
 * - Morph target: stretches X and Z (by flatteningFactor), flattens Y (by 0.1).
 *
 * Returns a THREE.Mesh object using the snowMaterial (cloned).
 *
 * @returns {THREE.Mesh} The snowball mesh with morph target.
 */
function createSnowball(){
    const geometry = snowballGeometry.clone();
    
    const positionAttribute = geometry.attributes.position;
    const morphPositions = [];
    
    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = positionAttribute.getZ(i);
        
        const flatteningFactor = 3;
        const newY = y * 0.1;
        const newX = x * flatteningFactor;
        const newZ = z * flatteningFactor;
        
        morphPositions.push(newX, newY, newZ);
    }
    
    geometry.morphAttributes.position = [
        new THREE.Float32BufferAttribute(morphPositions, 3)
    ];
    
    const snowballMaterial = snowMaterial.clone();
    const snowball = new THREE.Mesh(geometry, snowballMaterial);
    
    snowball.morphTargetInfluences = [0];
    
    return snowball;
}

/**
 * Creates and adds a pile of snowballs to the scene at a fixed location.
 *
 * This function generates a group of 100 snowball meshes, distributed in a small random area
 * near the specified coordinates (50, 0) in world space. Each snowball's local Y position
 * is adjusted according to the terrain height at its world placement. The snowballs are grouped
 * together and positioned as a single pile. The pile is added to both the scene and the
 * sceneObjects array for management.
 *
 * Typical use: a decorative or interactive pile of snowballs for the outdoor winter scene.
 */
function createSnowballPile() {
    const snowballPile = new THREE.Group();
    snowballPile.name = 'snowballPile';
    const groupWorldX = 50;
    const groupWorldZ = 0;
    const groupWorldY = getHeightAt(groupWorldX, groupWorldZ);
    
    snowballPile.position.set(groupWorldX, groupWorldY, groupWorldZ);
    
    for (let i = 0; i < 100; i++) {
        const snowball = createSnowball();
        const localX = Math.random() * 5 - 1;
        const localZ = Math.random() * 5 - 1;
        
        const worldX = groupWorldX + localX;
        const worldZ = groupWorldZ + localZ;
        const worldY = getHeightAt(worldX, worldZ);
        
        const localY = worldY - groupWorldY;
        snowball.position.set(localX, localY, localZ);
        snowballPile.add(snowball);
    }
    
    sceneObjects.push(snowballPile);
    scene.add(snowballPile);
}

/**
 * Checks if the elf currently has a snowball in hand.
 * 
 * @returns {boolean} True if a snowball is found in hand, false otherwise.
 */
export function hasSnowballInHand(){
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
        if (!elf) {
            scene.traverse((child) => {
                if (child.name === 'elf') {
                    elf = child;
                }
            });
        }
    }
    if (!elf) {
        return false;
    }
    
    if (!elfGroup) {
        elfGroup = elf.parent;
    }
    if (!elfGroup) {
        return false;
    }
    
    const snowball = elfGroup.children.find(child => child.name === 'snowballInHand');
    if (snowball) {
        return true;
    }
    
    let foundInScene = false;
    scene.traverse((child) => {
        if (child.name === 'snowballInHand' && child.parent === scene) {
            foundInScene = true;
        }
    });
    
    return foundInScene;
}

/**
 * Adds a snowball mesh to the elf character's hand (held position).
 *
 * This function ensures the elf character (as represented by elfGroup) is valid.
 * If a snowball is already present in the elf's hand, it will be removed first,
 * then a new snowball mesh is created, named 'snowballInHand', and added as a child
 * of elfGroup. The function also sets up shadow casting/receiving properties for realism.
 * The snowball's position is set relative to elfGroup to approximate a hand-held location.
 *
 * If elfGroup is not found, the function logs a warning and returns null.
 * Otherwise, the function returns nothing.
 *
 * Typical usage: call this function to make the elf "pick up" a new snowball,
 * either on interaction or before a snowball throw action.
 *
 * @export
 * @function pickUpSnowball
 */
export function pickUpSnowball(){
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
        if (!elf) {
            scene.traverse((child) => {
                if (child.name === 'elf') {
                    elf = child;
                }
            });
        }
    }
    if (!elf) {
        console.warn('Elf not found, cannot pick up snowball');
        return null;
    }
    
    if (!elfGroup) {
        elfGroup = elf.parent;
    }
    if (!elfGroup) {
        console.warn('ElfGroup not found, cannot pick up snowball');
        return null;
    }
    
    const existingSnowball = elfGroup.children.find(child => child.name === 'snowballInHand');
    if (existingSnowball) {
        elfGroup.remove(existingSnowball);
    }
    
    const snowball = createSnowball();
    snowball.name = 'snowballInHand';
    snowball.castShadow = true;
    snowball.receiveShadow = true;
    
    snowball.position.set(-2, 1.5, 1.0);
    
    elfGroup.add(snowball);    
}

function createThrowPath(mouseX, mouseY){
    if (!elfGroup) {
        if (!elf) {
            elf = scene.children.find(child => child.name === 'elf');
            if (!elf) {
                scene.traverse((child) => {
                    if (child.name === 'elf') {
                        elf = child;
                    }
                });
            }
        }
        if (elf) {
            elfGroup = elf.parent;
        }
    }
    if (!elfGroup) {
        console.warn('ElfGroup not found, cannot create throw path');
        return null;
    }
    
    let snowball = elfGroup.children.find(child => child.name === 'snowballInHand');
    
    if (!snowball) {
        scene.traverse((child) => {
            if (child.name === 'snowballInHand' && child.parent === scene) {
                snowball = child;
            }
        });
    }
    
    if (!snowball) {
        console.warn('Snowball not found, cannot create throw path');
        return null;
    }
    
    const snowballWorldPos = new THREE.Vector3();
    snowball.getWorldPosition(snowballWorldPos);
    
    const mouse = new THREE.Vector2();
    mouse.x = (mouseX / window.innerWidth) * 2 - 1;
    mouse.y = -(mouseY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const objectsToCheck = sceneObjects.filter(obj => obj instanceof THREE.Object3D);
    let intersects = [];
    
    for (const obj of objectsToCheck) {
        try {
            const objIntersects = raycaster.intersectObject(obj, true);
            intersects.push(...objIntersects);
        } catch (e) {
            continue;
        }
    }
    
    if (ground) {
        try {
            const groundIntersects = raycaster.intersectObject(ground, false);
            intersects.push(...groundIntersects);
        } catch (e) {
        }
    }
    
    let targetPos;
    if (intersects.length > 0) {
        intersects.sort((a, b) => a.distance - b.distance);
        targetPos = intersects[0].point;
    } else {
        const farPoint = new THREE.Vector3();
        raycaster.ray.at(100, farPoint);
        targetPos = farPoint;
    }
    
    const path = new THREE.LineCurve3(snowballWorldPos, targetPos);
    return path;
}


/**
 * Initiates the throwing of the snowball by the elf character.
 *
 * This function checks if the elf and a snowball in hand are available. If so,
 * it creates a throw animation path towards the screen position specified
 * by the mouse or touch coordinates (x, y). It then detaches the snowball from
 * the elf and starts the animation that visually moves the snowball along the path.
 *
 * Typical usage: Call this function in response to a mouse click or tap event
 * to throw a snowball from the elf's hand towards the user's target.
 *
 * @export
 * @function
 * @param {number} x - The X coordinate (in pixels) of the user's intended target on the screen.
 * @param {number} y - The Y coordinate (in pixels) of the user's intended target on the screen.
 */
export function throwSnowball(x, y){
    if (snowballThrowAnimation) {
        return;
    }
    
    if (!elf) {
        elf = scene.children.find(child => child.name === 'elf');
        if (!elf) {
            scene.traverse((child) => {
                if (child.name === 'elf') {
                    elf = child;
                }
            });
        }
    }
    if (!elf) {
        return;
    }
    
    if (!elfGroup) {
        elfGroup = elf.parent;
    }
    if (!elfGroup) {
        return;
    }
    
    let snowball = elfGroup.children.find(child => child.name === 'snowballInHand');
    
    if (!snowball) {
        scene.traverse((child) => {
            if (child.name === 'snowballInHand' && child.parent === scene) {
                snowball = child;
            }
        });
    }
    
    if (!snowball) {
        console.warn('No snowball in hand to throw');
        return;
    }
    
    const path = createThrowPath(x, y);
    if (!path) {
        return;
    }
    
    const startPos = new THREE.Vector3();
    snowball.getWorldPosition(startPos);
    
    const originalParent = snowball.parent;
    
    if (snowball.parent) {
        snowball.parent.remove(snowball);
    }
    scene.add(snowball);
    snowball.position.copy(startPos);
    
    snowballThrowAnimation = {
        snowball: snowball,
        path: path,
        currentT: 0,
        speed: 0.02,
        originalParent: originalParent,
        morphTriggered: false
    };
}

/**
 * Updates the snowball throw animation, moving the snowball along the path.
 * 
 * This function should be called every frame in the animate loop. It moves the snowball
 * along the throw path until it reaches the impact point, then calls morphSnowballIntoSplat()
 * and makeSplatSound().
 * 
 * @export
 * @function updateSnowballThrow
 */
export function updateSnowballThrow(){
    if (!snowballThrowAnimation) {
        return;
    }
    
    const { snowball, path, speed } = snowballThrowAnimation;
    
    if (snowballThrowAnimation.morphTriggered) {
        return;
    }
    
    snowballThrowAnimation.currentT += speed;
    
    if (snowballThrowAnimation.currentT > 1) {
        snowballThrowAnimation.currentT = 1;
    }
    
    const previousT = Math.max(0, snowballThrowAnimation.currentT - speed);
    const previousPoint = path.getPoint(previousT);
    const currentPoint = path.getPoint(snowballThrowAnimation.currentT);
    
    const hitResult = checkSnowballCollisionAlongPath(previousPoint, currentPoint);
    
    if (hitResult) {
        console.log('Snowball collision detected, triggering morph', hitResult);
        snowball.position.copy(hitResult.point);
        snowballThrowAnimation.morphTriggered = true;
        snowballThrowAnimation.impactPoint = hitResult.point;
        morphSnowballIntoSplat();
    } else {
        snowball.position.copy(currentPoint);
    }
}

/**
 * Checks if the snowball collides with any scene objects while moving from previous to current position.
 * 
 * @param {THREE.Vector3} previousPosition - The snowball's previous position
 * @param {THREE.Vector3} currentPosition - The snowball's current position
 * @returns {Object|null} - Returns { point: hitPoint } if collision detected, null otherwise
 */
function checkSnowballCollisionAlongPath(previousPosition, currentPosition) {
    const snowballRadius = 0.3;
    const raycaster = new THREE.Raycaster();
    
    raycaster.camera = camera;
    
    const objectsToCheck = sceneObjects.filter(obj => obj instanceof THREE.Object3D);
    
    scene.traverse((child) => {
        if (child instanceof THREE.Group) {
            if (child.name === 'cottageGroup' || 
                child.name === 'snowmanGroup' || 
                (child.name && child.name.startsWith('treeGroup')) ||
                child.name === 'campfireGroup' ||
                child.name === 'logGroup') {
                if (!objectsToCheck.includes(child)) {
                    objectsToCheck.push(child);
                }
            }
        }
    });
    
    if (ground) {
        objectsToCheck.push(ground);
    }
    
    const direction = new THREE.Vector3().subVectors(currentPosition, previousPosition);
    const distance = direction.length();
    
    if (distance === 0) {
        return null;
    }
    
    direction.normalize();
    
    raycaster.set(previousPosition, direction);
    
    let intersects = [];
    try {
        intersects = raycaster.intersectObjects(objectsToCheck, true);
    } catch (error) {
        for (const obj of objectsToCheck) {
            try {
                if (obj.type === 'Sprite') {
                    continue;
                }
                const objIntersects = raycaster.intersectObject(obj, true);
                intersects.push(...objIntersects);
            } catch (e) {
                continue;
            }
        }
    }
    
    if (intersects.length > 0) {
        intersects.sort((a, b) => a.distance - b.distance);
        const closestHit = intersects[0];
        
        if (closestHit.object && closestHit.object.name && closestHit.object.name.includes('tree')) {
            console.log('Tree intersection found:', {
                distance: closestHit.distance,
                snowballRadius: snowballRadius,
                pathDistance: distance,
                condition: `${closestHit.distance} >= ${snowballRadius} && ${closestHit.distance} <= ${distance + snowballRadius}`,
                passes: closestHit.distance >= snowballRadius && closestHit.distance <= distance + snowballRadius
            });
        }
        
        if (closestHit.distance >= 0 && closestHit.distance <= distance + snowballRadius) {
            const hitPoint = closestHit.point.clone();
            const offsetDirection = direction.clone().negate();
            hitPoint.add(offsetDirection.multiplyScalar(snowballRadius));
            return { point: hitPoint };
        }
    }
    
    const groundHeight = getHeightAt(currentPosition.x, currentPosition.z);
    if (currentPosition.y <= groundHeight + snowballRadius) {
        const groundHitPoint = new THREE.Vector3(currentPosition.x, groundHeight + snowballRadius, currentPosition.z);
        return { point: groundHitPoint };
    }
    
    return null;
}

function morphSnowballIntoSplat(){
    if (!snowballThrowAnimation) {
        return;
    }
    
    const { snowball } = snowballThrowAnimation;
    
    if (!snowball) {
        return;
    }
    
    if (!snowball.morphTargetInfluences || snowball.morphTargetInfluences.length === 0) {
        console.warn('Snowball has no morph targets');
        return;
    }
    
    if (!snowball.geometry || !snowball.geometry.morphAttributes || !snowball.geometry.morphAttributes.position) {
        console.warn('Snowball geometry has no morph attributes');
        return;
    }
    
    console.log('Starting snowball morph animation');
    
    makeSplatSound();
    
    const morphStartTime = Date.now();
    const morphDuration = 150;
    
    function animateMorph() {
        if (!snowball || !snowball.parent) {
            console.warn('Snowball removed during morph animation');
            return;
        }
        
        const elapsed = Date.now() - morphStartTime;
        const progress = Math.min(elapsed / morphDuration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        snowball.morphTargetInfluences[0] = eased;
        
        if (progress < 1) {
            requestAnimationFrame(animateMorph);
        } else {
            setTimeout(() => {
                fadeOutSplat(snowball);
            }, 2000);
        }
    }
    
    animateMorph();
}

/**
 * Fade out a splatted snowball object over a duration, then remove it from the scene.
 * Disposes of its geometry and material to free GPU resources.
 * 
 * @param {THREE.Mesh} splat - The snowball splat mesh to be faded out and cleaned up.
 *
 * The function animates the material's opacity from 1 to 0 over 500ms,
 * marks the material as transparent, and finally removes and disposes of the mesh, geometry, and material.
 * It also clears the `snowballThrowAnimation` reference.
 */
function fadeOutSplat(splat) {
    const fadeStartTime = Date.now();
    const fadeDuration = 500;
    
    function fade() {
        const elapsed = Date.now() - fadeStartTime;
        const progress = Math.min(elapsed / fadeDuration, 1);
        
        splat.material.opacity = 1 - progress;
        splat.material.transparent = true;
        
        if (progress < 1) {
            requestAnimationFrame(fade);
        } else {
            if (splat && splat.parent) {
                splat.parent.remove(splat);
            }
            if (splat.geometry) {
                splat.geometry.dispose();
            }
            if (splat.material) {
                splat.material.dispose();
            }
            snowballThrowAnimation = null;
        }
    }
    
    fade();
}

/**
 * Plays the "splat" sound effect when a snowball hits an object.
 * 
 * - Ensures there is a THREE.AudioListener attached to the camera (creates and attaches one if absent).
 * - Loads the splat sound effect from "/sounds/splat.mp3" using THREE.AudioLoader.
 * - Sets buffer, volume (0.7), and disables looping on the playing sound.
 * - Calls `resumeAudioContext()` to make sure the audio context is resumed (helps with browser restrictions).
 * - Plays the sound.
 * - Logs an error to the console if the sound file fails to load.
 *
 * Note: `audioListener`, `camera`, and `resumeAudioContext` must be in scope.
 */
function makeSplatSound() {
    if (!audioListener) {
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
    }
    
    const splatSound = new THREE.Audio(audioListener);
    const audioLoader = new THREE.AudioLoader();
    
    audioLoader.load(
        '/sounds/splat.mp3',
        function(buffer) {
            splatSound.setBuffer(buffer);
            splatSound.setVolume(0.7);
            splatSound.setLoop(false);
            
            resumeAudioContext();
            splatSound.play();
        },
        function(error) {
            console.error('Error loading splat sound:', error);
        }
    );
}

function loadWallTexture(){
    const loader = new THREE.TextureLoader();
    const wallTexture = loader.load(
        '/textures/mountains.webp',
        (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1);
        },
        undefined,
        (error) => {
            console.error('Error loading wall texture:', error);
        }
    );
    
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(1, 1);
    
    return wallTexture;
}

function createWall(wallCorners, wallName) {
    const corner1 = wallCorners[0];
    const corner2 = wallCorners[1];
    
    const wallWidth = corner1.distanceTo(corner2);
    
    const wallHeight = 25;
    
    const wallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    
    if (wallName) {
        wallMesh.name = wallName;
    }
    
    const midpoint = new THREE.Vector3();
    midpoint.addVectors(corner1, corner2);
    midpoint.multiplyScalar(0.5);
    
    wallMesh.position.set(midpoint.x, wallHeight / 2 - 5, midpoint.z);
    
    const wallDirection = new THREE.Vector3();
    wallDirection.subVectors(corner2, corner1);
    wallDirection.normalize();
    
    const outwardDirection = new THREE.Vector3();
    outwardDirection.copy(midpoint);
    outwardDirection.normalize();
    
    const wallNormal = new THREE.Vector3();
    wallNormal.crossVectors(wallDirection, new THREE.Vector3(0, 1, 0));
    
    if (wallNormal.dot(outwardDirection) < 0) {
        wallNormal.negate();
    }
    
    const angle = Math.atan2(wallNormal.x, wallNormal.z);
    wallMesh.rotation.y = angle;
    
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    
    return wallMesh;
}

function determineWallCorners(){
    const groundCorners = [];
    const frontLeftCorner = new THREE.Vector3(groundBounds.xMin, 0, groundBounds.zMin);
    const frontRightCorner = new THREE.Vector3(groundBounds.xMax, 0, groundBounds.zMin);
    const backLeftCorner = new THREE.Vector3(groundBounds.xMin, 0, groundBounds.zMax);
    const backRightCorner = new THREE.Vector3(groundBounds.xMax, 0, groundBounds.zMax);

    groundCorners.push(frontLeftCorner);
    groundCorners.push(frontRightCorner);
    groundCorners.push(backLeftCorner);
    groundCorners.push(backRightCorner);

    return groundCorners;
}

function determineFrontWallBounds(){
    const wallCorners = determineWallCorners();
    const frontWallCorners = [];
    const frontLeftCorner = wallCorners[0];
    const frontRightCorner = wallCorners[1];
    frontWallCorners.push(frontLeftCorner);
    frontWallCorners.push(frontRightCorner);
    return frontWallCorners;
}

function determineBackWallBounds(){
    const wallCorners = determineWallCorners();
    const backWallCorners = [];
    const backLeftCorner = wallCorners[2];
    const backRightCorner = wallCorners[3];
    backWallCorners.push(backLeftCorner);
    backWallCorners.push(backRightCorner);
    return backWallCorners;
}

function determineLeftWallBounds(){
    const wallCorners = determineWallCorners();
    const leftWallCorners = [];
    const leftFrontCorner = wallCorners[0];
    const leftBackCorner = wallCorners[2];
    leftWallCorners.push(leftFrontCorner);
    leftWallCorners.push(leftBackCorner);
    return leftWallCorners;
}

function determineRightWallBounds(){
    const wallCorners = determineWallCorners();
    const rightWallCorners = [];
    const rightFrontCorner = wallCorners[1];
    const rightBackCorner = wallCorners[3];
    rightWallCorners.push(rightFrontCorner);
    rightWallCorners.push(rightBackCorner);
    return rightWallCorners;
}

function generateWalls(){
    const frontWall = createWall(determineFrontWallBounds(), 'frontWall');
    const backWall = createWall(determineBackWallBounds(), 'backWall');
    const leftWall = createWall(determineLeftWallBounds(), 'leftWall');
    const rightWall = createWall(determineRightWallBounds(), 'rightWall');
    scene.add(frontWall);
    scene.add(backWall);
    scene.add(leftWall);
    scene.add(rightWall);
    
    sceneObjects.push(frontWall);
    sceneObjects.push(backWall);
    sceneObjects.push(leftWall);
    sceneObjects.push(rightWall);
}

function addJazzToHouse(cottageGroup){
    if (!cottageGroup) {
        return;
    }
    
    if (!audioListener) {
        audioListener = new THREE.AudioListener();
        camera.add(audioListener);
    }
    
    const jazzMusic = new THREE.PositionalAudio(audioListener);
    const audioLoader = new THREE.AudioLoader();
    
    jazzMusicSound = jazzMusic;
    jazzMusic.position.set(25, 0, 10);
    
    audioLoader.load(
        '/sounds/christmas-jazz.mp3',
        function(buffer) {
            jazzMusic.setBuffer(buffer);
            jazzMusic.setRefDistance(5);
            jazzMusic.setMaxDistance(40);
            jazzMusic.setRolloffFactor(8);
            jazzMusic.setLoop(true);
            jazzMusic.setVolume(0.4);
            
            cottageGroup.add(jazzMusic);
        },
        undefined
    );
}

export async function setupOutdoorScene(){    
    setupLights();
    createGround();
    await generateElfAtOrigin();
    const cottageGroup = await generateCottage();
    addChristmasLightsToCottage();
    generateSnow();
    createIcyPond();
    campfireGroup = await createCampfire();
    makeFireCrackle(campfireGroup);
    await addLogsAroundCampfire();
    await generateSnowmen();
    await generateTrees();   
    initKeyboardListeners();
    createNorthernLights();
    createSnowballPile();
    generateWalls();
    await addCandyToPath(createPath());
    addJazzToHouse(cottageGroup);
    return { scene, camera };
}

