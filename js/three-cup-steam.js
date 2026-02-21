import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. Scene Setup ---
const container = document.getElementById('hero-3d-canvas');
const scene = new THREE.Scene();

// Camera setup for a good angle on the cup
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 2, 5); // Look down slightly
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// --- 2. Rich, Warm Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Main gold light from the top-right to catch the steam and rim
const mainLight = new THREE.DirectionalLight(0xd4af37, 3);
mainLight.position.set(5, 10, 5);
scene.add(mainLight);

// Secondary rim light from behind to define the shape
const rimLight = new THREE.PointLight(0xd4af37, 2);
rimLight.position.set(-5, 5, -5);
scene.add(rimLight);


// --- 3. Build the Procedural Cup ---
const cupGroup = new THREE.Group();

// Materials
const cupMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0b2318, // Deep brand green
    roughness: 0.3,
    metalness: 0.2,
    side: THREE.DoubleSide
});
const coffeeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a0f00, // Very dark brown coffee color
    roughness: 0.1,
    metalness: 0.0,
    emissive: 0x1a0f00,
    emissiveIntensity: 0.2
});

// Cup Body (A slightly tapered cylinder)
const cupGeometry = new THREE.CylinderGeometry(1, 0.8, 1.5, 32, 1, true);
const cupBody = new THREE.Mesh(cupGeometry, cupMaterial);
cupGroup.add(cupBody);

// Cup Bottom
const bottomGeometry = new THREE.CircleGeometry(0.8, 32);
const cupBottom = new THREE.Mesh(bottomGeometry, cupMaterial);
cupBottom.rotation.x = -Math.PI / 2;
cupBottom.position.y = -0.75;
cupGroup.add(cupBottom);

// Coffee Liquid Surface
const liquidGeometry = new THREE.CircleGeometry(0.95, 32);
const liquid = new THREE.Mesh(liquidGeometry, coffeeMaterial);
liquid.rotation.x = -Math.PI / 2;
liquid.position.y = 0.6; // Place it near the top rim
cupGroup.add(liquid);

// Handle (A partial torus)
const handleGeometry = new THREE.TorusGeometry(0.4, 0.1, 16, 32, Math.PI * 1.5);
const handle = new THREE.Mesh(handleGeometry, cupMaterial);
handle.position.set(1, 0, 0); // Move to side
handle.rotation.z = Math.PI / 2; // Rotate to sit upright
cupGroup.add(handle);

// Adjust entire cup position
cupGroup.position.y = -0.5;
scene.add(cupGroup);


// --- 4. The Steam Particle System ---

// Helper to generate a procedural smoke texture on the fly
function createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255, 0.8)'); // White center
    gradient.addColorStop(0.4, 'rgba(255,255,255, 0.2)'); // Fade out
    gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent edge

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const smokeTexture = createSmokeTexture();
const smokeParticles = [];
const particleCount = 35; // Number of steam puffs

// Create individual particles
for (let i = 0; i < particleCount; i++) {
    const smokeMaterial = new THREE.SpriteMaterial({
        map: smokeTexture,
        color: 0xd4af37, // Tint the steam gold/cream
        transparent: true,
        opacity: 0, // Start invisible
        depthWrite: false, // Don't block other objects
        blending: THREE.AdditiveBlending // Gives a glowing effect
    });

    const particle = new THREE.Sprite(smokeMaterial);
    resetParticle(particle); // Set initial random position
    // Randomize starting phase so they don't all rise together
    particle.userData.phase = Math.random() * Math.PI * 2; 
    
    smokeParticles.push(particle);
    scene.add(particle);
}

// Helper to reset a particle to the coffee surface
function resetParticle(particle) {
    particle.position.set(
        (Math.random() - 0.5) * 0.5, // Random X near center
        0.6, // Start at liquid surface level
        (Math.random() - 0.5) * 0.5  // Random Z near center
    );
    particle.scale.set(0.5, 0.5, 0.5); // Start small
    particle.material.opacity = 0;
    particle.userData.speed = 0.005 + Math.random() * 0.005; // Random upward speed
}


// --- 5. Controls & Responsiveness ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = Math.PI / 3; // Limit vertical rotation
controls.maxPolarAngle = Math.PI / 1.8;

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});


// --- 6. Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Rotate the cup slowly
    cupGroup.rotation.y += 0.003;

    // 2. Animate Steam Particles
    smokeParticles.forEach(particle => {
        // Move up
        particle.position.y += particle.userData.speed;
        
        // Calculate lifecycle (0.0 to 1.0) based on height
        const life = (particle.position.y - 0.6) / 2.5; // Rise to about y=3.1

        if (life < 1.0) {
            // Grow in size as it rises
            const scale = 0.5 + life * 1.5;
            particle.scale.set(scale, scale, scale);

            // Fade in then fade out
            // Sine wave pattern for opacity: starts at 0, peaks, then back to 0
            particle.material.opacity = Math.sin(life * Math.PI) * 0.6; 
            
            // Add slight gentle swaying motion
            particle.position.x += Math.sin(time + particle.userData.phase) * 0.002;

        } else {
            // Particle has "died", reset it to the bottom
            resetParticle(particle);
        }
    });
    
    controls.update();
    renderer.render(scene, camera);
}

animate();
