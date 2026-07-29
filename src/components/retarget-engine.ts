/* === Kimodo Motion Retarget Engine ===
 * Maps somaskel77 posedJoints to arbitrary target skeletons.
 *
 * Three scenarios, auto-detected:
 *   1. 目标有骨骼 → 完整重定向 (joint mapping → bone quaternion driving)
 *   2. 目标无骨骼 → 根骨骼跟随 (entire model follows Hips transform)
 *   3. 无目标模型 → 火柴人渲染 (use SomaSkeletonView directly, no retarget)
 *
 * Pure math module — no Three.js dependency.
 * Three.js integration lives in RetargetController.tsx (phase B).
 */

// ── Somaskel77 canonical joint list (77 joints) ──

export const SOMASKEL77_JOINTS: readonly string[] = [
  'Hips',
  'Spine', 'Spine1', 'Spine2',
  'Neck', 'Neck1', 'Head', 'HeadEnd',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3', 'LeftHandThumb4',
  'LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3', 'LeftHandIndex4',
  'LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3', 'LeftHandMiddle4',
  'LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3', 'LeftHandRing4',
  'LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3', 'LeftHandPinky4',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3', 'RightHandThumb4',
  'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3', 'RightHandIndex4',
  'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3', 'RightHandMiddle4',
  'RightHandRing1', 'RightHandRing2', 'RightHandRing3', 'RightHandRing4',
  'RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3', 'RightHandPinky4',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToe', 'LeftToeEnd',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToe', 'RightToeEnd',
];

// ── Joint name aliases — common variations found in GLB/FBX models ──
// Keys are somaskel77 canonical names, values are known alternatives.

const JOINT_ALIASES: Record<string, string[]> = {
  'Hips':        ['hips', 'pelvis', 'root', 'Hip', 'mixamorig:Hips', 'mixamorig:Hip'],
  'Spine':       ['spine', 'spine1', 'spine_01', 'mixamorig:Spine'],
  'Spine1':      ['spine1', 'spine_01', 'spine_1', 'mixamorig:Spine1'],
  'Spine2':      ['spine2', 'spine_02', 'spine_2', 'chest', 'Chest', 'mixamorig:Spine2'],
  'Neck':        ['neck', 'neck1', 'neck_01', 'mixamorig:Neck'],
  'Neck1':       ['neck1', 'neck_01', 'neck_1', 'mixamorig:Neck1'],
  'Head':        ['head', 'mixamorig:Head'],
  'HeadEnd':     ['head_end', 'headend', 'Head_end', 'mixamorig:Head_end'],
  'LeftShoulder':['leftshoulder', 'l_shoulder', 'shoulder_l', 'left_shoulder',
                  'L_Shoulder', 'LeftShoulder', 'mixamorig:LeftShoulder'],
  'LeftArm':     ['leftarm', 'l_arm', 'arm_l', 'left_upperarm', 'left_upper_arm',
                  'L_Arm', 'LeftArm', 'mixamorig:LeftArm'],
  'LeftForeArm': ['leftforearm', 'l_forearm', 'forearm_l', 'left_lowerarm', 'left_lower_arm',
                  'L_ForeArm', 'LeftForeArm', 'mixamorig:LeftForeArm'],
  'LeftHand':    ['lefthand', 'l_hand', 'hand_l', 'left_wrist',
                  'L_Hand', 'LeftHand', 'mixamorig:LeftHand'],
  'RightShoulder':['rightshoulder', 'r_shoulder', 'shoulder_r', 'right_shoulder',
                   'R_Shoulder', 'RightShoulder', 'mixamorig:RightShoulder'],
  'RightArm':    ['rightarm', 'r_arm', 'arm_r', 'right_upperarm', 'right_upper_arm',
                  'R_Arm', 'RightArm', 'mixamorig:RightArm'],
  'RightForeArm':['rightforearm', 'r_forearm', 'forearm_r', 'right_lowerarm', 'right_lower_arm',
                  'R_ForeArm', 'RightForeArm', 'mixamorig:RightForeArm'],
  'RightHand':   ['righthand', 'r_hand', 'hand_r', 'right_wrist',
                  'R_Hand', 'RightHand', 'mixamorig:RightHand'],
  'LeftUpLeg':   ['leftupleg', 'l_upleg', 'upleg_l', 'left_thigh', 'left_upperleg',
                  'L_UpLeg', 'LeftUpLeg', 'mixamorig:LeftUpLeg'],
  'LeftLeg':     ['leftleg', 'l_leg', 'leg_l', 'left_calf', 'left_shin',
                  'L_Leg', 'LeftLeg', 'mixamorig:LeftLeg'],
  'LeftFoot':    ['leftfoot', 'l_foot', 'foot_l', 'left_ankle',
                  'L_Foot', 'LeftFoot', 'mixamorig:LeftFoot'],
  'LeftToe':     ['lefttoe', 'l_toe', 'toe_l', 'left_toes', 'left_toeBase',
                  'L_Toe', 'LeftToe', 'mixamorig:LeftToe'],
  'LeftToeEnd':  ['lefttoeend', 'l_toeend', 'toeend_l',
                  'L_ToeEnd', 'LeftToeEnd', 'mixamorig:LeftToe_end'],
  'RightUpLeg':  ['rightupleg', 'r_upleg', 'upleg_r', 'right_thigh', 'right_upperleg',
                  'R_UpLeg', 'RightUpLeg', 'mixamorig:RightUpLeg'],
  'RightLeg':    ['rightleg', 'r_leg', 'leg_r', 'right_calf', 'right_shin',
                  'R_Leg', 'RightLeg', 'mixamorig:RightLeg'],
  'RightFoot':   ['rightfoot', 'r_foot', 'foot_r', 'right_ankle',
                  'R_Foot', 'RightFoot', 'mixamorig:RightFoot'],
  'RightToe':    ['righttoe', 'r_toe', 'toe_r', 'right_toes', 'right_toeBase',
                  'R_Toe', 'RightToe', 'mixamorig:RightToe'],
  'RightToeEnd': ['righttoeend', 'r_toeend', 'toeend_r',
                  'R_ToeEnd', 'RightToeEnd', 'mixamorig:RightToe_end'],
};

