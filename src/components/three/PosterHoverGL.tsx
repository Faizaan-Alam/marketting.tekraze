"use client";

/**
 * Liquid ripple on card posters (skills: threejs-shaders, threejs-materials, threejs-textures,
 * threejs-performance).
 *
 * ONE WebGL renderer for the whole page. On hover its canvas is moved inside the hovered poster
 * (so it inherits the card's 3D tilt) and draws that poster's art through a ripple shader that
 * follows the cursor. The poster SVG underneath stays as the 2D fallback: if WebGL fails or the
 * context is lost, nothing changes visually except the ripple. Textures are rasterised from the
 * poster's own inline SVG (no network), cached, and disposed on unmount.
 */
import { useEffect } from "react";
import * as THREE from "three";
import { ensureGsap } from "@/lib/client/motion";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform sampler2D uTex;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    vec2 d = uv - uMouse;
    d.x *= uAspect;
    float dist = length(d);
    float falloff = smoothstep(0.6, 0.0, dist);
    float ripple = sin(dist * 30.0 - uTime * 5.5) * 0.011 * falloff;
    vec2 dir = d / max(dist, 1e-4);
    dir.x /= uAspect;
    vec2 offs = dir * ripple * uHover;
    offs += vec2(sin(uv.y * 9.0 + uTime * 1.4), cos(uv.x * 9.0 + uTime * 1.2)) * 0.0035 * uHover;
    float r = texture2D(uTex, uv + offs * 1.5).r;
    float g = texture2D(uTex, uv + offs).g;
    float b = texture2D(uTex, uv + offs * 0.55).b;
    vec3 col = vec3(r, g, b) + falloff * 0.06 * uHover;
    gl_FragColor = vec4(col, uHover);
  }
`;

async function rasterise(svg: SVGSVGElement, w: number, h: number): Promise<THREE.Texture> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const img = new Image(w, h);
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PosterHoverGL() {
  useEffect(() => {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
        premultipliedAlpha: false,
      });
    } catch {
      return; // no WebGL: the SVG posters remain as they are
    }
    const gsap = ensureGsap();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = "gl-poster";
    canvas.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTex: { value: null as THREE.Texture | null },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uTime: { value: 0 },
      uAspect: { value: 16 / 9 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    const cache = new Map<string, Promise<THREE.Texture>>();
    let current: HTMLElement | null = null;
    let target = 0;
    let lost = false;
    let running = false;

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      canvas.remove();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const tick = (time: number) => {
      if (!current || lost) return;
      uniforms.uHover.value += (target - uniforms.uHover.value) * 0.12;
      uniforms.uTime.value = time;
      renderer.render(scene, camera);
      if (target === 0 && uniforms.uHover.value < 0.01) {
        canvas.remove();
        current = null;
        gsap.ticker.remove(tick);
        running = false;
      }
    };

    const attach = async (poster: HTMLElement) => {
      const svg = poster.querySelector("svg");
      if (!svg || lost) return;
      const w = Math.max(1, poster.clientWidth);
      const h = Math.max(1, poster.clientHeight);
      const tw = 512;
      const th = Math.round((512 * h) / w);
      const key = `${svg.querySelector("linearGradient")?.id ?? ""}:${tw}x${th}`;
      let promise = cache.get(key);
      if (!promise) {
        promise = rasterise(svg, tw, th);
        cache.set(key, promise);
      }
      let tex: THREE.Texture;
      try {
        tex = await promise;
      } catch {
        return;
      }
      if (current !== poster) return; // pointer moved on while loading
      uniforms.uTex.value = tex;
      uniforms.uAspect.value = w / h;
      renderer.setSize(w, h, false);
      svg.after(canvas);
      target = 1;
      if (!running) {
        running = true;
        gsap.ticker.add(tick);
      }
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const poster = (e.target as Element | null)?.closest<HTMLElement>("[data-gl-poster]");
      if (!poster || poster === current) return;
      if (current) {
        canvas.remove();
        uniforms.uHover.value = 0;
      }
      current = poster;
      target = 0;
      void attach(poster);
    };
    const onOut = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget as Node | null;
      if (to && current.contains(to)) return;
      const from = (e.target as Element | null)?.closest("[data-gl-poster]");
      if (from === current) target = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!current) return;
      const r = current.getBoundingClientRect();
      uniforms.uMouse.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      gsap.ticker.remove(tick);
      canvas.remove();
      void Promise.all(cache.values()).then(
        (texs) => texs.forEach((t) => t.dispose()),
        () => undefined,
      );
      material.dispose();
      geometry.dispose();
      renderer.dispose();
    };
  }, []);
  return null;
}
