/* === PlaybackEngine — sequential clip playback with crossFade === */
import * as THREE from 'three';
import { AnimationTimeline, ClipBlock } from './shared';
import { clipLibrary } from './ClipLibrary';

export class PlaybackEngine {
  mixer: THREE.AnimationMixer | null = null;
  private timeline: AnimationTimeline | null = null;
  private activeActions: { action: THREE.AnimationAction; block: ClipBlock; endTime: number }[] = [];
  private currentTime = 0;
  private playing = false;

  /** Bind to a skinned mesh and its timeline. Call once per figure change. */
  bind(mesh: THREE.Object3D, timeline: AnimationTimeline) {
    this.stop();
    this.mixer = new THREE.AnimationMixer(mesh);
    this.timeline = timeline;
  }

  /** Start or resume playback from the given time. */
  play(fromTime = 0) {
    if (!this.mixer || !this.timeline) return;
    this.playing = true;
    this.currentTime = fromTime;
    this.scheduleBlocks();
  }

  pause() { this.playing = false; }

  stop() {
    this.playing = false;
    this.currentTime = 0;
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
    }
    this.activeActions = [];
    this.mixer = null;
  }

  /** Advance the mixer by delta seconds. Call from useFrame. */
  update(delta: number) {
    if (!this.playing || !this.mixer) return;
    this.currentTime += delta;
    this.mixer.update(delta);

    // Clean up finished actions
    this.activeActions = this.activeActions.filter(a => {
      if (this.currentTime >= a.endTime) {
        a.action.fadeOut(0.1);
        return false;
      }
      return true;
    });

    // Schedule new blocks that start within this time window
    this.scheduleBlocks();
  }

  seek(time: number) {
    if (!this.mixer || !this.timeline) return;
    this.mixer.stopAllAction();
    this.activeActions = [];
    this.currentTime = time;
    // Jump-start: find the active block and seek within it
    for (const block of this.timeline.blocks) {
      const clip = clipLibrary.get(block.clipId);
      if (!clip) continue;
      const blockDur = (clip.duration / block.timeScale) * block.repeatCount;
      const blockEnd = block.startTime + blockDur;
      if (time >= block.startTime && time < blockEnd) {
        const localTime = time - block.startTime;
        const action = this.mixer.clipAction(clip.clip);
        action.reset();
        action.time = localTime * block.timeScale;
        action.setEffectiveTimeScale(block.timeScale);
        action.setLoop(THREE.LoopRepeat, block.repeatCount);
        action.play();
        this.activeActions.push({ action, block, endTime: blockEnd });
        break; // Only one block active at a time for now
      }
    }
    this.mixer.update(0);
  }

  /** Release all resources */
  dispose() {
    this.stop();
    this.timeline = null;
  }

  // ─── Private ───

  private scheduleBlocks() {
    if (!this.mixer || !this.timeline) return;
    const scheduledIds = new Set(this.activeActions.map(a => a.block.id));

    for (const block of this.timeline.blocks) {
      if (scheduledIds.has(block.id)) continue;

      const clip = clipLibrary.get(block.clipId);
      if (!clip) continue;

      const blockDur = (clip.duration / block.timeScale) * block.repeatCount;
      const blockEnd = block.startTime + blockDur;

      // Start if currentTime is within the block window
      if (this.currentTime >= block.startTime - block.crossfadeDuration && this.currentTime < blockEnd) {
        const action = this.mixer.clipAction(clip.clip);
        action.reset();
        action.setEffectiveTimeScale(block.timeScale);
        action.setLoop(THREE.LoopRepeat, block.repeatCount);

        // Apply root offset (correct foot sliding and position)
        if (block.rootOffsetY !== 0 || block.rootOffsetX !== 0) {
          // Root offset is applied at play start via the animation's root bone
          const root = this.mixer.getRoot();
          if (root) {
            root.position.x += block.rootOffsetX;
            root.position.y += block.rootOffsetY;
          }
        }

        // Crossfade from previous action
        const prevAction = this.activeActions.length > 0 ? this.activeActions[this.activeActions.length - 1].action : null;
        if (prevAction && block.crossfadeDuration > 0) {
          action.crossFadeFrom(prevAction, block.crossfadeDuration, false);
        } else {
          action.fadeIn(0.05);
        }

        action.play();
        this.activeActions.push({ action, block, endTime: blockEnd });
        scheduledIds.add(block.id);
      }
    }
  }
}
