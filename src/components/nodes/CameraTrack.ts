/* CameraTrack — 相机轨道计算，独立于 3D 世界渲染 */
import * as THREE from 'three';

export type Vec3 = [number,number,number];
export type TrackType = 'dolly'|'curved'|'orbit';
export interface SpeedKey { time:number; speed:number; }
export interface RotationKey { time:number; pitch:number; yaw:number; }
export interface AnimTrack { modelId:string; start:number; dur:number; color:string; }

export interface CameraRig {
  type: TrackType;
  duration: number;
  speedCurve: SpeedKey[];
  rotationKeys: RotationKey[];
  animTracks: AnimTrack[];
  dolly?: { pointA: Vec3; pointB: Vec3; };
  curbed?: { controlPoints: { id:string; position:Vec3; }[]; };
  orbit?: { center: Vec3; radius:number; height:number; startAngle:number; endAngle:number; controlPoints: { id:string; position:Vec3; }[]; };
}

// 对象池 — 避免每帧 new Vector3 产生 GC
const _cv  = new THREE.Vector3();
const _cv2 = new THREE.Vector3();
const _cv3 = new THREE.Vector3();
const _camRes = {
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  pitch: undefined as number|undefined,
  yaw: undefined as number|undefined,
};
let _lastCurve: THREE.CatmullRomCurve3|null = null;
let _lastCurveKey = '';

/** 梯形积分：从 0 到 to 的 speed 累积面积 */
function integrateSpeed(sc: SpeedKey[], to: number): number {
  let e = 0, pt = 0, ps = 1;
  if (sc.length > 0 && sc[0].time <= 0) ps = sc[0].speed;
  for (let i = 0; i < sc.length; i++) {
    const kt = Math.min(sc[i].time, to);
    if (kt > pt) { e += (ps + sc[i].speed) / 2 * (kt - pt); }
    if (sc[i].time >= to) { return e; }
    pt = sc[i].time;
    ps = sc[i].speed;
  }
  if (to > pt) e += ps * (to - pt);
  return e;
}

/** 根据 speedCurve 将时间进度 prog 映射为轨道进度 pp */
export function speedToPP(speedCurve: SpeedKey[], duration: number, prog: number): number {
  const sc = [...speedCurve].sort((a,b) => a.time - b.time);
  const tt = prog * duration;
  const eff = integrateSpeed(sc, tt);
  const total = integrateSpeed(sc, duration);
  return total > 0 ? Math.max(0, Math.min(1, eff / total)) : prog;
}

/** 获取轨道上指定进度 pp 处的相机位置/朝向 */
export function getTrackCamera(rig: CameraRig, pp: number): {
  pos: THREE.Vector3; look: THREE.Vector3;
  pitch: number|undefined; yaw: number|undefined;
} | null {
  const r = rig;
  if (!r) return null;

  // 旋转关键帧插值
  let pitch: number|undefined, yaw: number|undefined;
  const rk = [...r.rotationKeys].sort((a,b) => a.time - b.time);
  if (rk.length >= 2) {
    const tt = pp * r.duration;
    let i0 = 0;
    for (let i = 1; i < rk.length; i++) { if (rk[i].time <= tt) i0 = i; else break; }
    const i1 = Math.min(i0 + 1, rk.length - 1);
    const st = rk[i1].time > rk[i0].time ? (tt - rk[i0].time) / (rk[i1].time - rk[i0].time) : 0;
    pitch = rk[i0].pitch + (rk[i1].pitch - rk[i0].pitch) * st;
    yaw = rk[i0].yaw + (rk[i1].yaw - rk[i0].yaw) * st;
  } else if (rk.length === 1) {
    pitch = rk[0].pitch; yaw = rk[0].yaw;
  }

  // Dolly: A→B 线性插值
  if (r.type === 'dolly' && r.dolly) {
    _cv.set(...r.dolly.pointA);
    _cv2.set(...r.dolly.pointB);
    _cv3.copy(_cv).lerp(_cv2, pp);
    _cv3.y += 0.13;
    _camRes.pos.copy(_cv3);
    _camRes.look.copy(_cv2);
    _camRes.pitch = pitch; _camRes.yaw = yaw;
    return _camRes;
  }

  // Curved: CatmullRom 曲线
  if (r.type === 'curved' && r.curved && r.curved.controlPoints.length >= 2) {
    const ck = JSON.stringify(r.curved.controlPoints.map(cp => cp.position));
    if (ck !== _lastCurveKey) {
      _lastCurve = new THREE.CatmullRomCurve3(
        r.curved.controlPoints.map(p => new THREE.Vector3(...p.position))
      );
      _lastCurveKey = ck;
    }
    _lastCurve!.getPointAt(pp, _cv3);
    _lastCurve!.getTangentAt(pp, _cv);
    _cv.copy(_cv3).add(_cv);
    _camRes.pos.copy(_cv3);
    _camRes.look.copy(_cv);
    _camRes.pitch = pitch; _camRes.yaw = yaw;
    return _camRes;
  }

  // Orbit: 圆轨道
  if (r.type === 'orbit' && r.orbit) {
    const { center, radius, height, startAngle, endAngle } = r.orbit;
    _cv.set(...center);
    _cv2.set(
      _cv.x + Math.cos(startAngle + (endAngle - startAngle) * pp) * radius,
      _cv.y + height + 0.13,
      _cv.z + Math.sin(startAngle + (endAngle - startAngle) * pp) * radius
    );
    _camRes.pos.copy(_cv2);
    _camRes.look.copy(_cv);
    _camRes.pitch = pitch; _camRes.yaw = yaw;
    return _camRes;
  }

  return null;
}
