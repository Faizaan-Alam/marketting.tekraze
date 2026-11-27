"use client";

/**
 * Hero "service constellation" (skills: threejs-react-three-fiber, threejs-fundamentals,
 * threejs-performance, threejs-lighting, threejs-materials).
 *
 * Five glassy-metal tiles, one per category. The tile of the episode on screen swings forward
 * and lights up; in the finale they stack into one deck — the Growth Bundle. So the 3D carries
 * the page's structure, not just decoration.
 *
 * Performance: frameloop="never" — frames are advanced from the shared GSAP ticker only while
 * the hero is on screen; one shared RoundedBox geometry, one shared plane, a single Points draw
 * call for dust, DPR clamped and lowered by PerformanceMonitor, everything disposed on unmount.
 * No remote assets: no Environment presets, no drei <Text> (its default font is fetched from a
 * CDN); labels are drawn to CanvasTextures with the self-hosted display font.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { categories } from "@/content/services";
import { detectCapabilities } from "@/lib/client/capabilities";
import { ensureGsap, trailerState } from "@/lib/client/motion";

const BANDS = [0, 0.14, 0.29, 0.44, 0.59, 0.74, 0.87, 1];
const TILE_W = 1.7;
const TILE_H = 1.06;

function TickerDriver({ active }: { active: boolean }) {
  const advance = useThree((s) => s.advance);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    const gsap = ensureGsap();
    const tick = (time: number) => {
      if (activeRef.current && document.visibilityState === "visible") advance(time * 1000);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance]);
  return null;
}

function displayFontFamily(): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-big-shoulders")
    .trim();
  return v || "Impact, sans-serif";
}

function makeLabel(episode: number, title: string, hue: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const family = displayFontFamily();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `hsl(${hue} 90% 62%)`;
    ctx.font = `800 64px ${family}`;
    ctx.fillText(`EP ${episode}`, 64, 112);
    ctx.fillStyle = "#eee8e1";
    ctx.font = `800 132px ${family}`;
    const words = title.toUpperCase().split(" ");
    let line = "";
    let y = 300;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > 880 && line) {
        ctx.fillText(line, 64, y);
        line = w;
        y += 132;
      } else line = test;
    }
    ctx.fillText(line, 64, y);
    ctx.fillStyle = `hsl(${hue} 90% 62%)`;
    ctx.fillRect(64, 560, 180, 10);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Continuous episode position from scroll progress: 0..4 across the five episodes. */
function episodeFromProgress(p: number): { e: number; idle: number; finale: number } {
  const first = BANDS[1]!;
  const last = BANDS[6]!;
  const e = Math.min(4, Math.max(0, ((p - first) / (last - first)) * 5 - 0.5));
  const idle = Math.max(0, Math.min(1, 1 - (p - first * 0.6) / (first * 0.6)));
  const finale = Math.max(0, Math.min(1, (p - last) / ((1 - last) * 0.6)));
  return { e, idle, finale };
}

