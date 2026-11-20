import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Fog,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { finePointer, reducedMotion } from '../core/dom';
import { TARGET, colorWeights, gainFor, smoothstep, softLimit, texture } from '../model/signal';
import { sampleKeys } from '../model/story';
import { COLORS, createOrb } from './orb';
import { createStage } from './stage';

/** Shared with the page script: scroll position in chapters and each diorama's before/after blend. */
export interface TableState {
  /** 0 = hero overview, 1–3 = song, blast, whisper, 4 = closing overview. */
  w: number;
  /** 0 = before (raw), 1 = after (levelled), per diorama. */
  compare: [number, number, number];
  /** Called by the page when state changes; the stage hooks it for reduced-motion redraws. */
  changed: () => void;
}

const TABLE_RADIUS = 5.2;
const TABLE_SIZE = 8;
const PLATE_RADIUS = 2.7;
const STEP = (Math.PI * 2) / 3;
const BAR_SCALE = 1.6;
const BAR_BASE = 0.08;
const LIMITER_CEILING = 1;
const SPRING = 4; // drag offset spring-back rate
const DRAG_SPEED = 0.008; // radians per dragged pixel
const DAMPING = 4;
const SPIN_SPEED = 0.15; // radians per second of the hub orb

/** Loudness of each scene: the song and blast are loud, the whisper is very quiet. */
const LOUDNESS = { song: 1.3, blast: 1.5, whisper: 0.12 } as const;

/** Per scroll position: [camera x, camera y, camera z, look y, table x, table x on small screens]. */
const VIEW_KEYS: readonly (readonly [number, readonly number[]])[] = [
  [0, [0, 13, 21, 0, 4.6]],
  [1, [0, 3.6, 10.5, 0.8, 3]],
  [2, [0, 3.6, 10.5, 0.8, -3]],
  [3, [0, 3.2, 10, 0.6, 3]],
  [4, [0, 13, 21, 0, 4.6]],
];

/** Sky per scroll position: [r, g, b]. */
const SKY_KEYS: readonly (readonly [number, readonly number[]])[] = [
  [0, [0.17, 0.14, 0.44]],
  [1, [0.42, 0.31, 0.85]],
  [2, [0.71, 0.33, 0.17]],
  [3, [0.12, 0.23, 0.36]],
  [4, [0.17, 0.14, 0.44]],
];

interface Diorama {
  readonly bars: InstancedMesh;
  readonly count: number;
  readonly place: (index: number, height: number, helper: Object3D) => void;
  readonly amplitude: (index: number, time: number, blend: number) => number;
  readonly ratio: (blend: number) => number;
}

