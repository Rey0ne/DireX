/* === Scene3D shared types, constants, utilities === */
import React from 'react';

// ─── Types ──────────────────────────────────────
export interface SceneObject {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'figure' | 'camera';
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color?: string;
  figurePose?: string;
  figureSrc?: string;
}
export type Vec3 = [number, number, number];
export type GizmoMode = 'translate' | 'rotate' | 'scale';
export type TrackType = 'dolly' | 'curved' | 'orbit';

export interface SpeedKey { time: number; speed: number; }
export interface RotationKey { time: number; pitch: number; yaw: number; }

export interface CameraRig {
  type: TrackType;
  duration: number;
  speedCurve: SpeedKey[];
  rotationKeys: RotationKey[];
  dolly?: { pointA: Vec3; pointB: Vec3; };
  curved?: { controlPoints: { id: string; position: Vec3; }[]; };
  orbit?: { center: Vec3; radius: number; height: number; startAngle: number; endAngle: number; };
}

// ─── Pose types ─────────────────────────────────
export interface JointSet {
  head: Vec3; neck: Vec3;
  shoulderL: Vec3; shoulderR: Vec3;
  elbowL: Vec3; elbowR: Vec3;
  handL: Vec3; handR: Vec3;
  hip: Vec3; hipL: Vec3; hipR: Vec3;
  kneeL: Vec3; kneeR: Vec3;
  footL: Vec3; footR: Vec3;
}
export type PoseEntry = { name: string; src: string; format?: 'glb' | 'fbx' };

// ─── Constants ───────────────────────────────────
export const KNOWN_POSES = ['stand1', 'stand2', 'sit', 'walk', 'run', 'squat', 'lie', 'fight'];
export const PF: Record<string, string> = { stand1: '站立1', stand2: '站立2', sit: '坐姿', walk: '行走', run: '跑步', squat: '蹲姿', lie: '卧躺', fight: '格斗' };
export const OBJ_COLORS = ['#8899aa', '#99aabb', '#aabbcc', '#778899', '#b0bec5'];
export const SENSOR_H = 18.17;
export const LENSES: Record<string, { name: string; fov: number; maxAperture: number; minAperture: number; blades: number }> = {
  '24': { name: '24mm', fov: 2 * Math.atan(SENSOR_H / (2 * 24)) * (180 / Math.PI), maxAperture: 1.3, minAperture: 22, blades: 11 },
  '35': { name: '35mm', fov: 2 * Math.atan(SENSOR_H / (2 * 35)) * (180 / Math.PI), maxAperture: 1.3, minAperture: 22, blades: 11 },
  '50': { name: '50mm', fov: 2 * Math.atan(SENSOR_H / (2 * 50)) * (180 / Math.PI), maxAperture: 1.3, minAperture: 22, blades: 11 },
  '85': { name: '85mm', fov: 2 * Math.atan(SENSOR_H / (2 * 85)) * (180 / Math.PI), maxAperture: 1.3, minAperture: 22, blades: 11 },
  '135': { name: '135mm', fov: 2 * Math.atan(SENSOR_H / (2 * 135)) * (180 / Math.PI), maxAperture: 1.3, minAperture: 22, blades: 11 },
};
export const SCALE_FACTOR = 0.12;

// ─── Pose registry (module-level state) ──────────
export const poseRegistry = new Map<string, PoseEntry>();
export let poseInitDone = false;
export function markPoseInitDone() { poseInitDone = true; }

export function pickColor() { return OBJ_COLORS[Math.floor(Math.random() * OBJ_COLORS.length)]; }

export function addPoseEntry(id: string, name: string, src: string, format?: 'glb' | 'fbx') {
  poseRegistry.set(id, { name, src, format });
  if (!poseInitDone) poseInitDone = true;
}

// ─── Generic ErrorBoundary ────────────────────────
export class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { err: boolean }> {
  constructor(p: { fallback: React.ReactNode; children: React.ReactNode }) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}
