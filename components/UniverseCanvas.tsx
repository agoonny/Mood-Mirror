"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { EmotionProfile } from "@/lib/emotion";

type Props = { profile: EmotionProfile; phase: number; pointer: { x: number; y: number } };

type EmotionTheme = {
  palette: string[];
  glow: [number, number, number];
  fog: [number, number, number];
  behavior: "burst" | "rain" | "storm" | "breath";
};

const themes: Record<EmotionProfile["emotion"], EmotionTheme> = {
  happy: { palette: ["#F59E0B", "#FB7185", "#FDE047", "#F97316"], glow: [1.0, 0.55, 0.2], fog: [0.08, 0.03, 0.01], behavior: "burst" },
  sad: { palette: ["#60A5FA", "#1D4ED8", "#7DD3FC", "#C4B5FD"], glow: [0.2, 0.45, 1.0], fog: [0.01, 0.03, 0.09], behavior: "rain" },
  anxious: { palette: ["#A855F7", "#22D3EE", "#F43F5E", "#F59E0B"], glow: [0.85, 0.25, 0.95], fog: [0.07, 0.01, 0.08], behavior: "storm" },
  calm: { palette: ["#34D399", "#38BDF8", "#C4B5FD", "#A7F3D0"], glow: [0.2, 0.8, 0.7], fog: [0.01, 0.06, 0.06], behavior: "breath" }
};

function ParticleField({ profile, phase, pointer }: Props) {
  const ref = useRef<THREE.Points>(null);
  const { camera, clock } = useThree();

  const { positions, colors } = useMemo(() => {
    const rand = mulberry32(parseInt(profile.seed.slice(0, 8), 16));
    const count = 5000 + Math.floor(profile.intensity * 5000);
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const theme = themes[profile.emotion];
    const palette = theme.palette;

    for (let i = 0; i < count; i++) {
      const swirl = profile.emotion === "anxious" ? 1.55 : profile.emotion === "calm" ? 0.3 : 1.0;
      const radius = Math.pow(rand(), 0.5) * (10 + profile.intensity * 24);
      const theta = rand() * Math.PI * 2 + radius * 0.1 * swirl;
      const phi = Math.acos(2 * rand() - 1);
      let x = radius * Math.sin(phi) * Math.cos(theta);
      let y = radius * Math.sin(phi) * Math.sin(theta);
      let z = radius * Math.cos(phi);

      if (theme.behavior === "rain") { y *= 1.8; x *= 0.65; }
      if (theme.behavior === "burst") { z *= 1.3; }
      if (theme.behavior === "storm") { x += Math.sin(y * 0.4) * 2.0; }
      if (theme.behavior === "breath") { z *= 0.7; y *= 0.9; }

      p[i * 3] = x;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = z;

      const color = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    }
    return { positions: p, colors: c };
  }, [profile]);

  useFrame(() => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const behavior = themes[profile.emotion].behavior;
    const isAnxious = behavior === "storm";
    const isCalm = behavior === "breath";

    const pulse = behavior === "breath" ? (1 + Math.sin(t * 0.7) * 0.08) : 1;
    ref.current.scale.setScalar(pulse);
    ref.current.rotation.y = t * (behavior === "burst" ? 0.22 : 0.05 + profile.intensity * 0.16) + pointer.x * 0.18;
    ref.current.rotation.x = Math.sin(t * (isAnxious ? 1.8 : 0.45)) * (isCalm ? 0.08 : 0.3) + pointer.y * 0.23;

    const chaos = Math.max(0, 1 - phase);
    const settle = Math.max(0, phase - 2);
    ref.current.position.x = pointer.x * 2.7 + Math.sin(t * (isAnxious ? 11 : behavior === "burst" ? 3.4 : 1.8)) * chaos;
    ref.current.position.y = pointer.y * 1.9 + Math.cos(t * (isAnxious ? 9 : behavior === "rain" ? 0.9 : 1.5)) * chaos - (behavior === "rain" ? (Math.sin(t * 0.9) * 0.5) : 0);

    camera.position.z = 19 - t * 0.16 - settle * 0.9;
    camera.position.x = Math.sin(t * 0.17) * 1.3;
    camera.position.y = Math.cos(t * 0.12) * 0.6;
    camera.lookAt(0, 0, 0);
  });

  return (
    <Points ref={ref} positions={positions} colors={colors} stride={3}>
      <PointMaterial transparent vertexColors size={0.06 + profile.intensity * 0.22} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </Points>
  );
}