export function startTurntable(canvas: HTMLCanvasElement, state: TableState): void {
  const stage = createStage(canvas, { fov: 38, smallFov: 52, background: '#2b2370', fog: { near: 18, far: 60 } });
  if (!stage) return;
  const { scene, camera, small } = stage;
  const sky = scene.background as Color;
  const fog = scene.fog as Fog;

  scene.add(new HemisphereLight(0xeef0ff, 0x3b2f6e, 1.2));
  const sun = new DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(6, 12, 8);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(sun);

  const rig = new Group(); // moves sideways to leave room for the text
  const table = new Group(); // turns with scroll and drag
  rig.add(table);
  scene.add(rig);

  const top = new Mesh(new CylinderGeometry(TABLE_SIZE, TABLE_SIZE * 1.02, 0.6, 72), new MeshStandardMaterial({ color: COLORS.paper, roughness: 0.8 }));
  top.position.y = -0.3;
  top.receiveShadow = !small;
  table.add(top);
  const rim = new Mesh(new TorusGeometry(TABLE_SIZE, 0.08, 10, 96), new MeshStandardMaterial({ color: COLORS.violet, roughness: 0.4 }));
  rim.rotation.x = Math.PI / 2;
  table.add(rim);

  const hub = createOrb(0.7, small);
  hub.group.position.y = 0.7;
  table.add(hub.group);

  const helper = new Object3D();
  const barGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
  const plateMaterial = new MeshStandardMaterial({ color: 0xf8f5ee, roughness: 0.6 });
  const targetMaterial = new MeshBasicMaterial({ color: COLORS.teal, transparent: true, opacity: 0.55, depthWrite: false });

  const makePlate = (index: number): Group => {
    const group = new Group();
    const angle = index * STEP;
    group.position.set(Math.sin(angle) * TABLE_RADIUS, 0, Math.cos(angle) * TABLE_RADIUS);
    group.rotation.y = angle;
    const plate = new Mesh(new CylinderGeometry(PLATE_RADIUS, PLATE_RADIUS, 0.16, 48), plateMaterial);
    plate.position.y = 0.08;
    plate.receiveShadow = !small;
    const line = new Mesh(new TorusGeometry(PLATE_RADIUS * 0.96, 0.025, 6, 64), targetMaterial);
    line.rotation.x = Math.PI / 2;
    line.position.y = BAR_BASE + 0.16 + TARGET * BAR_SCALE;
    group.add(plate, line);
    table.add(group);
    return group;
  };

  const barMesh = (count: number, group: Group): InstancedMesh => {
    const mesh = new InstancedMesh(barGeometry, new MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }), count);
    mesh.castShadow = !small;
    group.add(mesh);
    return mesh;
  };

  // ---------- The Song: two rings of bars and a pair of speakers ----------
  const songGroup = makePlate(0);
  const songOuter = 22;
  const songCount = songOuter + 12;
  const speakerMaterial = new MeshStandardMaterial({ color: 0x2a2440, roughness: 0.6 });
  for (const side of [-1, 1]) {
    const speaker = new Mesh(new RoundedBoxGeometry(0.8, 1.5, 0.7, 2, 0.08), speakerMaterial);
    speaker.position.set(side * 1.7, 0.92, -1.5);
    speaker.castShadow = !small;
    songGroup.add(speaker);
  }
  const song: Diorama = {
    bars: barMesh(songCount, songGroup),
    count: songCount,
    place: (i, height, h) => {
      const outer = i < songOuter;
      const n = outer ? songOuter : songCount - songOuter;
      const angle = ((outer ? i : i - songOuter) / n) * Math.PI * 2;
      const r = outer ? 2.2 : 1.2;
      h.position.set(Math.cos(angle) * r, 0.16 + height / 2, Math.sin(angle) * r);
      h.rotation.set(0, -angle, 0);
      h.scale.set(0.22, height, 0.22);
    },
    amplitude: (i, time, blend) => {
      const raw = LOUDNESS.song * (0.55 + 0.45 * Math.abs(Math.sin(time * 4 + i * 0.7)));
      return raw * (1 + (gainFor(LOUDNESS.song) - 1) * blend);
    },
    ratio: (blend) => (LOUDNESS.song * (1 + (gainFor(LOUDNESS.song) - 1) * blend)) / TARGET,
  };

  // ---------- The Blast: a block of spikes and a shockwave ----------
  const blastGroup = makePlate(1);
  const grid = 5;
  const blastCount = grid * grid;
  const shock = new Mesh(
    new TorusGeometry(1, 0.05, 8, 64),
    new MeshBasicMaterial({ color: COLORS.amber, transparent: true, opacity: 0, depthWrite: false }),
  );
  shock.rotation.x = Math.PI / 2;
  shock.position.y = 0.3;
  blastGroup.add(shock);
  const flash = new Mesh(
    new SphereGeometry(0.7, 20, 14),
    new MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
  );
  flash.position.y = 2.6;
  blastGroup.add(flash);
  const blast: Diorama = {
    bars: barMesh(blastCount, blastGroup),
    count: blastCount,
    place: (i, height, h) => {
      const x = (i % grid) - (grid - 1) / 2;
      const z = Math.floor(i / grid) - (grid - 1) / 2;
      h.position.set(x * 0.72, 0.16 + height / 2, z * 0.72);
      h.rotation.set(0, 0, 0);
      h.scale.set(0.5, height, 0.5);
    },
    amplitude: (i, time, blend) => {
      const pulse = Math.max(0, 1 - ((time * 0.45) % 1) * 3); // the explosion's sharp peak
      const raw = LOUDNESS.blast * texture(i * 1.7 + time * 2) + pulse * 1.2;
      const levelled = softLimit(raw * gainFor(LOUDNESS.blast) + pulse * 0.6, LIMITER_CEILING);
      return raw + (levelled - raw) * blend;
    },
    ratio: (blend) => (LOUDNESS.blast * (1 + (gainFor(LOUDNESS.blast) - 1) * blend)) / TARGET,
  };

  // ---------- The Whisper: a lamp-lit corner with low bars ----------
  const whisperGroup = makePlate(2);
  const wallMaterial = new MeshStandardMaterial({ color: 0xece4d6, roughness: 0.9 });
  for (const [x, z, w, d] of [
    [0, -1.9, 3.6, 0.15],
    [-1.8, -0.4, 0.15, 3],
  ] as const) {
    const wall = new Mesh(new RoundedBoxGeometry(w, 1.8, d, 2, 0.04), wallMaterial);
    wall.position.set(x, 1.06, z);
    wall.castShadow = !small;
    wall.receiveShadow = !small;
    whisperGroup.add(wall);
  }
  const lampPost = new Mesh(new CylinderGeometry(0.04, 0.06, 1.6, 10), new MeshStandardMaterial({ color: 0x4a453d }));
  lampPost.position.set(1.4, 0.96, -1.2);
  const lampShade = new Mesh(new CylinderGeometry(0.2, 0.34, 0.34, 20, 1, true), new MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb45a, emissiveIntensity: 0.8 }));
  lampShade.position.set(1.4, 1.84, -1.2);
  whisperGroup.add(lampPost, lampShade);
  const whisperCount = 12;
  const whisper: Diorama = {
    bars: barMesh(whisperCount, whisperGroup),
    count: whisperCount,
    place: (i, height, h) => {
      h.position.set((i - (whisperCount - 1) / 2) * 0.3, 0.16 + height / 2, 0.6);
      h.rotation.set(0, 0, 0);
      h.scale.set(0.2, height, 0.2);
    },
    amplitude: (i, time, blend) => {
      const raw = LOUDNESS.whisper * texture(i * 0.9 + time * 1.5) * 1.4;
      return raw * (1 + (gainFor(LOUDNESS.whisper) - 1) * blend);
    },
    ratio: (blend) => (LOUDNESS.whisper * (1 + (gainFor(LOUDNESS.whisper) - 1) * blend)) / TARGET,
  };

  const dioramas = [song, blast, whisper] as const;
  const amber = new Color(COLORS.amber);
  const teal = new Color(COLORS.teal);
  const violet = new Color(COLORS.violet);
  const barColor = new Color();

  // ---------- Grab to turn (mouse only, so touch keeps scrolling) ----------
  let dragOffset = 0;
  let dragging = false;
  let lastX = 0;
  const root = document.documentElement;
  if (finePointer) {
    addEventListener('pointerdown', (event) => {
      const target = event.target as Element | null;
      if (event.pointerType !== 'mouse' || target?.closest('a, button, input, label, .ch-copy, .nav, .menu')) return;
      dragging = true;
      lastX = event.clientX;
      root.classList.add('grabbing');
    });
    addEventListener('pointermove', (event) => {
      if (!dragging) return;
      dragOffset += (event.clientX - lastX) * DRAG_SPEED;
      lastX = event.clientX;
      if (reducedMotion) stage.requestRender();
    });
    addEventListener('pointerup', () => {
      dragging = false;
      root.classList.remove('grabbing');
    });
  }

  // ---------- Frame ----------
  const view = [0, 0, 0, 0, 0];
  const skyValues = [0, 0, 0];
  const look = new Vector3();
  let w = state.w;
  let firstFrame = true;

  stage.onFrame((dt, elapsed) => {
    const follow = firstFrame || reducedMotion ? 1 : 1 - Math.exp(-dt * DAMPING);
    w += (state.w - w) * follow;
    if (!dragging && !reducedMotion) dragOffset *= Math.exp(-dt * SPRING);
    if (!dragging && reducedMotion) dragOffset = 0;
    const time = reducedMotion ? 1.3 : elapsed;

    const chapter = Math.min(3, Math.max(1, w)) - 1;
    table.rotation.y = -chapter * STEP + dragOffset;
    hub.group.rotation.y = time * SPIN_SPEED;

    sampleKeys(VIEW_KEYS, w, view);
    const [cx = 0, cy = 4, cz = 11, lookY = 0.8, side = 0] = view;
    // Small screens: the stage sits above the text, so keep it centred and lift the view.
    rig.position.x = small ? 0 : side;
    camera.position.set(cx, cy, cz);
    const overview = smoothstep(1 - Math.min(w, 4 - w));
    look.set(0, small ? lookY - 1.4 : lookY, (1 - overview) * TABLE_RADIUS * 0.6);
    camera.lookAt(look);

    dioramas.forEach((diorama, d) => {
      const blend = state.compare[d] ?? 1;
      const weights = colorWeights(diorama.ratio(blend));
      barColor.setRGB(
        amber.r * weights.amber + teal.r * weights.teal + violet.r * weights.violet,
        amber.g * weights.amber + teal.g * weights.teal + violet.g * weights.violet,
        amber.b * weights.amber + teal.b * weights.teal + violet.b * weights.violet,
      );
      for (let i = 0; i < diorama.count; i++) {
        const height = BAR_BASE + diorama.amplitude(i, time, blend) * BAR_SCALE;
        diorama.place(i, height, helper);
        helper.updateMatrix();
        diorama.bars.setMatrixAt(i, helper.matrix);
        diorama.bars.setColorAt(i, barColor);
      }
      diorama.bars.instanceMatrix.needsUpdate = true;
      if (diorama.bars.instanceColor) diorama.bars.instanceColor.needsUpdate = true;
    });

    const phase = (time * 0.45) % 1;
    const rawBlast = 1 - (state.compare[1] ?? 1); // the blast flash only shows before levelling
    shock.scale.setScalar(1 + phase * 3.5);
    (shock.material as MeshBasicMaterial).opacity = (1 - phase) * 0.8 * rawBlast;
    (flash.material as MeshBasicMaterial).opacity = Math.max(0, 1 - phase * 3) * 0.8 * rawBlast;

    sampleKeys(SKY_KEYS, w, skyValues);
    sky.setRGB(skyValues[0] ?? 0.2, skyValues[1] ?? 0.2, skyValues[2] ?? 0.4, SRGBColorSpace);
    fog.color.copy(sky);
    firstFrame = false;
  });

  if (reducedMotion) state.changed = () => stage.requestRender();
  addEventListener('pagehide', () => stage.dispose(), { once: true });
}
