"use client";

import { useEffect, useRef } from "react";

const ARTWORK = "1787632591923-45abc927-9983-4e23-a0f9-78a020e6a361.png";
const REPAIR_AREAS = [
  [
    [986, 186],
    [978, 187],
    [970, 193],
    [964, 201],
    [967, 205],
    [976, 203],
    [986, 196],
    [990, 192],
  ],
  [
    [963, 274],
    [970, 274],
    [980, 283],
    [987, 286],
    [993, 295],
    [999, 305],
    [991, 308],
    [980, 302],
    [975, 291],
    [968, 284],
  ],
];

function makeRibbon(THREE, scene, material, settings) {
  const rows = 64;
  const columns = 14;
  const geometry = new THREE.PlaneGeometry(1, 1, columns, rows);
  const positions = geometry.attributes.position;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const edges = [-1, 1].map(() => {
    const edge = new THREE.BufferGeometry();
    edge.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array((rows + 1) * 3), 3),
    );
    const line = new THREE.Line(
      edge,
      new THREE.LineBasicMaterial({
        color: "#b6a1e7",
        transparent: true,
        opacity: 0.65,
      }),
    );
    line.frustumCulled = false;
    scene.add(line);
    return line;
  });
  return (time) => {
    const phase = (time * Math.PI * 2) / 16 + settings.phase;
    for (let row = 0; row <= rows; row += 1) {
      const s = row / rows;
      const freedom = s * s;
      const width =
        settings.width * (0.5 + Math.sin(s * Math.PI) * 0.5) * (1 - s * 0.4);
      const x =
        settings.x +
        s * settings.dx +
        Math.sin(s * 5 - phase) * freedom * settings.sway;
      const y =
        settings.y +
        s * settings.dy +
        Math.sin(s * 6 - phase + 0.8) * freedom * settings.sway;
      const twist = Math.sin(s * 7 - phase) * freedom * 1.35;
      const norm = Math.hypot(settings.dx, settings.dy);
      for (let col = 0; col <= columns; col += 1) {
        const u = (col / columns) * 2 - 1;
        const across = u * width;
        const px = x - (settings.dy / norm) * across * Math.cos(twist);
        const py = y + (settings.dx / norm) * across * Math.cos(twist);
        const z =
          8 +
          Math.sin(s * 7 - phase) * freedom * 9 +
          across * Math.sin(twist) +
          Math.cos(u * Math.PI * 2 + s * 4 - phase) * (0.4 + freedom * 1.2);
        positions.setXYZ(row * (columns + 1) + col, px, -py, z);
        if (col === 0 || col === columns)
          edges[col === 0 ? 0 : 1].geometry.attributes.position.setXYZ(
            row,
            px,
            -py,
            z + 0.1,
          );
      }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    edges.forEach((edge) => {
      edge.geometry.attributes.position.needsUpdate = true;
    });
  };
}

