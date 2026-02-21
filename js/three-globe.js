import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. Scene Setup ---
const container = document.getElementById('hero-3d-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 4.5); // Positioned perfectly for the globe

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --- 2. Premium Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Gold light from top-right
const goldLight = new THREE.DirectionalLight(0xd4af37, 2.5);
goldLight.position.set(5, 5, 5);
scene.add(goldLight);

// Green rim light from bottom-left to blend with background
const greenLight = new THREE.PointLight(0x2e7d32, 2);
greenLight.position.set(-5, -5, -2);
scene.add(greenLight);

// --- 3. Build the "Coffee World" Globe ---
const globeGroup = new THREE.Group();

// A. The Inner Core (Rich Coffee Brown)
const coreGeometry = new THREE.SphereGeometry(1.2, 64, 64);
const coreMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3e2723, // Very dark roast coffee brown
    roughness: 0.2,   // Slightly shiny
    metalness: 0.1
});
const core = new THREE.Mesh(coreGeometry, coreMaterial);
globeGroup.add(core);

// B. The Grid Lines (Mimicking the logo's latitude/longitude)
const gridGeometry = new THREE.SphereGeometry(1.22, 16, 16); 
const gridMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x4caf50, // The green from your logo leaves
    wireframe: true,
    transparent: true,
    opacity: 0.4
});
const grid = new THREE.Mesh(gridGeometry, gridMaterial);
globeGroup.add(grid);

scene.add(globeGroup);

// --- 4. Orbiting Coffee Beans ---
const beans = [];
const beanGeometry = new THREE.SphereGeometry(0.15, 32, 32);
const beanMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d4037, // Lighter brown for contrast
    roughness: 0.4,
    metalness: 0.1
});

// Create 3 abstract beans
for (let i = 0; i < 3; i++) {
    const bean = new THREE.Mesh(beanGeometry, beanMaterial);
    
    // Scale it to look like a coffee bean (ellipsoid)
    bean.scale.set(1, 1.4, 0.8);
    
    // Create a pivot point for each bean so they orbit the center
    const pivot = new THREE.Group();
    
    // Set bean distance from globe
    bean.position.set(1.8, 0, 0); 
    
    // Randomize their starting angles and rotation
    pivot.rotation.x = Math.random() * Math.PI;
    pivot.rotation.y = Math.random() * Math.PI;
    bean.rotation.x = Math.random() * Math.PI;
    
    // Store speed in user data
    pivot.userData.speed = 0.005 + (Math.random() * 0.005);
    bean.userData.rotationSpeed = 0.02;

    pivot.add(bean);
    scene.add(pivot);
    beans.push({ pivot, bean });
}

// --- 5. Controls & Responsiveness ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.autoRotate = false; // We will handle rotation manually

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// --- 6. Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the main globe
    globeGroup.rotation.y += 0.002;
    globeGroup.rotation.x += 0.0005; // Very slow tilt

    // Rotate the orbiting beans
    beans.forEach(item => {
        item.pivot.rotation.y += item.pivot.userData.speed; // Orbit speed
        item.bean.rotation.x += item.bean.userData.rotationSpeed; // Tumble speed
        item.bean.rotation.y += item.bean.userData.rotationSpeed;
    });
    
    controls.update();
    renderer.render(scene, camera);
}

animate();