// ── Somaskel77 parent-child hierarchy ──
// child → parent. Used to compute bone direction vectors.

const SOMASKEL77_PARENT_OF: Record<string, string> = {
  'Spine': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1',
  'Neck': 'Spine2', 'Neck1': 'Neck', 'Head': 'Neck1', 'HeadEnd': 'Head',
  'LeftShoulder': 'Spine2', 'LeftArm': 'LeftShoulder', 'LeftForeArm': 'LeftArm', 'LeftHand': 'LeftForeArm',
  'LeftHandThumb1': 'LeftHand', 'LeftHandThumb2': 'LeftHandThumb1', 'LeftHandThumb3': 'LeftHandThumb2', 'LeftHandThumb4': 'LeftHandThumb3',
  'LeftHandIndex1': 'LeftHand', 'LeftHandIndex2': 'LeftHandIndex1', 'LeftHandIndex3': 'LeftHandIndex2', 'LeftHandIndex4': 'LeftHandIndex3',
  'LeftHandMiddle1': 'LeftHand', 'LeftHandMiddle2': 'LeftHandMiddle1', 'LeftHandMiddle3': 'LeftHandMiddle2', 'LeftHandMiddle4': 'LeftHandMiddle3',
  'LeftHandRing1': 'LeftHand', 'LeftHandRing2': 'LeftHandRing1', 'LeftHandRing3': 'LeftHandRing2', 'LeftHandRing4': 'LeftHandRing3',
  'LeftHandPinky1': 'LeftHand', 'LeftHandPinky2': 'LeftHandPinky1', 'LeftHandPinky3': 'LeftHandPinky2', 'LeftHandPinky4': 'LeftHandPinky3',
  'RightShoulder': 'Spine2', 'RightArm': 'RightShoulder', 'RightForeArm': 'RightArm', 'RightHand': 'RightForeArm',
  'RightHandThumb1': 'RightHand', 'RightHandThumb2': 'RightHandThumb1', 'RightHandThumb3': 'RightHandThumb2', 'RightHandThumb4': 'RightHandThumb3',
  'RightHandIndex1': 'RightHand', 'RightHandIndex2': 'RightHandIndex1', 'RightHandIndex3': 'RightHandIndex2', 'RightHandIndex4': 'RightHandIndex3',
  'RightHandMiddle1': 'RightHand', 'RightHandMiddle2': 'RightHandMiddle1', 'RightHandMiddle3': 'RightHandMiddle2', 'RightHandMiddle4': 'RightHandMiddle3',
  'RightHandRing1': 'RightHand', 'RightHandRing2': 'RightHandRing1', 'RightHandRing3': 'RightHandRing2', 'RightHandRing4': 'RightHandRing3',
  'RightHandPinky1': 'RightHand', 'RightHandPinky2': 'RightHandPinky1', 'RightHandPinky3': 'RightHandPinky2', 'RightHandPinky4': 'RightHandPinky3',
  'LeftUpLeg': 'Hips', 'LeftLeg': 'LeftUpLeg', 'LeftFoot': 'LeftLeg', 'LeftToe': 'LeftFoot', 'LeftToeEnd': 'LeftToe',
  'RightUpLeg': 'Hips', 'RightLeg': 'RightUpLeg', 'RightFoot': 'RightLeg', 'RightToe': 'RightFoot', 'RightToeEnd': 'RightToe',
};

