/* === BVH → GLB converter (browser-side, uses Three.js) === */
import * as THREE from 'three';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Convert BVH base64 string to GLB ArrayBuffer.
 * Creates a skeleton hierarchy + animation clip, exports as binary glTF.
 */
export async function bvhToGlb(bvhBase64: string): Promise<ArrayBuffer> {
  // 1. Decode base64 → BVH text
  const binary = atob(bvhBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const bvhText = new TextDecoder().decode(bytes);

  // 2. Parse BVH → skeleton + animation clip
  const loader = new BVHLoader();
  const { skeleton, clip } = loader.parse(bvhText);

  // 3. Build a scene with the skeleton root bone
  const rootBone = skeleton.bones[0];
  const scene = new THREE.Group();
  scene.add(rootBone);

  // 4. GLTFExporter needs at least one skinned mesh to export the skeleton.
  // Create a tiny invisible skinned mesh to carry the skeleton through export.
  const skinnedGeom = new THREE.BoxGeometry(0.001, 0.001, 0.001);
  const skinnedMat = new THREE.MeshBasicMaterial({ visible: false });
  const skinnedMesh = new THREE.SkinnedMesh(skinnedGeom, skinnedMat);
  skinnedMesh.bind(skeleton, new THREE.Matrix4());
  rootBone.add(skinnedMesh);

  // 5. Export as binary GLB
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        // Dispose temp objects
        skinnedGeom.dispose();
        skinnedMat.dispose();

        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          // JSON fallback — convert to buffer
          const json = JSON.stringify(result);
          const buf = new ArrayBuffer(json.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i < json.length; i++) view[i] = json.charCodeAt(i);
          resolve(buf);
        }
      },
      (err) => reject(err),
      {
        binary: true,
        animations: [clip],
        truncateDrawRange: true,
        maxTextureSize: 1024,
      }
    );
  });
}
