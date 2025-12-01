import * as THREE from 'three';
import { setupOutdoorScene } from './outdoor-scene.js';
import { moveElf, updateSnow, northernLights, followElf, lookAround, checkCampfireProximity, checkCottageProximity, makeSnowmanSpeak, pickUpSnowball, updateSnowballThrow, throwSnowball, hasSnowballInHand } from './outdoor-scene.js';

async function init() {
    const { scene, camera } = await setupOutdoorScene();

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

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
        
        if (checkIfSnowballPile(allIntersects)) {
            return;
        }
        
        if (checkIfSnowman(allIntersects, event)) {
            return;
        }
        
        throwSnowball(event.clientX, event.clientY);
    }
    
    renderer.domElement.addEventListener('click', onMouseClick);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);
    
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        lookAround(delta);
        moveElf(delta);
        followElf(delta);

        checkCampfireProximity();
        checkCottageProximity();
        updateSnow();
        updateSnowballThrow();
        if (northernLights) {
            northernLights.material.uniforms.time.value += delta * 1.0;
        }
        renderer.render(scene, camera);
    }

    animate();
}

init();