// Set of "major" joints (excluding fingers/toes) for quality scoring
const MAJOR_JOINTS = new Set(SOMASKEL77_JOINTS.filter(j =>
  !j.includes('Thumb') && !j.includes('Index') && !j.includes('Middle')
  && !j.includes('Ring') && !j.includes('Pinky') && !j.endsWith('End')
));

// ── Types ────────────────────────────────────────

/** Direction vector in 3D */
export type Vec3 = [number, number, number];

/** Quaternion [x, y, z, w] */
export type Quat = [number, number, number, number];

export interface RetargetMapping {
  /** somaskel77 joint → target bone name */
  jointMap: Map<string, string>;
  /** target bone → somaskel77 joint (reverse lookup) */
  reverseMap: Map<string, string>;
  /** somaskel77 joints with no match */
  unmappedSource: string[];
  /** target bones with no somaskel77 match */
  unmappedTarget: string[];
  /** Match quality 0–1 (fraction of major joints mapped) */
  quality: number;
  /** Whether the target has any usable skeleton */
  hasSkeleton: boolean;
}

export interface BonePose {
  /** Target bone name */
  name: string;
  /** World-space position in meters */
  worldPosition: Vec3;
  /** Parent-space quaternion (ready for bone.quaternion) */
  localQuaternion: Quat;
}

export interface FramePose {
  /** Per-bone poses for this frame (only mapped bones) */
  bones: BonePose[];
  /** Root (Hips) world transform — use for skeletonless root-follow */
  root: { position: Vec3; quaternion: Quat };
}

export interface RetargetResult {
  /** The joint mapping used */
  mapping: RetargetMapping;
  /** One FramePose per motion frame */
  frames: FramePose[];
  /** Source data summary */
  source: {
    numFrames: number;
    jointNames: string[];
    fps: number;
  };
}

// ── Public API ───────────────────────────────────

/**
 * Full retarget pipeline:
 *   posedJoints + target bone names → per-frame bone poses
 *
 * poseJoints: [frames, joints, 3] in meters (Kimodo output format)
 * jointNames: names matching poseJoints dim 1
 * targetBoneNames: bone names from the target model's skeleton
 *                  (empty array = no skeleton → root-follow mode only)
 */
export function retargetMotion(
  poseJoints: number[][][],
  jointNames: string[],
  targetBoneNames: string[],
  fps: number = 30,
): RetargetResult {
  const mapping = buildRetargetMapping(targetBoneNames);

  const frames: FramePose[] = poseJoints.map((frameJoints) =>
    computeFramePose(frameJoints, jointNames, mapping),
  );

  return {
    mapping,
    frames,
    source: { numFrames: poseJoints.length, jointNames, fps },
  };
}

/**
 * Build a joint name mapping from somaskel77 → target skeleton.
 *
 * Matching strategy (ordered by confidence):
 *   1. Exact name match
 *   2. Case-insensitive match
 *   3. Known alias table
 *   4. Substring match (only for non-finger joints)
 */
export function buildRetargetMapping(targetBoneNames: string[]): RetargetMapping {
  const jointMap = new Map<string, string>();
  const reverseMap = new Map<string, string>();
  const unmappedSource: string[] = [];
  const targetLower = new Map<string, string>();

  for (const name of targetBoneNames) {
    targetLower.set(name.toLowerCase().trim(), name);
  }

  for (const srcName of SOMASKEL77_JOINTS) {
    let match: string | undefined;

    // 1. Exact match
    if (targetBoneNames.includes(srcName)) {
      match = srcName;
    }

    // 2. Case-insensitive
    if (!match) {
      const lower = srcName.toLowerCase();
      match = targetBoneNames.find(t => t.toLowerCase() === lower);
    }

    // 3. Alias table
    if (!match) {
      const aliases = JOINT_ALIASES[srcName];
      if (aliases) {
        for (const alias of aliases) {
          const found = targetBoneNames.find(t => t.toLowerCase() === alias.toLowerCase());
          if (found) { match = found; break; }
        }
      }
    }

    // 4. Substring match (last resort — skip finger joints to avoid false matches)
    if (!match && !srcName.includes('Thumb') && !srcName.includes('Index')
        && !srcName.includes('Middle') && !srcName.includes('Ring')
        && !srcName.includes('Pinky')) {
      const srcLower = srcName.toLowerCase();
      for (const [tLower, tOrig] of targetLower) {
        if (tLower.includes(srcLower) || srcLower.includes(tLower)) {
          match = tOrig;
          break;
        }
      }
    }

    if (match) {
      jointMap.set(srcName, match);
      reverseMap.set(match, srcName);
    } else {
      unmappedSource.push(srcName);
    }
  }

  const unmappedTarget = targetBoneNames.filter(t => !reverseMap.has(t));

  // Quality score: fraction of major body joints mapped
  const majorList = [...MAJOR_JOINTS];
  const mappedMajor = majorList.filter(j => jointMap.has(j)).length;
  const quality = majorList.length > 0 ? mappedMajor / majorList.length : 0;

  return {
    jointMap,
    reverseMap,
    unmappedSource,
    unmappedTarget,
    quality,
    hasSkeleton: targetBoneNames.length > 0,
  };
}

