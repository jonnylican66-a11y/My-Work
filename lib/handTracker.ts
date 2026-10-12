import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult
} from "@mediapipe/tasks-vision";

export type HandTrackerUpdate = {
  pinching: boolean;
  position: { x: number; y: number } | null;
  twoHandSpan: number | null;
  hands: number;
};

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const PINCH_START = 0.045;
const PINCH_END = 0.065;

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private frame = 0;
  private running = false;
  private pinchState: boolean[] = [];
  private lastTimestamp = -1;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly onUpdate: (update: HandTrackerUpdate) => void
  ) {}

  async start(): Promise<void> {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support webcam access.");
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
    });
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();

    try {
      const files = await FilesetResolver.forVisionTasks(WASM_ROOT);
      this.landmarker = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    } catch (error) {
      this.stop();
      throw new Error(
        `Could not initialize hand tracking: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }

    this.running = true;
    this.pinchState = [];
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.landmarker?.close();
    this.landmarker = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.pinchState = [];
    this.onUpdate({ pinching: false, position: null, twoHandSpan: null, hands: 0 });
  }

  private loop = (): void => {
    if (!this.running || !this.landmarker) return;
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const timestamp = Math.max(performance.now(), this.lastTimestamp + 1);
      this.lastTimestamp = timestamp;
      const result: HandLandmarkerResult = this.landmarker.detectForVideo(this.video, timestamp);
      this.publish(result);
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private publish(result: HandLandmarkerResult): void {
    const hands = result.landmarks;
    const pinchStates = hands.map((landmarks, index) => {
      const thumb = landmarks[4];
      const indexTip = landmarks[8];
      const pinchDistance = distance(thumb, indexTip);
      const wasPinching = this.pinchState[index] ?? false;
      return wasPinching ? pinchDistance < PINCH_END : pinchDistance < PINCH_START;
    });
    this.pinchState = pinchStates;

    const firstHand = hands[0];
    const thumb = firstHand?.[4];
    const indexTip = firstHand?.[8];
    const midpoint = thumb && indexTip
      ? {
          x: 1 - (thumb.x + indexTip.x) / 2,
          y: (thumb.y + indexTip.y) / 2
        }
      : null;

    const twoHandsPinched = hands.length > 1 && pinchStates[0] && pinchStates[1];
    const span = twoHandsPinched
      ? distance(hands[0][8], hands[1][8])
      : null;

    this.onUpdate({
      pinching: pinchStates[0] ?? false,
      position: midpoint,
      twoHandSpan: span,
      hands: hands.length
    });
  }
}
