"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { EmotionProfile } from "@/lib/emotion";

type Props = { profile: EmotionProfile; phase: number; pointer: { x: number; y: number } };

const palettes = {
  happy: ["#f59e0b", "#fb7185", "#fef08a"],
  sad: ["#60a5fa", "#1d4ed8", "#7dd3fc"],
  anxious: ["#a855f7", "#22d3ee", "#f43f5e"],
  calm: ["#34d399", "#38bdf8", "#c4b5fd"]
};

function ParticleField({ profile, phase, pointer }: Props) {
  const ref = useRef<THREE.Points>(null);
  const { camera, clock } = useThree();

  const { positions, colors } = useMemo(() => {
    const rand = mulberry32(parseInt(profile.seed.slice(0, 8), 16));
    const count = 6500;
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const palette = palettes[profile.emotion];
    for (let i = 0; i < count; i++) {
      const radius = Math.pow(rand(), 0.5) * (10 + profile.intensity * 18);
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      p[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = radius * Math.cos(phi);
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
    const speed = 0.04 + profile.intensity * 0.14;
    ref.current.rotation.y = t * speed;
    ref.current.rotation.x = Math.sin(t * 0.3) * 0.2 + pointer.y * 0.18;
    const chaos = Math.max(0, 1 - phase);
    const stable = Math.max(0, phase - 2);
    ref.current.position.x = pointer.x * 1.8 + Math.sin(t * 2.4) * chaos;
    ref.current.position.y = pointer.y * 1.2 + Math.cos(t * 1.8) * chaos;
    camera.position.z = 18 - t * 0.18 - stable;
    camera.position.x = Math.sin(t * 0.15) * 0.9;
    camera.lookAt(0, 0, 0);
  });

  return (
    <Points ref={ref} positions={positions} colors={colors} stride={3}>
      <PointMaterial
        transparent
        vertexColors
        size={0.085 + profile.intensity * 0.16}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function FlowLayer({ phase }: { phase: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.getElapsedTime() * (0.4 + phase * 0.12);
  });

  return (
    <mesh>
      <sphereGeometry args={[30, 64, 64]} />
      <shaderMaterial
        ref={mat}
        side={THREE.BackSide}
        transparent
        uniforms={{ uTime: { value: 0 }, uPhase: { value: phase } }}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          float noise(vec2 p){return sin(p.x)*sin(p.y);} 
          void main(){
            float n = noise(vUv*30.0 + uTime*0.3);
            float glow = smoothstep(0.2,0.95,n*0.5+0.5);
            vec3 col = mix(vec3(0.02,0.02,0.07), vec3(0.05,0.15,0.25), glow);
            gl_FragColor = vec4(col, 0.36 + glow*0.2);
          }
        `}
      />
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
  return (
    <Canvas camera={{ position: [0, 0, 18], fov: 55 }}>
      <color attach="background" args={["#020205"]} />
      <ambientLight intensity={0.25} />
      <ParticleField {...props} />
      <FlowLayer phase={props.phase} />
    </Canvas>
  );
}
