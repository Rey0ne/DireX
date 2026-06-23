/* === Cinematic Lighting Presets — 电影灯光预设 === */

export interface DirectionalLightConfig {
  intensity: number;
  color: string;
  azimuth: number;
  elevation: number;
  castShadow: boolean;
  shadowBias?: number;
}

export interface PointLightConfig {
  intensity: number;
  color: string;
  position: [number, number, number];
  distance: number;
  decay: number;
  castShadow: boolean;
}

export interface SpotLightConfig {
  intensity: number;
  color: string;
  position: [number, number, number];
  target: [number, number, number];
  angle: number;
  penumbra: number;
  distance: number;
  decay: number;
  castShadow: boolean;
}

export interface EnvironmentConfig {
  preset: string;
  intensity: number;
  blur: number;
}

export interface FakeGIConfig {
  ambientIntensity: number;
  ambientColor: string;
  hemisphereSkyIntensity: number;
  hemisphereSkyColor: string;
  hemisphereGroundIntensity: number;
  hemisphereGroundColor: string;
}

export interface CinematicLightingState {
  directional: DirectionalLightConfig | null;
  point: PointLightConfig | null;
  spot: SpotLightConfig | null;
  environment: EnvironmentConfig;
  fakeGI: FakeGIConfig;
  exposure: number;
  toneMapping: 'ACESFilmic' | 'Cineon' | 'Linear' | 'Reinhard';
  activePreset: string | null;
}

export type LightPresetId =
  | 'golden_hour'
  | 'sunset'
  | 'moonlight'
  | 'overcast'
  | 'studio_portrait'
  | 'cinematic_warm'
  | 'scifi_blue'
  | 'horror'
  | 'snowfield';

export interface LightPreset {
  id: LightPresetId;
  label: string;
  description: string;
  state: CinematicLightingState;
}

