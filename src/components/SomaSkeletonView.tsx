/* === SomaSkeletonView — BVH → Three.js skeleton visualization === */
// @ts-nocheck
import React, { useRef, useEffect, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';

// Joint colors matching DireX design system
const JOINT_COLOR = '#5EEAD4';
const BONE_COLOR = '#1a8a7a';
const HIGHLIGHT_COLOR = '#f0c040';

interface SomaSkeletonViewProps {
  bvhBase64?: string;
  bvhUrl?: string;
  posedJoints?: number[][][];  // [frames, joints, 3] in cm — direct from Kimodo
  jointNames?: string[];       // name per joint, matches posedJoints dim 1
  playing?: boolean;
  loop?: boolean;
  speed?: number;
  highlightJoints?: boolean;
}

// ── Key body bone connections (parent→child joint name pairs) ──
// These are matched against jointNames; missing joints are silently skipped.
const BODY_BONE_PAIRS: [string, string][] = [
  // Spine
  ['Hips', 'Spine1'], ['Spine1', 'Spine2'], ['Spine2', 'Chest'],
  ['Chest', 'Neck1'], ['Neck1', 'Neck2'], ['Neck2', 'Head'],
  ['Head', 'HeadEnd'],
  // Left arm
  ['Chest', 'LeftShoulder'], ['LeftShoulder', 'LeftArm'],
  ['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'],
  // Right arm
  ['Chest', 'RightShoulder'], ['RightShoulder', 'RightArm'],
  ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'],
  // Left leg
  ['Hips', 'LeftLeg'], ['LeftLeg', 'LeftShin'],
  ['LeftShin', 'LeftFoot'], ['LeftFoot', 'LeftToeBase'],
  ['LeftToeBase', 'LeftToeEnd'],
  // Right leg
  ['Hips', 'RightLeg'], ['RightLeg', 'RightShin'],
  ['RightShin', 'RightFoot'], ['RightFoot', 'RightToeBase'],
  ['RightToeBase', 'RightToeEnd'],
];

// ─── Posed-Joints Skeleton (primary path) ──────────

function PosedJointsSkeleton({
  posedJoints, jointNames, playing = true, loop = true, speed = 1,
}: {
  posedJoints: number[][][];
  jointNames: string[];
  playing?: boolean;
  loop?: boolean;
  speed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const jointsRef = useRef<THREE.Mesh[]>([]);
  const bonesRef = useRef<{ mesh: THREE.Mesh; pi: number; ci: number }[]>([]);
  const frameRef = useRef(0);
  const prevPlaying = useRef(playing);

  // Reset to frame 0 when playback starts
  useEffect(() => {
    if (playing && !prevPlaying.current) frameRef.current = 0;
    prevPlaying.current = playing;
  }, [playing]);
  // Sizes in cm (parent group scales ×0.01 → meters in scene)
  // After scaling: JOINT_R=4cm → 0.04m (8cm Ø), BONE_R=1.5cm → 0.015m (3cm Ø)
  const JOINT_R = 4;
  const BONE_R = 1.5;

  // ── Build geometry (rebuilds when posedJoints/jointNames change) ──
  useEffect(() => {
    if (!posedJoints || !jointNames || !groupRef.current) return;

    // Clear previous geometry
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    jointsRef.current = [];
    bonesRef.current = [];
    frameRef.current = 0;

    const nameToIdx = new Map<string, number>();
    jointNames.forEach((n, i) => nameToIdx.set(n, i));

    // Head/hand/feet joints slightly larger for visibility
    const KEY_LARGE = new Set(['Head', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot']);
    const jointGeomSmall = new THREE.SphereGeometry(JOINT_R, 12, 12);
    const jointGeomLarge = new THREE.SphereGeometry(JOINT_R * 1.5, 12, 12);

    const jointMat = new THREE.MeshStandardMaterial({
      color: JOINT_COLOR, roughness: 0.3, metalness: 0.1,
      emissive: JOINT_COLOR, emissiveIntensity: 0.25,
    });
    const boneMat = new THREE.MeshStandardMaterial({
      color: BONE_COLOR, roughness: 0.35, metalness: 0.08,
      emissive: BONE_COLOR, emissiveIntensity: 0.08,
    });

    const joints: THREE.Mesh[] = [];

    // One sphere per joint, positioned at rest pose (frame 0)
    // posed_joints are in METERS → multiply by 100 for cm (parent group scale 0.01 converts back)
    const rest = posedJoints[0];
    for (let j = 0; j < jointNames.length; j++) {
      const name = jointNames[j];
      const isKey = KEY_LARGE.has(name);
      const mesh = new THREE.Mesh(isKey ? jointGeomLarge : jointGeomSmall, jointMat);
      const p = rest[j];
      mesh.position.set(p[0] * 100, p[1] * 100, p[2] * 100);
      groupRef.current.add(mesh);
      joints.push(mesh);
    }
    jointsRef.current = joints;

    // Bone cylinders between connected joints
    const bones: { mesh: THREE.Mesh; pi: number; ci: number }[] = [];
    for (const [pName, cName] of BODY_BONE_PAIRS) {
      const pi = nameToIdx.get(pName);
      const ci = nameToIdx.get(cName);
      if (pi === undefined || ci === undefined) continue;

      const pPos = new THREE.Vector3(rest[pi][0] * 100, rest[pi][1] * 100, rest[pi][2] * 100);
      const cPos = new THREE.Vector3(rest[ci][0] * 100, rest[ci][1] * 100, rest[ci][2] * 100);
      const dir = cPos.clone().sub(pPos);
      const len = dir.length();
      if (len < 0.001) continue;

      const cylGeom = new THREE.CylinderGeometry(BONE_R, BONE_R, len, 8);
      const mesh = new THREE.Mesh(cylGeom, boneMat);

      const mid = pPos.clone().add(cPos).multiplyScalar(0.5);
      mesh.position.copy(mid);

      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), dir.normalize()
      );
      mesh.quaternion.copy(quat);

      groupRef.current.add(mesh);
      bones.push({ mesh, pi, ci });
    }
    bonesRef.current = bones;
  }, [posedJoints, jointNames]);

  // ── Animate ──
  useFrame((_, delta) => {
    if (!posedJoints || posedJoints.length < 2 || !playing) return;

    const numFrames = posedJoints.length;
    frameRef.current += delta * 30 * speed;

    if (loop) {
      while (frameRef.current >= numFrames) frameRef.current -= numFrames;
      while (frameRef.current < 0) frameRef.current += numFrames;
    } else {
      frameRef.current = Math.max(0, Math.min(frameRef.current, numFrames - 1));
    }

    const f0 = Math.floor(frameRef.current);
    const f1 = Math.min(f0 + 1, numFrames - 1);
    const frac = frameRef.current - f0;

    const frameA = posedJoints[f0];
    const frameB = posedJoints[f1];

    // Update joint spheres (m → cm via ×100, parent group scale 0.01 converts back)
    const joints = jointsRef.current;
    for (let j = 0; j < joints.length; j++) {
      const a = frameA[j], b = frameB[j];
      joints[j].position.set(
        (a[0] + (b[0] - a[0]) * frac) * 100,
        (a[1] + (b[1] - a[1]) * frac) * 100,
        (a[2] + (b[2] - a[2]) * frac) * 100,
      );
    }

    // Update bone cylinders
    const _p = new THREE.Vector3();
    const _c = new THREE.Vector3();
    const _dir = new THREE.Vector3();
    const _quat = new THREE.Quaternion();
    const _up = new THREE.Vector3(0, 1, 0);

    for (const { mesh, pi, ci } of bonesRef.current) {
      // Interpolate parent position (m → cm)
      _p.set(
        (frameA[pi][0] + (frameB[pi][0] - frameA[pi][0]) * frac) * 100,
        (frameA[pi][1] + (frameB[pi][1] - frameA[pi][1]) * frac) * 100,
        (frameA[pi][2] + (frameB[pi][2] - frameA[pi][2]) * frac) * 100,
      );
      // Interpolate child position (m → cm)
      _c.set(
        (frameA[ci][0] + (frameB[ci][0] - frameA[ci][0]) * frac) * 100,
        (frameA[ci][1] + (frameB[ci][1] - frameA[ci][1]) * frac) * 100,
        (frameA[ci][2] + (frameB[ci][2] - frameA[ci][2]) * frac) * 100,
      );

      _dir.copy(_c).sub(_p);
      const len = _dir.length();
      if (len < 0.001) continue;

      // Midpoint
      mesh.position.copy(_p).add(_c).multiplyScalar(0.5);

      // Orientation
      _quat.setFromUnitVectors(_up, _dir.normalize());
      mesh.quaternion.copy(_quat);

      // Scale cylinder to match current bone length
      mesh.scale.set(1, len / mesh.geometry.parameters.height, 1);
    }
  });

  return <group ref={groupRef} />;
}

// ─── BVH Skeleton Renderer (fallback path) ──────

function buildBoneVisuals(skeleton: THREE.Skeleton): THREE.Group {
  const group = new THREE.Group();
  const JOINT_R = 4;
  const BONE_R = 1.5;
  const geomSphere = new THREE.SphereGeometry(JOINT_R, 12, 12);
  const matJoint = new THREE.MeshStandardMaterial({
    color: JOINT_COLOR, roughness: 0.3, metalness: 0.1,
    emissive: JOINT_COLOR, emissiveIntensity: 0.3,
  });
  const matBone = new THREE.MeshStandardMaterial({
    color: BONE_COLOR, roughness: 0.4, metalness: 0.05,
  });
  skeleton.bones.forEach((bone) => {
    const joint = new THREE.Mesh(geomSphere, matJoint);
    bone.add(joint);
    if (bone.parent && bone.parent.isBone) {
      const pLocal = new THREE.Vector3();
      const cLocal = bone.position.clone();
      const dir = cLocal.clone().sub(pLocal);
      const len = dir.length();
      if (len > 0.001) {
        const cylGeom = new THREE.CylinderGeometry(BONE_R, BONE_R, len, 8);
        const boneMesh = new THREE.Mesh(cylGeom, matBone);
        const midLocal = pLocal.clone().add(cLocal).multiplyScalar(0.5);
        boneMesh.position.copy(midLocal);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0), dir.normalize()
        );
        boneMesh.quaternion.copy(quat);
        bone.parent.add(boneMesh);
      }
    }
  });
  return group;
}

