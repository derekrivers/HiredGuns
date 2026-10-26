import * as THREE from 'three';
import { cellIndex, type LevelData, type WorldState } from '../contracts';
import { isDead } from '../sim/fall';
import { blockSurfaces, type SurfaceData } from './grid-mesh';

export const TEAM_COLOURS = [0x70ded1, 0xf1bf70, 0x8eaef5, 0xe995b8];
export class FourViews {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cameras = Array.from({ length: 4 }, () => new THREE.PerspectiveCamera(72, 1, 0.04, 50));
  private avatars: THREE.Mesh[] = [];
  private initialized = false;
  constructor(private canvas: HTMLCanvasElement, private panes: HTMLElement[], level: LevelData) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setScissorTest(true);
    this.scene.background = new THREE.Color(0x111e25);
    this.scene.fog = new THREE.FogExp2(0x111e25, 0.065);
    this.scene.add(new THREE.HemisphereLight(0xb8e6e8, 0x364151, 2.5));
    const key = new THREE.DirectionalLight(0xffe1b3, 2); key.position.set(6, 20, -8); this.scene.add(key);
    this.buildLevel(level);
  }
  private buildLevel(level: LevelData): void {
    const floors: THREE.Matrix4[] = [], water: THREE.Matrix4[] = [];
    const matrix = new THREE.Matrix4();
    for (let z = 0; z < level.size.height; z++) for (let y = 0; y < level.size.depth; y++) for (let x = 0; x < level.size.width; x++) {
      const word = level.layers[0][cellIndex(level, { x, y, z })]!;
      if (word & 1) floors.push(matrix.makeTranslation(x + 0.5, z + 0.01, y + 0.5).clone());
      if (word & 4) water.push(matrix.makeTranslation(x + 0.5, z + 0.35, y + 0.5).clone());
    }
    const addInstances = (geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[]) => {
      if (!matrices.length) { geometry.dispose(); material.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.computeBoundingSphere(); this.scene.add(mesh);
    };
    const surfaces = blockSurfaces(level);
    const addSurface = (surface: SurfaceData, material: THREE.Material) => {
      if (!surface.positions.length) { material.dispose(); return; }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(surface.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(surface.normals, 3));
      geometry.computeBoundingSphere(); this.scene.add(new THREE.Mesh(geometry, material));
    };
    addSurface(surfaces.walls, new THREE.MeshStandardMaterial({ color: 0x56646b, roughness: 0.9 }));
    addSurface(surfaces.exits, new THREE.MeshStandardMaterial({ color: 0x66f7d1, emissive: 0x44d4b8, emissiveIntensity: 1.3, roughness: 0.5 }));
    addSurface(surfaces.stairs, new THREE.MeshStandardMaterial({ color: 0xe9b15e, roughness: 0.85 }));
    const floorGeometry = () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    addInstances(floorGeometry(), new THREE.MeshStandardMaterial({ color: 0x7d8990, roughness: 1, side: THREE.DoubleSide }), floors);
    addInstances(floorGeometry(), new THREE.MeshStandardMaterial({ color: 0x347a94, transparent: true, opacity: 0.7, side: THREE.DoubleSide }), water);
    for (const colour of TEAM_COLOURS) {
      const avatar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.65, 8), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.15 }));
      this.avatars.push(avatar); this.scene.add(avatar);
    }
  }
  render(world: WorldState, elapsed: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x !== width || size.y !== height) this.renderer.setSize(width, height, false);
    const blend = this.initialized ? 1 - Math.exp(-Math.min(elapsed, 100) / 55) : 1;
    for (let i = 0; i < 4; i++) {
      const p = world.mercenaries[i]!, camera = this.cameras[i]!;
      const target = new THREE.Vector3(p.x + 0.5, p.z + 0.68, p.y + 0.5);
      camera.position.lerp(target, blend);
      const desired = -p.facing * Math.PI / 2;
      const difference = Math.atan2(Math.sin(desired - camera.rotation.y), Math.cos(desired - camera.rotation.y));
      camera.rotation.y += difference * blend;
      this.avatars[i]!.position.set(p.x + 0.5, p.z + 0.325, p.y + 0.5);
    }
    for (let i = 0; i < 4; i++) {
      const pane = this.panes[i]!.getBoundingClientRect(), camera = this.cameras[i]!;
      const x = Math.round(pane.left - rect.left), y = Math.round(rect.bottom - pane.bottom);
      const w = Math.max(1, Math.round(pane.width)), h = Math.max(1, Math.round(pane.height));
      camera.aspect = w / h; camera.updateProjectionMatrix();
      this.renderer.setViewport(x, y, w, h); this.renderer.setScissor(x, y, w, h);
      this.avatars.forEach((avatar, j) => { avatar.visible = i !== j && !world.mission.exited[j] && !isDead(world,j); });
      this.renderer.render(this.scene, camera);
    }
    this.initialized = true;
  }
  dispose(): void {
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
        if (object instanceof THREE.InstancedMesh) object.dispose();
      }
    });
    this.renderer.dispose();
  }
}
