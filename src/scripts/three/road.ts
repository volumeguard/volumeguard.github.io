import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Fog,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { reducedMotion, root } from '../core/dom';
import { onScroll } from '../core/smooth';
import { TARGET, colorWeights, gainFor, smoothstep, texture } from '../model/signal';
import { CHAPTERS, roadLoudness, sampleKeys } from '../model/story';
import { COLORS, createOrb } from './orb';
import { story } from './road-state';
import { createStage } from './stage';

// ---------- Tuning ----------
const ROAD_START = 0.02; // orb position on the curve at p = 0
const ROAD_END = 0.985; // ... and at p = 1
const CALM_LEAD = 0.03; // how far ahead of the orb the road is already levelled
const CALM_WINDOW = 0.05; // blend length between raw and levelled
const BAR_BASE = 0.15; // minimum visible bar height
const BAR_SCALE = 1.4; // world height per unit of amplitude
const COLUMN_DEPTH = 2.2; // columns reach this far below the road line
const TILE_WIDTH = 1.9;
const ORB_RADIUS = 0.42;
const PLATE_LEAD = 0.06; // plates start dropping this far before the orb reaches a peak
const PLATE_DROP = 0.04;
const PEAK_EXTRA = 1.1; // extra raw height of a peak bar
const POINTER_TILT = 0.04;
const DAMPING = 4;
const SUN_OFFSET = new Vector3(6, 12, 4);

/** Twelve loud peaks: four in the song, five in the blast, three at night. */
const PEAKS = [0.21, 0.24, 0.27, 0.3, 0.38, 0.41, 0.44, 0.47, 0.49, 0.8, 0.84, 0.88];

/** Camera offsets per progress: [back, up, side, lookAhead]. */
const CAMERA_KEYS: readonly (readonly [number, readonly number[]])[] = [
  [CHAPTERS.start, [9, 5, 4, 6]],
  [CHAPTERS.how, [8, 4, 5, 5]],
  [CHAPTERS.song, [6.5, 2.6, 3.2, 4]],
  [CHAPTERS.blast, [7, 3.6, -4, 4]],
  [CHAPTERS.whisper, [5, 1.7, 2.6, 3]],
  [CHAPTERS.night, [8.5, 4.2, 0.5, 5]],
  [CHAPTERS.line, [9, 8, 0.1, 1]],
];

/** Sky per progress: [r, g, b, sun, hemisphere, stars]. */
const SKY_KEYS: readonly (readonly [number, readonly number[]])[] = [
  [0, [0.86, 0.87, 0.97, 2.2, 1.15, 0]],
  [CHAPTERS.song, [0.98, 0.86, 0.8, 2.4, 1.1, 0]],
  [CHAPTERS.blast, [0.97, 0.74, 0.62, 2.6, 1.0, 0]],
  [CHAPTERS.whisper, [0.79, 0.84, 0.94, 1.8, 1.05, 0]],
  [0.72, [0.2, 0.2, 0.38, 0.6, 0.5, 0.6]],
  [CHAPTERS.night, [0.06, 0.07, 0.14, 0.25, 0.35, 1]],
  [0.95, [0.1, 0.1, 0.2, 0.4, 0.45, 0.8]],
  [CHAPTERS.line, [0.93, 0.92, 0.97, 2.0, 1.15, 0]],
];

