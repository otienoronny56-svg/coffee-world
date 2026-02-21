import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. Setup
const container = document.getElementById('hero-3d-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true makes it transparent
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// 2. Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xd4af37, 2); // Gold light
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// 3. The 3D Object Placeholder
const geometry = new THREE.IcosahedronGeometry(1.5, 0); 
const material = new THREE.MeshStandardMaterial({ 
    color: 0x0b2318, 
    emissive: 0x111111,
    roughness: 0.2,
    metalness: 0.8,
    wireframe: true 
});
const coffeePlaceholder = new THREE.Mesh(geometry, material);
scene.add(coffeePlaceholder);

// 4. Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; 
controls.enableDamping = true;
controls.autoRotate = true; 
controls.autoRotateSpeed = 2.0;

// 5. Responsiveness
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// 6. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    
    coffeePlaceholder.rotation.y += 0.005;
    coffeePlaceholder.rotation.x += 0.002;
    
    controls.update(); 
    renderer.render(scene, camera);
}

animate();