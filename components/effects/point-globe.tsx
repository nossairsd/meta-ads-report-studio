"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Program, Mesh, Sphere } from "ogl";

const vertex = `#version 300 es
in vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uPointSize;
out float vDepth;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_PointSize = uPointSize / max(vDepth, 0.1);
  gl_Position = projectionMatrix * mv;
}
`;

const fragment = `#version 300 es
precision highp float;
in float vDepth;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uOpacity;
out vec4 fragColor;

void main() {
  // Round off the square point sprite
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float edge = smoothstep(0.5, 0.32, d);

  // Points further from the camera fade out, which is what reads as depth
  float depth = clamp((6.5 - vDepth) / 3.2, 0.10, 1.0);
  vec3 col = mix(uColor, uAccent, depth);
  fragColor = vec4(col, edge * depth * uOpacity);
}
`;

/**
 * Rotating point-cloud globe. Real 3D (perspective camera + sphere geometry
 * drawn as GL_POINTS), not a 2D illusion.
 */
export default function PointGlobe({
  color = "#2563EB",
  accent = "#93C5FD",
  opacity = 0.9,
  pointSize = 9,
  speed = 0.0016,
  className = "",
}: {
  color?: string;
  accent?: string;
  opacity?: number;
  pointSize?: number;
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
    // tests) — fail silently rather than crashing the footer.
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
    const geometry = new Sphere(gl, { radius: 1.35, widthSegments: 64, heightSegments: 40 });

    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      uniforms: {
        uPointSize: { value: pointSize * Math.min(window.devicePixelRatio || 1, 2) },
        uColor: { value: new Float32Array(hexToRgb(color)) },
        uAccent: { value: new Float32Array(hexToRgb(accent)) },
        uOpacity: { value: opacity },
      },
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });
    mesh.rotation.x = 0.42;
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

    const loop = () => {
      mesh.rotation.y += speed;
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
  }, [color, accent, opacity, pointSize, speed]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
