import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createWatchFaceTexture, updateWatchFaceTexture } from "@/lib/watchFace";

/**
 * Procedural, physically-based 3D model of the Sakhi AI Smart Safety Watch:
 *
 *   • Grade-5 titanium gunmetal case with chamfered bezel + emerald accent ring
 *   • Sapphire-crystal curved glass over a live AMOLED face (canvas texture)
 *   • Dedicated red SOS side button with an LED ring
 *   • Right-side crown, power + AI buttons
 *   • Brushed metal bracelet with emerald racing stripe + rose-gold lug rings
 *   • Rear sensor deck (heart-rate, SpO₂, temperature, stress, charging pins)
 *
 * `explode` (0..1) spreads the internals apart for the exploded-view shot.
 */

const gunmetal = "#2B2E33";
const gunmetalDark = "#1B1D21";
const emerald = "#17C98C";
const emeraldBright = "#22E6A0";
const roseGold = "#E8A87C";
const sosRed = "#D91F2A";

export function WatchModel({ explode = 0 }: { explode?: number }) {
  const e = Math.min(1, Math.max(0, explode));

  const face = useMemo(() => createWatchFaceTexture(), []);
  const lastRedraw = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - lastRedraw.current > 0.3) {
      lastRedraw.current = t;
      updateWatchFaceTexture(face, t);
    }
  });

  return (
    <group>
      {/* ══ Case group (slides back slightly when exploded) ══ */}
      <group position={[0, 0, -0.35 * e]}>
        {/* Case body */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.32, 1.32, 0.52, 96]} />
          <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.32} envMapIntensity={1.2} />
        </mesh>
        {/* Bezel ring */}
        <mesh position={[0, 0, 0.26]}>
          <torusGeometry args={[1.31, 0.1, 24, 96]} />
          <meshStandardMaterial color={gunmetal} metalness={0.96} roughness={0.28} envMapIntensity={1.3} />
        </mesh>
        {/* Emerald accent line */}
        <mesh position={[0, 0, 0.252]}>
          <torusGeometry args={[1.16, 0.028, 16, 96]} />
          <meshStandardMaterial color={emerald} metalness={0.85} roughness={0.22} envMapIntensity={1.4} />
        </mesh>
        {/* Inner recess (dark) */}
        <mesh position={[0, 0, 0.252]}>
          <cylinderGeometry args={[1.15, 1.15, 0.035, 96]} />
          <meshStandardMaterial color="#0B0D10" metalness={0.4} roughness={0.6} />
        </mesh>

        {/* Lugs */}
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[0.56, 0.6, 0.56]} />
          <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.34} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[0, -1.55, 0]}>
          <boxGeometry args={[0.56, 0.6, 0.56]} />
          <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.34} envMapIntensity={1.1} />
        </mesh>
        {/* Rose-gold lug rings */}
        <mesh position={[0, 1.55, 0.3]}>
          <torusGeometry args={[0.27, 0.015, 12, 48]} />
          <meshStandardMaterial color={roseGold} metalness={1} roughness={0.24} envMapIntensity={1.5} />
        </mesh>
        <mesh position={[0, -1.55, 0.3]}>
          <torusGeometry args={[0.27, 0.015, 12, 48]} />
          <meshStandardMaterial color={roseGold} metalness={1} roughness={0.24} envMapIntensity={1.5} />
        </mesh>
      </group>

      {/* ══ AMOLED display (canvas texture) ══ */}
      <mesh position={[0, 0, 0.262 + 0.55 * e]} renderOrder={1}>
        <circleGeometry args={[1.09, 96]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>

      {/* ══ Sapphire crystal glass ══ */}
      <group position={[0, 0, 0.855 * e]}>
        <mesh position={[0, 0, 0.285]} renderOrder={3}>
          <cylinderGeometry args={[1.14, 1.14, 0.05, 96]} />
          <meshPhysicalMaterial
            color="#d6dee9"
            transmission={0.9}
            thickness={0.4}
            roughness={0.03}
            metalness={0}
            ior={1.45}
            clearcoat={1}
            clearcoatRoughness={0.04}
            envMapIntensity={1.5}
          />
        </mesh>
        {/* glass rim */}
        <mesh position={[0, 0, 0.268]}>
          <torusGeometry args={[1.145, 0.016, 12, 96]} />
          <meshStandardMaterial color={gunmetalDark} metalness={0.9} roughness={0.4} />
        </mesh>
      </group>

      {/* ══ Motherboard (PCB) ══ */}
      <group position={[0, 0, -0.26 - 0.45 * e]}>
        <mesh>
          <boxGeometry args={[2.28, 2.28, 0.06]} />
          <meshStandardMaterial color="#173A24" metalness={0.35} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.62, 0.62, 0.05]} />
          <meshStandardMaterial color="#0C0F13" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.075]}>
          <torusGeometry args={[0.33, 0.014, 10, 40]} />
          <meshStandardMaterial color="#F5C97B" metalness={1} roughness={0.3} />
        </mesh>
        {/* screw holes */}
        {[
          [0.95, 0.95],
          [-0.95, 0.95],
          [0.95, -0.95],
          [-0.95, -0.95],
        ].map(([sx, sy], i) => (
          <mesh key={i} position={[sx, sy, 0.035]}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
            <meshStandardMaterial color="#3A3F46" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* ══ Battery ══ */}
      <group position={[0, 0, -0.27 - 0.8 * e]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.02, 1.02, 0.16, 64]} />
          <meshStandardMaterial color="#101318" metalness={0.75} roughness={0.42} envMapIntensity={0.8} />
        </mesh>
        {/* gold charge contact */}
        <mesh position={[0, 0, 0.085]}>
          <cylinderGeometry args={[0.3, 0.3, 0.02, 32]} />
          <meshStandardMaterial color="#F5C97B" metalness={1} roughness={0.28} />
        </mesh>
        {/* emerald battery band */}
        <mesh position={[0, 0, 0.07]}>
          <torusGeometry args={[0.66, 0.014, 10, 48]} />
          <meshStandardMaterial color={emerald} metalness={0.8} roughness={0.3} emissive={emerald} emissiveIntensity={0.25} />
        </mesh>
      </group>

      {/* ══ Rear sensor deck ══ */}
      <group position={[0, 0, -0.31 - 1.12 * e]}>
        {/* housing */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.01]}>
          <cylinderGeometry args={[0.68, 0.68, 0.06, 64]} />
          <meshStandardMaterial color="#171A1F" metalness={0.75} roughness={0.35} envMapIntensity={1} />
        </mesh>
        {/* heart-rate sensor */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.045]}>
          <cylinderGeometry args={[0.21, 0.21, 0.02, 48]} />
          <meshStandardMaterial color={emeraldBright} metalness={0.2} roughness={0.25} emissive={emeraldBright} emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <torusGeometry args={[0.23, 0.012, 10, 48]} />
          <meshStandardMaterial color="#0E3B2B" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* SpO₂ ring */}
        <mesh position={[0, 0, 0.05]}>
          <torusGeometry args={[0.37, 0.026, 12, 64]} />
          <meshStandardMaterial color="#C0392B" metalness={0.5} roughness={0.45} />
        </mesh>
        {/* temperature + stress */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[-0.32, 0.34, 0.05]}>
          <cylinderGeometry args={[0.075, 0.075, 0.018, 24]} />
          <meshStandardMaterial color={roseGold} metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.32, 0.34, 0.05]}>
          <cylinderGeometry args={[0.075, 0.075, 0.018, 24]} />
          <meshStandardMaterial color="#6FB7FF" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* charging pins */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[-0.19, -0.42, 0.055]}>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 24]} />
          <meshStandardMaterial color="#F5C97B" metalness={1} roughness={0.25} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.19, -0.42, 0.055]}>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 24]} />
          <meshStandardMaterial color="#F5C97B" metalness={1} roughness={0.25} />
        </mesh>
        {/* screws */}
        {[
          [0.52, 0.52],
          [-0.52, 0.52],
          [0.52, -0.52],
          [-0.52, -0.52],
        ].map(([sx, sy], i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[sx, sy, 0.05]}>
            <cylinderGeometry args={[0.035, 0.035, 0.014, 12]} />
            <meshStandardMaterial color="#3A3F46" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* ══ Straps (slide apart when exploded) ══ */}
      <group position={[0, 1.15 * e, -0.06]}>
        <mesh rotation={[0, 0, 0.11 * Math.PI]}>
          <torusGeometry args={[2.0, 0.16, 20, 56, 0.78 * Math.PI]} />
          <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.3} envMapIntensity={1.15} />
        </mesh>
        <mesh rotation={[0, 0, 0.11 * Math.PI]}>
          <torusGeometry args={[2.145, 0.022, 10, 56, 0.78 * Math.PI]} />
          <meshStandardMaterial color={emerald} metalness={0.85} roughness={0.25} envMapIntensity={1.4} />
        </mesh>
      </group>
      <group position={[0, -1.15 * e, -0.06]}>
        <mesh rotation={[0, 0, Math.PI + 0.11 * Math.PI]}>
          <torusGeometry args={[2.0, 0.16, 20, 56, 0.78 * Math.PI]} />
          <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.3} envMapIntensity={1.15} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI + 0.11 * Math.PI]}>
          <torusGeometry args={[2.145, 0.022, 10, 56, 0.78 * Math.PI]} />
          <meshStandardMaterial color={emerald} metalness={0.85} roughness={0.25} envMapIntensity={1.4} />
        </mesh>
      </group>

      {/* ══ Left side: SOS button with LED ring ══ */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-1.42 - 0.55 * e, 0.1, 0]}>
        <cylinderGeometry args={[0.135, 0.135, 0.3, 32]} />
        <meshStandardMaterial color={sosRed} metalness={0.25} roughness={0.38} emissive="#FF2D2D" emissiveIntensity={0.35} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-1.34 - 0.55 * e, 0.1, 0]}>
        <torusGeometry args={[0.155, 0.02, 12, 32]} />
        <meshStandardMaterial color="#0E0F12" metalness={0.6} roughness={0.4} emissive="#FF2D2D" emissiveIntensity={2.4} />
      </mesh>

      {/* ══ Right side: crown + power + AI buttons ══ */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[1.42 + 0.5 * e, 0.12, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.3, 28]} />
        <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.26} envMapIntensity={1.3} />
      </mesh>
      {[-0.08, -0.03, 0.02, 0.07].map((ox, i) => (
        <mesh key={i} rotation={[0, Math.PI / 2, 0]} position={[1.42 + 0.5 * e + ox, 0.12, 0]}>
          <torusGeometry args={[0.112, 0.012, 8, 24]} />
          <meshStandardMaterial color="#15171B" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[1.56 + 0.5 * e, 0.12, 0]}>
        <torusGeometry args={[0.115, 0.013, 8, 24]} />
        <meshStandardMaterial color={emerald} metalness={0.85} roughness={0.25} emissive={emerald} emissiveIntensity={0.2} />
      </mesh>

      <mesh rotation={[0, 0, Math.PI / 2]} position={[1.4 + 0.4 * e, -0.16, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.18, 24]} />
        <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[1.4 + 0.4 * e, -0.5, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.18, 24]} />
        <meshStandardMaterial color={gunmetal} metalness={0.95} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[1.48 + 0.4 * e, -0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 16]} />
        <meshStandardMaterial color={emerald} metalness={0.8} roughness={0.3} emissive={emerald} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
