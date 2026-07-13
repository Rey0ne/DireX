/* === QMemory — Four-Layer Memory System === */
import { v4 as uuid } from 'uuid';
import { readJSON, writeJSON } from '../db/store.js';

// ── Types ────────────────────────────────────────

export type EpisodicType =
  | 'pipeline_run' | 'generation' | 'deviation_found' | 'deviation_resolved'
  | 'user_action' | 'cognitive_cycle' | 'autofix_attempt' | 'system_event';

export type SemanticType =
  | 'user_preference' | 'project_pattern' | 'quality_heuristic'
  | 'fix_strategy' | 'style_rule' | 'workflow_learning';

export type ReflectiveType = 'pattern' | 'lesson' | 'principle' | 'anti_pattern';

export interface QEpisodicEntry {
  id: string;
  timestamp: string;
  type: EpisodicType;
  content: string;
  detail: Record<string, unknown>;
  importance: number;       // 0-1, drives pruning priority
  tags: string[];
  relatedIds: string[];
  consolidated: boolean;    // already distilled into semantic?
}

export interface QSemanticEntry {
  id: string;
  type: SemanticType;
  fact: string;
  confidence: number;       // 0-1, increases with reinforcement
  evidence: string[];       // episodic IDs that support this
  tags: string[];
  lastReinforced: string;
  consolidated: boolean;    // already distilled into reflective?
}

export interface QReflectiveEntry {
  id: string;
  type: ReflectiveType;
  insight: string;
  derivedFrom: string[];    // semantic IDs this came from
  strength: number;         // 0-1
  createdAt: string;
}

export interface RecallResult {
  layer: 'working' | 'episodic' | 'semantic' | 'reflective';
  entry: QEpisodicEntry | QSemanticEntry | QReflectiveEntry | WorkingMemoryEntry;
  score: number;            // relevance score
}

export interface WorkingMemoryEntry {
  id: string;
  timestamp: string;
  content: string;
  context: Record<string, unknown>;
}

// ── Importance Scores by Event Type ──────────────

const IMPORTANCE_BASE: Record<string, number> = {
  deviation_found: 0.9,      // VIOLATION
  deviation_found_minor: 0.6,// DEVIATION
  deviation_found_trivial: 0.2, // DISCREPANCY
  pipeline_failed: 0.8,
  user_action: 0.7,
  autofix_success: 0.7,
  autofix_failed: 0.6,
  cognitive_cycle: 0.5,
  deviation_resolved: 0.5,
  pipeline_success: 0.3,
  generation: 0.3,
  system_event: 0.1,
};

// ── File Paths ───────────────────────────────────

const EPISODIC_FILE = 'q-memory-episodic.json';
const SEMANTIC_FILE = 'q-memory-semantic.json';
const REFLECTIVE_FILE = 'q-memory-reflective.json';

const MAX_WORKING = 50;
const MAX_EPISODIC = 2000;
const RECENCY_HALF_LIFE_DAYS = 7;
const CONSOLIDATE_THRESHOLD = 50;   // unconsolidated episodic entries before triggering
const REFLECT_THRESHOLD = 20;       // unconsolidated semantic entries before triggering

// ── Memory Store ─────────────────────────────────

class QMemoryStore {
  // Layer 0: Working Memory (in-memory, session-scoped)
  private working: Map<string, WorkingMemoryEntry> = new Map();
  private workingOrder: string[] = [];  // LRU order (front = most recent)

  // Layer 1: Episodic Memory (loaded from disk, cached in memory)
  private episodic: QEpisodicEntry[] = [];
  private episodicLoaded = false;
  private unconsolidatedEpisodic = 0;

  // Layer 2: Semantic Memory
  private semantic: QSemanticEntry[] = [];
  private semanticLoaded = false;
  private unconsolidatedSemantic = 0;

  // Layer 3: Reflective Memory
  private reflective: QReflectiveEntry[] = [];
  private reflectiveLoaded = false;

  // Consolidation state
  private consolidating = false;
  private reflecting = false;

  // LLM function for consolidation (set externally during server init)
  private llmForConsolidation: ((systemPrompt: string, userPrompt: string) => Promise<string | null>) | null = null;

  setConsolidationLLM(fn: (systemPrompt: string, userPrompt: string) => Promise<string | null>): void {
    this.llmForConsolidation = fn;
  }

  // ── Layer 0: Working Memory ────────────────

