import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { WatchModel } from "./WatchModel";

export type WatchView =
  | "front"
  | "perspective"
  | "left"
  | "right"
  | "rear"
  | "exploded"
  | "floating";

type Preset = { pos: THREE.Vector3; target: THREE.Vector3 };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const VIEW_PRESETS: Record<WatchView, Preset> = {
  front: { pos: v(0, 0.15, 7.0), target: v(0, 0.05, 0) },
  perspective: { pos: v(4.0, 2.6, 5.8), target: v(0, 0.05, 0) },
  left: { pos: v(-6.9, 0.3, 0.8), target: v(0, 0, 0) },
  right: { pos: v(6.9, 0.3, 0.8), target: v(0, 0, 0) },
  rear: { pos: v(0, 0.3, -7.0), target: v(0, 0, 0) },
  exploded: { pos: v(5.6, 3.4, 7.8), target: v(0, 0.1, 0) },
  floating: { pos: v(3.0, 1.6, 6.6), target: v(0, 0.2, 0) },
};

/**
 * Dampens the camera + orbit target toward the active preset — but only while
 * a view transition is in flight, so the user can freely drag-rotate once the
 * camera has arrived.
 */
function CameraRig({ view }: { view: WatchView }) {
  const camera = useThree((s) => s.camera);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useThree((s) => s.controls) as any;
  const target = useRef(new THREE.Vector3(0, 0.05, 0));
  const animating = useRef(false);

  useEffect(() => {
    animating.current = true;
  }, [view]);

  useFrame((_, dt) => {
    if (!animating.current) return;
    const preset = VIEW_PRESETS[view];
    const k = 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(preset.pos, k);
    target.current.lerp(preset.target, k);
    if (controls) controls.target.copy(target.current);
    if (
      camera.position.distanceTo(preset.pos) < 0.04 &&
      target.current.distanceTo(preset.target) < 0.04
    ) {
      camera.position.copy(preset.pos);
      target.current.copy(preset.target);
      if (controls) controls.target.copy(target.current);
      animating.current = false;
    }
  });

  return null;
}

function Scene({ view, explode }: { view: WatchView; explode: number }) {
  return (
    <>
      <CameraRig view={view} />

      {/* Ambient + studio lights */}
      <ambientLight intensity={0.18} />
      <directionalLight position={[4, 6, 5]} intensity={1.7} color="#fff3e8" />
      <directionalLight position={[-4, 2, 3]} intensity={0.5} color="#bfe8ff" />
      <pointLight position={[0, -3, -4]} intensity={30} color="#17C98C" />

      {/* Local (offline) studio environment for metallic reflections */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={1.6} color="#ffffff" position={[0, 6, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[12, 12, 1]} />
        <Lightformer intensity={1.1} color="#F2956A" position={[-6, 1.5, 1]} rotation={[0, Math.PI / 2, 0]} scale={[8, 3, 1]} />
        <Lightformer intensity={0.9} color="#17C98C" position={[6, -0.5, 1.5]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 3, 1]} />
        <Lightformer intensity={0.5} color="#8B3A2F" position={[0, 2, -6]} scale={[10, 6, 1]} />
      </Environment>

      {/* Floating product shot gently bobs + auto-rotates; other views sit still */}
      {view === "floating" ? (
        <Float speed={1.4} rotationIntensity={0.16} floatIntensity={0.55}>
          <WatchModel explode={explode} />
        </Float>
      ) : (
        <WatchModel explode={explode} />
      )}

      {/* Premium dust motes */}
      <Sparkles count={50} scale={[9, 5.5, 4]} size={2.2} speed={0.35} opacity={0.32} color="#7fd8c0" />

      <ContactShadows position={[0, -2.75, 0]} opacity={0.5} scale={12} blur={2.8} far={4.2} color="#000000" />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.5}
        maxDistance={16}
        autoRotate={view === "floating"}
        autoRotateSpeed={0.9}
      />
    </>
  );
}

export function WatchStage({ view, explode }: { view: WatchView; explode: number }) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 40, position: VIEW_PRESETS[view].pos.toArray() as [number, number, number], near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene view={view} explode={explode} />
      </Suspense>
    </Canvas>
  );
}