export const LIGHTING_PRESETS: Record<LightPresetId, LightPreset> = {
  golden_hour: {
    id: 'golden_hour',
    label: '🌅 黄金时刻',
    description: '温暖日落，长阴影，电影感暖调',
    state: {
      directional: { intensity: 4.5, color: '#ffb366', azimuth: 270, elevation: 15, castShadow: true, shadowBias: -0.0003 },
      point: null,
      spot: null,
      environment: { preset: 'sunset', intensity: 0.6, blur: 0.1 },
      fakeGI: { ambientIntensity: 0.8, ambientColor: '#ffddcc', hemisphereSkyIntensity: 2.0, hemisphereSkyColor: '#ffccaa', hemisphereGroundIntensity: 0.6, hemisphereGroundColor: '#664433' },
      exposure: 0.8,
      toneMapping: 'ACESFilmic',
      activePreset: 'golden_hour',
    },
  },
  sunset: {
    id: 'sunset',
    label: '🌇 日落',
    description: '深橙红霞，戏剧性剪影',
    state: {
      directional: { intensity: 3.5, color: '#ff8844', azimuth: 260, elevation: 8, castShadow: true, shadowBias: -0.0004 },
      point: null,
      spot: null,
      environment: { preset: 'sunset', intensity: 0.8, blur: 0.15 },
      fakeGI: { ambientIntensity: 0.5, ambientColor: '#ffccaa', hemisphereSkyIntensity: 1.5, hemisphereSkyColor: '#ff9966', hemisphereGroundIntensity: 0.3, hemisphereGroundColor: '#442211' },
      exposure: 0.6,
      toneMapping: 'ACESFilmic',
      activePreset: 'sunset',
    },
  },
  moonlight: {
    id: 'moonlight',
    label: '🌙 月光',
    description: '冷蓝月光，静谧夜景',
    state: {
      directional: { intensity: 1.8, color: '#8899cc', azimuth: 120, elevation: 35, castShadow: true, shadowBias: -0.0002 },
      point: null,
      spot: null,
      environment: { preset: 'night', intensity: 0.35, blur: 0.2 },
      fakeGI: { ambientIntensity: 0.3, ambientColor: '#223344', hemisphereSkyIntensity: 0.8, hemisphereSkyColor: '#334466', hemisphereGroundIntensity: 0.15, hemisphereGroundColor: '#111122' },
      exposure: 1.2,
      toneMapping: 'ACESFilmic',
      activePreset: 'moonlight',
    },
  },
  overcast: {
    id: 'overcast',
    label: '☁ 阴天',
    description: '柔和漫射光，无硬阴影',
    state: {
      directional: { intensity: 1.2, color: '#ddeeff', azimuth: 180, elevation: 60, castShadow: false },
      point: null,
      spot: null,
      environment: { preset: 'dawn', intensity: 0.5, blur: 0.5 },
      fakeGI: { ambientIntensity: 1.2, ambientColor: '#ddeeff', hemisphereSkyIntensity: 2.5, hemisphereSkyColor: '#eef0f8', hemisphereGroundIntensity: 0.8, hemisphereGroundColor: '#8899aa' },
      exposure: 1.0,
      toneMapping: 'Linear',
      activePreset: 'overcast',
    },
  },
  studio_portrait: {
    id: 'studio_portrait',
    label: '📸 影棚人像',
    description: '三点布光，柔光箱质感',
    state: {
      directional: { intensity: 3.0, color: '#fff0e0', azimuth: 200, elevation: 40, castShadow: true, shadowBias: -0.0001 },
      point: { intensity: 2.5, color: '#ffe8d0', position: [-3, 2, 2], distance: 15, decay: 2, castShadow: false },
      spot: { intensity: 1.8, color: '#ffffff', position: [4, 3, -3], target: [0, 0, 0], angle: 0.3, penumbra: 0.5, distance: 20, decay: 2, castShadow: false },
      environment: { preset: 'studio', intensity: 0.4, blur: 0.3 },
      fakeGI: { ambientIntensity: 0.6, ambientColor: '#dddddd', hemisphereSkyIntensity: 1.5, hemisphereSkyColor: '#e8e8f0', hemisphereGroundIntensity: 0.4, hemisphereGroundColor: '#888898' },
      exposure: 1.0,
      toneMapping: 'ACESFilmic',
      activePreset: 'studio_portrait',
    },
  },
  cinematic_warm: {
    id: 'cinematic_warm',
    label: '🎬 电影暖调',
    description: '经典好莱坞暖色，高对比',
    state: {
      directional: { intensity: 5.0, color: '#ffcc88', azimuth: 240, elevation: 25, castShadow: true, shadowBias: -0.0003 },
      point: null,
      spot: null,
      environment: { preset: 'warehouse', intensity: 0.25, blur: 0.1 },
      fakeGI: { ambientIntensity: 0.5, ambientColor: '#ffe8cc', hemisphereSkyIntensity: 1.8, hemisphereSkyColor: '#eebb88', hemisphereGroundIntensity: 0.4, hemisphereGroundColor: '#554433' },
      exposure: 0.7,
      toneMapping: 'ACESFilmic',
      activePreset: 'cinematic_warm',
    },
  },
  scifi_blue: {
    id: 'scifi_blue',
    label: '🚀 科幻蓝',
    description: '冷峻科技感，蓝调为主',
    state: {
      directional: { intensity: 2.0, color: '#aaccff', azimuth: 300, elevation: 50, castShadow: true, shadowBias: -0.0002 },
      point: { intensity: 3.0, color: '#4488ff', position: [0, 1, -3], distance: 12, decay: 2, castShadow: false },
      spot: null,
      environment: { preset: 'night', intensity: 0.3, blur: 0.1 },
      fakeGI: { ambientIntensity: 0.4, ambientColor: '#223355', hemisphereSkyIntensity: 1.2, hemisphereSkyColor: '#335577', hemisphereGroundIntensity: 0.2, hemisphereGroundColor: '#112233' },
      exposure: 1.1,
      toneMapping: 'Cineon',
      activePreset: 'scifi_blue',
    },
  },
  horror: {
    id: 'horror',
    label: '🩸 恐怖',
    description: '极暗环境，红色底光，不安感',
    state: {
      directional: { intensity: 0.6, color: '#334455', azimuth: 180, elevation: 5, castShadow: true, shadowBias: -0.0001 },
      point: { intensity: 4.0, color: '#cc2222', position: [0, 0.3, -2], distance: 8, decay: 2, castShadow: true },
      spot: null,
      environment: { preset: 'night', intensity: 0.12, blur: 0.4 },
      fakeGI: { ambientIntensity: 0.2, ambientColor: '#111111', hemisphereSkyIntensity: 0.3, hemisphereSkyColor: '#112222', hemisphereGroundIntensity: 0.05, hemisphereGroundColor: '#000000' },
      exposure: 0.45,
      toneMapping: 'Cineon',
      activePreset: 'horror',
    },
  },
  snowfield: {
    id: 'snowfield',
    label: '❄ 雪原',
    description: '高亮雪地，冷白日光',
    state: {
      directional: { intensity: 6.0, color: '#ffffff', azimuth: 150, elevation: 30, castShadow: true, shadowBias: -0.0002 },
      point: null,
      spot: null,
      environment: { preset: 'dawn', intensity: 0.7, blur: 0.05 },
      fakeGI: { ambientIntensity: 1.5, ambientColor: '#eef4ff', hemisphereSkyIntensity: 3.0, hemisphereSkyColor: '#ddeeff', hemisphereGroundIntensity: 2.0, hemisphereGroundColor: '#ffffff' },
      exposure: 0.9,
      toneMapping: 'ACESFilmic',
      activePreset: 'snowfield',
    },
  },
};

export const DEFAULT_LIGHTING: CinematicLightingState = LIGHTING_PRESETS.golden_hour.state;