function FlowLayer({ phase, profile }: { phase: number; profile: EmotionProfile }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const tone = themes[profile.emotion].glow;
  const fog = themes[profile.emotion].fog;

  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.getElapsedTime();
    mat.current.uniforms.uPhase.value = phase;
    mat.current.uniforms.uIntensity.value = profile.intensity;
  });

  return (
    <mesh>
      <sphereGeometry args={[35, 96, 96]} />
      <shaderMaterial
        ref={mat}
        side={THREE.BackSide}
        transparent
        uniforms={{
          uTime: { value: 0 },
          uPhase: { value: phase },
          uIntensity: { value: profile.intensity },
          uTone: { value: new THREE.Vector3(...tone) },
          uFog: { value: new THREE.Vector3(...fog) }
        }}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform float uPhase;
          uniform float uIntensity;
          uniform vec3 uTone;
          uniform vec3 uFog;
          float fbm(vec2 p){
            float v=0.0;
            v += sin(p.x*3.1+uTime*0.35)*0.5;
            v += sin(p.y*4.7-uTime*0.28)*0.25;
            v += sin((p.x+p.y)*6.2+uTime*0.16)*0.25;
            return v;
          }
          void main(){
            vec2 uv = vUv*2.0-1.0;
            float ring = smoothstep(0.95, 0.15, length(uv));
            float waves = fbm(vUv*8.0 + uPhase*0.3 + vec2(sin(uTime*0.11), cos(uTime*0.13)));
            float flow = smoothstep(-0.4, 0.8, waves + uIntensity*0.45);
            float pulse = 0.5 + 0.5*sin(uTime*12.0);
            vec3 col = mix(uFog, uTone*0.35 + uFog, flow);
            col += uTone * 0.15 * pulse * uIntensity;
            float alpha = (0.22 + flow*0.35 + pulse*0.08*uIntensity) * ring;
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
}


function EmotionAccent({ profile }: { profile: EmotionProfile }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = themes[profile.emotion].palette[0];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (profile.emotion === "happy") {
      ref.current.scale.setScalar(1 + Math.sin(t * 3.2) * 0.35 * profile.intensity);
      ref.current.rotation.z = t * 0.8;
    } else if (profile.emotion === "anxious") {
      ref.current.scale.setScalar(1 + Math.sin(t * 16.0) * 0.08);
      ref.current.rotation.z = Math.sin(t * 20.0) * 0.3;
    } else if (profile.emotion === "calm") {
      ref.current.scale.setScalar(1 + Math.sin(t * 0.7) * 0.16);
      ref.current.rotation.z = t * 0.1;
    } else {
      ref.current.position.y = -Math.abs(Math.sin(t * 0.7)) * 0.8;
      ref.current.scale.set(1.6, 2.5, 1.6);
    }
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[6.5, profile.emotion === "sad" ? 0.06 : 0.13, 32, 240]} />
      <meshBasicMaterial color={color} transparent opacity={profile.emotion === "anxious" ? 0.45 : 0.28} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function UniverseCanvas(props: Props) {
  const theme = themes[props.profile.emotion];
  const bg = new THREE.Color(...theme.fog).multiplyScalar(0.75);

  return (
    <Canvas camera={{ position: [0, 0, 19], fov: 56 }}>
      <color attach="background" args={[`#${bg.getHexString()}`]} />
      <fog attach="fog" args={[`#${bg.getHexString()}`, 12, 42]} />
      <ambientLight intensity={0.2 + props.profile.intensity * 0.35} />
      <ParticleField {...props} />
      <EmotionAccent profile={props.profile} />
      <FlowLayer phase={props.phase} profile={props.profile} />
    </Canvas>
  );
}