  workingAdd(content: string, context: Record<string, unknown> = {}): string {
    const id = uuid();
    const entry: WorkingMemoryEntry = { id, timestamp: new Date().toISOString(), content, context };
    this.working.set(id, entry);
    this.workingOrder.unshift(id); // front = newest

    // LRU eviction
    while (this.workingOrder.length > MAX_WORKING) {
      const evict = this.workingOrder.pop()!;
      this.working.delete(evict);
    }
    return id;
  }

  workingGet(id: string): WorkingMemoryEntry | undefined {
    return this.working.get(id);
  }

  workingSearch(query: string): RecallResult[] {
    const q = query.toLowerCase();
    const results: RecallResult[] = [];
    for (const id of this.workingOrder) {
      const entry = this.working.get(id)!;
      const score = this._textScore(entry.content, q) + this._contextScore(entry.context, q);
      if (score > 0) {
        results.push({ layer: 'working', entry, score: Math.min(score, 1) });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  // ── Layer 1: Episodic Memory ───────────────

  private _loadEpisodic(): void {
    if (this.episodicLoaded) return;
    const data = readJSON(EPISODIC_FILE);
    this.episodic = (data.entries || []) as QEpisodicEntry[];
    this.unconsolidatedEpisodic = this.episodic.filter(e => !e.consolidated).length;
    this.episodicLoaded = true;
  }

  private _saveEpisodic(): void {
    writeJSON(EPISODIC_FILE, { entries: this.episodic, updatedAt: new Date().toISOString() });
  }

  episodicAdd(
    type: EpisodicType,
    content: string,
    detail: Record<string, unknown> = {},
    tags: string[] = [],
    relatedIds: string[] = [],
  ): QEpisodicEntry {
    this._loadEpisodic();

    // Calculate importance
    let importance = IMPORTANCE_BASE[type] || 0.1;
    // Fine-tune by severity in detail
    if (detail.severity === 'VIOLATION') importance = 0.9;
    else if (detail.severity === 'DEVIATION') importance = 0.6;
    else if (detail.severity === 'DISCREPANCY') importance = 0.2;
    // Pipeline status
    if (detail.status === 'failed') importance = Math.max(importance, 0.8);
    else if (detail.status === 'succeeded') importance = Math.max(importance, 0.3);

    const entry: QEpisodicEntry = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      type,
      content,
      detail,
      importance,
      tags,
      relatedIds,
      consolidated: false,
    };

    this.episodic.push(entry);
    this.unconsolidatedEpisodic++;

    // Auto-prune if over limit
    if (this.episodic.length > MAX_EPISODIC) {
      this._pruneEpisodic();
    }

    this._saveEpisodic();

    // Check if consolidation should trigger
    if (this.unconsolidatedEpisodic >= CONSOLIDATE_THRESHOLD && !this.consolidating) {
      const llmFn = this.llmForConsolidation
        ? async (sp: string, up: string) => {
            const result = await this.llmForConsolidation!(sp, up);
            return result || '';
          }
        : undefined;
      this.consolidate(llmFn).catch(() => {/* fire-and-forget */});
    }

    return entry;
  }

  episodicGet(id: string): QEpisodicEntry | undefined {
    this._loadEpisodic();
    return this.episodic.find(e => e.id === id);
  }

  episodicSearch(query: string, limit = 20): RecallResult[] {
    this._loadEpisodic();
    const q = query.toLowerCase();
    const results: RecallResult[] = [];

    for (const entry of this.episodic) {
      let score = this._textScore(entry.content, q) * 0.5;
      // Tag match bonus
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(q) || q.includes(tag.toLowerCase())) {
          score += 0.3;
        }
      }
      // Recency bonus (exponential decay, half-life = 7 days)
      const ageMs = Date.now() - new Date(entry.timestamp).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyBonus = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS) * 0.2;
      score += recencyBonus;

      if (score > 0.05) {
        results.push({ layer: 'episodic', entry, score: Math.min(score, 1) });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private _pruneEpisodic(): void {
    // Score each entry: importance * recency
    const now = Date.now();
    const scored = this.episodic.map(e => {
      const ageDays = (now - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const recency = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
      const consolidationBonus = e.consolidated ? 0.05 : 0; // slight bias to keep unconsolidated
      return { entry: e, score: e.importance * 0.7 + recency * 0.25 + consolidationBonus };
    });

    scored.sort((a, b) => b.score - a.score);
    this.episodic = scored.slice(0, MAX_EPISODIC).map(s => s.entry);
  }

  // ── Layer 2: Semantic Memory ─────────────────

  private _loadSemantic(): void {
    if (this.semanticLoaded) return;
    const data = readJSON(SEMANTIC_FILE);
    this.semantic = (data.entries || []) as QSemanticEntry[];
    this.unconsolidatedSemantic = this.semantic.filter(e => !e.consolidated).length;
    this.semanticLoaded = true;
  }

  private _saveSemantic(): void {
    writeJSON(SEMANTIC_FILE, { entries: this.semantic, updatedAt: new Date().toISOString() });
  }

  semanticAdd(
    type: SemanticType,
    fact: string,
    evidence: string[],
    tags: string[] = [],
    confidence = 0.5,
  ): QSemanticEntry {
    this._loadSemantic();

    // Check if a similar fact already exists (reinforce instead of duplicate)
    const existing = this.semantic.find(s =>
      s.type === type && this._textScore(s.fact, fact.toLowerCase()) > 0.6,
    );
    if (existing) {
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.evidence = [...new Set([...existing.evidence, ...evidence])];
      existing.lastReinforced = new Date().toISOString();
      existing.tags = [...new Set([...existing.tags, ...tags])];
      this._saveSemantic();
      return existing;
    }

    const entry: QSemanticEntry = {
      id: uuid(),
      type,
      fact,
      confidence,
      evidence,
      tags,
      lastReinforced: new Date().toISOString(),
      consolidated: false,
    };

    this.semantic.push(entry);
    this.unconsolidatedSemantic++;
    this._saveSemantic();

    // Check if reflection should trigger
    if (this.unconsolidatedSemantic >= REFLECT_THRESHOLD && !this.reflecting) {
      const llmFn = this.llmForConsolidation
        ? async (sp: string, up: string) => {
            const result = await this.llmForConsolidation!(sp, up);
            return result || '';
          }
        : undefined;
      this.reflect(llmFn).catch(() => {/* fire-and-forget */});
    }

    return entry;
  }

  semanticSearch(query: string, limit = 10): RecallResult[] {
    this._loadSemantic();
    const q = query.toLowerCase();
    const results: RecallResult[] = [];

    for (const entry of this.semantic) {
      let score = this._textScore(entry.fact, q) * entry.confidence;
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(q) || q.includes(tag.toLowerCase())) {
          score += 0.2;
        }
      }
      if (score > 0.05) {
        results.push({ layer: 'semantic', entry, score: Math.min(score, 1) });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  semanticAll(): QSemanticEntry[] {
    this._loadSemantic();
    return [...this.semantic];
  }

  // ── Layer 3: Reflective Memory ──────────────

  private _loadReflective(): void {
    if (this.reflectiveLoaded) return;
    const data = readJSON(REFLECTIVE_FILE);
    this.reflective = (data.entries || []) as QReflectiveEntry[];
    this.reflectiveLoaded = true;
  }

  private _saveReflective(): void {
    writeJSON(REFLECTIVE_FILE, { entries: this.reflective, updatedAt: new Date().toISOString() });
  }

  reflectiveAdd(
    type: ReflectiveType,
    insight: string,
    derivedFrom: string[],
    strength = 0.5,
  ): QReflectiveEntry {
    this._loadReflective();

    // Avoid near-duplicate insights
    const existing = this.reflective.find(r =>
      this._textScore(r.insight, insight.toLowerCase()) > 0.7,
    );
    if (existing) {
      existing.strength = Math.min(1, existing.strength + 0.1);
      existing.derivedFrom = [...new Set([...existing.derivedFrom, ...derivedFrom])];
      this._saveReflective();
      return existing;
    }

    const entry: QReflectiveEntry = {
      id: uuid(),
      type,
      insight,
      derivedFrom,
      strength,
      createdAt: new Date().toISOString(),
    };

    this.reflective.push(entry);
    this._saveReflective();
    return entry;
  }

  reflectiveAll(): QReflectiveEntry[] {
    this._loadReflective();
    return [...this.reflective];
  }

  // ── Cross-layer Recall ─────────────────────

  recall(query: string, context: Record<string, unknown> = {}): RecallResult[] {
    const allResults: RecallResult[] = [];

    // Layer 0: Working memory
    allResults.push(...this.workingSearch(query));

    // Layer 1: Episodic
    allResults.push(...this.episodicSearch(query, 20));

    // Layer 2: Semantic
    allResults.push(...this.semanticSearch(query, 10));

    // Layer 3: Reflective (always included, lower weight for high-level insights)
    this._loadReflective();
    const q = query.toLowerCase();
    for (const entry of this.reflective) {
      const score = this._textScore(entry.insight, q) * entry.strength * 0.8;
      if (score > 0.05) {
        allResults.push({ layer: 'reflective', entry, score: Math.min(score, 1) });
      }
    }

    return allResults.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  // ── Consolidation: Episodic → Semantic ─────

  async consolidate(llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>): Promise<QSemanticEntry[]> {
    if (this.consolidating) return [];
    this.consolidating = true;

    try {
      this._loadEpisodic();
      this._loadSemantic();

      const unconsolidated = this.episodic.filter(e => !e.consolidated);
      if (unconsolidated.length < 5) return [];  // not enough to distill

      // Take the highest-importance unconsolidated entries (max 30)
      const batch = unconsolidated
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 30);

      if (!llmChat) {
        // Rule-based consolidation: simple pattern extraction
        return this._ruleBasedConsolidate(batch);
      }

      // LLM-based consolidation
      const episodicText = batch.map(e =>
        `[${e.type}] ${e.content} (importance: ${e.importance.toFixed(2)}, tags: ${e.tags.join(', ')})`
      ).join('\n');

      const systemPrompt = `You are 小Q's memory consolidation module. Your ONLY job is to read raw episodic memories and distill them into concise semantic facts.

Output ONLY valid JSON array of objects. Each object must have:
- "type": one of "user_preference", "project_pattern", "quality_heuristic", "fix_strategy", "style_rule", "workflow_learning"
- "fact": a single, specific, natural language statement of what was learned
- "tags": array of 1-3 keyword tags
- "confidence": number 0.5-0.9 (how certain you are based on the evidence)

Rules:
- ONE fact per object. If there are 3 distinct learnings, output 3 objects.
- Be specific, not generic. "User prefers warm tungsten lighting over cool fluorescent" not "user likes warm tones".
- If the batch has no clear pattern, output empty array [].
- Do NOT invent facts not supported by the episodic entries.
- Limit to 5 facts maximum.`;

      const response = await llmChat(systemPrompt, episodicText);
      const parsed = this._parseLLMJson(response);
      const newSemantic: QSemanticEntry[] = [];

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.fact && item.type) {
            const entry = this.semanticAdd(
              item.type as SemanticType,
              item.fact,
              batch.map(e => e.id),
              item.tags || [],
              item.confidence || 0.5,
            );
            newSemantic.push(entry);
          }
        }
      }

      // Mark episodic entries as consolidated
      for (const e of batch) {
        e.consolidated = true;
      }
      this.unconsolidatedEpisodic = this.episodic.filter(e => !e.consolidated).length;
      this._saveEpisodic();

      return newSemantic;
    } finally {
      this.consolidating = false;
    }
  }

  private _ruleBasedConsolidate(batch: QEpisodicEntry[]): QSemanticEntry[] {
    const newEntries: QSemanticEntry[] = [];

    // Pattern 1: Repeated failures on same shot number → quality_heuristic
    const failedByShot = new Map<number, QEpisodicEntry[]>();
    for (const e of batch) {
      const shot = e.detail.shotNumber as number;
      if (shot && (e.type === 'deviation_found' || e.type === 'autofix_attempt')) {
        if (!failedByShot.has(shot)) failedByShot.set(shot, []);
        failedByShot.get(shot)!.push(e);
      }
    }
    for (const [shot, entries] of failedByShot) {
      if (entries.length >= 2) {
        newEntries.push(this.semanticAdd(
          'quality_heuristic',
          `Shot ${shot} has repeated quality issues — consider adjusting the shot specification or splitting into simpler shots`,
          entries.map(e => e.id),
          [`shot-${shot}`, 'quality', 'repeat-issue'],
          0.6,
        ));
      }
    }

    // Pattern 2: Deviation categories
    const devCategories = new Map<string, QEpisodicEntry[]>();
    for (const e of batch) {
      const cat = e.detail.category as string;
      if (cat && e.type === 'deviation_found') {
        if (!devCategories.has(cat)) devCategories.set(cat, []);
        devCategories.get(cat)!.push(e);
      }
    }
    for (const [cat, entries] of devCategories) {
      if (entries.length >= 3) {
        newEntries.push(this.semanticAdd(
          'project_pattern',
          `Common deviation type: ${cat} — occurred ${entries.length} times across shots`,
          entries.map(e => e.id),
          [cat, 'deviation-pattern'],
          0.7,
        ));
      }
    }

    // Mark batch as consolidated
    for (const e of batch) {
      e.consolidated = true;
    }
    this.unconsolidatedEpisodic = this.episodic.filter(e => !e.consolidated).length;
    this._saveEpisodic();

    return newEntries;
  }

  // ── Reflection: Semantic → Reflective ──────

  async reflect(llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>): Promise<QReflectiveEntry[]> {
    if (this.reflecting) return [];
    this.reflecting = true;

    try {
      this._loadSemantic();
      this._loadReflective();

      const unconsolidated = this.semantic.filter(s => !s.consolidated);
      if (unconsolidated.length < 3) return [];

      if (!llmChat) {
        return [];
      }

      const semanticText = unconsolidated
        .sort((a, b) => b.confidence - a.confidence)
        .map(s => `[${s.type}] ${s.fact} (confidence: ${s.confidence.toFixed(2)})`)
        .join('\n');

      const systemPrompt = `You are 小Q's reflective memory module. You review learned semantic facts and produce deeper meta-insights.

Output ONLY valid JSON array of objects. Each object must have:
- "type": one of "pattern", "lesson", "principle", "anti_pattern"
- "insight": a deeper observation that connects multiple facts into one insight
- "strength": number 0.3-0.8

Rules:
- Connect MULTIPLE facts into ONE insight. Don't restate individual facts.
- Anti-patterns: things to avoid
- Principles: rules of thumb that apply across projects
- Lessons: things learned the hard way
- Limit to 3 insights maximum.
- If the semantic facts don't connect into any deeper insight, output empty array [].`;

      const response = await llmChat(systemPrompt, semanticText);
      const parsed = this._parseLLMJson(response);
      const newReflective: QReflectiveEntry[] = [];

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.insight && item.type) {
            const entry = this.reflectiveAdd(
              item.type as ReflectiveType,
              item.insight,
              unconsolidated.map(s => s.id),
              item.strength || 0.5,
            );
            newReflective.push(entry);
          }
        }
      }