export function startRoad(canvas: HTMLCanvasElement): void {
  const stage = createStage(canvas, { fov: 40, smallFov: 55, background: '#dcdff7', fog: { near: 22, far: 90 } });
  if (!stage) return;
  const { scene, camera, small } = stage;
  const fog = scene.fog as Fog;
  const sky = scene.background as Color;

  // The room environment flattens the bar colours on a bright sky; keep it for the glass orb only.
  scene.environmentIntensity = 0.35;
  const world = new Group();
  scene.add(world);

  // ---------- Lights ----------
  const hemi = new HemisphereLight(0xeef0ff, 0xf3c8a8, 1.15);
  scene.add(hemi);
  const sun = new DirectionalLight(0xfff1dc, 2.3);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  // ---------- Road curve ----------
  const points: Vector3[] = [];
  for (let i = 0; i <= 16; i++) points.push(new Vector3(Math.sin(i * 0.7) * 6, Math.sin(i * 0.45) * 0.6, -i * 10));
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.4);
  const roadLength = curve.getLength();

  // ---------- Bars ----------
  const tileCount = small ? 170 : 280;
  const tileLength = (roadLength / tileCount) * 0.86;
  const tileGeometry = new RoundedBoxGeometry(tileLength, 1, TILE_WIDTH, 2, 0.06);
  const tileMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 });
  const tiles = new InstancedMesh(tileGeometry, tileMaterial, tileCount);
  tiles.castShadow = !small;
  tiles.receiveShadow = !small;
  world.add(tiles);

  const tileS = new Float32Array(tileCount);
  const tilePos: Vector3[] = [];
  const tileRot: Quaternion[] = [];
  const up = new Vector3(0, 1, 0);
  const helper = new Object3D();
  for (let i = 0; i < tileCount; i++) {
    const s = i / (tileCount - 1);
    tileS[i] = s;
    const position = curve.getPointAt(s);
    const tangent = curve.getTangentAt(s);
    helper.position.copy(position);
    helper.lookAt(position.clone().add(tangent));
    helper.rotateY(Math.PI / 2); // tile length runs along the road
    tilePos.push(position);
    tileRot.push(helper.quaternion.clone());
  }

  const peakNear = (s: number): number => {
    let extra = 0;
    for (const peak of PEAKS) extra += Math.exp(-(((s - peak) / 0.004) ** 2));
    return extra;
  };

  /** Bar amplitude at road position s, `calm` 0 = raw soundtrack, 1 = levelled. */
  const amplitudeAt = (s: number, calm: number): number => {
    const loudness = roadLoudness(s);
    const end = smoothstep((s - 0.95) / 0.03); // the road runs out perfectly flat at the line
    const raw = loudness * texture(s * 160) + PEAK_EXTRA * peakNear(s);
    const levelled = loudness * gainFor(loudness) * texture(s * 160) + 0.15 * peakNear(s);
    const value = raw + (levelled - raw) * calm;
    return value + (TARGET - value) * end;
  };
  const ratioAt = (s: number, calm: number): number => {
    const loudness = roadLoudness(s) + PEAK_EXTRA * peakNear(s) * (1 - calm);
    return (loudness * (1 + (gainFor(roadLoudness(s)) - 1) * calm)) / TARGET;
  };
  const topAt = (index: number, calm: number): number =>
    (tilePos[index]?.y ?? 0) + BAR_BASE + amplitudeAt(tileS[index] ?? 0, calm) * BAR_SCALE;

  const amber = new Color(COLORS.amber);
  const teal = new Color(COLORS.teal);
  const violet = new Color(COLORS.violet);
  const tileColor = new Color();
  const matrix = new Matrix4();
  const scale = new Vector3();
  const centre = new Vector3();

  // ---------- Orb ----------
  const orb = createOrb(ORB_RADIUS, small);
  world.add(orb.group);
  const orbLight = new Mesh(
    new SphereGeometry(ORB_RADIUS * 2.4, 16, 12),
    new MeshBasicMaterial({ color: COLORS.teal, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
  );
  world.add(orbLight);

  // ---------- Peak plates ----------
  const plateGeometry = new RoundedBoxGeometry(tileLength * 3.2, 0.14, TILE_WIDTH * 1.08, 2, 0.05);
  const plateMaterial = new MeshStandardMaterial({ color: COLORS.teal, roughness: 0.3, emissive: COLORS.tealDeep, emissiveIntensity: 0.4 });
  const plates = new InstancedMesh(plateGeometry, plateMaterial, PEAKS.length);
  plates.castShadow = !small;
  world.add(plates);
  const peakIndex = PEAKS.map((s) => Math.round(s * (tileCount - 1)));

  // ---------- Scenery ----------
  const sideOf = (s: number, offset: number, lift = 0): Vector3 => {
    const point = curve.getPointAt(s);
    const side = new Vector3().crossVectors(curve.getTangentAt(s), up).normalize();
    return point.add(side.multiplyScalar(offset)).add(new Vector3(0, lift, 0));
  };

  // The Song: a ring equaliser and two speakers.
  const ringBars = 28;
  const eq = new InstancedMesh(
    new RoundedBoxGeometry(0.28, 1, 0.28, 2, 0.05),
    new MeshStandardMaterial({ color: COLORS.amber, roughness: 0.4, emissive: COLORS.amberDeep, emissiveIntensity: 0.25 }),
    ringBars,
  );
  const eqCentre = sideOf(CHAPTERS.song + 0.01, 7, -0.5);
  world.add(eq);
  const speakerMaterial = new MeshStandardMaterial({ color: 0x2a2440, roughness: 0.6 });
  const coneMaterial = new MeshStandardMaterial({ color: 0x15130f, roughness: 0.4 });
  for (const [s, offset] of [
    [CHAPTERS.song - 0.02, -5],
    [CHAPTERS.song + 0.035, -5.5],
  ] as const) {
    const speaker = new Group();
    const box = new Mesh(new RoundedBoxGeometry(1.6, 2.6, 1.4, 3, 0.12), speakerMaterial);
    box.castShadow = !small;
    speaker.add(box);
    for (const [y, r] of [
      [0.55, 0.5],
      [-0.6, 0.32],
    ] as const) {
      const cone = new Mesh(new CylinderGeometry(r, r * 0.6, 0.2, 28), coneMaterial);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(0, y, 0.72);
      speaker.add(cone);
    }
    speaker.position.copy(sideOf(s, offset, 1));
    speaker.lookAt(curve.getPointAt(s));
    world.add(speaker);
  }

  // The Blast: a block of towers and a shockwave ring.
  const towerCount = 16;
  const towers = new InstancedMesh(
    new RoundedBoxGeometry(1, 1, 1, 2, 0.06),
    new MeshStandardMaterial({ color: 0xe9d9cf, roughness: 0.8 }),
    towerCount,
  );
  towers.castShadow = !small;
  towers.receiveShadow = !small;
  for (let i = 0; i < towerCount; i++) {
    const s = CHAPTERS.blast - 0.04 + (i / towerCount) * 0.1;
    const height = 2 + ((i * 37) % 7);
    const p = sideOf(s, (i % 2 ? 1 : -1) * (5 + (i % 3) * 1.6), height / 2 - 1.5);
    helper.position.copy(p);
    helper.rotation.set(0, i * 0.4, 0);
    helper.scale.set(1.4, height, 1.4);
    helper.updateMatrix();
    towers.setMatrixAt(i, helper.matrix);
  }
  world.add(towers);
  const shock = new Mesh(
    new TorusGeometry(1, 0.06, 8, 64),
    new MeshBasicMaterial({ color: COLORS.amber, transparent: true, opacity: 0, depthWrite: false }),
  );
  shock.rotation.x = Math.PI / 2;
  shock.position.copy(sideOf(CHAPTERS.blast + 0.02, 0, 0.3));
  world.add(shock);
  const flash = new Mesh(
    new SphereGeometry(1.2, 24, 16),
    new MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
  );
  flash.position.copy(sideOf(CHAPTERS.blast + 0.02, -6, 3));
  world.add(flash);

  // The Whisper: a small house with a warm window and lamp posts.
  const house = new Group();
  const walls = new Mesh(new RoundedBoxGeometry(3, 2.2, 2.6, 2, 0.08), new MeshStandardMaterial({ color: 0xf6efe4, roughness: 0.9 }));
  walls.castShadow = !small;
  const roof = new Mesh(new ConeGeometry(2.4, 1.4, 4), new MeshStandardMaterial({ color: 0x8a7be0, roughness: 0.7 }));
  roof.position.y = 1.8;
  roof.rotation.y = Math.PI / 4;
  const windowLight = new Mesh(new PlaneGeometry(0.9, 0.7), new MeshBasicMaterial({ color: 0xffd28a }));
  windowLight.position.set(0, 0.1, 1.31);
  house.add(walls, roof, windowLight);
  house.position.copy(sideOf(CHAPTERS.whisper + 0.01, 6.5, 0.4));
  house.lookAt(curve.getPointAt(CHAPTERS.whisper + 0.01));
  world.add(house);
  const lampMaterial = new MeshStandardMaterial({ color: 0x4a453d, roughness: 0.6 });
  const bulbMaterial = new MeshBasicMaterial({ color: 0xffe2a8 });
  for (let i = 0; i < 3; i++) {
    const s = CHAPTERS.whisper - 0.03 + i * 0.03;
    const lamp = new Group();
    const post = new Mesh(new CylinderGeometry(0.05, 0.07, 2.4, 10), lampMaterial);
    post.position.y = 1.2;
    const bulb = new Mesh(new SphereGeometry(0.18, 16, 12), bulbMaterial);
    bulb.position.y = 2.5;
    lamp.add(post, bulb);
    lamp.position.copy(sideOf(s, i % 2 ? 2.2 : -2.2, -1));
    world.add(lamp);
  }

  // Night: stars and a moon.
  const starCount = small ? 350 : 700;
  const starPositions: number[] = [];
  let seed = 11;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const nightCentre = curve.getPointAt(CHAPTERS.night);
  for (let i = 0; i < starCount; i++) {
    const theta = random() * Math.PI * 2;
    const phi = random() * Math.PI * 0.45;
    const r = 60 + random() * 20;
    starPositions.push(
      nightCentre.x + r * Math.sin(phi) * Math.cos(theta),
      nightCentre.y + r * Math.cos(phi) * 0.6 + 5,
      nightCentre.z + r * Math.sin(phi) * Math.sin(theta),
    );
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
  const starMaterial = new PointsMaterial({ color: 0xfff4d6, size: 0.35, transparent: true, opacity: 0, depthWrite: false, fog: false });
  world.add(new Points(starGeometry, starMaterial));
  const moon = new Mesh(new SphereGeometry(2.2, 32, 24), new MeshBasicMaterial({ color: 0xf6f0de, transparent: true, opacity: 0, fog: false }));
  moon.position.copy(nightCentre).add(new Vector3(-18, 16, -30));
  world.add(moon);

  // The line: the target ring at the end of the road.
  const lineRing = new Mesh(
    new TorusGeometry(2.4, 0.09, 14, 96),
    new MeshStandardMaterial({ color: COLORS.teal, roughness: 0.25, emissive: COLORS.tealDeep, emissiveIntensity: 0.7 }),
  );
  lineRing.rotation.x = Math.PI / 2;
  const lineEnd = curve.getPointAt(0.995);
  lineRing.position.set(lineEnd.x, lineEnd.y + BAR_BASE + TARGET * BAR_SCALE + 0.05, lineEnd.z);
  world.add(lineRing);

  // ---------- Pointer tilt ----------
  let pointerX = 0;
  let pointerY = 0;
  if (!reducedMotion) {
    addEventListener(
      'pointermove',
      (event) => {
        pointerX = event.clientX / innerWidth - 0.5;
        pointerY = event.clientY / innerHeight - 0.5;
      },
      { passive: true },
    );
  }

  // ---------- Per-frame update ----------
  let p = story.p;
  let lastOrbS = ROAD_START + p * (ROAD_END - ROAD_START);
  const cameraValues = [0, 0, 0, 0];
  const skyValues = [0, 0, 0, 0, 0, 0];
  const orbPos = new Vector3();
  const tangent = new Vector3();
  const side = new Vector3();
  const rollAxis = new Vector3();
  const cameraTarget = new Vector3();
  const lookTarget = new Vector3();
  const look = new Vector3();
  let firstFrame = true;

  stage.onFrame((dt, elapsed) => {
    stage.setCovered(story.covered);
    const follow = firstFrame || reducedMotion ? 1 : 1 - Math.exp(-dt * DAMPING);
    p += (story.p - p) * follow;
    const orbS = ROAD_START + p * (ROAD_END - ROAD_START);
    const time = reducedMotion ? 0 : elapsed;

    // Bars: levelled behind the orb, raw ahead of it.
    for (let i = 0; i < tileCount; i++) {
      const s = tileS[i] ?? 0;
      const calm = smoothstep((orbS + CALM_LEAD - s) / CALM_WINDOW + 0.5);
      const top = topAt(i, calm);
      const base = (tilePos[i]?.y ?? 0) - COLUMN_DEPTH;
      const height = top - base;
      centre.copy(tilePos[i] ?? centre);
      centre.y = base + height / 2;
      scale.set(1, height, 1);
      matrix.compose(centre, tileRot[i] ?? helper.quaternion, scale);
      tiles.setMatrixAt(i, matrix);
      const w = colorWeights(ratioAt(s, calm));
      tileColor.setRGB(
        amber.r * w.amber + teal.r * w.teal + violet.r * w.violet,
        amber.g * w.amber + teal.g * w.teal + violet.g * w.violet,
        amber.b * w.amber + teal.b * w.teal + violet.b * w.violet,
      );
      tiles.setColorAt(i, tileColor);
    }
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;

    // Plates drop onto peaks as the orb arrives; passed peaks count as tamed.
    let tamed = 0;
    PEAKS.forEach((peakS, k) => {
      const index = peakIndex[k] ?? 0;
      const drop = smoothstep((orbS - (peakS - PLATE_LEAD)) / PLATE_DROP);
      const bounce = drop < 1 ? drop + Math.sin(drop * Math.PI) * 0.15 : 1;
      const top = topAt(index, 1);
      centre.copy(tilePos[index] ?? centre);
      centre.y = top + 0.08 + (1 - bounce) * 6;
      const visible = drop > 0.001 ? 1 : 0.0001;
      scale.set(visible, visible, visible);
      matrix.compose(centre, tileRot[index] ?? helper.quaternion, scale);
      plates.setMatrixAt(k, matrix);
      if (orbS > peakS) tamed++;
    });
    plates.instanceMatrix.needsUpdate = true;
    story.peaks = tamed;

    // Orb rides the levelled road and rolls by the distance travelled.
    curve.getPointAt(orbS, orbPos);
    curve.getTangentAt(orbS, tangent);
    const orbIndex = Math.round(orbS * (tileCount - 1));
    orbPos.y = topAt(orbIndex, 1) + ORB_RADIUS;
    orb.group.position.copy(orbPos);
    rollAxis.crossVectors(up, tangent).normalize();
    orb.roll((orbS - lastOrbS) * roadLength, rollAxis);
    lastOrbS = orbS;
    orbLight.position.copy(orbPos);

    // Scenery motion.
    // The equaliser calms down once the orb has passed the song.
    const songCalm = 1 - 0.6 * smoothstep((p - CHAPTERS.song) / 0.1);
    for (let i = 0; i < ringBars; i++) {
      const angle = (i / ringBars) * Math.PI * 2;
      const h = 0.3 + (0.4 + 0.6 * Math.abs(Math.sin(time * 4 + i * 0.7))) * 2.2 * songCalm;
      helper.position.set(eqCentre.x + Math.cos(angle) * 2.4, eqCentre.y + h / 2, eqCentre.z + Math.sin(angle) * 2.4);
      helper.rotation.set(0, -angle, 0);
      helper.scale.set(1, h, 1);
      helper.updateMatrix();
      eq.setMatrixAt(i, helper.matrix);
    }
    eq.instanceMatrix.needsUpdate = true;

    const blastPhase = (time * 0.45) % 1;
    const nearBlast = 1 - Math.min(1, Math.abs(p - CHAPTERS.blast) / 0.12);
    shock.scale.setScalar(1 + blastPhase * 9);
    (shock.material as MeshBasicMaterial).opacity = (1 - blastPhase) * 0.8 * nearBlast;
    (flash.material as MeshBasicMaterial).opacity = Math.max(0, 1 - blastPhase * 3) * 0.7 * nearBlast;
    lineRing.rotation.z = time * 0.3;

    // Sky, fog, light and stars.
    sampleKeys(SKY_KEYS, p, skyValues);
    sky.setRGB(skyValues[0] ?? 1, skyValues[1] ?? 1, skyValues[2] ?? 1);
    fog.color.copy(sky);
    sun.intensity = skyValues[3] ?? 2;
    hemi.intensity = skyValues[4] ?? 1;
    const stars = skyValues[5] ?? 0;
    starMaterial.opacity = stars;
    (moon.material as MeshBasicMaterial).opacity = stars;
    (orbLight.material as MeshBasicMaterial).opacity = stars * 0.35;
    sun.position.copy(orbPos).add(SUN_OFFSET);
    sun.target.position.copy(orbPos);

    // Camera follows the orb from a chapter-specific angle.
    sampleKeys(CAMERA_KEYS, p, cameraValues);
    const [back = 8, lift = 4, sideOffset = 3, ahead = 4] = cameraValues;
    side.crossVectors(tangent, up).normalize();
    cameraTarget
      .copy(orbPos)
      .addScaledVector(tangent, -back)
      .addScaledVector(up, lift)
      .addScaledVector(side, sideOffset);
    lookTarget.copy(orbPos).addScaledVector(tangent, ahead);
    if (firstFrame) {
      camera.position.copy(cameraTarget);
      look.copy(lookTarget);
    } else {
      camera.position.lerp(cameraTarget, follow);
      look.lerp(lookTarget, follow);
    }
    camera.lookAt(look);
    world.rotation.set(pointerY * POINTER_TILT, pointerX * POINTER_TILT, 0);
    firstFrame = false;
  });

  if (reducedMotion) onScroll(() => stage.requestRender());
  addEventListener('pagehide', () => stage.dispose(), { once: true });
  root.classList.add('road-ready');
}