/**
 * Compute one frame's bone poses from posedJoints data.
 * Uses parent-child direction vectors to compute quaternions.
 */
export function computeFramePose(
  posedJoints: number[][],
  jointNames: string[],
  mapping: RetargetMapping,
): FramePose {
  const srcNameToIdx = new Map<string, number>();
  jointNames.forEach((n, i) => srcNameToIdx.set(n, i));

  // ── Collect world positions for all mapped joints ──
  const worldPositions = new Map<string, Vec3>();
  for (const [srcName, tgtName] of mapping.jointMap) {
    const idx = srcNameToIdx.get(srcName);
    if (idx != null && idx < posedJoints.length) {
      worldPositions.set(tgtName, [
        posedJoints[idx][0],
        posedJoints[idx][1],
        posedJoints[idx][2],
      ]);
    }
  }

  // ── Root (Hips) position ──
  const hipsIdx = srcNameToIdx.get('Hips');
  const hipsPos: Vec3 = hipsIdx != null && hipsIdx < posedJoints.length
    ? [posedJoints[hipsIdx][0], posedJoints[hipsIdx][1], posedJoints[hipsIdx][2]]
    : [0, 0, 0];

  // ── Compute bone poses ──
  const bones: BonePose[] = [];
  const boneSet = new Set<string>();

  for (const [, tgtName] of mapping.reverseMap) {
    const srcName = mapping.reverseMap.get(tgtName)!;
    const parentSrcName = SOMASKEL77_PARENT_OF[srcName];

    const childPos = worldPositions.get(tgtName);
    if (!childPos) continue;

    let quat: Quat = [0, 0, 0, 1];

    if (parentSrcName) {
      const parentTgtName = mapping.jointMap.get(parentSrcName);
      const parentPos = parentTgtName ? worldPositions.get(parentTgtName) : null;

      if (parentPos) {
        // Compute rotation from reference vector (0, 1, 0) to parent→child direction
        const len = vec3Len(vec3Sub(childPos, parentPos));
        if (len > 0.0001) {
          const dir = vec3Normalize(vec3Sub(childPos, parentPos));
          quat = quatFromDirection(dir[0], dir[1], dir[2]);
        }
      }
    }

    if (!boneSet.has(tgtName)) {
      boneSet.add(tgtName);
      bones.push({ name: tgtName, worldPosition: childPos, localQuaternion: quat });
    }
  }

  // ── Root quaternion (Hips→Spine direction) ──
  let rootQuat: Quat = [0, 0, 0, 1];
  const spineTgtName = mapping.jointMap.get('Spine');
  const spinePos = spineTgtName ? worldPositions.get(spineTgtName) : null;
  if (spinePos) {
    const len = vec3Len(vec3Sub(spinePos, hipsPos));
    if (len > 0.0001) {
      const dir = vec3Normalize(vec3Sub(spinePos, hipsPos));
      rootQuat = quatFromDirection(dir[0], dir[1], dir[2]);
    }
  }

  return { bones, root: { position: hipsPos, quaternion: rootQuat } };
}

/**
 * Root-only transform — for skeletonless models.
 * Returns Hips world position + facing direction.
 */
