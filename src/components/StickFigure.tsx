import React, { forwardRef, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
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
  (
    { position, isWinner, name, hasSword = false, isRunning = false, swordRef },
    ref
  ) => {
    const { showBlood, stage } = useAnimationStore();
    const groupRef = useRef<THREE.Group>(null);
    const localSwordRef = useRef<THREE.Group | null>(null);
    const actualSwordRef = swordRef || localSwordRef;
    const runningTime = useRef(0);
    const celebrationTime = useRef(0);
    const armsRef = useRef<THREE.Group>(null);
    const legsRef = useRef<THREE.Group>(null);
    const attackTime = useRef(0);

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

    // Animación de correr y celebrar
    useFrame((_, delta) => {
      if (!groupRef.current) return;

      // Animación de ataque cuando es el ganador y hay sangre
      if (hasSword && isWinner && showBlood) {
        attackTime.current += delta * 3; // Velocidad del ataque ajustada

        // Movimiento del brazo derecho para el ataque
        if (armsRef.current) {
          const rightArm = armsRef.current.children[1] as THREE.Group;
          const attackProgress = Math.min(attackTime.current, 1);

          if (attackProgress < 0.3) {
            // Fase 1: Levantar la espada
            rightArm.rotation.x = -Math.PI * 0.75 * (attackProgress / 0.3);
          } else if (attackProgress < 0.6) {
            // Fase 2: Corte vertical rápido
            const slashProgress = (attackProgress - 0.3) / 0.3;
            rightArm.rotation.x =
              -Math.PI * 0.75 + Math.PI * 1.25 * slashProgress;
          } else {
            // Fase 3: Mantener posición final
            rightArm.rotation.x = Math.PI * 0.5;
          }
        }
        return;
      }

      if (isRunning || stage === "running") {
        runningTime.current += delta;

        // Animar brazos durante la carrera
        if (armsRef.current) {
          armsRef.current.children.forEach((arm, index) => {
            const offset = index === 0 ? 0 : Math.PI; // Brazos alternados
            (arm as THREE.Mesh).rotation.x =
              Math.sin(runningTime.current * 10 + offset) * 0.5;
          });
        }

        // Animar piernas durante la carrera
        if (legsRef.current) {
          legsRef.current.children.forEach((leg, index) => {
            const offset = index === 0 ? 0 : Math.PI; // Piernas alternadas
            (leg as THREE.Mesh).rotation.x =
              Math.sin(runningTime.current * 10 + offset) * 0.5;
          });
        }
      }

      if (stage === "celebrating") {
        celebrationTime.current += delta;

        // Distribuir personajes en círculo durante la celebración
        if (groupRef.current) {
          // Usar el nombre para generar una posición consistente
          const offset = name ? name.charCodeAt(0) % 6 : 0;
          const radius = 2; // Radio del círculo
          const angle = (offset / 6) * Math.PI * 2;

          // Calcular posición en círculo
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;

          // Aplicar salto y posición
          const jumpHeight =
            Math.abs(Math.sin(celebrationTime.current * 5)) * 0.5;
          groupRef.current.position.set(x, position[1] + jumpHeight, z);

          // Mantener al personaje mirando hacia el centro
          groupRef.current.rotation.y = angle + Math.PI;
        }

        // Animar brazos durante la celebración - Movimiento más enérgico
        if (armsRef.current) {
          armsRef.current.children.forEach((arm, index) => {
            const armGroup = arm as THREE.Group;
            // Movimiento de brazos arriba y abajo más pronunciado
            armGroup.rotation.x = Math.sin(celebrationTime.current * 10) * 1.2;
            // Movimiento lateral de brazos reducido
            armGroup.rotation.z =
              (index === 0 ? -Math.PI / 4 : Math.PI / 4) +
              Math.sin(celebrationTime.current * 8) * 0.2;
          });
        }

        // Animar piernas durante la celebración - Movimiento más sutil
        if (legsRef.current) {
          legsRef.current.children.forEach((leg, index) => {
            const legGroup = leg as THREE.Group;
            const offset = index === 0 ? 0 : Math.PI;
            // Movimiento de piernas sincronizado con el salto
            legGroup.rotation.x =
              Math.sin(celebrationTime.current * 5 + offset) * 0.3;
          });
        }
      }
    });

    // Si es el ganador y hay sangre, no renderizar (ha sido asesinado)
    if (isWinner && showBlood) {
      return null;
    }

    // Crear material para la remera de Racing (rayas celestes y blancas)
    const racingShirtMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float stripeWidth = 0.15; // Rayas más anchas
          float stripe = step(0.5, fract(vUv.x / stripeWidth));
          vec3 color1 = vec3(0.529, 0.808, 0.922); // Celeste (#87CEEB)
          vec3 color2 = vec3(1.0, 1.0, 1.0); // Blanco
          gl_FragColor = vec4(mix(color1, color2, stripe), 1.0);
        }
      `,
    });

    return (
      <group ref={groupRef} position={position}>
        {/* Grupo del cuerpo completo - mantiene todo unido durante el salto */}
        <group>
          {/* Cabeza */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <sphereGeometry args={[0.25, 32, 32]} />
            <meshStandardMaterial
              color={isWinner ? "#FFD700" : hasSword ? "#FFA07A" : "#1E90FF"}
            />
          </mesh>

          {/* Cuello */}
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.15, 16]} />
            <meshStandardMaterial color="#333333" />
          </mesh>

          {/* Cuerpo con remera */}
          <group>
            {/* Torso superior (remera) */}
            <mesh position={[0, 1.0, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.2, 0.6, 16]} />
              {hasSword ? (
                <primitive object={racingShirtMaterial} />
              ) : (
                <meshStandardMaterial
                  color="#5717D4"
                  metalness={0.1}
                  roughness={0.8}
                />
              )}
            </mesh>

            {/* Torso inferior (remera) */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.15, 0.4, 16]} />
              {hasSword ? (
                <primitive object={racingShirtMaterial} />
              ) : (
                <meshStandardMaterial
                  color="#5717D4"
                  metalness={0.1}
                  roughness={0.8}
                />
              )}
            </mesh>

            {/* Cintura */}
            <mesh position={[0, 0.35, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.13, 0.15, 16]} />
              <meshStandardMaterial color="#222222" />
            </mesh>
          </group>

          {/* Brazos - Más detallados */}
          <group ref={armsRef}>
            {/* Brazo izquierdo */}
            <group position={[-0.25, 1.15, 0]} rotation={[0, 0, -Math.PI / 4]}>
              {/* Hombro */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.07, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Brazo superior */}
              <mesh position={[0, -0.15, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.05, 0.3, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Codo */}
              <mesh position={[0, -0.3, 0]} castShadow>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Antebrazo */}
              <mesh position={[0, -0.45, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.04, 0.3, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
            </group>

            {/* Brazo derecho */}
            <group position={[0.25, 1.15, 0]} rotation={[0, 0, Math.PI / 4]}>
              {/* Hombro */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.07, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Brazo superior */}
              <mesh position={[0, -0.15, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.05, 0.3, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Codo */}
              <mesh position={[0, -0.3, 0]} castShadow>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Antebrazo */}
              <mesh position={[0, -0.45, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.04, 0.3, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Espada (si tiene) */}
              {hasSword && (
                <group
                  ref={actualSwordRef}
                  position={[0.1, -0.6, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  {/* Grupo de la espada - rotado para apuntar hacia adelante */}
                  <group rotation={[Math.PI / 3, 0, 0]}>
                    {/* Mango */}
                    <mesh position={[0, 0, 0]} castShadow>
                      <cylinderGeometry args={[0.035, 0.03, 0.25, 16]} />
                      <meshStandardMaterial
                        color="#8B4513"
                        metalness={0.3}
                        roughness={0.7}
                      />
                    </mesh>

                    {/* Hoja */}
                    <mesh position={[0, 0.5, 0]} castShadow>
                      <boxGeometry args={[0.08, 1.0, 0.02]} />
                      <meshStandardMaterial
                        color="#C0C0C0"
                        metalness={0.9}
                        roughness={0.1}
                      />
                    </mesh>

                    {/* Guardia */}
                    <mesh position={[0, 0.1, 0]} castShadow>
                      <boxGeometry args={[0.2, 0.05, 0.05]} />
                      <meshStandardMaterial
                        color="#8B4513"
                        metalness={0.3}
                        roughness={0.7}
                      />
                    </mesh>

                    {/* Punta de la espada */}
                    <mesh position={[0, 0.95, 0]} castShadow>
                      <coneGeometry args={[0.06, 0.15, 4]} />
                      <meshStandardMaterial
                        color="#C0C0C0"
                        metalness={0.9}
                        roughness={0.1}
                      />
                    </mesh>
                  </group>
                </group>
              )}
            </group>
          </group>

          {/* Piernas - Más detalladas */}
          <group ref={legsRef}>
            {/* Pierna izquierda */}
            <group position={[-0.12, 0.3, 0]} rotation={[0, 0, 0.1]}>
              {/* Cadera */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.07, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Muslo */}
              <mesh position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.05, 0.4, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Rodilla */}
              <mesh position={[0, -0.4, 0]} castShadow>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Pantorrilla */}
              <mesh position={[0, -0.6, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.04, 0.4, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
            </group>

            {/* Pierna derecha */}
            <group position={[0.12, 0.3, 0]} rotation={[0, 0, -0.1]}>
              {/* Cadera */}
              <mesh position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.07, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Muslo */}
              <mesh position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.05, 0.4, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Rodilla */}
              <mesh position={[0, -0.4, 0]} castShadow>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
              {/* Pantorrilla */}
              <mesh position={[0, -0.6, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.04, 0.4, 8]} />
                <meshStandardMaterial color="#333333" />
              </mesh>
            </group>
          </group>
        </group>

        {/* El nombre se mantiene fuera del grupo del cuerpo para que no se vea afectado por las animaciones */}
        {name && (
          <group position={[0, 2.1, 0]}>
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