      // Mark semantic entries as consolidated
      for (const s of unconsolidated) {
        s.consolidated = true;
      }
      this.unconsolidatedSemantic = this.semantic.filter(s => !s.consolidated).length;
      this._saveSemantic();

      return newReflective;
    } finally {
      this.reflecting = false;
    }
  }

  // ── Forget ────────────────────────────────

  forget(id: string): boolean {
    this._loadEpisodic();
    this._loadSemantic();
    this._loadReflective();

    // Check episodic
    const epIdx = this.episodic.findIndex(e => e.id === id);
    if (epIdx >= 0) {
      this.episodic.splice(epIdx, 1);
      this._saveEpisodic();
      return true;
    }

    // Check semantic
    const semIdx = this.semantic.findIndex(s => s.id === id);
    if (semIdx >= 0) {
      this.semantic.splice(semIdx, 1);
      this._saveSemantic();
      return true;
    }

    // Check reflective
    const refIdx = this.reflective.findIndex(r => r.id === id);
    if (refIdx >= 0) {
      this.reflective.splice(refIdx, 1);
      this._saveReflective();
      return true;
    }

    return false;
  }

  // ── Stats ─────────────────────────────────

  stats() {
    this._loadEpisodic();
    this._loadSemantic();
    this._loadReflective();
    return {
      working: this.workingOrder.length,
      episodic: { total: this.episodic.length, unconsolidated: this.unconsolidatedEpisodic },
      semantic: { total: this.semantic.length, unconsolidated: this.unconsolidatedSemantic },
      reflective: this.reflective.length,
    };
  }

  // ── Helpers ───────────────────────────────

  private _textScore(text: string, query: string): number {
    const tl = text.toLowerCase();
    // Exact phrase match
    if (tl.includes(query)) return 0.8;
    // Word-level overlap
    const queryWords = query.split(/\s+/).filter(w => w.length > 1);
    if (queryWords.length === 0) return 0;
    let hits = 0;
    for (const w of queryWords) {
      if (tl.includes(w)) hits++;
    }
    return (hits / queryWords.length) * 0.5;
  }

  private _contextScore(context: Record<string, unknown>, query: string): number {
    const q = query.toLowerCase();
    let score = 0;
    for (const [, v] of Object.entries(context)) {
      if (typeof v === 'string' && v.toLowerCase().includes(q)) {
        score += 0.15;
      }
    }
    return Math.min(score, 0.3);
  }

  private _parseLLMJson(text: string): unknown {
    try {
      // Extract JSON array from possibly markdown-wrapped response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      return JSON.parse(text);
    } catch {
      return [];
    }
  }
}

// ── Singleton Export ─────────────────────────────

export const qMemory = new QMemoryStore();

// Convenience wrappers
export const remember = qMemory.episodicAdd.bind(qMemory);
export const recall = qMemory.recall.bind(qMemory);
export const consolidate = qMemory.consolidate.bind(qMemory);
export const reflect = qMemory.reflect.bind(qMemory);
export const forget = qMemory.forget.bind(qMemory);
