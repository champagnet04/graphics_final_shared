import * as THREE from 'three';
import { setupOutdoorScene } from './outdoor-scene.js';
import { moveElf, updateSnow, northernLights, followElf, lookAround, checkCampfireProximity, makeSnowmanSpeak } from './outdoor-scene.js';

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
    
    function onMouseClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const snowmen = scene.children.filter(child => {
            if (child.type === 'Group' && child.children.length > 0) {
                return child.children.some(part => 
                    part.type === 'Mesh' && 
                    part.geometry && 
                    part.geometry.type === 'SphereGeometry'
                );
            }
            return false;
        });
        
        const intersects = raycaster.intersectObjects(snowmen, true);
        
        if (intersects.length > 0) {
            makeSnowmanSpeak();
        }
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
        if (northernLights) {
            northernLights.material.uniforms.time.value += 0.01;
        }
        renderer.render(scene, camera);
    }

    animate();
}

init();

