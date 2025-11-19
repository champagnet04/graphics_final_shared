import * as THREE from 'three';
import { setupOutdoorScene } from './outdoor-scene.js';
import { moveElf, updateSnow, northernLights, followElf, lookAround, checkCampfireProximity, makeSnowmanSpeak, pickUpSnowball, updateSnowballThrow, throwSnowball, hasSnowballInHand } from './outdoor-scene.js';

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // OrbitControls disabled - using 3rd person camera following elf
    // const controls = new OrbitControls(camera, renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    function checkIfSnowballPile(intersects) {
        for (const intersect of intersects) {
            let obj = intersect.object;
            while (obj) {
                if (obj.name === 'snowballPile') {
                    pickUpSnowball();
                    return true;
                }
                obj = obj.parent;
            }
        }
        return false;
    }
    
    function checkIfSnowman(intersects, event) {
        for (const intersect of intersects) {
            let obj = intersect.object;
            while (obj) {
                if (obj.type === 'Group' && obj.name !== 'snowballPile' && obj.children.length > 0) {
                    if (obj.children.length < 20 && obj.children.some(part => 
                        part.type === 'Mesh' && 
                        part.geometry && 
                        part.geometry.type === 'SphereGeometry'
                    )) {
                        // If snowball is in hand, throw it instead of making snowman speak
                        if (hasSnowballInHand()) {
                            throwSnowball(event.clientX, event.clientY);
                        } else {
                            makeSnowmanSpeak();
                        }
                        return true;
                    }
                }
                obj = obj.parent;
            }
        }
        return false;
    }
    
    function onMouseClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const allIntersects = raycaster.intersectObjects(scene.children, true);
        
        // Check for snowball pile click first
        if (checkIfSnowballPile(allIntersects)) {
            return;
        }
        
        // Check for snowman click
        if (checkIfSnowman(allIntersects, event)) {
            return;
        }
        
        // Otherwise, throw snowball if one exists
        throwSnowball(event.clientX, event.clientY);
    }
    
    renderer.domElement.addEventListener('click', onMouseClick);

    // Update camera aspect ratio when window resizes
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    function animate() {
        requestAnimationFrame(animate);
        lookAround();
        moveElf();
        followElf();
        checkCampfireProximity();
        updateSnow();
        updateSnowballThrow();
        if (northernLights) {
            northernLights.material.uniforms.time.value += 0.01;
        }
        renderer.render(scene, camera);
    }

    animate();
}

init();

