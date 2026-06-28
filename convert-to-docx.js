/* Convert patent-disclosure.md to Word document on Desktop with embedded patent figures */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, BorderStyle, WidthType,
  AlignmentType, convertInchesToTwip, ImageRun
} = require('docx');

const md = fs.readFileSync(path.join(__dirname, 'patent-disclosure.md'), 'utf-8');
const FIGURE_DIR = path.join(require('os').homedir(), 'Desktop', 'patent-figures');

// Map figures to each embodiment section end
const EMBODIMENT_FIGURES = {
  '6.1': [
    { file: 'fig1_canvas_agent_architecture.png', caption: '图1 / Fig. 1 — 画布即Agent架构总览 / Canvas-as-Agent Architecture Overview' },
    { file: 'fig2_sequence_diagram.png', caption: '图2 / Fig. 2 — 感知-认知-行动完整循环时序图 / P-C-A Loop Sequence Diagram' },
  ],
  '6.2': [
    { file: 'fig3_five_layer_extraction.png', caption: '图3 / Fig. 3 — 五层结构约束提取认知流程 / Five-Layer Structural Constraint Extraction' },
    { file: 'fig5_parameter_injection.png', caption: '图5 / Fig. 5 — 结构化参数注入认知编译流程 / Structured Parameter Injection Pipeline' },
  ],
  '6.3': [
    { file: 'fig4_parallel_pipeline.png', caption: '图4 / Fig. 4 — 任务分离异步并行管线调度 / Task-Separated Async Parallel Pipeline' },
    { file: 'fig6_dual_channel_routing.png', caption: '图6 / Fig. 6 — 双通道感知与智能路由决策 / Dual-Channel Perception & Intelligent Routing' },
    { file: 'fig7_provider_abstraction.png', caption: '图7 / Fig. 7 — Provider感知与自适应调度架构 / Provider Abstraction & Adaptive Scheduling' },
    { file: 'fig8_incremental_sync.png', caption: '图8 / Fig. 8 — 状态一致性维护机制 / Incremental Sync & State Persistence' },
  ],
  '6.4': [
    { file: 'fig9_3d_world_architecture.png', caption: '图9 / Fig. 9 — 3D世界维度架构总览 / 3D World Dimension Architecture' },
    { file: 'fig10_3d_editor_internal.png', caption: '图10 / Fig. 10 — 3D场景编辑器内部架构 / 3D Scene Editor Internal Architecture' },
    { file: 'fig11_closed_loop_pipeline.png', caption: '图11 / Fig. 11 — AI生成→3D编辑→AI再生成闭环管线 / AI Gen → 3D Edit → AI Re-Gen Closed Loop' },
  ],
};

// Read figure images into buffers
function loadFigureBuffer(filename) {
  const filePath = path.join(FIGURE_DIR, filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  console.warn(`  [WARN] Figure not found: ${filename}`);
  return null;
}

const figureBuffers = {};
for (const [section, figs] of Object.entries(EMBODIMENT_FIGURES)) {
  for (const fig of figs) {
    if (!figureBuffers[fig.file]) {
      figureBuffers[fig.file] = loadFigureBuffer(fig.file);
    }
  }
}

const children = [];
let currentEmbodiment = null; // track which embodiment we're in

function addImageParagraph(figDef) {
  const buf = figureBuffers[figDef.file];
  if (!buf) return;

  // Add spacing before figure
  children.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }));

  // Add the image — scale to fit A4 printable width (~150mm = ~5670 twips)
  // Original figures are ~16-18in wide at 300dpi; scale to ~6in = 4320 twips
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new ImageRun({
        data: buf,
        transformation: {
          width: 5600,  // ~148mm — fits within A4 margins
          height: 3300, // maintains ~16:9.5 aspect ratio
        },
        type: 'png',
      }),
    ],
  }));

  // Add caption below
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 200 },
    children: [new TextRun({ text: figDef.caption, italics: true, size: 18, color: '333333' })],
  }));
}

function insertFiguresForEmbodiment(embodimentNum) {
  const figs = EMBODIMENT_FIGURES[embodimentNum];
  if (!figs) return;

  // Add a figure section header
  children.push(new Paragraph({
    spacing: { before: 300, after: 150 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: '999999' } },
    children: [],
  }));
  children.push(new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({ text: `附图 — 实施例${embodimentNum.split('.')[1]} / Figures — Embodiment ${embodimentNum.split('.')[1]}`, bold: true, size: 22 })],
  }));

  for (const fig of figs) {
    addImageParagraph(fig);
  }
}

