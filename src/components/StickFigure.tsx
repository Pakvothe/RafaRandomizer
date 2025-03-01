import React, { forwardRef, useRef, useEffect } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useAnimationStore } from "../store/animationStore";

interface StickFigureProps {
  position: [number, number, number];
  animationStage: number;
  isWinner: boolean;
  name?: string;
  hasSword?: boolean;
  isRunning?: boolean;
  swordRef?: React.MutableRefObject<THREE.Group | null>;
  targetPosition?: [number, number, number];
}

const StickFigure = forwardRef<THREE.Group, StickFigureProps>(
  ({ position, isWinner, name, hasSword = false, swordRef }, ref) => {
    const { showBlood } = useAnimationStore();
    const groupRef = useRef<THREE.Group>(null);
    const localSwordRef = useRef<THREE.Group | null>(null);
    const actualSwordRef = swordRef || localSwordRef;

    // Exponer la referencia al grupo principal
    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref(groupRef.current);
        } else {
          ref.current = groupRef.current;
        }
      }
    }, [ref]);

    // Si es el ganador y hay sangre, no renderizar (ha sido asesinado)
    if (isWinner && showBlood) {
      return null;
    }

    return (
      <group ref={groupRef} position={position}>
        {/* Cabeza */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial
            color={isWinner ? "#FFD700" : hasSword ? "#FFA07A" : "#1E90FF"}
          />
        </mesh>

        {/* Cuerpo - Palito negro */}
        <mesh position={[0, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 1, 16]} />
          <meshStandardMaterial color="#333333" />
        </mesh>

        {/* Brazos - Palitos negros */}
        <group>
          {/* Brazo izquierdo */}
          <mesh
            position={[-0.25, 0.9, 0]}
            rotation={[0, 0, -Math.PI / 4]}
            castShadow
          >
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>

          {/* Brazo derecho */}
          <mesh
            position={[0.25, 0.9, 0]}
            rotation={[0, 0, Math.PI / 4]}
            castShadow
          >
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>

        {/* Piernas - Palitos negros */}
        <group>
          {/* Pierna izquierda */}
          <mesh position={[-0.15, 0.25, 0]} rotation={[0, 0, 0.2]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>

          {/* Pierna derecha */}
          <mesh position={[0.15, 0.25, 0]} rotation={[0, 0, -0.2]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>

        {/* Espada mejorada (solo para Raphael) */}
        {hasSword && (
          <group
            ref={actualSwordRef}
            position={[0.4, 0.9, 0]}
            rotation={[0, 0, Math.PI / 4]}
          >
            {/* Mango */}
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.25, 16]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Hoja - Más grande y mejor */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[0.08, 0.8, 0.02]} />
              <meshStandardMaterial
                color="#C0C0C0"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>

            {/* Guardia - Más grande */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.2, 0.05, 0.05]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Punta de la espada */}
            <mesh
              position={[0, 0.95, 0]}
              rotation={[0, 0, Math.PI / 4]}
              castShadow
            >
              <coneGeometry args={[0.06, 0.15, 4]} />
              <meshStandardMaterial
                color="#C0C0C0"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          </group>
        )}

        {/* Nombre */}
        {name && (
          <group position={[0, 2, 0]}>
            <mesh>
              <planeGeometry args={[1, 0.3]} />
              <meshBasicMaterial
                color="#FFFFFF"
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.15}
              color="#000000"
              anchorX="center"
              anchorY="middle"
            >
              {name}
            </Text>
          </group>
        )}
      </group>
    );
  }
);

StickFigure.displayName = "StickFigure";

export default StickFigure;