function BVHBasedSkeleton({
  bvhBase64,
  bvhUrl,
  playing = true,
  loop = true,
  speed = 1,
}: {
  bvhBase64?: string;
  bvhUrl?: string;
  playing?: boolean;
  loop?: boolean;
  speed?: number;
}) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const bonesRef = useRef<THREE.Group>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loader = new BVHLoader();
    let cancelled = false;

    async function load() {
      try {
        let data: ArrayBuffer;
        if (bvhBase64) {
          const binary = atob(bvhBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          data = bytes.buffer;
        } else if (bvhUrl) {
          const resp = await fetch(bvhUrl);
          data = await resp.arrayBuffer();
        } else {
          return;
        }

        if (cancelled) return;

        const text = new TextDecoder().decode(data);
        const result = loader.parse(text);

        if (cancelled) return;

        const { skeleton } = result;

        if (bonesRef.current) {
          bonesRef.current.clear();
          const visuals = buildBoneVisuals(skeleton);
          bonesRef.current.add(visuals);
          bonesRef.current.add(skeleton.bones[0]);

          if (mixerRef.current) {
            mixerRef.current.uncacheRoot(mixerRef.current.getRoot());
          }

          const mixer = new THREE.AnimationMixer(skeleton.bones[0]);
          const clip = result.clip;
          const action = mixer.clipAction(clip);
          action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
          action.play();
          if (!playing) action.paused = true;

          mixerRef.current = mixer;
        }

        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e).slice(0, 200));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [bvhBase64, bvhUrl]);

  useEffect(() => {
    if (!mixerRef.current) return;
    const actions = Object.values(mixerRef.current._actions || {}) as any[];
    actions.forEach((a: any) => { if (a) a.paused = !playing; });
  }, [playing]);

  useFrame((_, delta) => {
    if (!mixerRef.current || !playing) return;
    mixerRef.current.update(delta * speed);
  });

  if (error) {
    return (
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff4444" wireframe />
      </mesh>
    );
  }

  return <group ref={bonesRef} />;
}

