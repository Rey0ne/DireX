/* === Validate all project state.json files === */
/* Run: npx tsx server/src/scripts/validate-all.ts */

import fs from 'node:fs';
import path from 'node:path';

const PROJECTS_DIR = path.join(process.cwd(), 'server', 'data', 'projects');

interface Node {
  id: string;
  type?: string;
  status?: string;
  pos?: { x: number; y: number };
  size?: { width: number; height: number };
}

interface Edge {
  id: string;
  from?: { nodeId?: string };
  to?: { nodeId?: string };
}

interface State {
  nodes: Node[];
  edges: Edge[];
  updatedAt?: string;
}

interface Issue {
  project: string;
  level: 'ERROR' | 'WARN';
  message: string;
}

function validateProject(projectId: string, state: State, autoFix: boolean): { issues: Issue[]; fixed: number } {
  const issues: Issue[] = [];
  let fixed = 0;
  const nodes = state.nodes || [];
  let edges = state.edges || [];

  // 1. Node ID uniqueness
  const idSet = new Set<string>();
  const dupes: string[] = [];
  for (const n of nodes) {
    if (idSet.has(n.id)) dupes.push(n.id);
    else idSet.add(n.id);
  }
  for (const d of dupes) {
    issues.push({ project: projectId, level: 'ERROR', message: `Duplicate node ID: ${d}` });
  }

  // 2. Dangling edges — auto-fix
  const validEdges = edges.filter(e => {
    const fid = e.from?.nodeId;
    const tid = e.to?.nodeId;
    if (!fid || !tid) {
      issues.push({ project: projectId, level: 'ERROR', message: `Edge ${e.id}: missing from/to nodeId` });
      return !autoFix; // keep if not auto-fixing
    }
    if (!idSet.has(fid)) {
      issues.push({ project: projectId, level: 'ERROR', message: `Dangling edge ${e.id}: from node ${fid} not found` });
      return false;
    }
    if (!idSet.has(tid)) {
      issues.push({ project: projectId, level: 'ERROR', message: `Dangling edge ${e.id}: to node ${tid} not found` });
      return false;
    }
    return true;
  });
  if (validEdges.length < edges.length && autoFix) {
    fixed += edges.length - validEdges.length;
    state.edges = validEdges;
  }

  // 3. Failed nodes
  for (const n of nodes) {
    if (n.status === 'failed') {
      issues.push({ project: projectId, level: 'WARN', message: `Failed node: ${n.id} (type=${n.type})` });
      if (autoFix) {
        n.status = 'blocked';
        if (!n.meta) (n as any).meta = {};
        (n as any).meta._blockedReason = 'Auto-fixed by validate-all';
        fixed++;
      }
    }
  }

  // 4. Blocked nodes (report only)
  for (const n of nodes) {
    if (n.status === 'blocked') {
      issues.push({ project: projectId, level: 'WARN', message: `Blocked node: ${n.id} (type=${n.type})` });
    }
  }

  // 5. Missing type
  const typeless = nodes.filter(n => !n.type);
  if (typeless.length > 0) {
    issues.push({ project: projectId, level: 'WARN', message: `${typeless.length} node(s) missing type` });
  }

  // 6. Invalid position (x/y must be finite numbers)
  for (const n of nodes) {
    if (n.pos) {
      const x = (n.pos as any).x ?? n.pos.x;
      const y = (n.pos as any).y ?? n.pos.y;
      if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
        issues.push({ project: projectId, level: 'WARN', message: `Node ${n.id}: invalid position (x=${x}, y=${y})` });
      }
    }
  }

  // 7. Timestamp
  if (state.updatedAt) {
    const ts = Date.parse(state.updatedAt);
    if (isNaN(ts)) {
      issues.push({ project: projectId, level: 'WARN', message: `Invalid updatedAt: ${state.updatedAt}` });
    }
  }

  return { issues, fixed };
}

