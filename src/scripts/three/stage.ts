import {
  ACESFilmicToneMapping,
  Color,
  Fog,
  Mesh,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { reducedMotion, root } from '../core/dom';

const SMALL_SCREEN = 760;
const SLOW_FRAME_MS = 24; // sustained frame time that triggers a quality drop
const SLOW_FRAMES_BEFORE_DROP = 90;
const PIXEL_RATIO_STEPS = [2, 1.5, 1.25, 1];

export interface Stage {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** Small screens get no shadows, no antialiasing and simpler materials. */
  readonly small: boolean;
  /** Called every rendered frame with seconds since the last frame and since start. */
  onFrame(callback: (dt: number, elapsed: number) => void): void;
  onResize(callback: (width: number, height: number) => void): void;
  /** Skip rendering while an opaque panel covers the canvas. */
  setCovered(covered: boolean): void;
  /** With reduced motion the loop is off; call this after anything that changes the picture. */
  requestRender(): void;
  dispose(): void;
}

export interface StageOptions {
  fov: number;
  smallFov?: number;
  background: string;
  fog?: { near: number; far: number };
}

/** Creates the renderer, scene, camera and loop. Returns null (and marks `no-gl`) when WebGL is unavailable. */
export function createStage(canvas: HTMLCanvasElement, options: StageOptions): Stage | null {
  const small = innerWidth < SMALL_SCREEN;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
  } catch {
    root.classList.add('no-gl');
    return null;
  }

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = new Color(options.background);
  if (options.fog) scene.fog = new Fog(options.background, options.fog.near, options.fog.far);
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  pmrem.dispose();

  const camera = new PerspectiveCamera(small ? (options.smallFov ?? options.fov) : options.fov, 1, 0.1, 400);
  const frameCallbacks: ((dt: number, elapsed: number) => void)[] = [];
  const resizeCallbacks: ((width: number, height: number) => void)[] = [];
  let ratioStep = PIXEL_RATIO_STEPS.findIndex((r) => r <= Math.min(devicePixelRatio, small ? 1.5 : 2));
  if (ratioStep < 0) ratioStep = PIXEL_RATIO_STEPS.length - 1;
  let covered = false;
  let slowFrames = 0;
  let firstFrame = true;
  let renderQueued = false;

  const resize = (): void => {
    const width = innerWidth;
    const height = innerHeight;
    renderer.setPixelRatio(PIXEL_RATIO_STEPS[ratioStep] ?? 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    for (const callback of resizeCallbacks) callback(width, height);
    if (reducedMotion) requestRender();
  };

  const timer = new Timer();
  timer.connect(document); // freezes the delta while the tab is hidden

  const draw = (dt: number): void => {
    for (const callback of frameCallbacks) callback(dt, timer.getElapsed());
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      root.classList.add('gl-ready');
    }
  };

  const loop = (): void => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    if (covered || document.hidden) return;
    draw(dt);
    // Drop resolution when the device cannot keep up.
    if (dt * 1000 > SLOW_FRAME_MS) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 2);
    if (slowFrames > SLOW_FRAMES_BEFORE_DROP && ratioStep < PIXEL_RATIO_STEPS.length - 1) {
      ratioStep++;
      slowFrames = 0;
      resize();
    }
  };

  function requestRender(): void {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      timer.update();
      draw(0);
    });
  }

  addEventListener('resize', resize);
  // Defer the first resize so pages can register resize callbacks first.
  queueMicrotask(resize);
  if (reducedMotion) requestRender();
  else renderer.setAnimationLoop(loop);

  return {
    renderer,
    scene,
    camera,
    small,
    onFrame: (callback) => frameCallbacks.push(callback),
    onResize: (callback) => resizeCallbacks.push(callback),
    setCovered: (value) => {
      covered = value;
    },
    requestRender,
    dispose() {
      renderer.setAnimationLoop(null);
      removeEventListener('resize', resize);
      timer.dispose();
      disposeTree(scene);
      environment.dispose();
      renderer.dispose();
    },
  };
}

/** Frees geometries, materials and their textures under `object`. */
export function disposeTree(object: Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh) && !('geometry' in child)) return;
    const node = child as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
    node.geometry?.dispose();
    for (const material of [node.material ?? []].flat()) {
      for (const value of Object.values(material)) if ((value as Texture | null)?.isTexture) (value as Texture).dispose();
      material.dispose();
    }
  });
}
