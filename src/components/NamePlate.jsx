import { Text } from '@react-three/drei';
import { useMemo } from 'react';

const COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#f9ca24',
  '#a29bfe',
];

export default function NamePlate({ name, position, seatIndex = 0, isActive = false }) {
  const color = useMemo(() => COLORS[seatIndex % COLORS.length], [seatIndex]);

  return (
    <group position={position}>
      <mesh position={[0, -0.12, 0]}>
        <planeGeometry args={[name.length * 0.08 + 0.3, 0.35]} />
        <meshBasicMaterial
          color={isActive ? color : '#000000'}
          transparent
          opacity={isActive ? 0.6 : 0.4}
          depthWrite={false}
        />
      </mesh>

      {isActive && (
        <mesh position={[name.length * 0.04 + 0.2, 0, 0]}>
          <circleGeometry args={[0.06, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}

      <Text
        fontSize={0.15}
        color={isActive ? color : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
}
