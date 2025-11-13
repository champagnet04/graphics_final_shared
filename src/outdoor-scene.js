import * as THREE from 'three';

//this file will setup the outdoor scene
//it is incredibly important that we break down EVERYTHING into as many smaller functions as possible
const scene = createScene();
const camera = setupCamera();

function createScene(){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x191970); // Midnight blue background
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
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Gray color for ground
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    ground.position.y = 0; // Position at ground level
    scene.add(ground);
}
 
export function setupOutdoorScene(){    
    // Setup camera
    setupCamera();
    
    // Setup lights (pass scene)
    setupLights(scene);
    
    // Create and add ground
    createGround();
    
    return { scene, camera }; // Return both scene and camera
}