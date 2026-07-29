/* === Kimodo v2 — Euler / Quaternion Math ===
 * Zero dependencies. All formulas are standard 3D math.
 *
 * BVH rotation channels are Euler angles in ZXY order for somaskel77.
 * This module provides conversion to/from quaternions and slerp interpolation.
 */

// ── Types ────────────────────────────────────────

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // [x, y, z, w]

/** BVH channel order — varies by skeleton. Kimodo somaskel77 uses ZXY. */
export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';

// ── Quaternion helpers ───────────────────────────

export function quatMultiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatConjugate(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function quatNormalize(q: Quat): Quat {
  const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (len < 1e-10) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

// ── Euler ↔ Quaternion ──────────────────────────

/**
 * Convert Euler angles (radians) to quaternion.
 * Uses the specified rotation order (default ZXY — Kimodo somaskel77 convention).
 */
export function eulerToQuat(euler: Vec3, order: EulerOrder = 'ZXY'): Quat {
  const [x, y, z] = euler;
  const cx = Math.cos(x * 0.5), sx = Math.sin(x * 0.5);
  const cy = Math.cos(y * 0.5), sy = Math.sin(y * 0.5);
  const cz = Math.cos(z * 0.5), sz = Math.sin(z * 0.5);

  // Quaternions for each axis rotation
  const qx: Quat = [sx, 0, 0, cx]; // rotation around X
  const qy: Quat = [0, sy, 0, cy]; // rotation around Y
  const qz: Quat = [0, 0, sz, cz]; // rotation around Z

  // Compose based on order (right-to-left multiplication)
  // e.g. ZXY means: apply X, then Y, then Z → q = qz * qy * qx
  const orderMap: Record<EulerOrder, [Quat, Quat, Quat]> = {
    XYZ: [qz, qy, qx], // qz * qy * qx (X first)
    XZY: [qy, qz, qx],
    YXZ: [qz, qx, qy],
    YZX: [qx, qz, qy],
    ZXY: [qy, qx, qz], // qy * qx * qz → but actually ZXY means Z then X then Y
    ZYX: [qx, qy, qz],
  };

  // For intrinsic rotations: apply axis1, then axis2, then axis3
  // This maps to: q = q_axis3 * q_axis2 * q_axis1
  // ZXY: X first, then Y, then Z → q = qz * qy * qx
  const [third, second, first] = orderMap[order];
  return quatNormalize(quatMultiply(third, quatMultiply(second, first)));
}

/**
 * Convert quaternion to Euler angles (radians) in the specified order.
 */
export function quatToEuler(q: Quat, order: EulerOrder = 'ZXY'): Vec3 {
  const [x, y, z, w] = quatNormalize(q);

  // Build rotation matrix from quaternion
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;

  const m00 = 1 - 2 * (yy + zz);
  const m01 = 2 * (xy - wz);
  const m02 = 2 * (xz + wy);
  const m10 = 2 * (xy + wz);
  const m11 = 1 - 2 * (xx + zz);
  const m12 = 2 * (yz - wx);
  const m20 = 2 * (xz - wy);
  const m21 = 2 * (yz + wx);
  const m22 = 1 - 2 * (xx + yy);

  // Extract Euler angles based on order
  // Using intrinsic rotation decomposition
  switch (order) {
    case 'XYZ': {
      // m22 → cosX*cosY, m20 → -sinY, etc.
      const sy = -m20;
      const cy = Math.sqrt(1 - sy * sy);
      if (Math.abs(sy) < 0.999999) {
        return [Math.atan2(m21, m22), Math.asin(sy), Math.atan2(m10, m00)];
      }
      return [Math.atan2(-m12, m11), Math.asin(sy), 0];
    }
    case 'ZXY': {
      // ZXY: X first (m20,m22), then Y (m21), then Z (m01,m11)
      const sy = m21;
      const cy = Math.sqrt(1 - sy * sy);
      if (Math.abs(sy) < 0.999999) {
        return [Math.atan2(-m20, m22), Math.asin(sy), Math.atan2(-m01, m11)];
      }
      return [Math.atan2(m02, m00), Math.asin(sy), 0];
    }
    case 'YXZ': {
      const sy = -m12;
      if (Math.abs(sy) < 0.999999) {
        return [Math.atan2(m02, m22), Math.asin(sy), Math.atan2(m10, m11)];
      }
      return [Math.atan2(-m20, m00), Math.asin(sy), 0];
    }
    default: {
      // Generic fallback: treat as ZXY for Kimodo
      const sy = m21;
      if (Math.abs(sy) < 0.999999) {
        return [Math.atan2(-m20, m22), Math.asin(sy), Math.atan2(-m01, m11)];
      }
      return [Math.atan2(m02, m00), Math.asin(sy), 0];
    }
  }
}

// ── Interpolation ────────────────────────────────

/** Linear interpolation between two scalars */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Spherical linear interpolation between two quaternions */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  // Ensure we take the shorter path
  let cosTheta = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let flip = false;
  if (cosTheta < 0) {
    cosTheta = -cosTheta;
    flip = true;
  }

  // Use lerp for very small angles
  if (cosTheta > 0.9995) {
    const result: Quat = [
      lerp(a[0], flip ? -b[0] : b[0], t),
      lerp(a[1], flip ? -b[1] : b[1], t),
      lerp(a[2], flip ? -b[2] : b[2], t),
      lerp(a[3], flip ? -b[3] : b[3], t),
    ];
    return quatNormalize(result);
  }

  const theta = Math.acos(cosTheta);
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;

  const bSign = flip ? -1 : 1;
  return [
    wa * a[0] + wb * bSign * b[0],
    wa * a[1] + wb * bSign * b[1],
    wa * a[2] + wb * bSign * b[2],
    wa * a[3] + wb * bSign * b[3],
  ];
}

/** Linear interpolation between two 3D vectors */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
