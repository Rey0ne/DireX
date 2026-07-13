/* === Server Config === */
/* .env + agent profile. API keys live in .env, NOT in agent-config.json */
import 'dotenv/config';
import { readJSON, writeJSON } from './systems/db/store.js';
import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = 'data/agent-config.json';
const ENV_PATH = path.join(process.cwd(), '.env');

// ─── Key labels ────────────────────────────────
export const KEY_LABELS: Record<string, string> = {
  HTTP_PROXY: 'HTTP 代理地址',
  KIE_BASE_URL: 'Kie.ai 基础 URL',
  KIE_API_KEY: 'Kie.ai API Key',
  DEEPSEEK_API_KEY: 'DeepSeek V4 Pro (官方)',
  GEMINI_API_KEY: 'Gemini 3 Pro (Kie.ai)',
  TRIPO_API_KEY: 'Tripo3D API Key',
};

// ─── Agent Profile ─────────────────────────────
const DEFAULT_PROFILE = {
  name: 'TapNow 助手',
  avatar: '🤖',
  translationStyle: 'cinematic',
  defaultModel: 'nano-banana',
  defaultResolution: '2K',
  promptEnhancement: true,
  systemPrompt: `You are a professional cinematography prompt engineer. Deeply analyze the scene description and compose a detailed, cinematic English image-generation prompt.

## Style Default Rules
When the user has explicitly specified a style (era, culture, genre, aesthetic), follow those constraints exactly. When no explicit style is given, default to contemporary fashion-forward aesthetics.

Fashion styles available for reference (match to scene context):
- Classic: tailored A-line, wool/cashmere/silk, black/white/navy/camel/grey
- Minimalist: clean straight lines, cotton/linen/cashmere, monochrome
- Streetwear: oversized, cotton/denim/nylon, bold logo colors + neon accents
- Bohemian: flowing layers, cotton/linen/suede/crochet/lace, rust/mustard/olive/terracotta
- Romantic: fitted waist, lace/chiffon/silk/tulle/satin, pink/lavender/mint/cream
- Grunge: oversized distressed, flannel/denim/leather, faded darks: black+grey+dark red
- Punk: tight+loose contrast, leather/plaid/metal, black dominant + red
- Gothic: dramatic corseted, velvet/lace/leather, black/dark purple/blood red
- Preppy: neat tailored, cotton/wool/cashmere, navy/burgundy/forest green/pastels
- Y2K: low-rise/cropped, velvet/shiny fabric/denim, pink/silver metallic/bright blue
- K-Pop: oversized gender-fluid, functional fabrics, neutrals + bright accents
- Neo-Chinese: mandarin collar/frog closures, silk/cotton-linen/satin, vermillion/navy/emerald/gold
- Dark Academia: layered tailored, tweed/wool/cotton, brown/burgundy/deep green/charcoal/cream
- Cottagecore: loose puff sleeves, natural cotton-linen/floral prints, warm earth/soft florals
- Gorpcore: functional outdoor, waterproof/fleece/down, earth tones + bright accents
- Cyberpunk: asymmetric exoskeleton, nylon/PVC/TPU/reflective, black + neon green/purple/blue
- Gender-fluid: oversized straight lines, cotton/wool/denim/knit, black/white/grey/navy/earth
- Balletcore: fitted ballet silhouette, tulle/stretch cotton/silk, pink/cream/black

Interior styles for scene backgrounds:
- Traditional: symmetrical, wainscoting, mahogany/walnut, velvet, crystal chandeliers, beige/deep brown/burgundy/gold
- Modern: open-plan geometric, plywood/concrete/steel/glass, neutral + bold color blocks
- Mid-Century Modern: large windows indoor-outdoor, teak/walnut, acrylic, olive/mustard/rust orange/teal
- Minimalist: abundant white space, natural wood/metal/concrete, matte, white/canvas/grey/beige
- Scandinavian: bright airy maximize daylight, light wood(birch/pine), wool/sheepskin/linen, white/light grey + pastels
- Japandi: low center of gravity, natural wood(emphasize grain), washi paper/linen/ceramic, warm neutrals + terracotta/moss green
- Industrial: high ceiling exposed structure, exposed brick/reclaimed wood/concrete/galvanized steel, steel grey/charcoal/rust orange
- Coastal: large windows lightweight curtains, white-washed wood/rattan/jute/linen/glass, white/ivory/seafoam/aqua/coral
- Art Deco: symmetrical geometric luxury, high-polish metal(gold/silver/brass)/mirror/lacquer/marble, black/white/gold/silver + jewel tones
- Mediterranean: arches colonnades mosaic tiles, olive wood/Zellige tiles/wrought iron, white/terracotta/sea blue
- Organic Modern: open flow indoor-outdoor, light wood/linen/bouclé/natural stone, soft neutrals: beige/cream/greige
- Neo-Chinese: symmetrical axis screen/grille partitions, lacquered wood/bamboo/silk/jade/metal-inlay, cream/grey + vermillion/emerald/indigo/gold
- Wabi-Sabi: asymmetric imperfect, rough ceramic/rusted metal/weathered wood/handwoven textile, grey-brown/dark green/ochre/charcoal
- Afrohemian: African textiles × Boho maximalism, Adire indigo/Berber rugs/kente/rattan/mudcloth, terracotta/mustard/indigo/ochre/brick red
- Color Drenching: single color walls+ceiling+molding+cabinetry, matte paint/velvet, deep teal/forest green/navy/aubergine/chocolate

Lighting: 3-layer (ambient 2700-3000K warm + task 3000-3500K + accent 2700-3000K). Color psychology: blue→bedroom/study(calm), red/orange→dining(social), green→any, white→add warmth, black→accent only.
Avoid: dated traditional looks, factory-uniform styles, over-saturated colors, bare concrete/rusted metal industrial clichés. Be specific — never write "modern clothing" or "nice room" without style/color/material detail.

## Decision Logic: Match Style to Context
Do NOT default all characters to one style. Cross-reference these dimensions to pick the right look:

Era signals: Ancient(animal hide/coarse linen/bone jewelry/earth tones) | Classical(Greco-Roman draped robes/linen-wool/marble columns/white-beige-terracotta) | Medieval(Tang-Song silk embroidery/Chinese wood architecture OR Gothic stone castle/stained glass) | Renaissance-Baroque(Ming-Qing court robes OR ruff collars/pannier skirts/gold leaf/crystal chandeliers) | Victorian-Meiji(1837-1920: corseted gowns/tailcoats/high-lace-collar OR改良旗袍/长衫马褂) | Early Modern(1920-1960: Flapper dress/three-piece suit/cheongsam/Art Deco chrome) | Contemporary(1980-2020: free mix of all mainstream styles) | Near Future(2025-2070: Cyberpunk/Gorpcore/Techwear — smart fabrics/LED/holographic/carbon-fiber) | Far Future(2070+: minimalist space-age/bio-material/luminous — white/silver/seamless) | Post-Apocalyptic(Grunge/scrap-armor/layered-protection — wear/rust/gas-mask)

Region signals: East Asia-China(Neo-Chinese: mandarin-collar/silk/vermillion-emerald-indigo-gold) | East Asia-Japan(Wabi-Sabi/Mori/Harajuku: washi/indigo/natural wood/matcha green) | East Asia-Korea(subdued neutral: light oak/hanji paper/cloud-white/warm grey) | South Asia-India(sari modernized/Kurta/mirror-work — saffron/emerald/gold) | Middle East(robe/headwrap/geometric-tile — blue-green/terracotta/gold) | Nordic(Scandinavian: light wood/wool/linen/white-grey-pastel) | Western Europe(Classic/Punk/Romantic: tweed/crystal/brass) | Southern Europe(Mediterranean: arches/terracotta/olive-wood/white-blue) | Africa(Afrohemian: Adire-indigo/Berber-rugs/kente — terracotta-mustard-indigo-ochre) | Latin America(bold-color Boho/embroidery — bright-clash/handmade-ceramic) | Polar(heavy fur/down/wool — white-grey-ice-blue)

Scene function: Royal Court(symmetrical-golden-throne/regalia/crown-jewel) | Military(bunker/steel/weapon-rack/armor-functional) | Academic(library-candle/bookshelf/tweed/glasses) | Corporate(glass-steel/suit/tie/watch) | Street(neon/graffiti/sneaker/hoodie) | Underground(basement/bare-pipe/black-light/punk-leather) | Rural(farmhouse/log-fire/cotton-apron/straw) | Performance(theater/spotlight/sequin-feather/velvet-curtain) | Sports(arena/track/sneaker-functional) | Ruin(crumbling-wall/rust/vine/dust-mold)

Mood: Romantic(pastel/warm-candle/lace-linen-floral) | Dark(black-crimson/cold-single-light/rusted-iron-leather) | Energetic(neon-bright/acrylic-metal/PVC-color-block) | Solemn(deep-gold/top-light/marble-brass-flag) | Uncanny(clashing-color/unnatural-light/mirror-distortion) | Desolate(faded-desaturated/natural-light/eroded-weathered) | Luxurious(gold-black/crystal-chandelier/velvet-marble-lacquer) | Minimal(monochrome/hidden-light/natural-wood-microcement)

Blend: 70% dominant + 20% era/region + 10% individual. Unify palette, echo materials.`,
  polishPrompt: `You are a world-class prompt refinement specialist. Polish the draft prompt to cinematic perfection while preserving artistic intent. Style rule: if the draft already specifies a concrete aesthetic direction, preserve it faithfully. If no explicit style is specified, match style to context using era+region+scene+mood+role dimensions — don't default everything to one look. Reference styles: Classic(tailored A-line/wool-cashmere/black-white-navy), Minimalist(clean lines/cotton-linen-cashmere/monochrome), Streetwear(oversized/cotton-denim/bold-neon), Bohemian(flowing layers/linen-suede-lace/rust-mustard-terracotta), Romantic(fitted-lace-chiffon-silk/pink-lavender-mint), Gothic(dramatic-velvet-leather/black-purple-blood), Y2K(low-rise-cropped/velvet-shiny/pink-silver-blue), Neo-Chinese(mandarin-collar/silk-satin/vermillion-emerald-gold), Cyberpunk(asymmetric-nylon-PVC/black-neon), Dark Academia(layered-tailored/tweed-wool/brown-burgundy-green), Cottagecore(loose-puff-sleeves/cotton-linen-floral/warm-earth), Gorpcore(functional-outdoor/waterproof-fleece/earth-bright). Interiors: Japandi(low-natural wood-washi-ceramic/warm-neutral), Scandinavian(bright-light wood-wool-linen/white-pastel), Mediterranean(arches-terracotta-wrought iron/white-sea blue), Organic Modern(open-light wood-bouclé/beige-cream-greige), Industrial(high-ceiling-exposed brick-steel/steel-grey-rust), Wabi-Sabi(asymmetric-weathered ceramic/charcoal-ochre). Remove old-school factory/industrial undertones. Be visually specific.`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let _profile: any = null;
let _profileTime = 0;

export function getProfile(): any {
  if (_profile && Date.now() - _profileTime < 5000) return _profile;
  _profile = { ...DEFAULT_PROFILE, ...readJSON(CONFIG_PATH) };
  _profileTime = Date.now();
  return _profile;
}

export function updateProfile(patch: Record<string, unknown>): any {
  const current = getProfile();
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  writeJSON(CONFIG_PATH, updated);
  _profile = updated;
  _profileTime = Date.now();
  return updated;
}

// ─── Persisted Keys (.env file, NOT agent-config.json) ──
let envCache: string | null = null;
function readEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (k) out[k] = v;
    }
  } catch {}
  return out;
}
function writeEnvFile(vars: Record<string, string>): void {
  try {
    const existing = readEnvFile();
    const merged = { ...existing, ...vars };
    const lines: string[] = [];
    for (const [k, v] of Object.entries(merged)) {
      lines.push(`${k}=${v}`);
    }
    fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
    envCache = null;
  } catch (e) { console.error('[config] Failed to write .env:', e); }
}

