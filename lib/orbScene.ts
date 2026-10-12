import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type OrbSceneApi = {
  setRotation: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  dispose: () => void;
};

const chromaticShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    amount: { value: 0.0012 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 shift = vec2(amount, 0.0);
      float red = texture2D(tDiffuse, vUv + shift).r;
      float green = texture2D(tDiffuse, vUv).g;
      float blue = texture2D(tDiffuse, vUv - shift).b;
      gl_FragColor = vec4(red, green, blue, texture2D(tDiffuse, vUv).a);
    }
  `
};

function makeTextSprite(label: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a canvas context for the orb HUD.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "24px monospace";
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.fillText(label, 10, 56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.74
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.15, 0.59, 1);
  return sprite;
}

function makeDust(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 17;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    color.setHSL(0.08 + Math.random() * 0.07, 0.7, 0.45 + Math.random() * 0.3);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.025,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geometry, material);
}

export function createOrbScene(host: HTMLElement): OrbSceneApi {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070908, 0.035);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 0, 10.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x070908, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.domElement.className = "absolute inset-0 h-full w-full";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.18, 0.64, 0.13);
  composer.addPass(bloom);
  const chromatic = new ShaderPass(chromaticShader);
  composer.addPass(chromatic);

  scene.add(new THREE.AmbientLight(0xffa64b, 1.3));
  const keyLight = new THREE.PointLight(0xff8a24, 24, 14);
  keyLight.position.set(0, 0, 2.6);
  scene.add(keyLight);

  const root = new THREE.Group();
  scene.add(root);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 48, 36),
    new THREE.MeshBasicMaterial({ color: 0xffa537, transparent: true, opacity: 0.84 })
  );
  root.add(core);

  const coreHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffb451,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
  );
  root.add(coreHalo);

  const shellMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xffa542, wireframe: true, transparent: true, opacity: 0.26 }),
    new THREE.MeshBasicMaterial({ color: 0xffd18b, wireframe: true, transparent: true, opacity: 0.17 }),
    new THREE.MeshBasicMaterial({ color: 0xff7c20, wireframe: true, transparent: true, opacity: 0.13 })
  ];
  const shellSizes = [1.28, 1.68, 2.08];
  const shells = shellSizes.map((radius, index) => {
    const geometry = index === 1
      ? new THREE.SphereGeometry(radius, 20, 12)
      : new THREE.IcosahedronGeometry(radius, index === 0 ? 2 : 1);
    const mesh = new THREE.Mesh(geometry, shellMaterials[index]);
    mesh.rotation.set(index * 0.63, index * 0.42, index * -0.37);
    root.add(mesh);
    return mesh;
  });

  const spiralPositions: number[] = [];
  const spiralCount = 3200;
  for (let i = 0; i < spiralCount; i += 1) {
    const t = i / (spiralCount - 1);
    const angle = t * Math.PI * 38;
    const radius = 0.1 + t * 1.16;
    spiralPositions.push(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      (t - 0.5) * 2.15
    );
  }
  const spiralGeometry = new THREE.BufferGeometry();
  spiralGeometry.setAttribute("position", new THREE.Float32BufferAttribute(spiralPositions, 3));
  const spiral = new THREE.Points(
    spiralGeometry,
    new THREE.PointsMaterial({
      color: 0xffc06a,
      size: 0.013,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  spiral.rotation.x = Math.PI * 0.21;
  root.add(spiral);

  const dust = makeDust(1250);
  scene.add(dust);

  const rings: THREE.Mesh[] = [];
  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.48 + index * 0.26, 0.004 + (index % 2) * 0.002, 6, 180),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? 0xff9b32 : 0xffd18b,
        transparent: true,
        opacity: 0.38 - index * 0.045,
        blending: THREE.AdditiveBlending
      })
    );
    ring.rotation.set(index * 0.7, Math.PI * 0.5 + index * 0.45, index * 0.22);
    root.add(ring);
    rings.push(ring);
  }

  const debris: THREE.Mesh[] = [];
  for (let index = 0; index < 28; index += 1) {
    const size = 0.018 + Math.random() * 0.035;
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 0),
      new THREE.MeshBasicMaterial({
        color: index % 4 === 0 ? 0xffd394 : 0xff8c28,
        transparent: true,
        opacity: 0.8
      })
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.45 + Math.random() * 0.88;
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * 1.6);
    root.add(mesh);
    debris.push(mesh);
  }

  const labels = ["NEURAL / 04", "CORE TEMP  38.2", "SYNC // ACTIVE", "0x7F  A9  3C"];
  const sprites = labels.map((label, index) => {
    const sprite = makeTextSprite(label, index % 2 === 0 ? "#ffbc6a" : "#baf5ca");
    const angle = (index / labels.length) * Math.PI * 2;
    sprite.position.set(Math.cos(angle) * 2.05, Math.sin(angle) * 1.48, (index % 2) * 0.6 - 0.3);
    root.add(sprite);
    return sprite;
  });

  const hudLines: THREE.Line[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const points = [
      new THREE.Vector3(Math.cos(angle) * 2.35, Math.sin(angle) * 2.35, 0),
      new THREE.Vector3(Math.cos(angle) * 2.65, Math.sin(angle) * 2.65, 0),
      new THREE.Vector3(Math.cos(angle + 0.035) * 2.65, Math.sin(angle + 0.035) * 2.65, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffae54, transparent: true, opacity: 0.5 })
    );
    root.add(line);
    hudLines.push(line);
  }

  const targetRotation = new THREE.Vector2(0.12, 0.3);
  let targetZoom = 1;
  const clock = new THREE.Clock();
  let frame = 0;
  let disposed = false;

  const resize = () => {
    if (disposed) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    root.rotation.x += (targetRotation.x - root.rotation.x) * 0.055;
    root.rotation.y += (targetRotation.y + elapsed * 0.045 - root.rotation.y) * 0.055;
    root.scale.setScalar(targetZoom);
    core.scale.setScalar(1 + Math.sin(elapsed * 2.3) * 0.035);
    coreHalo.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.07);
    shells[0].rotation.y += 0.0018;
    shells[0].rotation.x -= 0.0008;
    shells[1].rotation.x += 0.0011;
    shells[2].rotation.z -= 0.0009;
    spiral.rotation.z += 0.0017;
    rings.forEach((ring, index) => {
      ring.rotation.z += (index % 2 === 0 ? 1 : -1) * (0.0007 + index * 0.00014);
    });
    debris.forEach((mesh, index) => {
      mesh.rotation.x += 0.006 + (index % 3) * 0.002;
      mesh.rotation.y -= 0.004;
    });
    sprites.forEach((sprite, index) => {
      sprite.material.opacity = 0.52 + (Math.sin(elapsed * 1.2 + index) + 1) * 0.13;
    });
    dust.rotation.y += 0.00015;
    dust.rotation.x = Math.sin(elapsed * 0.08) * 0.025;
    composer.render();
  };
  animate();

  return {
    setRotation: (x, y) => {
      targetRotation.set(x, y);
    },
    setZoom: (zoom) => {
      targetZoom = THREE.MathUtils.clamp(zoom, 0.68, 1.55);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if ("map" in material && material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
