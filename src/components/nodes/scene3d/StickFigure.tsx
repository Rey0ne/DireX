/* === StickFigure — procedural character from joint positions === */
import React from 'react';
import * as THREE from 'three';
import { Vec3, JointSet } from './shared';

export const POSE_JOINTS: Record<string, JointSet> = {
  stand: { head: [0, 1.68, 0], neck: [0, 1.50, 0], shoulderL: [-0.28, 1.46, 0], shoulderR: [0.28, 1.46, 0], elbowL: [-0.28, 1.16, 0], elbowR: [0.28, 1.16, 0], handL: [-0.28, 0.86, 0], handR: [0.28, 0.86, 0], hip: [0, 0.85, 0], hipL: [-0.14, 0.83, 0], hipR: [0.14, 0.83, 0], kneeL: [-0.14, 0.42, 0], kneeR: [0.14, 0.42, 0], footL: [-0.14, 0.04, 0], footR: [0.14, 0.04, 0] },
  sit: { head: [0, 1.24, 0], neck: [0, 1.06, 0], shoulderL: [-0.28, 1.02, 0], shoulderR: [0.28, 1.02, 0], elbowL: [-0.34, 0.72, 0.18], elbowR: [0.34, 0.72, 0.18], handL: [-0.40, 0.48, 0.30], handR: [0.40, 0.48, 0.30], hip: [0, 0.40, 0], hipL: [-0.18, 0.38, 0.12], hipR: [0.18, 0.38, 0.12], kneeL: [-0.36, 0.30, 0.28], kneeR: [0.36, 0.30, 0.28], footL: [-0.44, 0.16, 0.40], footR: [0.44, 0.16, 0.40] },
};

export function buildFigure(j: JointSet, c: string): React.ReactNode[] {
  const r: React.ReactNode[] = [];
  let k = 0;
  const cyl = (a: Vec3, b: Vec3, rad: number) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
    r.push(<mesh key={k++} position={[mx, my, mz]} quaternion={q} scale={[rad, len / 2, rad]}>
      <cylinderGeometry args={[1, 1, 2, 10]} /><meshLambertMaterial color={c} />
    </mesh>);
  };
  const sph = (p: Vec3, rad: number) => {
    r.push(<mesh key={k++} position={p} scale={rad}><sphereGeometry args={[1, 14, 14]} /><meshLambertMaterial color={c} /></mesh>);
  };
  const box = (p: Vec3, scl: Vec3) => {
    r.push(<mesh key={k++} position={p} scale={scl}><boxGeometry /><meshLambertMaterial color={c} /></mesh>);
  };
  // Torso
  cyl(j.neck, j.hip, 0.20);
  sph(j.head, 0.14); sph(j.neck, 0.07);
  sph(j.shoulderL, 0.07); sph(j.shoulderR, 0.07);
  // Arms
  cyl(j.shoulderL, j.elbowL, 0.075); cyl(j.shoulderR, j.elbowR, 0.075);
  sph(j.elbowL, 0.055); sph(j.elbowR, 0.055);
  cyl(j.elbowL, j.handL, 0.065); cyl(j.elbowR, j.handR, 0.065);
  sph(j.handL, 0.055); sph(j.handR, 0.055);
  // Legs
  sph(j.hip, 0.10);
  cyl(j.hipL, j.kneeL, 0.10); cyl(j.hipR, j.kneeR, 0.10);
  sph(j.kneeL, 0.065); sph(j.kneeR, 0.065);
  cyl(j.kneeL, j.footL, 0.085); cyl(j.kneeR, j.footR, 0.085);
  box([j.footL[0], j.footL[1] - 0.06, j.footL[2] + 0.04], [0.10, 0.04, 0.14]);
  box([j.footR[0], j.footR[1] - 0.06, j.footR[2] + 0.04], [0.10, 0.04, 0.14]);
  return r;
}

export function StickFigure({ poseId, color = '#c0c8d0' }: { poseId: string; color?: string }) {
  const j = POSE_JOINTS[poseId || 'stand'];
  return j ? <group>{buildFigure(j, color)}</group> : null;
}