export default function ScarfMotion({ src, imageRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!String(src).split(/[?#]/)[0].endsWith(ARTWORK)) return;
    const canvas = canvasRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let cleanup;
    async function initialize() {
      const THREE = await import("three");
      if (disposed) return;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(0, 1361, 0, -644, 0.1, 2000);
      camera.position.z = 1000;
      scene.add(new THREE.HemisphereLight("#eee3ff", "#514070", 1.8));
      const key = new THREE.DirectionalLight("#fff4e9", 2);
      key.position.set(700, 200, 500);
      scene.add(key);
      const fill = new THREE.DirectionalLight("#9fa8ff", 1);
      fill.position.set(1100, -500, 300);
      scene.add(fill);
      const silk = new THREE.MeshPhysicalMaterial({
        color: "#7866ae",
        side: THREE.DoubleSide,
        roughness: 0.48,
        metalness: 0.12,
        sheen: 1,
        sheenColor: "#c3a3ed",
        sheenRoughness: 0.6,
      });
      const animate = [
        makeRibbon(THREE, scene, silk, {
          x: 985,
          y: 190,
          dx: -56,
          dy: 18,
          width: 4.5,
          sway: 7,
          phase: 0,
        }),
        makeRibbon(THREE, scene, silk, {
          x: 969,
          y: 278,
          dx: 27,
          dy: 52,
          width: 8,
          sway: 6,
          phase: 1.4,
        }),
      ];
      let ready = false;
      let frame = 0;
      let elapsed = 0;
      let last = 0;
      let visible = true;
      let contextLost = false;
      let width = 0;
      let height = 0;
      let repairTexture;
      const repair = new Image();
      repair.onload = () => {
        if (disposed) return;
        const plate = document.createElement("canvas");
        plate.width = 1361;
        plate.height = 644;
        const ctx = plate.getContext("2d");
        ctx.beginPath();
        REPAIR_AREAS.forEach((points) => {
          ctx.moveTo(...points[0]);
          points.slice(1).forEach((point) => ctx.lineTo(...point));
          ctx.closePath();
        });
        ctx.clip();
        ctx.drawImage(repair, 900, 100, 170, 230);
        repairTexture = new THREE.CanvasTexture(plate);
        repairTexture.colorSpace = THREE.SRGBColorSpace;
        const patch = new THREE.Mesh(
          new THREE.PlaneGeometry(1361, 644),
          new THREE.MeshBasicMaterial({
            map: repairTexture,
            transparent: true,
            depthWrite: false,
          }),
        );
        patch.position.set(1361 / 2, -644 / 2, 0);
        patch.renderOrder = -1;
        scene.add(patch);
        ready = true;
        resume();
      };
      const draw = (now) => {
        frame = 0;
        if (
          disposed ||
          !ready ||
          !visible ||
          document.hidden ||
          contextLost ||
          motion.matches
        )
          return;
        elapsed += last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
        const w = canvas.clientWidth,
          h = canvas.clientHeight;
        if (!w || !h) return;
        if (w !== width || h !== height) {
          width = w;
          height = h;
          renderer.setSize(w, h, false);
        }
        const focus = getComputedStyle(imageRef.current)
          .objectPosition.split(" ")
          .map((value) => parseFloat(value) / 100);
        const scale = Math.max(w / 1361, h / 644);
        const vw = w / scale,
          vh = h / scale;
        camera.left = (1361 - vw) * focus[0];
        camera.right = camera.left + vw;
        camera.top = -(644 - vh) * focus[1];
        camera.bottom = camera.top - vh;
        camera.updateProjectionMatrix();
        animate.forEach((update) => update(elapsed));
        renderer.render(scene, camera);
        canvas.style.opacity = "1";
        frame = requestAnimationFrame(draw);
      };
      function resume() {
        cancelAnimationFrame(frame);
        last = 0;
        if (motion.matches) canvas.style.opacity = "0";
        if (
          ready &&
          visible &&
          !document.hidden &&
          !contextLost &&
          !motion.matches &&
          !disposed
        )
          frame = requestAnimationFrame(draw);
      }
      const observer = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        resume();
      });
      observer.observe(canvas);
      const lost = (event) => {
        event.preventDefault();
        contextLost = true;
        cancelAnimationFrame(frame);
        canvas.style.opacity = "0";
      };
      const restored = () => {
        contextLost = false;
        resume();
      };
      canvas.addEventListener("webglcontextlost", lost);
      canvas.addEventListener("webglcontextrestored", restored);
      document.addEventListener("visibilitychange", resume);
      motion.addEventListener("change", resume);
      repair.src = "/scarf-animation/scarf-repair.webp";
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        repair.onload = null;
        canvas.removeEventListener("webglcontextlost", lost);
        canvas.removeEventListener("webglcontextrestored", restored);
        document.removeEventListener("visibilitychange", resume);
        motion.removeEventListener("change", resume);
        const geometries = new Set(),
          materials = new Set();
        scene.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
          if (object.material) materials.add(object.material);
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        repairTexture?.dispose();
        renderer.dispose();
        canvas.style.opacity = "0";
      };
    }
    initialize().catch(() => {
      canvas.style.opacity = "0";
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [src, imageRef]);
  return (
    <canvas ref={canvasRef} className="intro-scarf-motion" aria-hidden="true" />
  );
}
