"use client";

import { useRef, useEffect, useState, useCallback, useTransition } from "react";
import { createOrbScene, type OrbSceneApi } from "@/lib/orbScene";
import { HandTracker, type HandTrackerUpdate } from "@/lib/handTracker";
import ChatPanel from "./ChatPanel";

type InputMode = "hands" | "pointer";

export default function JarvisOrb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const orb = useRef<OrbSceneApi | null>(null);
  const handTracker = useRef<HandTracker | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>("pointer");
  const [isPinching, setIsPinching] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [, startTransition] = useTransition();
  const [mouseDown, setMouseDown] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    orb.current = createOrbScene(containerRef.current);
    return () => {
      orb.current?.dispose();
      orb.current = null;
    };
  }, []);

  const handleCameraToggle = useCallback(() => {
    startTransition(async () => {
      if (cameraActive) {
        handTracker.current?.stop();
        setCameraActive(false);
        setCameraReady(false);
      } else {
        if (!videoRef.current) return;
        try {
          const tracker = new HandTracker(videoRef.current, (update) => {
            setIsPinching(update.pinching);
            setHandCount(update.hands);
            if (inputMode === "hands" && update.position && update.pinching) {
              const normX = (update.position.x - 0.5) * 0.6;
              const normY = (update.position.y - 0.5) * 0.4;
              setRotation((prev) => ({
                x: prev.x + normY * 0.04,
                y: prev.y + normX * 0.05
              }));
              orb.current?.setRotation(
                rotation.x + normY * 0.04,
                rotation.y + normX * 0.05
              );
            }
            if (inputMode === "hands" && update.twoHandSpan !== null) {
              const span = update.twoHandSpan;
              setZoom((prev) => Math.max(0.68, Math.min(1.55, prev + (0.5 - span) * 0.08)));
              orb.current?.setZoom(Math.max(0.68, Math.min(1.55, zoom + (0.5 - span) * 0.08)));
            }
          });
          await tracker.start();
          handTracker.current = tracker;
          setCameraActive(true);
          setCameraReady(true);
        } catch (error) {
          alert(`Camera error: ${error instanceof Error ? error.message : "unknown error"}`);
          setCameraReady(false);
        }
      }
    });
  }, [cameraActive, inputMode, rotation, zoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "G") {
        setInputMode((prev) => (prev === "hands" ? "pointer" : "hands"));
      }
      if (e.key === "r" || e.key === "R") {
        setRotation({ x: 0.12, y: 0.3 });
        setZoom(1);
        orb.current?.setRotation(0.12, 0.3);
        orb.current?.setZoom(1);
      }
      if (e.key === "+") {
        setZoom((z) => Math.min(1.55, z + 0.08));
        orb.current?.setZoom(Math.min(1.55, zoom + 0.08));
      }
      if (e.key === "-") {
        setZoom((z) => Math.max(0.68, z - 0.08));
        orb.current?.setZoom(Math.max(0.68, zoom - 0.08));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (inputMode !== "pointer") return;
      setMouseDown(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDown || inputMode !== "pointer") return;
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      const newRot = {
        x: rotation.x + dy * 0.005,
        y: rotation.y + dx * 0.005
      };
      setRotation(newRot);
      orb.current?.setRotation(newRot.x, newRot.y);
      setLastMouse({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setMouseDown(false);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const newZoom = Math.max(0.68, Math.min(1.55, zoom + delta));
      setZoom(newZoom);
      orb.current?.setZoom(newZoom);
    };

    const handle = containerRef.current;
    if (handle) {
      handle.addEventListener("mousedown", handleMouseDown, false);
      handle.addEventListener("mousemove", handleMouseMove, false);
      handle.addEventListener("mouseup", handleMouseUp, false);
      handle.addEventListener("wheel", handleWheel, { passive: false });

      handle.addEventListener("touchstart", (e: TouchEvent) => {
        if (inputMode !== "pointer") return;
        if (e.touches.length === 1) {
          setMouseDown(true);
          setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        } else if (e.touches.length === 2) {
          setMouseDown(false);
        }
      }, false);

      handle.addEventListener("touchmove", (e: TouchEvent) => {
        if (!mouseDown || inputMode !== "pointer" || e.touches.length !== 1) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - lastMouse.x;
        const dy = e.touches[0].clientY - lastMouse.y;
        const newRot = {
          x: rotation.x + dy * 0.005,
          y: rotation.y + dx * 0.005
        };
        setRotation(newRot);
        orb.current?.setRotation(newRot.x, newRot.y);
        setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }, { passive: false });

      handle.addEventListener("touchend", () => setMouseDown(false), false);
    }

    return () => {
      if (handle) {
        handle.removeEventListener("mousedown", handleMouseDown);
        handle.removeEventListener("mousemove", handleMouseMove);
        handle.removeEventListener("mouseup", handleMouseUp);
        handle.removeEventListener("wheel", handleWheel);
      }
    };
  }, [mouseDown, lastMouse, rotation, zoom, inputMode]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-void flex flex-col">
      <div
        ref={containerRef}
        className="orb-stage relative flex-1"
        role="main"
        aria-label="Holographic interface stage"
      />

      <video
        ref={videoRef}
        className="fixed bottom-20 right-6 w-48 h-32 rounded border border-orange-600/40 bg-black/80 hidden"
        aria-hidden="true"
      />

      <div className="fixed top-4 left-4 flex flex-col gap-3 z-20 pointer-events-auto">
        <div className="hud-panel p-3 flex items-start gap-2">
          <span className="micro-label">MODE</span>
          <button
            onClick={() => setInputMode(inputMode === "pointer" ? "hands" : "pointer")}
            className="hud-button"
            aria-pressed={inputMode === "hands"}
            title="G key"
          >
            {inputMode === "hands" ? "HAND / ACTIVE" : "POINTER / READY"}
          </button>
        </div>
        <div className="hud-panel p-3 flex items-start gap-2">
          <span className="micro-label">CAMERA</span>
          <button
            onClick={handleCameraToggle}
            disabled={!cameraReady && cameraActive}
            className="hud-button"
            aria-pressed={cameraActive}
          >
            {cameraActive ? `ACTIVE / ${handCount} HAND` : "ENABLE CAMERA"}
          </button>
        </div>
        <div className="hud-panel p-3 space-y-1.5">
          <span className="micro-label block">CONTROLS</span>
          <div className="space-y-0.5 text-xs text-muted">
            <div>G: toggle gestures</div>
            <div>R: reset view</div>
            <div>+/-: zoom</div>
            <div>Drag: rotate</div>
          </div>
        </div>
      </div>

      <ChatPanel />
    </div>
  );
}
