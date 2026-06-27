import * as THREE from 'three';

const AVATAR_COUNT = 6;
const SEAT_RADIUS = 2.8;
const TABLE_RADIUS = 1.6;
const TABLE_HEIGHT = 0.75;

function getSeatPositions() {
  return Array.from({ length: AVATAR_COUNT }, (_, i) => {
    const angle = (i / AVATAR_COUNT) * Math.PI * 2 - Math.PI / 2;
    return {
      x: SEAT_RADIUS * Math.cos(angle),
      z: SEAT_RADIUS * Math.sin(angle),
      angle: Math.atan2(
        SEAT_RADIUS * Math.cos(angle),
        SEAT_RADIUS * Math.sin(angle)
      ),
    };
  });
}

function Chair({ x, z, angle }) {
  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.42, 0]} receiveShadow>
        <boxGeometry args={[0.55, 0.06, 0.55]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.75, -0.35]} castShadow>
        <boxGeometry args={[0.55, 0.48, 0.06]} />
        <meshStandardMaterial color="#34495e" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.8, 0.2]}>
        <boxGeometry args={[0.55, 0.06, 0.2]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.5} />
      </mesh>
      {[
        [-0.22, 0.22, -0.22],
        [0.22, 0.22, -0.22],
        [-0.22, 0.22, 0.22],
        [0.22, 0.22, 0.22],
      ].map((legPos, j) => (
        <mesh key={j} position={legPos} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.44, 8]} />
          <meshStandardMaterial color="#555" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default function RoundTable() {
  const seats = getSeatPositions();

  return (
    <group>
      <mesh
        position={[0, TABLE_HEIGHT, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
      >
        <circleGeometry args={[TABLE_RADIUS, 48]} />
        <meshStandardMaterial
          color="#6b4226"
          roughness={0.4}
          metalness={0.15}
        />
      </mesh>

      <mesh
        position={[0, TABLE_HEIGHT - 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[TABLE_RADIUS * 0.94, 48]} />
        <meshStandardMaterial
          color="#7a4f30"
          roughness={0.25}
          metalness={0.1}
          transparent
          opacity={0.5}
        />
      </mesh>

      <mesh position={[0, TABLE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.35, TABLE_HEIGHT, 16]} />
        <meshStandardMaterial color="#4a2f1a" roughness={0.7} />
      </mesh>

      {[
        [0, TABLE_HEIGHT, TABLE_RADIUS * 0.7],
        [0, TABLE_HEIGHT, -TABLE_RADIUS * 0.7],
        [TABLE_RADIUS * 0.7, TABLE_HEIGHT, 0],
        [-TABLE_RADIUS * 0.7, TABLE_HEIGHT, 0],
      ].map(([x, y, z], i) => (
        <mesh key={`notepad-${i}`} position={[x, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.25, 0.18]} />
          <meshStandardMaterial color="#f5f5f0" roughness={0.9} />
        </mesh>
      ))}

      {seats.map((seat, i) => (
        <Chair key={i} x={seat.x} z={seat.z} angle={seat.angle} />
      ))}
    </group>
  );
}
