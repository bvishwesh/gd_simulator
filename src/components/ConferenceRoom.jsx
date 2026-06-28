import * as THREE from 'three';

const ROOM_W = 12;
const ROOM_D = 12;
const ROOM_H = 4.5;

export default function ConferenceRoom() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.2, 64]} />
        <meshStandardMaterial
          color="#22223b"
          roughness={0.8}
          metalness={0.05}
          transparent
          opacity={0.5}
        />
      </mesh>

      {[
        [-ROOM_W / 2, ROOM_H / 2, 0, Math.PI / 2],
        [ROOM_W / 2, ROOM_H / 2, 0, -Math.PI / 2],
        [0, ROOM_H / 2, -ROOM_D / 2, 0],
        [0, ROOM_H / 2, ROOM_D / 2, Math.PI],
      ].map(([x, y, z, rotY], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, rotY, 0]}>
          <planeGeometry args={[ROOM_W, ROOM_H]} />
          <meshStandardMaterial
            color="#2a2a3e"
            roughness={0.85}
            metalness={0.02}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {[-ROOM_W / 2 + 0.15, ROOM_W / 2 - 0.15].map((x, i) => (
        <mesh key={`trim-${i}`} position={[x, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, ROOM_D]} />
          <meshStandardMaterial color="#4a4a6a" roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
      {[-ROOM_D / 2 + 0.15, ROOM_D / 2 - 0.15].map((z, i) => (
        <mesh key={`trim-z-${i}`} position={[0, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[ROOM_W, 0.1]} />
          <meshStandardMaterial color="#4a4a6a" roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
    </>
  );
}
