"use client";

import { useEffect, useRef } from "react";

const FISH_ARTWORK = "1787632591923-45abc927-9983-4e23-a0f9-78a020e6a361.png";

function createFish(T) {
  const fish = new T.Group();
  const stroke = { value: 0 };
  const material = (color, extra = {}) =>
    new T.MeshPhysicalMaterial({
      color,
      roughness: 0.38,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
      ...extra,
    });
  const pink = material("#f16b91");
  const aqua = material("#25c0d5");
  const dark = material("#092e45", { roughness: 0.22 });
  const gold = material("#ffda9c", { metalness: 0.3 });
  const pearl = material("#b9f7ff", {
    emissive: "#56c9ef",
    emissiveIntensity: 1.2,
    roughness: 0.15,
  });
  const skin = material("#ffffff", { vertexColors: true, metalness: 0.08 });
  skin.onBeforeCompile = (shader) => {
    shader.uniforms.swimStroke = stroke;
    shader.vertexShader =
      `uniform float swimStroke;\n${shader.vertexShader}`.replace(
        "#include <begin_vertex>",
        `
      #include <begin_vertex>
      float weight = smoothstep(-3.0, 3.1, position.x);
      transformed.z += sin(swimStroke - position.x * 0.48) * 0.10 * weight;
      transformed.y += sin(swimStroke - position.x * 0.48) * 0.025 * weight;
    `,
      );
  };
  const tube = (points, radius, mat, parent = fish, taper = 0) => {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    const geometry = new T.TubeGeometry(curve, 40, radius, 8, false);
    if (taper) {
      const vertices = geometry.attributes.position;
      for (let i = 0; i <= 40; i += 1) {
        const center = curve.getPointAt(i / 40);
        const radiusScale = 1 - (taper * i) / 40;
        for (let j = 0; j <= 8; j += 1) {
          const index = i * 9 + j;
          const point = new T.Vector3()
            .fromBufferAttribute(vertices, index)
            .sub(center)
            .multiplyScalar(radiusScale)
            .add(center);
          vertices.setXYZ(index, point.x, point.y, point.z);
        }
      }
      geometry.computeVertexNormals();
    }
    const mesh = new T.Mesh(geometry, mat);
    parent.add(mesh);
    return mesh;
  };
  const sphere = (position, scale, mat, parent = fish) => {
    const mesh = new T.Mesh(new T.SphereGeometry(1, 32, 24), mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  };
  // Closed elliptical sections give the creature a rounded body with real depth.
  const sections = [
    [-4.05, 0.7, 0.02, 0.02],
    [-3.85, 0.63, 0.43, 0.35],
    [-3.4, 0.34, 0.74, 0.55],
    [-2.65, -0.05, 0.89, 0.68],
    [-1.65, -0.35, 0.85, 0.66],
    [-0.5, -0.42, 0.63, 0.51],
    [0.7, -0.2, 0.43, 0.35],
    [1.85, 0.17, 0.29, 0.24],
    [2.9, 0.5, 0.16, 0.15],
    [3.12, 0.54, 0.035, 0.04],
  ];
  const spine = new T.CatmullRomCurve3(
    sections.map((s) => new T.Vector3(s[0], s[1], 0)),
  );
  const radii = new T.CatmullRomCurve3(
    sections.map((s) => new T.Vector3(s[2], s[3], 0)),
  );
  const positions = [],
    colors = [],
    indices = [],
    uvs = [];
  const coral = new T.Color("#f16b91"),
    cream = new T.Color("#ffe1bb");
  const turquoise = new T.Color("#25bdd1"),
    blue = new T.Color("#08728f");
  const rings = 112,
    sides = 56;
  for (let i = 0; i <= rings; i += 1) {
    const c = spine.getPoint(i / rings),
      r = radii.getPoint(i / rings);
    for (let j = 0; j <= sides; j += 1) {
      const angle = (j / sides) * Math.PI * 2,
        upper = Math.cos(angle);
      positions.push(c.x, c.y + upper * r.x, Math.sin(angle) * r.y);
      uvs.push((i / rings) * 4, (j / sides) * 2);
      const color =
        upper > 0.15
          ? cream.clone().lerp(coral, T.MathUtils.smoothstep(upper, 0.15, 0.95))
          : turquoise
              .clone()
              .lerp(blue, T.MathUtils.smoothstep(-upper, 0.2, 1));
      color.offsetHSL(
        0,
        0,
        Math.sin(i * 2.7 + j * 1.9) * Math.sin(j * 3.1) * 0.025,
      );
      colors.push(color.r, color.g, color.b);
      if (i < rings && j < sides) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const body = new T.BufferGeometry();
  body.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  body.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  body.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  body.setIndex(indices);
  body.computeVertexNormals();
  fish.add(new T.Mesh(body, skin));
  const fin = (origin, outline, mat, parent = fish) => {
    const shape = new T.Shape();
    shape.moveTo(...outline[0]);
    for (let i = 1; i < outline.length; i += 3)
      shape.bezierCurveTo(...outline[i], ...outline[i + 1], ...outline[i + 2]);
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelSize: 0.045,
      bevelThickness: 0.035,
      bevelSegments: 3,
      curveSegments: 24,
    });
    geometry.translate(0, 0, -0.045);
    const pivot = new T.Group();
    pivot.position.set(...origin);
    pivot.add(new T.Mesh(geometry, mat));
    parent.add(pivot);
    return pivot;
  };
  const outline = [
    [0, 0],
    [-0.2, -0.5],
    [0.4, -1.5],
    [1.05, -1.45],
    [1.5, -1.4],
    [1.55, -1.13],
    [1.47, -1.03],
    [0.92, -1.29],
    [0.56, -0.32],
    [0.38, 0.05],
  ];
  const farFin = fin([-2.2, -0.5, -0.48], outline, aqua);
  farFin.rotation.y = -0.4;
  farFin.scale.setScalar(0.87);
  const nearFin = fin([-1.85, -0.7, 0.48], outline, pink);
  nearFin.rotation.y = 0.34;
  tube(
    [
      [0.1, -0.13, 0.065],
      [0.48, -0.85, 0.07],
      [1.03, -1.31, 0.07],
    ],
    0.018,
    gold,
    nearFin,
  );
  const rearFin = fin([0.65, -0.47, 0.25], outline, pink);
  rearFin.scale.setScalar(0.55);
  const tail = new T.Group();
  tail.position.set(2.85, 0.48, 0);
  fish.add(tail);
  fin(
    [0, 0, 0.08],
    [
      [0, 0],
      [0.4, 0.19],
      [1.7, 0.02],
      [1.95, -0.7],
      [2.14, -1.3],
      [1.5, -1.8],
      [1.29, -1.85],
      [1.63, -1.21],
      [1.41, -0.65],
      [0.72, -0.32],
      [0.21, -0.16],
      [-0.04, -0.18],
      [0, 0],
    ],
    aqua,
    tail,
  );
  tube(
    [
      [0, 0.02, 0.13],
      [0.9, -0.11, 0.13],
      [1.76, -0.67, 0.13],
      [1.38, -1.74, 0.13],
    ],
    0.065,
    pink,
    tail,
  );
  fin(
    [0.1, -0.04, -0.09],
    [
      [0, 0],
      [-0.03, -0.43],
      [-0.67, -0.75],
      [-0.56, -1.29],
      [-0.34, -1.11],
      [-0.05, -0.77],
      [0.34, -0.6],
      [0.56, -0.37],
      [0.2, -0.11],
      [0, 0],
    ],
    aqua,
    tail,
  );
  for (let i = 0; i < 4; i += 1)
    tube(
      [
        [0.12, -0.03, 0.15],
        [0.75 + i * 0.1, -0.3 - i * 0.05, 0.17],
        [1.4 + i * 0.08, -0.74 - i * 0.17, 0.14],
      ],
      0.013,
      gold,
      tail,
    );
  sphere([-3.28, 0.44, 0.49], [0.22, 0.16, 0.1], gold);
  sphere([-3.29, 0.45, 0.57], [0.16, 0.12, 0.07], dark);
  sphere([-3.31, 0.47, 0.625], [0.075, 0.09, 0.027], aqua);
  sphere([-3.31, 0.47, 0.646], [0.028, 0.076, 0.012], dark);
  sphere([-3.34, 0.51, 0.658], [0.019, 0.021, 0.01], pearl);
  tube(
    [
      [-3.94, 0.57, 0.15],
      [-3.68, 0.17, 0.38],
      [-3.04, -0.2, 0.6],
      [-2.72, -0.19, 0.62],
    ],
    0.028,
    dark,
  );
  for (let i = 0; i < 6; i += 1)
    tube(
      [
        [-3.84 + i * 0.1, 0.42 - i * 0.065, 0.32 + i * 0.03],
        [-3.35 + i * 0.16, -0.32 - i * 0.065, 0.57],
        [-2.7 + i * 0.17, -0.7 - i * 0.065, 0.44],
      ],
      0.013,
      aqua,
    );
  const crown = new T.Group();
  crown.position.set(-3.5, 0.83, 0);
  fish.add(crown);
  tube(
    [
      [0, 0, 0],
      [0.55, 0.39, 0],
      [1.35, 0.57, -0.05],
      [2, 0.87, -0.08],
    ],
    0.095,
    pink,
    crown,
    0.88,
  );
  for (let i = 0; i < 6; i += 1) {
    const x = 0.12 + i * 0.33,
      y = 0.28 + i * 0.08,
      h = 0.45 + Math.sin(i * 1.7) * 0.13;
    tube(
      [
        [x, y, 0],
        [x - 0.03, y + h * 0.65, 0.05],
        [x + 0.13, y + h, 0.06],
      ],
      0.047,
      pink,
      crown,
      0.7,
    );
    sphere([x + 0.13, y + h, 0.06], [0.085, 0.085, 0.085], pearl, crown);
  }
  tube(
    [
      [-3.85, 0.65, 0.27],
      [-3.3, 1.05, 0.32],
      [-2.8, 1, 0.42],
    ],
    0.012,
    gold,
  );
  tube(
    [
      [-3.85, 0.57, 0.27],
      [-3.2, 0.82, 0.56],
      [-2.46, 0.65, 0.59],
    ],
    0.01,
    gold,
  );
  // The rider becomes a small sculpture, keeping the painting's narrative.
  const rider = new T.Group();
  rider.position.set(2.1, 0.31, 0.12);
  fish.add(rider);
  const cloth = material("#e8a188"),
    violet = material("#7967ac"),
    complexion = material("#ffe0ba");
  sphere([0, 0.26, 0], [0.36, 0.15, 0.23], cloth, rider);
  sphere([0.13, 0.57, 0], [0.17, 0.31, 0.13], violet, rider);
  sphere([0.11, 0.94, 0.025], [0.15, 0.18, 0.13], complexion, rider);
  sphere([0.12, 1.03, -0.055], [0.18, 0.13, 0.15], pink, rider);
  sphere([0.17, 0.96, 0.145], [0.027, 0.015, 0.012], dark, rider);
  sphere([0.075, 0.965, 0.149], [0.026, 0.014, 0.012], dark, rider);
  sphere([0.122, 0.926, 0.156], [0.025, 0.036, 0.035], complexion, rider);
  tube(
    [
      [0.088, 0.879, 0.144],
      [0.12, 0.875, 0.154],
      [0.152, 0.88, 0.146],
    ],
    0.009,
    pink,
    rider,
  );
  sphere([-0.037, 0.936, 0.029], [0.031, 0.049, 0.028], complexion, rider);
  sphere([-0.053, 0.9, 0.057], [0.018, 0.025, 0.012], gold, rider);
  tube(
    [
      [-0.03, 1.04, 0.11],
      [0.075, 1.095, 0.11],
      [0.245, 1.047, 0.1],
    ],
    0.023,
    gold,
    rider,
  );
  tube(
    [
      [0.02, 0.78, 0.13],
      [0.12, 0.744, 0.15],
      [0.235, 0.78, 0.115],
    ],
    0.018,
    gold,
    rider,
  );
  tube(
    [
      [0.02, 1.06, -0.05],
      [-0.24, 0.89, -0.05],
      [-0.39, 0.66, -0.07],
      [-0.45, 0.57, -0.09],
    ],
    0.07,
    dark,
    rider,
  );
  tube(
    [
      [0.12, 0.67, 0.1],
      [-0.09, 0.54, 0.19],
      [-0.29, 0.5, 0.15],
    ],
    0.057,
    complexion,
    rider,
  );
  tube(
    [
      [0.12, 0.48, 0.1],
      [-0.2, 0.25, 0.27],
      [-0.54, 0.19, 0.23],
      [-0.64, 0.06, 0.17],
    ],
    0.085,
    cloth,
    rider,
  );
  tube(
    [
      [0.2, 0.43, 0.12],
      [0.24, 0.13, 0.26],
      [0.43, 0.04, 0.29],
    ],
    0.063,
    violet,
    rider,
  );
  fin(
    [0, 0, 0.2],
    [
      [0.16, 0.46],
      [-0.13, 0.44],
      [-0.44, 0.29],
      [-0.64, 0.16],
      [-0.6, 0.02],
      [-0.39, 0.11],
      [-0.2, 0.16],
      [-0.12, 0.09],
      [0.1, 0.05],
      [0.24, 0.18],
      [0.31, 0.23],
      [0.25, 0.38],
      [0.16, 0.46],
    ],
    cloth,
    rider,
  );
  for (let i = 0; i < 5; i += 1) {
    tube(
      [
        [0.1 - i * 0.022, 0.39, 0.285],
        [-0.12 - i * 0.05, 0.26, 0.3],
        [-0.2 - i * 0.065, 0.15, 0.295],
      ],
      0.008,
      gold,
      rider,
    );
  }
  for (let i = 0; i < 6; i += 1)
    sphere(
      [0.02 + i * 0.035, 1.12 - Math.sin(i) * 0.025, 0.025],
      [0.038, 0.04, 0.035],
      gold,
      rider,
    );
  fish.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { fish, stroke, tail, nearFin, farFin, rearFin, crown, skin };
}

export default function SwimmingArtwork({ src, imageRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!String(src).split(/[?#]/)[0].endsWith(FISH_ARTWORK)) return;
    const canvas = canvasRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false,
      disposeScene;
    async function initialize() {
      const T = await import("three");
      if (disposed) return;
      let renderer;
      try {
        renderer = new T.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFShadowMap;
      const scene = new T.Scene();
      const camera = new T.OrthographicCamera(-5.3, 5.3, 2.51, -2.51, 0.1, 50);
      camera.position.z = 15;
      const model = createFish(T);
      scene.add(model.fish);
      model.fish.scale.setScalar(0.9);
      model.fish.position.set(-0.25, -0.1, 0);
      scene.add(new T.HemisphereLight("#dafaff", "#2a5575", 1.4));
      const key = new T.DirectionalLight("#fff1de", 3.0);
      key.position.set(-3, 5, 7);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, {
        left: -7,
        right: 7,
        top: 4,
        bottom: -4,
      });
      key.shadow.normalBias = 0.035;
      key.shadow.bias = -0.0003;
      key.shadow.radius = 4;
      scene.add(key);
      const rim = new T.DirectionalLight("#4de4ff", 2.1);
      rim.position.set(4, 1, -3);
      scene.add(rim);
      const fill = new T.DirectionalLight("#f6a9b9", 0.8);
      fill.position.set(1, -3, 5);
      scene.add(fill);
      const background = new T.Mesh(
        new T.PlaneGeometry(10.6, 5.02),
        new T.MeshBasicMaterial({ color: "#07547a", toneMapped: false }),
      );
      background.position.z = -3;
      scene.add(background);
      const shadow = new T.Mesh(
        new T.PlaneGeometry(20, 15),
        new T.ShadowMaterial({ color: "#042f52", opacity: 0.18 }),
      );
      shadow.position.z = -2.8;
      shadow.receiveShadow = true;
      scene.add(shadow);
      const water = new T.TextureLoader().load(
        "/hero-animation/water-background.webp",
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = T.SRGBColorSpace;
          background.material.map = texture;
          background.material.color.set("#ffffff");
          background.material.needsUpdate = true;
        },
      );
      const scales = new T.TextureLoader().load(
        "/hero-animation/fish-scales.webp",
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.wrapS = T.RepeatWrapping;
          texture.wrapT = T.RepeatWrapping;
          model.skin.bumpMap = texture;
          model.skin.bumpScale = 0.026;
          model.skin.needsUpdate = true;
        },
      );
      let frame = 0,
        visible = true,
        contextLost = false,
        last = 0,
        elapsed = 0,
        width = 0,
        height = 0;
      const pointer = { x: 0, y: 0 },
        target = { x: 0, y: 0 };
      const move = (e) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      const leave = () => {
        target.x = 0;
        target.y = 0;
      };
      const render = (now) => {
        frame = 0;
        if (disposed || !visible || document.hidden || contextLost) return;
        const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
        if (!motion.matches) elapsed += delta;
        const w = canvas.clientWidth,
          h = canvas.clientHeight;
        if (!w || !h) return;
        if (width !== w || height !== h) {
          width = w;
          height = h;
          renderer.setSize(w, h, false);
        }
        const focus = getComputedStyle(imageRef.current)
          .objectPosition.split(" ")
          .map((n) => parseFloat(n) / 100);
        const portrait = w < h;
        const cover = Math.max(w / 10.6, h / 5.02);
        const vw = portrait ? 7.4 : w / cover;
        const vh = portrait ? (vw * h) / w : h / cover;
        camera.left = portrait
          ? -vw / 2 + (focus[0] - 0.5) * 1.5
          : -5.3 + (10.6 - vw) * focus[0];
        camera.right = camera.left + vw;
        camera.top = portrait
          ? vh / 2 + (0.5 - focus[1])
          : 2.51 - (5.02 - vh) * focus[1];
        camera.bottom = camera.top - vh;
        background.scale.setScalar(Math.max(1, vh / 5.02));
        camera.updateProjectionMatrix();
        const phase = (elapsed * Math.PI * 2) / 14,
          smooth = 1 - Math.exp(-delta * 1.5),
          parallax = motion.matches ? 0 : 1;
        pointer.x += (target.x - pointer.x) * smooth;
        pointer.y += (target.y - pointer.y) * smooth;
        model.stroke.value = phase;
        model.fish.rotation.set(
          0.07 + pointer.y * 0.018 * parallax,
          -0.22 + Math.sin(phase * 0.5) * 0.045 + pointer.x * 0.045 * parallax,
          (portrait ? -0.62 : 0.015) + Math.sin(phase * 0.5) * 0.012,
        );
        model.fish.position.y = -0.1 + Math.sin(phase * 0.5) * 0.035;
        model.tail.rotation.set(
          Math.sin(phase - 1) * 0.17,
          Math.sin(phase - 0.65) * 0.14,
          Math.sin(phase - 1) * 0.025,
        );
        model.nearFin.rotation.x = Math.sin(phase + 0.5) * 0.12;
        model.farFin.rotation.x = Math.sin(phase + 1.2) * 0.1;
        model.rearFin.rotation.x = Math.sin(phase + 1.7) * 0.1;
        model.crown.rotation.x = Math.sin(phase - 0.4) * 0.02;
        renderer.render(scene, camera);
        canvas.style.opacity = "1";
        frame = requestAnimationFrame(render);
      };
      const resume = () => {
        cancelAnimationFrame(frame);
        last = 0;
        if (visible && !document.hidden && !disposed && !contextLost)
          frame = requestAnimationFrame(render);
      };
      const observer = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        resume();
      });
      observer.observe(canvas);
      const lost = (e) => {
        e.preventDefault();
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
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("blur", leave);
      document.addEventListener("visibilitychange", resume);
      motion.addEventListener("change", resume);
      resume();
      disposeScene = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        canvas.removeEventListener("webglcontextlost", lost);
        canvas.removeEventListener("webglcontextrestored", restored);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("blur", leave);
        document.removeEventListener("visibilitychange", resume);
        motion.removeEventListener("change", resume);
        const geometries = new Set(),
          materials = new Set();
        scene.traverse((o) => {
          if (o.geometry) geometries.add(o.geometry);
          if (o.material) materials.add(o.material);
        });
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        water.dispose();
        scales.dispose();
        renderer.dispose();
        canvas.style.opacity = "0";
      };
    }
    initialize().catch(() => {
      canvas.style.opacity = "0";
    });
    return () => {
      disposed = true;
      disposeScene?.();
    };
  }, [src, imageRef]);
  return (
    <canvas
      ref={canvasRef}
      className="intro-swimming-artwork"
      aria-hidden="true"
    />
  );
}