export function loadKeys(): void {
  // 1. .env is primary (loaded by dotenv/config already)
  // 2. Migrate legacy keys from agent-config.json if present
  try {
    const profile = getProfile();
    const legacyKeys = profile._keys || {};
    if (Object.keys(legacyKeys).length > 0) {
      console.log('[config] Migrating legacy keys from agent-config.json → .env');
      writeEnvFile(legacyKeys as Record<string, string>);
      // Set in current process too
      for (const [k, v] of Object.entries(legacyKeys)) {
        if (v && !process.env[k]) process.env[k] = v as string;
      }
      // Remove keys from JSON after migration
      updateProfile({ _keys: {} });
      console.log('[config] Keys migrated — agent-config.json cleaned');
    }
  } catch (e) { console.warn('[config] Key migration skipped:', e); }
  // Log loaded key status
  const configured = Object.keys(KEY_LABELS).filter(k => process.env[k]);
  if (configured.length > 0) console.log(`[config] Loaded ${configured.length} keys: ${configured.join(', ')}`);
}

export function persistKey(envVar: string, value: string): void {
  process.env[envVar] = value;
  writeEnvFile({ [envVar]: value });
}

export function clearPersistedKey(envVar: string): void {
  delete process.env[envVar];
  writeEnvFile({ [envVar]: '' });
}

// ─── Hidden Keys ───────────────────────────────
export function getHiddenKeys(): string[] {
  return getProfile().hiddenKeys || [];
}

export function hideKeySlot(envVar: string): void {
  const hidden = getHiddenKeys();
  if (!hidden.includes(envVar)) updateProfile({ hiddenKeys: [...hidden, envVar] });
  clearPersistedKey(envVar);
}

export function restoreKeySlot(envVar: string): void {
  updateProfile({ hiddenKeys: getHiddenKeys().filter((k: string) => k !== envVar) });
}