function addHeading(text, level) {
  // Detect embodiment headings to track where we are
  const h3Match = text.match(/^###\s+6\.(\d)\s/);
  const h2Match = text.match(/^##\s+七/); // Section 7 — end of all embodiments

  // If we're transitioning to a new embodiment (or ending embodiments), insert figures for previous
  if (h3Match && currentEmbodiment && currentEmbodiment !== `6.${h3Match[1]}`) {
    insertFiguresForEmbodiment(currentEmbodiment);
  }
  if (h3Match) {
    currentEmbodiment = `6.${h3Match[1]}`;
  }
  // When we hit Section 7 (工业实用性), insert figures for last embodiment
  if (h2Match && currentEmbodiment) {
    insertFiguresForEmbodiment(currentEmbodiment);
    currentEmbodiment = null; // prevent double-insert
  }

  children.push(new Paragraph({
    heading: level <= 1 ? HeadingLevel.HEADING_1 :
             level === 2 ? HeadingLevel.HEADING_2 :
             level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
    spacing: { before: level <= 2 ? 400 : 300, after: 200 },
    children: [new TextRun({ text: text.replace(/^#+\s*/, '').replace(/\*\*/g, ''), bold: true, size: level === 1 ? 36 : level === 2 ? 28 : 22 })],
  }));
}

function addPara(text, opts = {}) {
  if (!text.trim()) return;
  const parts = [];
  let remaining = text;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      if (boldMatch.index > 0) parts.push(new TextRun({ text: remaining.slice(0, boldMatch.index), ...opts }));
      parts.push(new TextRun({ text: boldMatch[1], bold: true, ...opts }));
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(new TextRun({ text: remaining, ...opts }));
      remaining = '';
    }
  }
  children.push(new Paragraph({
    spacing: { before: 120, after: 120 },
    children: parts,
  }));
}

function addCodeBlock(code) {
  children.push(new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { type: 'solid', color: 'F5F5F5' },
    children: [new TextRun({ text: code, font: 'Consolas', size: 18, color: '333333' })],
  }));
}

function addSeparator() {
  children.push(new Paragraph({
    spacing: { before: 300, after: 300 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
    children: [],
  }));
}

const lines = md.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  if (line.startsWith('# ') && !line.startsWith('## ')) { addHeading(line, 1); continue; }
  if (line.startsWith('## ') && !line.startsWith('### ')) { addHeading(line, 2); continue; }
  if (line.startsWith('### ')) { addHeading(line, 3); continue; }
  if (line.startsWith('#### ')) { addHeading(line, 4); continue; }
  if (line.startsWith('---')) { addSeparator(); continue; }

  if (line.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) {
      const cells = lines[i].split('|').filter(c => c.trim());
      if (!lines[i].includes('---')) {
        rows.push(cells.map(c => c.trim()));
      }
      i++;
    }
    i--;
    if (rows.length > 0) {
      const tableChildren = rows.map((row, ri) =>
        new TableRow({
          children: row.map(cell =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: cell.replace(/\*\*/g, '').replace(/`/g, ''), size: 18, bold: ri === 0 })],
              })],
              shading: ri === 0 ? { type: 'solid', color: 'E8E8E8' } : undefined,
            })
          ),
        })
      );
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableChildren,
      }));
    }
    continue;
  }

  if (line.startsWith('```')) {
    const codeLines = [];
    i++;
    while (i < lines.length && !lines[i].startsWith('```')) {
      codeLines.push(lines[i]);
      i++;
    }
    addCodeBlock(codeLines.join('\n'));
    continue;
  }

  addPara(line, { size: 21 });
}

// Edge case: document ends without hitting Section 7
if (currentEmbodiment) {
  insertFiguresForEmbodiment(currentEmbodiment);
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Microsoft YaHei', size: 21 },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.2),
          right: convertInchesToTwip(1.2),
        },
      },
    },
    children,
  }],
});

const desktop = path.join(require('os').homedir(), 'Desktop');
const outputPath = path.join(desktop, 'DireX_Patent_Disclosure_20260626.docx');

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Word document saved to: ' + outputPath);
  console.log('Size: ' + (buffer.length / 1024).toFixed(1) + ' KB');
});