// ─── BVHSkeleton (dispatcher) ──────────────────

function BVHSkeleton(props: SomaSkeletonViewProps) {
  // Prefer posed_joints when available — much more reliable than BVH parsing
  if (props.posedJoints && props.jointNames && props.posedJoints.length > 0) {
    return (
      <PosedJointsSkeleton
        posedJoints={props.posedJoints}
        jointNames={props.jointNames}
        playing={props.playing}
        loop={props.loop}
        speed={props.speed}
      />
    );
  }

  // Fallback: parse BVH
  return (
    <BVHBasedSkeleton
      bvhBase64={props.bvhBase64}
      bvhUrl={props.bvhUrl}
      playing={props.playing}
      loop={props.loop}
      speed={props.speed}
    />
  );
}

// ─── Ground Plane ───────────────────────────────

function SkeletonGround() {
  return (
    <>
      <Grid
        position={[0, 0, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#333333"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#555555"
        fadeDistance={30}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
    </>
  );
}

// ─── Main Export ────────────────────────────────

// ─── Exported BVHSkeleton for use inside other Canvases ──
export { BVHSkeleton };

export default function SomaSkeletonView(props: SomaSkeletonViewProps) {
  const { playing = true, loop = true, speed = 1, highlightJoints } = props;

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }}>
      <Canvas
        camera={{ position: [2, 2, 5], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 3]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 2, -3]} intensity={0.3} />
        <SkeletonGround />
        <Suspense fallback={null}>
          <BVHSkeleton {...props} />
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 1, 0]}
          minDistance={1}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2 + 0.3}
        />
      </Canvas>

      {/* Overlay HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          display: 'flex',
          gap: 8,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace',
          }}
        >
          {playing ? '▶ PLAYING' : '⏸ PAUSED'} · {speed}x
        </span>
        <span
          style={{
            fontSize: 9,
            color: '#5EEAD4',
            fontFamily: 'monospace',
          }}
        >
          SOMA skeleton
        </span>
      </div>
    </div>
  );
}