function main() {
  const autoFix = process.argv.includes('--fix');

  if (!fs.existsSync(PROJECTS_DIR)) {
    console.log('No projects directory found. Nothing to validate.');
    process.exit(0);
  }

  const allIssues: Issue[] = [];
  const stats: { project: string; nodes: number; edges: number; status: string; fixed?: number }[] = [];
  let totalFixed = 0;

  for (const dir of fs.readdirSync(PROJECTS_DIR)) {
    const stateFile = path.join(PROJECTS_DIR, dir, 'state.json');
    if (!fs.existsSync(stateFile)) continue;

    try {
      const raw = fs.readFileSync(stateFile, 'utf-8');
      let state: State;
      try {
        state = JSON.parse(raw);
      } catch {
        allIssues.push({ project: dir, level: 'ERROR', message: 'Invalid JSON — cannot parse state.json' });
        stats.push({ project: dir, nodes: 0, edges: 0, status: 'CORRUPT' });
        continue;
      }

      const { issues, fixed } = validateProject(dir, state, autoFix);
      allIssues.push(...issues);

      if (fixed > 0 && autoFix) {
        // Backup before overwrite
        try { fs.copyFileSync(stateFile, stateFile + '.bak'); } catch {}
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
        totalFixed += fixed;
      }

      // Status: only ERROR if unfixed errors remain
      const activeErrors = issues.filter(i => i.level === 'ERROR' && !i.message.includes('(fixed)'));
      const warns = issues.filter(i => i.level === 'WARN').length;
      let status = 'ok';
      if (activeErrors.length > 0) status = 'ERROR';
      else if (warns > 0) status = 'WARN';

      stats.push({ project: dir, nodes: state.nodes?.length || 0, edges: state.edges?.length || 0, status, fixed: fixed || undefined });
    } catch (e: any) {
      allIssues.push({ project: dir, level: 'ERROR', message: `Cannot read: ${e.message}` });
      stats.push({ project: dir, nodes: 0, edges: 0, status: 'ERROR' });
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('  DireX 项目状态校验报告');
  if (autoFix) console.log('  (--fix mode: auto-repair enabled)');
  console.log('═══════════════════════════════════════\n');

  const colPad = (s: string, w: number) => s.padEnd(w);
  console.log(colPad('Project', 20) + colPad('Nodes', 8) + colPad('Edges', 8) + 'Status');
  console.log('-'.repeat(42));
  for (const s of stats) {
    const icon = s.status === 'ok' ? '✅' : s.status === 'WARN' ? '⚠️' : '❌';
    const fixNote = s.fixed ? ` (fixed ${s.fixed})` : '';
    console.log(colPad(s.project, 20) + colPad(String(s.nodes), 8) + colPad(String(s.edges), 8) + icon + ' ' + s.status + fixNote);
  }

  // Only show DETAIL issues now — skip the "invalid size" noise
  const detailIssues = allIssues.filter(i =>
    i.level === 'ERROR' ||
    (i.level === 'WARN' && !i.message.includes('Blocked node'))
  );
  if (detailIssues.length > 0) {
    console.log(`\n${detailIssues.length} actionable issue(s):\n`);
    for (const i of detailIssues) {
      const icon = i.level === 'ERROR' ? '❌' : '⚠️';
      console.log(`  ${icon} [${i.project}] ${i.message}`);
    }
  }
  if (allIssues.length > detailIssues.length) {
    const blockedCount = allIssues.filter(i => i.message.includes('Blocked node')).length;
    console.log(`\n  ℹ️  + ${blockedCount} blocked node(s) — previously failed, displayed as blocked in UI`);
  }

  if (allIssues.length === 0) {
    console.log('\n✅ All projects clean — no issues found.');
  }

  // Cross-project ID conflict check
  const globalIds = new Map<string, string[]>();
  for (const dir of fs.readdirSync(PROJECTS_DIR)) {
    const stateFile = path.join(PROJECTS_DIR, dir, 'state.json');
    if (!fs.existsSync(stateFile)) continue;
    try {
      const state: State = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      for (const n of state.nodes || []) {
        if (!globalIds.has(n.id)) globalIds.set(n.id, []);
        globalIds.get(n.id)!.push(dir);
      }
    } catch {}
  }
  const conflicts = [...globalIds.entries()].filter(([_, projects]) => projects.length > 1);
  if (conflicts.length > 0) {
    console.log(`\n🔍 Cross-project ID conflicts: ${conflicts.length} IDs shared across projects`);
    const byPair = new Map<string, number>();
    for (const [id, projects] of conflicts) {
      const pair = projects.sort().join(' ↔ ');
      byPair.set(pair, (byPair.get(pair) || 0) + 1);
    }
    for (const [pair, count] of byPair) {
      console.log(`   ${count} IDs: ${pair}`);
    }
  }

  console.log('');
  if (autoFix && totalFixed > 0) {
    console.log(`🔧 Auto-fixed ${totalFixed} issue(s) across all projects.`);
  }
  if (!autoFix && allIssues.some(i => i.level === 'ERROR')) {
    console.log('💡 Run with --fix to auto-repair: npx tsx server/src/scripts/validate-all.ts --fix');
  }

  const hasErrors = allIssues.some(i => i.level === 'ERROR');
  process.exit(hasErrors ? 1 : 0);
}

main();