export function computeRootOnly(
  poseJoints: number[][][],
  jointNames: string[],
  frameIndex: number,
): { position: Vec3; quaternion: Quat } | null {
  const srcNameToIdx = new Map<string, number>();
  jointNames.forEach((n, i) => srcNameToIdx.set(n, i));

  const hipsIdx = srcNameToIdx.get('Hips');
  if (hipsIdx == null) return null;

  const frame = poseJoints[frameIndex];
  if (!frame || hipsIdx >= frame.length) return null;

  const pos: Vec3 = [frame[hipsIdx][0], frame[hipsIdx][1], frame[hipsIdx][2]];

  let quat: Quat = [0, 0, 0, 1];
  const spineIdx = srcNameToIdx.get('Spine');
  if (spineIdx != null && spineIdx < frame.length) {
    const dx = frame[spineIdx][0] - frame[hipsIdx][0];
    const dy = frame[spineIdx][1] - frame[hipsIdx][1];
    const dz = frame[spineIdx][2] - frame[hipsIdx][2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 0.0001) {
      quat = quatFromDirection(dx / len, dy / len, dz / len);
    }
  }

  return { position: pos, quaternion: quat };
}

/**
 * Quick check: does a bone name list look like a valid skeleton?
 */
export function isRiggable(targetBoneNames: string[]): boolean {
  const mapping = buildRetargetMapping(targetBoneNames);
  return mapping.quality >= 0.3; // at least 30% of major joints mapped
}

/**
 * Determine retarget mode based on target skeleton.
 */
export type RetargetMode = 'full' | 'root-only' | 'stick-figure';

export function determineRetargetMode(targetBoneNames: string[]): RetargetMode {
  if (targetBoneNames.length === 0) return 'stick-figure';
  if (isRiggable(targetBoneNames)) return 'full';
  return 'root-only';
}

// ── Internal math helpers ─────────────────────────

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Len(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Len(v);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

/**
 * Compute quaternion that rotates reference vector (0, 1, 0) to target direction.
 * Reference (0,1,0) = Kimodo skeleton default "up/bone-axis" direction.
 * Returns [x, y, z, w].
 */
export function quatFromDirection(dx: number, dy: number, dz: number): Quat {
  const refX = 0, refY = 1, refZ = 0;

  // Cross = rotation axis
  const cx = refY * dz - refZ * dy;
  const cy = refZ * dx - refX * dz;
  const cz = refX * dy - refY * dx;

  // Dot = cos(angle)
  const dot = refX * dx + refY * dy + refZ * dz;

  // Parallel
  if (dot > 0.9999) return [0, 0, 0, 1];

  // Anti-parallel: rotate 180° around perpendicular
  if (dot < -0.9999) {
    // Pick a perpendicular vector: (ref + (1,0,0)) normalized
    const px = refX + 1, py = refY, pz = refZ;
    const plen = Math.sqrt(px * px + py * py + pz * pz);
    return [px / plen, py / plen, pz / plen, 0];
  }

  // General case
  const s = Math.sqrt((1 + dot) * 2);
  return [cx / s, cy / s, cz / s, s * 0.5];
}

/**
 * Slerp between two quaternions [x, y, z, w].
 */
export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  // Flip sign if needed for shortest path
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  if (dot < 0) { dot = -dot; bx = -bx; by = -by; bz = -bz; bw = -bw; }

  if (dot > 0.9995) {
    // Linear interpolation for near-identical quaternions
    const r: Quat = [
      a[0] + (bx - a[0]) * t,
      a[1] + (by - a[1]) * t,
      a[2] + (bz - a[2]) * t,
      a[3] + (bw - a[3]) * t,
    ];
    const len = Math.sqrt(r[0] ** 2 + r[1] ** 2 + r[2] ** 2 + r[3] ** 2);
    return [r[0] / len, r[1] / len, r[2] / len, r[3] / len];
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);

  const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
  const s1 = sinTheta / sinTheta0;

  return [
    a[0] * s0 + bx * s1,
    a[1] * s0 + by * s1,
    a[2] * s0 + bz * s1,
    a[3] * s0 + bw * s1,
  ];
}

// ── Debug / inspection ────────────────────────────

/**
 * Human-readable mapping report for UI display.
 */
export function mappingReport(mapping: RetargetMapping): string[] {
  const lines: string[] = [];
  const qualityPct = Math.round(mapping.quality * 100);

  if (!mapping.hasSkeleton) {
    lines.push('目标模型无骨骼 — 使用根骨骼跟随模式');
    return lines;
  }

  lines.push(`关节匹配率: ${qualityPct}% (${mapping.jointMap.size}/${SOMASKEL77_JOINTS.length})`);

  if (mapping.unmappedSource.length > 0) {
    const major = mapping.unmappedSource.filter(j => MAJOR_JOINTS.has(j));
    const minor = mapping.unmappedSource.filter(j => !MAJOR_JOINTS.has(j));
    if (major.length > 0) lines.push(`核心关节缺失: ${major.join(', ')}`);
    if (minor.length > 0) lines.push(`末节关节缺失: ${minor.length} 个 (手指/脚趾)`);
  }

  return lines;
}
