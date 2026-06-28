"""
Generate 11 WIPO-compliant patent figures for DireX Canvas-Agent disclosure.
Black and white technical diagrams, 300 DPI PNG output.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Arc, Polygon, Rectangle, FancyArrow
import numpy as np
import os

OUTPUT_DIR = os.path.join(os.path.expanduser('~'), 'Desktop', 'patent-figures')
os.makedirs(OUTPUT_DIR, exist_ok=True)
DPI = 300

# ─── Styling ─────────────
BOX_STYLE = dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='black', linewidth=1.5)
BOX_STYLE_FILLED = dict(boxstyle='round,pad=0.3', facecolor='#f0f0f0', edgecolor='black', linewidth=1.5)
ARROW_STYLE = dict(arrowstyle='->', lw=1.5, color='black')
DASHED_ARROW = dict(arrowstyle='->', lw=1.2, color='black', linestyle='dashed')

def new_fig(w=16, h=10, title=''):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    if title:
        ax.set_title(title, fontsize=14, fontweight='bold', pad=10)
    return fig, ax

def draw_box(ax, x, y, w, h, text, filled=False, fontsize=9, color='black'):
    style = BOX_STYLE_FILLED if filled else BOX_STYLE
    box = FancyBboxPatch((x, y), w, h, **style)
    ax.add_patch(box)
    lines = text.split('\n')
    for i, line in enumerate(lines):
        ax.text(x + w/2, y + h - 4 - i*5, line, ha='center', va='center', fontsize=fontsize, color=color, weight='bold' if i==0 else 'normal')
    return box

def draw_arrow(ax, x1, y1, x2, y2, dashed=False):
    style = DASHED_ARROW if dashed else ARROW_STYLE
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1), arrowprops=style)

def draw_label(ax, x, y, text, fontsize=8, ha='center', va='center', bold=False, color='black'):
    ax.text(x, y, text, fontsize=fontsize, ha=ha, va=va, weight='bold' if bold else 'normal', color=color)

def draw_bracket(ax, x, y, w, h, label='', fontsize=9):
    """Draw a large grouping bracket around an area"""
    rect = Rectangle((x, y), w, h, fill=False, edgecolor='black', linewidth=1.5, linestyle='--')
    ax.add_patch(rect)
    if label:
        ax.text(x + w/2, y + h + 1, label, fontsize=fontsize, ha='center', va='bottom', weight='bold')

def save(fig, name):
    path = os.path.join(OUTPUT_DIR, name)
    fig.savefig(path, dpi=DPI, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close(fig)
    print(f'  [OK] {name}')

# ═══════════════════════════════════════════════════════════
# FIGURE 1: Canvas-Agent Three-Layer Architecture Overview
# ═══════════════════════════════════════════════════════════
def fig1():
    fig, ax = new_fig(18, 13, 'FIG. 1: Canvas-Agent Architecture Overview')

    # Three main layers
    # ── Perception Layer (top) ──
    draw_bracket(ax, 3, 68, 94, 28, 'PERCEPTION LAYER', 11)
    draw_box(ax, 8, 72, 18, 18, 'P1\nGraph Topology\nPerception', True, 8)
    draw_box(ax, 30, 72, 18, 18, 'P2\nPort Type\nPerception', True, 8)
    draw_box(ax, 52, 72, 18, 18, 'P3\nGeneration Status\nPerception', True, 8)
    draw_box(ax, 74, 72, 18, 18, 'P4\nSemantic Intent\nPerception', True, 8)

    # ── Cognition Layer (middle) ──
    draw_bracket(ax, 3, 38, 94, 28, 'COGNITION LAYER', 11)
    draw_box(ax, 8, 42, 18, 18, 'C1\nIntent Reasoning\nPipeline Selection', True, 8)
    draw_box(ax, 30, 42, 18, 18, 'C2\nDependency Analysis\nParallel Scheduling', True, 8)
    draw_box(ax, 52, 42, 18, 18, 'C3\nContext Assembly\nConstraint Compilation', True, 8)
    draw_box(ax, 74, 42, 18, 18, 'C4\nState Consistency\nReasoning', True, 8)

    # ── Action Layer (bottom) ──
    draw_bracket(ax, 3, 8, 94, 28, 'ACTION LAYER', 11)
    draw_box(ax, 8, 12, 16, 18, 'A1\nAuto Data\nConfluence', True, 8)
    draw_box(ax, 27, 12, 16, 18, 'A2\nIntelligent Task\nRouting', True, 8)
    draw_box(ax, 46, 12, 16, 18, 'A3\nParallel\nOrchestration', True, 8)
    draw_box(ax, 65, 12, 16, 18, 'A4\nMulti-Channel\nPolling', True, 8)
    draw_box(ax, 84, 12, 16, 18, 'A5\nState\nPersistence', True, 8)

    # Arrows between layers (P→C)
    for x_pos in [17, 39, 61, 83]:
        draw_arrow(ax, x_pos, 71, x_pos, 62)

    # Arrows between layers (C→A)
    for x_pos in [17, 39, 61, 83]:
        draw_arrow(ax, x_pos, 41, x_pos, 32)

    # Feedback loop arrow (right side)
    draw_arrow(ax, 93, 95, 97, 95)
    draw_arrow(ax, 97, 95, 97, 5)
    draw_arrow(ax, 97, 5, 93, 5)
    ax.text(99, 50, 'FEEDBACK\nLOOP', fontsize=7, ha='center', va='center', rotation=90)

    # Creator interaction
    draw_box(ax, 35, 90, 30, 8, 'CREATOR\n(Expresses Creative Intent)', False, 8)
    draw_arrow(ax, 50, 89, 50, 88)

    # External AI Services
    draw_box(ax, 35, 2, 30, 6, 'EXTERNAL AI SERVICES\n(Provider Abstraction)', False, 7)

    save(fig, 'fig1_canvas_agent_architecture.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 2: Three-Node Pipeline Sequence Diagram
# ═══════════════════════════════════════════════════════════
def fig2():
    fig, ax = new_fig(18, 14, 'FIG. 2: Canvas Agent Perception-Cognition-Action Sequence Diagram')

    # Lifelines
    lifelines = [
        ('Creator', 10), ('Canvas\nAgent', 35), ('Script\nAnalysis', 55),
        ('Image\nGeneration', 70), ('Video\nGeneration', 85)
    ]
    for name, x in lifelines:
        ax.plot([x, x], [15, 92], 'k-', lw=1)
        ax.plot([x, x], [88, 92], 'k-', lw=2)  # top bar
        draw_label(ax, x, 90, name, 7, bold=True)

    # Phase annotations
    draw_bracket(ax, 3, 78, 95, 14, 'PERCEPTION PHASE', 9)
    draw_bracket(ax, 3, 52, 95, 24, 'COGNITION PHASE', 9)
    draw_bracket(ax, 3, 15, 95, 35, 'ACTION PHASE', 9)

    # Perception Phase
    draw_arrow(ax, 10, 83, 35, 83)
    draw_label(ax, 22, 85, '1. Places nodes\n& connects edges', 6, ha='center')

    # Cognition Phase (Agent reasoning - self-arrow)
    ax.annotate('', xy=(38, 73), xytext=(32, 73), arrowprops=dict(arrowstyle='->', lw=1.2, color='black', connectionstyle='arc3,rad=.3'))
    draw_label(ax, 35, 76, '2. Infers intent\n3. Selects pipeline\n4. Analyzes dependencies', 6)

    # Action Phase - Sub-task submission
    draw_arrow(ax, 35, 64, 55, 64)
    draw_label(ax, 45, 66, '5. Submit:\n4 sub-tasks\n(parallel)', 6)
    # Internal sub-task detail
    ax.annotate('', xy=(58, 58), xytext=(52, 58), arrowprops=dict(arrowstyle='->', lw=1, color='gray'))
    draw_label(ax, 55, 60, 'Char. Ext.\nScene Ext.\nSound Des.\n(in parallel)', 5, color='gray')

    # Character extraction completes → trigger storyboard
    draw_arrow(ax, 55, 54, 35, 54)
    draw_label(ax, 45, 56, '6. Char. Ext.\ncompleted', 5)
    draw_arrow(ax, 35, 50, 55, 50)
    draw_label(ax, 45, 52, '7. Auto-trigger\nStoryboard Gen.', 5)

    # All complete → inject into Image Gen
    draw_arrow(ax, 35, 42, 70, 42)
    draw_label(ax, 52, 44, '8. Inject character_profile\n+ structured prefix\ninto Image Gen request', 5)
    # Image gen completes
    draw_arrow(ax, 70, 36, 35, 36)
    draw_label(ax, 52, 38, '9. Image Gen\ncompleted', 5)

    # Inject image into Video Gen
    draw_arrow(ax, 35, 28, 85, 28)
    draw_label(ax, 60, 30, '10. Inject generated\nimage into Video Gen', 5)
    # Video gen completes
    draw_arrow(ax, 85, 22, 35, 22)
    draw_label(ax, 60, 24, '11. Video Gen\ncompleted', 5)

    # State persistence
    draw_arrow(ax, 35, 18, 35, 16)
    draw_label(ax, 35, 14, '12. State\npersisted', 6)

    save(fig, 'fig2_sequence_diagram.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 3: Five-Layer Structural Constraint Extraction Flow
# ═══════════════════════════════════════════════════════════
def fig3():
    fig, ax = new_fig(14, 18, 'FIG. 3: Five-Layer Structural Constraint Extraction Flow')

    y = 88
    draw_box(ax, 20, y, 60, 8, 'INPUT: Reference Image + "Extract [target]" Prompt', True, 9)
    draw_arrow(ax, 50, y, 50, y-2)

    y = 80
    draw_box(ax, 20, y, 60, 6, 'Intent Detection: Extract keywords + @mention image?', False, 8)
    draw_arrow(ax, 50, y, 50, y-2)

    # Layer 1
    y = 70
    draw_box(ax, 15, y, 70, 7, 'LAYER 1: Category Positioning — Broadest functional classification\n"ceramic vessel" (NOT "blue-and-white vase")', True, 7)
    draw_label(ax, 13, y+3.5, '→ Avoids\nmorphological\nbias', 6, ha='right')
    draw_arrow(ax, 50, y, 50, y-2)

    # Layer 2
    y = 58
    draw_box(ax, 15, y, 70, 9, 'LAYER 2: Functional Structure Constraints\nHas lid? Opening size ratio? Handles? Base type? Pouring structure?\nDescribed as YES/NO binary attributes — immutable "skeleton"', True, 7)
    draw_arrow(ax, 50, y, 50, y-2)

    # Layer 3
    y = 45
    draw_box(ax, 15, y, 70, 10, 'LAYER 3: Morphological Structure Constraints\nProfile curve type? Neck-to-body ratio? Max diameter position?\nH:W ratio? Base narrowing? Rim treatment?\nDescribed in GEOMETRIC terms — NO aesthetic vocabulary', True, 7)
    draw_arrow(ax, 50, y, 50, y-2)

    # Layer 4
    y = 32
    draw_box(ax, 15, y, 70, 10, 'LAYER 4: Detail Constraints\nSurface pattern layout? Colors? Markings? Gloss level?\nMaterial texture? Each detail WITH reference image position\n— "Fingerprint" features distinguishing THIS object', True, 7)
    draw_arrow(ax, 50, y, 50, y-2)

    # Layer 5 (highlighted)
    y = 18
    draw_box(ax, 15, y, 70, 11, 'LAYER 5: NEGATIVE CONSTRAINTS [INNOVATION]\nEnumerate common variants DEFINITIVELY ABSENT from reference:\nNOT dual-handled | NOT wide-mouth | NOT transparent | NOT relief | NOT metal\n→ Delineates EXCLUSION ZONES in probability space', True, 7)
    draw_label(ax, 87, y+5.5, '★ First proposed\nin this field', 7, ha='left', bold=True)
    draw_arrow(ax, 50, y, 50, y-3)

    # Output
    y = 6
    draw_box(ax, 10, y, 80, 9, 'OUTPUT: Structural Constraint Generation Prompt\n"Use reference image as primary visual source..." + 5-layer constraints + scene params', True, 8)

    # Right side annotations
    ax.text(92, 84, 'SEMANTIC\nDRIFT\nELIMINATED', fontsize=8, ha='center', va='center', weight='bold',
            bbox=dict(boxstyle='round', facecolor='#e8e8e8', edgecolor='black'))

    save(fig, 'fig3_five_layer_extraction.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 4: Task Separation Async Parallel Pipeline
# ═══════════════════════════════════════════════════════════
def fig4():
    fig, ax = new_fig(18, 13, 'FIG. 4: Task-Separated Async Parallel Pipeline Sequence Diagram')

    # Lifelines
    lifelines = [
        ('Canvas\nAgent', 5), ('Char. Extract\n(Sub-task A)', 25),
        ('Scene Extract\n(Sub-task B)', 45), ('Sound Design\n(Sub-task D)', 65),
        ('Storyboard Gen\n(Sub-task C)', 85)
    ]
    for name, x in lifelines:
        ax.plot([x, x], [15, 92], 'k-', lw=1)
        ax.plot([x, x], [88, 92], 'k-', lw=2)
        draw_label(ax, x, 90, name, 7, bold=True)

    # Phase 1: Semantic Separation
    ax.annotate('', xy=(8, 83), xytext=(2, 83), arrowprops=dict(arrowstyle='->', lw=1, color='gray'))
    draw_label(ax, 5, 86, '1. Semantic\nSeparation', 6, bold=True)
    ax.text(2, 80, 'Split into 4\nindependent\nsub-tasks', fontsize=6, ha='left')

    # Phase 2: Dependency Analysis
    ax.annotate('', xy=(8, 74), xytext=(2, 74), arrowprops=dict(arrowstyle='->', lw=1, color='gray'))
    draw_label(ax, 5, 77, '2. Dependency\nAnalysis', 6, bold=True)
    draw_label(ax, 50, 78, 'A↛B (independent)  A↛D (independent)  A→C (C depends on A)', 6)

    # Phase 3: Parallel submission of A, B, D
    draw_arrow(ax, 5, 66, 25, 66)
    draw_arrow(ax, 5, 64, 45, 64)
    draw_arrow(ax, 5, 62, 65, 62)
    draw_label(ax, 5, 69, '3. Parallel\nSubmit', 6, bold=True)
    draw_label(ax, 15, 68, 'A: Char. Extract', 5)
    draw_label(ax, 35, 66, 'B: Scene Extract', 5)
    draw_label(ax, 55, 64, 'D: Sound Design', 5)

    # Polling channels
    for x in [25, 45, 65]:
        ax.plot([x, x], [55, 62], 'k--', lw=0.8)
        draw_label(ax, x, 58, 'polling', 5, color='gray')
    # Status returns
    draw_arrow(ax, 25, 52, 5, 52)
    draw_label(ax, 15, 54, 'completed', 5)
    draw_arrow(ax, 45, 50, 5, 50)
    draw_label(ax, 15, 52, 'completed', 5)
    draw_arrow(ax, 65, 48, 5, 48)
    draw_label(ax, 15, 50, 'completed', 5)

    # Phase 4: Trigger dependent sub-task C
    draw_arrow(ax, 5, 42, 85, 42)
    draw_label(ax, 45, 44, '4. A completed → Auto-trigger C (Storyboard Gen)\nInject A''s character_profile output into C''s input', 6)

    # C polling
    ax.plot([85, 85], [35, 42], 'k--', lw=0.8)
    draw_arrow(ax, 85, 32, 5, 32)
    draw_label(ax, 45, 34, 'C completed', 5)

    # Phase 5: Result assembly
    draw_label(ax, 5, 26, '5. Result\nAssembly', 6, bold=True)
    draw_label(ax, 50, 25, 'Merge A+B+C+D → Unified JSON → Tabbed display\n(Characters | Scenes | Storyboards | Sound)', 6)

    # Phase 6: Persistent task IDs
    ax.annotate('', xy=(8, 18), xytext=(2, 18), arrowprops=dict(arrowstyle='->', lw=1, color='gray'))
    draw_label(ax, 5, 21, '6. Persist\nTask IDs', 6, bold=True)
    draw_label(ax, 50, 18, 'All 4 task IDs stored → Survives disconnection/reconnection', 6)

    # Dependency graph inset
    draw_box(ax, 20, 6, 60, 10, 'Dependency Graph:  {A, B, D} parallel group  →  A → C serial chain', False, 7)

    save(fig, 'fig4_parallel_pipeline.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 5: Structured Parameter Injection Pipeline
# ═══════════════════════════════════════════════════════════
def fig5():
    fig, ax = new_fig(18, 9, 'FIG. 5: Structured Parameter Injection Pipeline')

    # Knowledge Base (left)
    draw_box(ax, 2, 25, 22, 65, 'VISUAL STYLE\nPARAMETER\nKNOWLEDGE BASE\n\n[Model-Independent]\n\nDimension 1:\nEquipment Char.\n\nDimension 2:\nOptical System\n\nDimension 3:\nPhotosensitive\nMedium', True, 8)
    draw_label(ax, 13, 22, 'Standardized\nidentifiers + formats', 7)

    # Parameter Selection UI (middle-left)
    draw_box(ax, 30, 50, 20, 35, 'PARAMETER\nSELECTION UI\n\nDropdown menus\norganized in\nphotographic\nworkflow order:\n\nEquipment →\nOptics → Medium', False, 8)
    draw_arrow(ax, 24, 60, 30, 60)
    draw_label(ax, 27, 63, 'reads', 6)

    # Structured Prefix Compiler (middle-right)
    draw_box(ax, 55, 50, 20, 35, 'STRUCTURED\nPREFIX\nCOMPILER\n\n1. Read selected\n   parameter IDs\n2. Lookup formats\n   from KB\n3. Assemble:\n[Cat: Val]\n[Cat: Val]...\nin Equipment→\nOptics→Medium\norder', True, 8)
    draw_arrow(ax, 50, 65, 55, 65)
    draw_label(ax, 52.5, 68, 'selected\nparam IDs', 6)

    # Prompt Assembly (right)
    draw_box(ax, 80, 65, 18, 20, 'PROMPT\nASSEMBLY\n\n[Prefix]\n+\n[User Prompt]', False, 8)
    draw_arrow(ax, 75, 72, 80, 72)
    draw_label(ax, 77.5, 75, 'structured\nprefix string', 6)

    # Model Execution (bottom-right)
    draw_box(ax, 80, 35, 18, 12, 'AI MODEL\nEXECUTION', True, 8)
    draw_arrow(ax, 89, 65, 89, 49)

    # Generated Image (rightmost)
    draw_box(ax, 80, 8, 18, 15, 'GENERATED\nIMAGE\n\nConsistent\nvisual style\nmatching\nparameters', True, 8)
    draw_arrow(ax, 89, 35, 89, 25)

    # Independence boundary
    ax.plot([26, 26], [20, 92], 'k--', lw=1.5)
    draw_label(ax, 26, 94, 'INDEPENDENCE BOUNDARY', 8, bold=True)
    draw_label(ax, 13, 92, 'MODEL-INDEPENDENT', 7, ha='center')
    draw_label(ax, 50, 92, 'MODEL-DEPENDENT (pluggable)', 7, ha='center')

    # Example
    draw_box(ax, 55, 20, 20, 18, 'EXAMPLE OUTPUT:\n[ColorTendency: warm]\n[OpticalChar: soft-focus]\n[MediumStyle: low-grain]\n+ "A medieval armchair\nin a library..."', False, 7)

    save(fig, 'fig5_parameter_injection.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 6: Dual-Channel Perception + Intelligent Routing
# ═══════════════════════════════════════════════════════════
def fig6():
    fig, ax = new_fig(16, 14, 'FIG. 6: Dual-Channel Data Confluence and Intelligent Routing')

    # Top: Two channels
    draw_box(ax, 5, 72, 35, 20, 'CHANNEL 1:\nDirected Edge\nAutomatic Data Flow\n\nSource node output →\nEdge → Target node input\n(Auto, structured,\nfull context)', True, 8)
    draw_box(ax, 60, 72, 35, 20, 'CHANNEL 2:\n@mention Semantic\nManual Reference\n\n"@" triggers node\npicker → inline\npreview thumbnail\n→ reference link', True, 8)

    # Merge point
    draw_arrow(ax, 22, 72, 22, 66)
    draw_arrow(ax, 77, 72, 77, 66)
    draw_box(ax, 30, 58, 40, 8, 'DUAL-CHANNEL INFORMATION MERGE', False, 8)
    draw_arrow(ax, 22, 66, 22, 62)
    draw_arrow(ax, 77, 66, 77, 62)
    draw_arrow(ax, 22, 62, 30, 62)
    draw_arrow(ax, 77, 62, 70, 62)

    # Intent Reasoning
    draw_arrow(ax, 50, 58, 50, 52)
    draw_box(ax, 20, 42, 60, 10, 'INTENT REASONING ENGINE\nSynthesize: node type + prompt keywords + reference data types', True, 9)

    # Three branch decision
    draw_arrow(ax, 50, 42, 50, 36)
    draw_box(ax, 30, 28, 40, 8, 'DECISION DIAMOND', False, 8)
    # Branch 1: Extraction
    draw_arrow(ax, 30, 32, 10, 32)
    draw_arrow(ax, 10, 32, 10, 20)
    draw_box(ax, 2, 12, 16, 8, 'ROUTE TO:\nVisual Extraction\n(5-Layer\nConstraints)', True, 7)
    draw_label(ax, 10, 22, 'Extract keywords\n+ image ref', 6)

    # Branch 2: Reference I2I
    draw_arrow(ax, 50, 28, 50, 20)
    draw_box(ax, 42, 12, 16, 8, 'ROUTE TO:\nReference I2I\nPipeline', True, 7)
    draw_label(ax, 50, 22, '@mention ref\nno extract keywords', 6)

    # Branch 3: Standard T2I
    draw_arrow(ax, 70, 32, 90, 32)
    draw_arrow(ax, 90, 32, 90, 20)
    draw_box(ax, 82, 12, 16, 8, 'ROUTE TO:\nStandard T2I\nPipeline', True, 7)
    draw_label(ax, 90, 22, 'No ref\nno extract', 6)

    # Port compatibility matrix (bottom-left)
    draw_box(ax, 2, 2, 40, 8, 'Port Type Compatibility Matrix:\nimage→image✓ image→video✓ prompt→all✓ model_3d→model_3d✓ ...', False, 6)

    save(fig, 'fig6_dual_channel_routing.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 7: Provider Abstraction + Adaptive Scheduling
# ═══════════════════════════════════════════════════════════
def fig7():
    fig, ax = new_fig(16, 12, 'FIG. 7: Unified Provider Abstraction and Adaptive Scheduling Engine')

    # Standard Interface
    draw_box(ax, 5, 60, 40, 30,
             'STANDARDIZED PROVIDER INTERFACE\n\n'
             'submitTask(StandardizedRequest) → TaskID\n'
             'queryTask(TaskID) → {status, progress}\n'
             'fetchResult(TaskID) → GenerationResult', True, 9)

    # Provider Registry
    draw_box(ax, 55, 60, 40, 30,
             'PROVIDER REGISTRY\n(Capability-Service Mapping)\n\n'
             'image.generate → [Provider#1, Provider#2]\n'
             'video.generate → [Provider#1]\n'
             'scene.3d      → [Provider#1]\n'
             'text.analyze  → [Provider#1, Provider#2]\n'
             'audio.generate → [Provider#1]', True, 8)

    # Load balancing + Failover
    draw_box(ax, 5, 30, 40, 22,
             'LOAD BALANCING\n& FAILOVER\n\n'
             'Round-robin /\nPriority /\nFailover routing\n\n'
             'Provider#1 down →\nauto-switch to\nProvider#2', False, 8)

    draw_box(ax, 55, 30, 40, 22,
             'ADAPTIVE SCHEDULING\nENGINE\n\n'
             'Per-task-type polling\nstrategy configuration:\n'
             '• Polling interval\n'
             '• Max wait time\n'
             '• Retry count\n'
             '• Backoff strategy\n\n'
             'Dynamically optimized\nfrom historical data', True, 8)

    # Arrows
    draw_arrow(ax, 25, 60, 25, 54)
    draw_arrow(ax, 75, 60, 75, 54)

    # Agent interaction
    draw_box(ax, 30, 5, 40, 18,
             'UPPER LAYERS (Agent + Frontend)\n'
             'Query registry by CAPABILITY\n'
             '→ Get Provider instance\n'
             '→ Call standard interface methods\n'
             '→ ZERO knowledge of underlying service', False, 8)
    draw_arrow(ax, 25, 30, 25, 25)
    draw_arrow(ax, 75, 30, 75, 25)

    save(fig, 'fig7_provider_abstraction.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 8: Incremental Sync + State Persistence
# ═══════════════════════════════════════════════════════════
def fig8():
    fig, ax = new_fig(16, 12, 'FIG. 8: Incremental Synchronization and State Persistence Mechanism')

    # Frontend
    draw_bracket(ax, 2, 62, 50, 35, 'FRONTEND', 10)
    draw_box(ax, 5, 68, 20, 24, 'Map-Structure\nGraph State\n\nnodes: Map<ID, Data>\nedges: Map<ID, Data>\nassets: Map<ID, Data>\njobs: Map<ID, Data>\n\nO(1) lookup/update', True, 8)
    draw_box(ax, 30, 75, 18, 15, 'Change\nCounter\n\nN++ on each\nadd/delete/\nmodify', False, 8)
    draw_box(ax, 30, 62, 18, 10, 'Diff\nDetector\n\nCompare\nsnapshots', False, 8)

    draw_arrow(ax, 25, 78, 30, 82)
    draw_arrow(ax, 39, 75, 39, 74)

    # Network
    draw_arrow(ax, 50, 67, 60, 67)
    draw_label(ax, 55, 70, 'Only diff\nentity set\nserialized', 7)

    # Backend
    draw_bracket(ax, 58, 62, 40, 35, 'BACKEND', 10)
    draw_box(ax, 62, 75, 32, 15, 'Diff Merge\n→ In-memory state tree\n→ Write complete\n   snapshot to file', True, 8)
    draw_box(ax, 62, 62, 32, 10,
             'Structured File\nPersistence\n\nnodes.json\nedges.json\njobs.json', False, 7)

    # Recovery flow (bottom)
    draw_bracket(ax, 2, 8, 96, 50, 'RECOVERY FLOW (on restart / reconnection)', 10)

    draw_box(ax, 5, 38, 22, 16, 'STEP 1\nLoad persistence\nfiles\n\nRead nodes.json\nedges.json\njobs.json', True, 8)
    draw_arrow(ax, 27, 46, 35, 46)

    draw_box(ax, 35, 38, 22, 16, 'STEP 2\nIdentify in-progress\ntasks\n\nFilter jobs where\nstatus = pending\nor running', True, 8)
    draw_arrow(ax, 57, 46, 65, 46)

    draw_box(ax, 65, 38, 22, 16, 'STEP 3\nResume polling\n\nFor each in-progress\ntask: start polling\nchannel → retrieve\nresult when done', True, 8)
    draw_arrow(ax, 87, 46, 92, 46)

    draw_box(ax, 5, 12, 90, 18, 'STEP 4: Reconstruct frontend canvas — render all nodes, edges, previews, and progress indicators\nCompleted tasks → show cached results | In-progress tasks → show live polling progress', True, 8)

    save(fig, 'fig8_incremental_sync.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 9: 3D World Dimension Architecture Overview
# ═══════════════════════════════════════════════════════════
def fig9():
    fig, ax = new_fig(18, 14, 'FIG. 9: Canvas Agent 3D World Dimension Architecture')

    # Center: Canvas Agent
    draw_box(ax, 35, 42, 30, 16, 'CANVAS AGENT\nPerception-Cognition-Action Loop', True, 10)

    # Four sub-capabilities around center
    # Top-Left: AI 3D Generation
    draw_box(ax, 5, 68, 28, 24,
             '(A) AI-DRIVEN 3D MODEL\nGENERATION\n\n• Text-to-3D mode\n• Image-to-3D mode\n• Precision tier selection\n  (High-poly / Low-poly)\n• PBR material decision\n• Auto-save to asset library\n• WebGL interactive preview\n• model_3d output port', True, 7)
    draw_arrow(ax, 19, 68, 40, 60)

    # Top-Right: 3D Scene Editor
    draw_box(ax, 67, 60, 30, 32,
             '(B) REAL-TIME WebGL\n3D SCENE EDITOR\n\n• Primitives (box/sphere/cylinder)\n• Human figure + pose library\n• Cinematic lighting (8 presets)\n  - Directional/point/spot lights\n  - HDRI + procedural sky\n  - Tone mapping + exposure\n• Multi-camera system\n  - Lens simulation (FOV)\n  - Depth of Field (T-stop)\n  - PiP viewfinder\n• Camera motion rigs\n  - Dolly / Curved / Orbit\n  - Speed curves + keyframes', True, 7)
    draw_arrow(ax, 67, 76, 63, 58)

    # Bottom-Left: 3D→2D
    draw_box(ax, 5, 8, 28, 24,
             '(C) 3D→2D OUTPUT\nTHROUGHPUT\n\n• Snapshot output\n  (PNG → image port)\n• Video recording\n  (WebM → video port)\n• Lighting parameter\n  structured injection\n  (3D light params →\n   2D style prefix)', True, 7)
    draw_arrow(ax, 33, 20, 40, 42)

    # Bottom-Right: 2D→3D
    draw_box(ax, 67, 8, 30, 24,
             '(D) 2D→3D REVERSE\nTHROUGHPUT\n\n• AI model auto-import\n  (model_3d → scene)\n• Reference image →\n  lighting + camera\n• Character description →\n  figure + pose config', True, 7)
    draw_arrow(ax, 67, 20, 63, 42)

    # Bidirectional arrows between 3D and 2D
    ax.annotate('3D → 2D', xy=(30, 85), xytext=(10, 85),
                arrowprops=dict(arrowstyle='->', lw=2, color='black'),
                fontsize=9, weight='bold')
    ax.annotate('2D → 3D', xy=(10, 80), xytext=(30, 80),
                arrowprops=dict(arrowstyle='->', lw=2, color='black'),
                fontsize=9, weight='bold')

    # Node flow connection
    draw_box(ax, 5, 90, 90, 8,
             '2D NODE FLOW: Script Analysis → Image Generation → Video Generation  ←→  3D NODE: Tripo3D Generation → Scene3D Editor', False, 8)

    save(fig, 'fig9_3d_world_architecture.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 10: 3D Scene Editor Internal Architecture
# ═══════════════════════════════════════════════════════════
def fig10():
    fig, ax = new_fig(18, 14, 'FIG. 10: 3D Scene Editor Internal Subsystem Architecture')

    # Four subsystem columns
    col_w = 20
    gap = 2
    start_x = [3, 26, 49, 72]
    titles = [
        'SCENE OBJECT\nSYSTEM',
        'CINEMATIC\nLIGHTING SYSTEM',
        'MULTI-CAMERA\nCINEMATOGRAPHY',
        'CAMERA MOTION\nSYSTEM'
    ]

    for i in range(4):
        draw_box(ax, start_x[i], 78, col_w, 6, titles[i], True, 8)

    # Column 1: Scene Objects
    draw_box(ax, start_x[0], 55, col_w, 20,
             'Primitives:\n□ Box  ○ Sphere\n◯ Cylinder  ▭ Plane\n\nHuman Figures:\n• Pose library\n  (stand/sit/walk/run/\n   squat/lie/fight)\n• GLB/FBX loading\n\nAI Model Auto-Import:\n• model_3d edge →\n  auto-load to scene\n• PBR standardization\n• Bounding box scaling', True, 7)

    # Column 2: Lighting
    draw_box(ax, start_x[1], 48, col_w, 27,
             '8 CINEMATIC PRESETS:\n1. Golden Hour (warm)\n2. Moonlight (cool)\n3. Overcast (soft)\n4. Studio 3-Point\n5. Hollywood Warm\n6. Sci-Fi Blue\n7. Horror Dark\n8. Snowfield Bright\n\nEach preset defines:\n• DirectionalLight\n  (azimuth, elevation,\n   intensity, color temp)\n• Aux lights (point/spot)\n• Environment (HDRI/sky)\n• Tone mapping + exposure', True, 7)

    # Column 3: Cameras
    draw_box(ax, start_x[2], 48, col_w, 27,
             'CAMERA LAYOUT:\n• Multiple positions\n• Independent 3D coords\n• Visual indicators\n\nLENS SIMULATION:\n• FOV auto-adjust\n  per lens selection\n• Wide → depth\n• Tele → compression\n\nDEPTH OF FIELD:\n• T-stop aperture\n• Real-time bokeh\n• EffectComposer\n  post-processing\n\nPiP VIEWFINDER:\n• Live camera view\n• Lens + aperture\n  controls', True, 7)

    # Column 4: Motion
    draw_box(ax, start_x[3], 48, col_w, 27,
             'DOLLY RIG:\n• Linear A→B track\n• Speed curves (keyframes)\n\nCURVED RIG:\n• Catmull-Rom spline\n• Editable control points\n\nORBIT RIG:\n• Circular motion\n• Radius + height + speed\n\nROTATION KEYFRAMES:\n• Pitch + yaw over time\n\nANIMATION TRACKS:\n• Bind camera to\n  character animation\n• Timeline sync', True, 7)

    # Interconnection arrows
    draw_arrow(ax, 23, 65, 26, 65)
    draw_label(ax, 24.5, 67, 'scene\nstate', 6)
    draw_arrow(ax, 46, 65, 49, 65)
    draw_label(ax, 47.5, 67, 'light\nrefs', 6)
    draw_arrow(ax, 69, 65, 72, 65)
    draw_label(ax, 70.5, 67, 'camera\ntransform', 6)

    # Output layer
    draw_box(ax, 3, 22, 94, 20,
             'RENDERING OUTPUT LAYER\n'
             '┌─────────────────────────────────────────────────────────────────────────────────────────┐\n'
             '│  WebGL Render Pipeline (R3F/Three.js)  │  Post-Processing (EffectComposer)  │  Canvas CaptureStream  │\n'
             '├─────────────────────────────────────────────────────────────────────────────────────────┤\n'
             '│  Snapshot (PNG → image output port)  │  Video Recording (WebM VP9 → video output port)  │  PiP Live Preview  │\n'
             '└─────────────────────────────────────────────────────────────────────────────────────────┘', True, 7)

    # Input port (left)
    draw_box(ax, 3, 4, 20, 12, 'INPUT:\nmodel-in port\n(model_3d type)\n← from Tripo3D\n  AI generated\n  model', True, 7)
    draw_arrow(ax, 23, 10, 50, 22)

    # 2D node flow (right)
    draw_box(ax, 65, 4, 32, 12, 'OUTPUT → 2D NODE FLOW:\nimage port → Image Gen node\nvideo port → Video Gen node\nlighting params → style injection', False, 7)
    draw_arrow(ax, 65, 10, 60, 22)

    save(fig, 'fig10_3d_editor_internal.png')


# ═══════════════════════════════════════════════════════════
# FIGURE 11: Closed-Loop Pipeline Sequence Diagram
# ═══════════════════════════════════════════════════════════
def fig11():
    fig, ax = new_fig(20, 15, 'FIG. 11: AI Generation → 3D Editing → AI Re-Generation Closed-Loop Pipeline')

    # Lifelines
    lifelines = [
        ('Creator', 3), ('Canvas\nAgent', 20), ('Tripo3D\nAI Model\nGeneration', 40),
        ('Scene3D\nEditor', 60), ('Image\nGeneration\n(2D)', 80), ('Video\nGeneration\n(2D)', 95)
    ]
    for name, x in lifelines:
        ax.plot([x, x], [12, 88], 'k-', lw=1)
        ax.plot([x, x], [84, 88], 'k-', lw=2)
        draw_label(ax, x, 86, name, 6, bold=True)

    # ── Phase 1: AI 3D Model Generation ──
    draw_bracket(ax, 1, 72, 98, 14, 'PHASE 1: AI 3D MODEL GENERATION', 8)
    draw_arrow(ax, 3, 80, 20, 80)
    draw_label(ax, 11, 82, '1. Input text:\n"medieval\narmchair"', 6)
    draw_arrow(ax, 20, 76, 40, 76)
    draw_label(ax, 30, 78, '2. Agent routes to\nTripo3D: Text-to-3D\nhigh-precision + PBR', 5)
    # Self-arrow for generation
    ax.annotate('', xy=(43, 72), xytext=(37, 72), arrowprops=dict(arrowstyle='->', lw=1, color='gray'))
    draw_label(ax, 40, 70, '3. Generate\n(polling)', 5)
    draw_arrow(ax, 40, 66, 20, 66)
    draw_label(ax, 30, 68, '4. Completed:\nGLB saved to\nasset library', 5)

    # ── Phase 2: Auto-Import ──
    draw_bracket(ax, 1, 52, 98, 14, 'PHASE 2: AUTO-IMPORT INTO 3D SCENE EDITOR', 8)
    draw_arrow(ax, 20, 60, 60, 60)
    draw_label(ax, 40, 62, '5. Agent auto-imports:\nvalidate → load GLB →\nstandardize PBR →\nbounding box → scale →\nplace at scene origin', 5)
    ax.annotate('', xy=(63, 56), xytext=(57, 56), arrowprops=dict(arrowstyle='->', lw=1, color='gray'))
    draw_label(ax, 60, 54, '6. Creator opens\n3D editor', 5)

    # ── Phase 3: Lighting + Camera ──
    draw_bracket(ax, 1, 38, 98, 14, 'PHASE 3: CINEMATIC LIGHTING + MULTI-CAMERA SETUP', 8)
    ax.annotate('', xy=(63, 46), xytext=(57, 46), arrowprops=dict(arrowstyle='->', lw=1, color='gray'))
    draw_label(ax, 60, 48, '7. Select lighting\npreset + deploy\n3 cameras', 5)
    draw_arrow(ax, 60, 42, 80, 42)
    draw_label(ax, 70, 44, '8. Agent injects\nlighting params as\nstructured prefix\ninto Image Gen', 5)

    # ── Phase 4: Render Output ──
    draw_bracket(ax, 1, 24, 98, 14, 'PHASE 4: 3D→2D RENDER OUTPUT', 8)
    draw_arrow(ax, 60, 32, 80, 32)
    draw_label(ax, 70, 34, '9. Snapshot (PNG)\n→ image port', 5)
    draw_arrow(ax, 60, 28, 95, 28)
    draw_label(ax, 77, 30, '10. Video recording\n(WebM VP9)\n→ video port', 5)

    # ── Phase 5: Iterative Loop ──
    draw_bracket(ax, 1, 6, 98, 16, 'PHASE 5: ITERATIVE CLOSED LOOP', 8)
    ax.annotate('', xy=(22, 16), xytext=(18, 16), arrowprops=dict(arrowstyle='->', lw=1.5, color='black'))
    draw_label(ax, 20, 19, '11. If unsatisfied:\nswitch lighting preset\n→ Agent auto-updates\n3D scene + re-renders\n→ downstream auto-refreshes', 5)

    # Iteration feedback arrow (right side loop)
    ax.annotate('', xy=(92, 25), xytext=(50, 55),
                arrowprops=dict(arrowstyle='->', lw=1.5, color='black', connectionstyle='arc3,rad=-.4'))
    draw_label(ax, 70, 12, 'ITERATIVE\nFEEDBACK\nLOOP', 7, bold=True)

    save(fig, 'fig11_closed_loop_pipeline.png')


# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════
if __name__ == '__main__':
    print(f'Generating patent figures → {OUTPUT_DIR}\n')
    fig1()
    fig2()
    fig3()
    fig4()
    fig5()
    fig6()
    fig7()
    fig8()
    fig9()
    fig10()
    fig11()
    print(f'\n[DONE] All 11 figures saved to {OUTPUT_DIR}')
