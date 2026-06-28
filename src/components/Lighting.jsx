import { Environment } from '@react-three/drei';

export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />

      <directionalLight
        position={[6, 10, 4]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <directionalLight position={[-5, 7, -4]} intensity={0.3} />
      <directionalLight position={[0, 9, -7]} intensity={0.25} />

      <pointLight
        position={[0, 4.5, 0]}
        intensity={0.5}
        distance={12}
        decay={2}
        color="#ffeedd"
      />

      <pointLight
        position={[3, 3.5, 3]}
        intensity={0.2}
        distance={8}
        decay={2}
        color="#aaccff"
      />

      <pointLight
        position={[-3, 3.5, -3]}
        intensity={0.2}
        distance={8}
        decay={2}
        color="#ffccaa"
      />

      <Environment preset="studio" background={false} />
    </>
  );
}
