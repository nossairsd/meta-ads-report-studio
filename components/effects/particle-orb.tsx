"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Program, Mesh, Sphere } from "ogl";

// Ashima / Stefan Gustavson simplex noise, used to displace the shell so the
// orb breathes instead of being a rigid sphere.
const SIMPLEX = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const vertex = `#version 300 es
in vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uPointSize;
uniform float uRadius;
uniform float uNoiseScale;
uniform float uDisplace;
out float vDepth;
out float vDisp;

${SIMPLEX}

void main() {
  vec3 dir = normalize(position);

  // Two noise octaves at different speeds keep the surface from looping
  // visibly, so the motion reads as organic rather than mechanical.
  float n1 = snoise(dir * uNoiseScale + vec3(0.0, 0.0, uTime * 0.22));
  float n2 = snoise(dir * (uNoiseScale * 2.3) + vec3(uTime * 0.14, 0.0, 0.0));
  float disp = n1 * 0.72 + n2 * 0.28;
  vDisp = clamp(disp * 0.5 + 0.5, 0.0, 1.0);

  vec3 displaced = dir * (uRadius + disp * uDisplace);
  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vDepth = -mv.z;

  // Crests get bigger points, troughs smaller — adds visible relief
  gl_PointSize = (uPointSize * (0.55 + vDisp * 1.0)) / max(vDepth, 0.1);
  gl_Position = projectionMatrix * mv;
}
`;

const fragment = `#version 300 es
precision highp float;
in float vDepth;
in float vDisp;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uHighlight;
uniform float uOpacity;
out vec4 fragColor;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float edge = smoothstep(0.5, 0.22, d);

  float depth = clamp((6.9 - vDepth) / 3.4, 0.06, 1.0);
  vec3 col = mix(uColor, uAccent, smoothstep(0.35, 0.75, vDisp));
  col = mix(col, uHighlight, smoothstep(0.82, 1.0, vDisp));

  fragColor = vec4(col, edge * depth * uOpacity);
}
`;

/**
 * Particle orb: a sphere of points displaced by simplex noise, rendered with a
 * perspective camera. Real 3D geometry, not a 2D illusion.
 */
export default function ParticleOrb({
  color = "#1D4ED8",
  accent = "#60A5FA",
  highlight = "#E0F2FE",
  opacity = 0.95,
  pointSize = 10,
  radius = 1.35,
  displace = 0.34,
  noiseScale = 1.5,
  speed = 0.0013,
  className = "",
}: {
  color?: string;
  accent?: string;
  highlight?: string;
  opacity?: number;
  pointSize?: number;
  radius?: number;
  displace?: number;
  noiseScale?: number;
  speed?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hexToRgb = (hex: string): [number, number, number] => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return [1, 1, 1];
      return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
    };

    // WebGL2 isn't available everywhere (older Safari, disabled GPUs, jsdom in
    // tests) — fail silently rather than crashing the section.
    let renderer: InstanceType<typeof Renderer>;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const camera = new Camera(gl, { fov: 35 });
    camera.position.set(0, 0, 5);

    const scene = new Transform();
    const geometry = new Sphere(gl, { radius: 1, widthSegments: 96, heightSegments: 64 });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uPointSize: { value: pointSize * dpr },
        uRadius: { value: radius },
        uNoiseScale: { value: noiseScale },
        uDisplace: { value: displace },
        uColor: { value: new Float32Array(hexToRgb(color)) },
        uAccent: { value: new Float32Array(hexToRgb(accent)) },
        uHighlight: { value: new Float32Array(hexToRgb(highlight)) },
        uOpacity: { value: opacity },
      },
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });
    mesh.rotation.x = 0.38;
    mesh.setParent(scene);

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const t0 = performance.now();

    const loop = (t: number) => {
      const elapsed = (t - t0) * 0.001;
      (program.uniforms.uTime as { value: number }).value = elapsed;
      mesh.rotation.y += speed;
      // Slow vertical sway so the silhouette never sits perfectly still
      mesh.rotation.x = 0.38 + Math.sin(elapsed * 0.25) * 0.07;
      renderer.render({ scene, camera });
      raf = requestAnimationFrame(loop);
    };
    const tryStart = () => {
      if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
    };
    const tryStop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) tryStart();
        else tryStop();
      },
      { threshold: 0 }
    );
    io.observe(container);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    tryStart();

    return () => {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        container.removeChild(canvas);
      } catch {
        // already detached
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [color, accent, highlight, opacity, pointSize, radius, displace, noiseScale, speed]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