function Constellation() {
  const group = useRef<THREE.Group>(null);
  const tiles = useRef<Array<THREE.Group | null>>([]);
  const mats = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const { viewport } = useThree();
  const layout: { position: [number, number, number]; scale: number } =
    viewport.aspect < 1
      ? { position: [0.2, 1.45, -3.2], scale: 0.55 }
      : viewport.aspect < 1.5
        ? { position: [viewport.width * 0.24, 0.75, -2.2], scale: 0.66 }
        : { position: [viewport.width * 0.33, 0.45, -1.2], scale: 0.78 };

  const geometry = useMemo(() => new RoundedBoxGeometry(TILE_W, TILE_H, 0.07, 4, 0.06), []);
  const plane = useMemo(() => new THREE.PlaneGeometry(TILE_W * 0.9, TILE_H * 0.9), []);
  const labels = useMemo(() => categories.map((c) => makeLabel(c.episode, c.title, c.hue)), []);
  useEffect(
    () => () => {
      geometry.dispose();
      plane.dispose();
      labels.forEach((t) => t.dispose());
    },
    [geometry, plane, labels],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { e, idle, finale } = episodeFromProgress(trailerState.progress);
    const t = state.clock.elapsedTime;
    tiles.current.forEach((tile, i) => {
      if (!tile) return;
      // idle: gentle orbit of the whole arc; episodes: active tile forward; finale: stacked deck
      const centre = THREE.MathUtils.lerp(e, 2 + Math.sin(t * 0.22) * 1.6, idle);
      const d = i - centre;
      const ad = Math.abs(d);
      // a fanned deck angled toward the copy on the left; the active card comes forward
      let x = d * 1.12;
      let y = -d * 0.06 + Math.sin(t * 0.6 + i) * 0.05;
      let z = -ad * 1.15 - idle * 0.6;
      let ry = -0.5 - d * 0.14;
      let rx = 0;
      let s = 1 - Math.min(ad, 2) * 0.16;
      if (finale > 0) {
        x = THREE.MathUtils.lerp(x, (i - 2) * 0.14, finale);
        y = THREE.MathUtils.lerp(y, (i - 2) * 0.11, finale);
        z = THREE.MathUtils.lerp(z, -(4 - i) * 0.22, finale);
        ry = THREE.MathUtils.lerp(ry, -0.42, finale);
        rx = THREE.MathUtils.lerp(rx, 0.12, finale);
        s = THREE.MathUtils.lerp(s, 1.04, finale);
      }
      const k = 5;
      tile.position.x = THREE.MathUtils.damp(tile.position.x, x, k, dt);
      tile.position.y = THREE.MathUtils.damp(tile.position.y, y, k, dt);
      tile.position.z = THREE.MathUtils.damp(tile.position.z, z, k, dt);
      tile.rotation.y = THREE.MathUtils.damp(tile.rotation.y, ry, k, dt);
      tile.rotation.x = THREE.MathUtils.damp(tile.rotation.x, rx, k, dt);
      tile.scale.setScalar(THREE.MathUtils.damp(tile.scale.x, s, k, dt));
      const mat = mats.current[i];
      if (mat) {
        const glow = Math.max(0.08, 1 - Math.min(ad, 1)) * (idle > 0.5 ? 0.45 : 1);
        mat.emissiveIntensity = THREE.MathUtils.damp(
          mat.emissiveIntensity,
          glow * 0.9 + finale * 0.5,
          4,
          dt,
        );
      }
    });
    if (group.current) {
      const px = trailerState.pointerX;
      const py = trailerState.pointerY;
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, px * 0.18, 3, dt);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -py * 0.1, 3, dt);
    }
  });

  return (
    <group ref={group} position={layout.position} scale={layout.scale}>
      {categories.map((c, i) => (
        <group
          key={c.id}
          ref={(el) => {
            tiles.current[i] = el;
          }}
          position={[(i - 2) * 1.9, 0, 0]}
        >
          <mesh geometry={geometry}>
            <meshStandardMaterial
              ref={(el) => {
                mats.current[i] = el;
              }}
              color="#121014"
              metalness={0.8}
              roughness={0.26}
              emissive={new THREE.Color().setHSL(c.hue / 360, 0.85, 0.45)}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh geometry={plane} position={[0, 0, 0.04]}>
            <meshBasicMaterial map={labels[i]} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    // deterministic PRNG (mulberry32) keeps render pure and the field identical on every mount
    let seed = 0x7e4a2;
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (rand() - 0.5) * 16;
      pos[i * 3 + 1] = (rand() - 0.5) * 9;
      pos[i * 3 + 2] = -rand() * 8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += Math.min(delta, 0.05) * 0.015;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.025}
        color="#eee8e1"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

export default function HeroScene({ active, onReady }: { active: boolean; onReady: () => void }) {
  const tier = detectCapabilities().tier;
  const [dpr, setDpr] = useState<number | [number, number]>(tier === "high" ? [1, 1.75] : 1);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let live = true;
    void document.fonts.ready.then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      trailerState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      trailerState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      trailerState.pointerX = Math.max(-1, Math.min(1, e.gamma / 30));
      trailerState.pointerY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);

  return (
    <Canvas
      frameloop="never"
      dpr={dpr}
      camera={{ position: [0, 0, 7], fov: 35 }}
      gl={{ antialias: tier === "high", alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <TickerDriver active={active} />
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => tier === "high" && setDpr([1, 1.75])}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <pointLight position={[-3, 1.5, 3]} intensity={18} color="#f2243a" distance={14} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 3, 4]} scale={[8, 1.2, 1]} />
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#f2243a"
          position={[-5, 0, 2]}
          rotation-y={Math.PI / 2}
          scale={[4, 6, 1]}
        />
        <Lightformer form="circle" intensity={0.8} position={[4, -1, 3]} scale={2} />
      </Environment>
      {fontsReady ? <Constellation /> : null}
      <Dust count={tier === "high" ? 700 : 300} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
