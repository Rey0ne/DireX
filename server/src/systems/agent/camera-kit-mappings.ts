/* === Camera Kit → Visual Description Mappings === *
 * Shared across /api/agent/generate, /api/agent/visual-extract,
 * and compiler.ts.  Single source of truth — no duplication.
 */

// ── Camera Visual Descriptions ──────────────────
// AI models don't know brand names → describe visual character

export const CAMERA_VISUAL: Record<string, string> = {
  'Sony Venice': 'Sony Venice full-frame digital cinema: clean modern digital look, high dynamic range, crisp detail, neutral color science',
  'Arri Alexa 35': 'Arri Alexa 35 Super 35 digital cinema: warm organic filmic look, soft highlight rolloff, cinematic skin tones, rich shadow detail',
  'Arri Alexa 65': 'Arri Alexa 65 large-format digital cinema: ultra-shallow depth of field, epic wide perspective, rich texture, fine detail',
  'RED V-Raptor': 'RED V-Raptor digital cinema: crisp high-resolution digital, clean shadows, modern clinical sharpness, high detail',
  'Panavision DXL2': 'Panavision DXL2 large-format digital cinema: 8K VistaVision sensor, rich Panavision color science, smooth highlight handling, cinematic dynamic range, modular lightweight body',
  'ArriCam LT': 'ArriCam LT 35mm film camera: classic Arri mechanical precision, authentic film gate texture, organic celluloid grain, compact shoulder-mount form factor',
  'ArriFlex 435': 'ArriFlex 435 35mm film camera: authentic celluloid film texture, organic grain structure, classic cinema feel, soft highlight bloom',
  'IMAX Film Camera': 'IMAX 70mm film camera: massive large-format film, ultra-high resolution, immersive epic scale, fine grain, expansive field of view',
};

// ── Lens Visual Descriptions ─────────────────────

export const LENS_VISUAL: Record<string, string> = {
  'Zeiss Ultra Prime': 'Zeiss Ultra Prime: sharp clean contrast, neutral color rendition, crisp modern rendering, high resolution',
  'Arri Signature': 'Arri Signature: smooth creamy bokeh, warm gentle focus rolloff, organic depth, cinematic softness, flattering falloff',
  'Canon K-35': 'Canon K-35 vintage: soft dreamy glow, warm amber tint, creamy bokeh, nostalgic 1970s film character, gentle halation',
  'Cooke S4': 'Cooke S4: classic Cooke Look — warm gentle contrast, smooth round bokeh, subtle edge softness, flattering skin tones, organic dimensionality, Hollywood standard',
  'Cooke Panchro': 'Cooke Panchro/i Classic: vintage Series II/III formula — low contrast, warm amber flare, subtle field curvature, soft glow wide open, 1920s-50s character in modern housing',
  'Cooke SF 1.8x': 'Cooke S-F 1.8x anamorphic: smooth oval bokeh, warm subtle blue horizontal flares, organic 3D dimensionality, gentle focus falloff, Cooke Look × anamorphic compression',
  'Panavision C-series': 'Panavision C-series anamorphic: iconic vintage anamorphic — strong horizontal blue streak flares, pronounced oval bokeh, warm golden cast, organic barrel distortion, 1970s Hollywood widescreen character',
  'Panavision Primo': 'Panavision Primo: classic Hollywood look, rich warm tones, smooth contrast, flattering skin rendition, elegant rendering',
  'Helios 44-2': 'Helios 44-2 vintage Soviet: legendary swirly petzval bokeh, soft center with wild edge distortion, warm yellow-green cast, low contrast, dreamy uncoated vintage character',
  'Hawk Class X': 'Hawk Class X anamorphic: horizontal blue streak flares, oval bokeh, wide cinematic 2.39:1 widescreen character, vintage anamorphic feel',
};

// ── Film Stock Color Grade Descriptions ──────────

export const FILM_VISUAL: Record<string, string> = {
  'Kodak 2383': 'Kodak 2383 color grade: warm cinematic amber-gold highlights, rich teal-shadow contrast, classic Hollywood print film saturation, subtle film grain',
  'Kodak 250D': 'Kodak 250D color grade: soft natural daylight tones, gentle warm bias, low contrast pastel-like rolloff, smooth skin tones, airy atmosphere',
  'Kodak 500T': 'Kodak 500T color grade: cool tungsten blue-green cast, moody cyan shadows, muted saturation, cinematic night interior look, fine grain',
  'Ektachrome': 'Ektachrome color grade: punchy blue-green saturation, crisp contrast, cool vivid color reversal slide film look, deep teal skies, clean whites',
  'Fuji Eterna': 'Fuji Eterna color grade: cool fresh Japanese cinema tone, subtle green-cyan bias, low contrast milky blacks, soft pastel color rendition, calm atmosphere',
  'Fuji Velvia': 'Fuji Velvia color grade: extreme high saturation landscape film, deep reds and vibrant greens, heavy color contrast, golden warmth, vivid hyper-real pop',
  'Technicolor': 'Technicolor 3-strip color grade: rich saturated primaries, distinct red/teal separation, golden skin tones, deep blacks, vintage Hollywood spectacle look',
  'Bleach Bypass': 'Bleach Bypass color grade: silver retention high contrast, heavily desaturated near-monochrome, metallic gritty texture, crushed blacks, blown highlights, gritty raw aesthetic',
  'B&W Acros': 'B&W Acros monochrome: deep rich blacks, smooth broad tonal range, fine grain, classic black and white film texture, timeless contrast, no color',
};

// ── Aperture Visual Descriptions ─────────────────

export const APERTURE_VISUAL: Record<string, string> = {
  'f/1.4': 'f/1.4 wide-open aperture: extremely shallow depth of field, strong background blur, smooth bokeh, dreamy separation, subject isolation',
  'f/4': 'f/4 moderate aperture: balanced depth of field, gentle background separation, sharp overall image, natural look',
  'f/11': 'f/11 deep aperture: deep focus, everything in focus from foreground to background, sharp detail throughout, landscape-style clarity',
};

// ── Helper ───────────────────────────────────────

/** Build the camBlock string prepended to compiled prompts. */
export function buildCamBlock(params: {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  filmStock?: string;
}): string {
  const { camera, lens, focalLength, aperture, filmStock } = params;
  if (!camera && !lens && !focalLength && !aperture && !filmStock) return '';

  const parts: string[] = [];
  if (camera) parts.push(`Camera: ${CAMERA_VISUAL[camera] || camera}`);
  if (lens) parts.push(`Lens: ${LENS_VISUAL[lens] || lens}`);
  if (focalLength) parts.push(`Focal length: ${focalLength}`);
  if (aperture) parts.push(`Aperture: ${aperture}`);
  if (filmStock) parts.push(`Film Stock: ${FILM_VISUAL[filmStock] || filmStock}`);

  return '[' + parts.join(', ') + '] ';
}
