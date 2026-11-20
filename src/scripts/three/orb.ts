import {
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Vector3,
} from 'three';

/** Brand colours as numbers for materials. */
export const COLORS = {
  violet: 0x7c5cff,
  violetDeep: 0x4a2fd0,
  teal: 0x2dd4bf,
  tealDeep: 0x0f9d8f,
  amber: 0xffb020,
  amberDeep: 0xd97a06,
  paper: 0xf3efe7,
  ink: 0x15130f,
  night: 0x111317,
} as const;

export interface Orb {
  readonly group: Group;
  /** Rolls the orb by the distance travelled along `axis` (world units). */
  roll(distance: number, axis: Vector3): void;
}

/**
 * The guard orb: the logo's dial as a glass marble. A violet core with a teal ring sits inside a
 * clear shell. Small screens get a cheaper shell without transmission.
 */
export function createOrb(radius: number, small: boolean): Orb {
  const group = new Group();
  const shell = new Mesh(
    new SphereGeometry(radius, small ? 32 : 48, small ? 20 : 32),
    small
      ? new MeshStandardMaterial({ color: 0xdfe4ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 })
      : new MeshPhysicalMaterial({
          roughness: 0.04,
          transmission: 0.92,
          thickness: 0.4,
          ior: 1.45,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
        }),
  );
  shell.castShadow = true;
  group.add(shell);

  const spin = new Group();
  spin.add(new Mesh(new SphereGeometry(radius * 0.6, 32, 24), new MeshStandardMaterial({ color: COLORS.violet, roughness: 0.3 })));
  const ring = new Mesh(
    new TorusGeometry(radius * 0.66, radius * 0.1, 12, 48),
    new MeshStandardMaterial({ color: COLORS.teal, roughness: 0.25, emissive: COLORS.tealDeep, emissiveIntensity: 0.35 }),
  );
  ring.rotation.x = Math.PI / 2;
  spin.add(ring);
  group.add(spin);

  return {
    group,
    roll(distance, axis) {
      spin.rotateOnWorldAxis(axis, distance / radius);
    },
  };
}
