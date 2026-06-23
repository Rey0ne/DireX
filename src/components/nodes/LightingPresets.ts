/* === DireX Cinematic Lighting Presets === */
export interface LightingPreset {
  id: string;
  name: string;
  nameZh: string;
  /* ── Directional Light ── */
  sunAzimuth: number;      // 0-360°, 0=+X, 90=+Z
  sunElevation: number;    // 0-90°, 0=horizon 90=zenith
  sunIntensity: number;    // 1-15
  sunColorTemp: number;    // Kelvin 1000-40000
  /* ── Hemisphere Light ── */
  skyColor: string;        // hex
  groundColor: string;     // hex
  ambientIntensity: number;
  /* ── Shadows ── */
  shadowMapSize: number;   // 512/1024/2048/4096
  shadowBias: number;
  /* ── Post ── */
  exposure: number;        // 0.3-3.0
}

/* ── Color temperature → RGB approximation (Tanner Helland) ── */
export function kelvinToRGB(k: number): { r: number; g: number; b: number } {
  const t = k / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  return {
    r: Math.max(0, Math.min(255, r)) / 255,
    g: Math.max(0, Math.min(255, g)) / 255,
    b: Math.max(0, Math.min(255, b)) / 255,
  };
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    nameZh: '黄金时刻',
    sunAzimuth: 280,
    sunElevation: 12,
    sunIntensity: 6.5,
    sunColorTemp: 3200,
    skyColor: '#ffd4a0',
    groundColor: '#5a3a1a',
    ambientIntensity: 0.8,
    shadowMapSize: 2048,
    shadowBias: -0.0008,
    exposure: 1.0,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    nameZh: '日落',
    sunAzimuth: 290,
    sunElevation: 6,
    sunIntensity: 8.0,
    sunColorTemp: 2200,
    skyColor: '#ff7744',
    groundColor: '#331111',
    ambientIntensity: 0.5,
    shadowMapSize: 2048,
    shadowBias: -0.0005,
    exposure: 0.8,
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    nameZh: '月光',
    sunAzimuth: 180,
    sunElevation: 35,
    sunIntensity: 1.2,
    sunColorTemp: 8000,
    skyColor: '#224466',
    groundColor: '#0a0a14',
    ambientIntensity: 0.3,
    shadowMapSize: 1024,
    shadowBias: -0.002,
    exposure: 1.5,
  },
  {
    id: 'overcast',
    name: 'Overcast',
    nameZh: '阴天',
    sunAzimuth: 45,
    sunElevation: 60,
    sunIntensity: 1.5,
    sunColorTemp: 6500,
    skyColor: '#aabbcc',
    groundColor: '#556666',
    ambientIntensity: 1.4,
    shadowMapSize: 512,
    shadowBias: -0.003,
    exposure: 1.2,
  },
  {
    id: 'studio_portrait',
    name: 'Studio Portrait',
    nameZh: '棚拍人像',
    sunAzimuth: 315,
    sunElevation: 30,
    sunIntensity: 4.0,
    sunColorTemp: 5500,
    skyColor: '#ddeeff',
    groundColor: '#334455',
    ambientIntensity: 0.7,
    shadowMapSize: 2048,
    shadowBias: -0.001,
    exposure: 1.1,
  },
  {
    id: 'cinematic_warm',
    name: 'Cinematic Warm',
    nameZh: '电影暖调',
    sunAzimuth: 225,
    sunElevation: 20,
    sunIntensity: 5.0,
    sunColorTemp: 4000,
    skyColor: '#eebb88',
    groundColor: '#3a2210',
    ambientIntensity: 0.6,
    shadowMapSize: 2048,
    shadowBias: -0.0008,
    exposure: 0.9,
  },
  {
    id: 'scifi_blue',
    name: 'Sci-Fi Blue',
    nameZh: '科幻蓝调',
    sunAzimuth: 135,
    sunElevation: 25,
    sunIntensity: 4.5,
    sunColorTemp: 12000,
    skyColor: '#334466',
    groundColor: '#0a0a1a',
    ambientIntensity: 0.5,
    shadowMapSize: 2048,
    shadowBias: -0.001,
    exposure: 1.0,
  },
  {
    id: 'horror',
    name: 'Horror',
    nameZh: '恐怖',
    sunAzimuth: 90,
    sunElevation: 8,
    sunIntensity: 2.0,
    sunColorTemp: 1800,
    skyColor: '#1a0a00',
    groundColor: '#050505',
    ambientIntensity: 0.2,
    shadowMapSize: 1024,
    shadowBias: -0.0005,
    exposure: 0.7,
  },
];
