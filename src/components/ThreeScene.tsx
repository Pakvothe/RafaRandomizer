import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
} from "@react-three/drei";
import StickFigure from "./StickFigure";
import Fireworks from "./Fireworks";
import * as THREE from "three";
import { useAnimationStore } from "../store/animationStore";

// Componente para ajustar la cámara según el tamaño de la pantalla
const ResponsiveCamera = () => {
  const { size } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    if (cameraRef.current) {
      // Ajustar la posición de la cámara según el ancho de la pantalla
      if (size.width < 768) {
        // Para dispositivos móviles, alejar la cámara
        cameraRef.current.position.set(0, 6, 14);
      } else {
        // Para pantallas más grandes
        cameraRef.current.position.set(0, 5, 10);
      }
    }
  }, [size.width]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 5, 10]}
      fov={size.width < 768 ? 60 : 50}
    />
  );
};

interface ThreeSceneProps {
  winner: string | null;
  participants: string[];
  isAnimating: boolean;
  onAnimationComplete: () => void;
}

// Función para generar una posición aleatoria en el mapa
const getRandomPosition = (isMobile: boolean): [number, number, number] => {
  const range = isMobile ? 5 : 8;
  return [(Math.random() - 0.5) * range * 2, 0, (Math.random() - 0.5) * range];
};

// Componente para manejar la animación de los participantes
interface ParticipantsAnimationProps {
  winner: string | null;
  participants: string[];
  participantPositions: Record<string, [number, number, number]>;
  participantRefs: React.MutableRefObject<Record<string, THREE.Group | null>>;
  participantTargets: React.MutableRefObject<
    Record<string, [number, number, number]>
  >;
  participantSpeeds: React.MutableRefObject<Record<string, number>>;
  isMobile: React.MutableRefObject<boolean>;
  setParticipantPositions: React.Dispatch<
    React.SetStateAction<Record<string, [number, number, number]>>
  >;
}

const ParticipantsAnimation = ({
  winner,
  participants,
  participantPositions,
  participantRefs,
  participantTargets,
  participantSpeeds,
  isMobile,
  setParticipantPositions,
}: ParticipantsAnimationProps) => {
  const { stage, isAnimating, showBlood } = useAnimationStore();
  const updateInterval = useRef(0);
  const batchSize = useRef(isMobile.current ? 10 : 20);
  const centerPosition = new THREE.Vector3(0, 0, 0);

  // Actualizar movimiento de los participantes
  useFrame(() => {
    if (!isAnimating || stage === "idle") return;

    // Actualizar solo un subconjunto de participantes por frame
    const startIndex = updateInterval.current * batchSize.current;
    const endIndex = Math.min(
      startIndex + batchSize.current,
      participants.length
    );
    const currentBatch = participants.slice(startIndex, endIndex);

    // Los participantes corren cuando la animación está activa
    currentBatch.forEach((participant) => {
      if (participant !== winner && participantRefs.current[participant]) {
        const ref = participantRefs.current[participant];
        if (!ref) return;

        // Si hay un ganador y no ha sido eliminado, huir de él
        if (winner && participantPositions[winner] && !showBlood) {
          const winnerPos = new THREE.Vector3(...participantPositions[winner]);
          const current = new THREE.Vector3(
            ...participantPositions[participant]
          );

          // Vector desde el ganador al participante (dirección de huida)
          const fleeDirection = new THREE.Vector3()
            .subVectors(current, winnerPos)
            .normalize();

          // Calcular nueva posición alejándose del ganador
          const speed = participantSpeeds.current[participant] || 0.05;
          const newPos: [number, number, number] = [
            current.x + fleeDirection.x * speed * 1.5,
            0,
            current.z + fleeDirection.z * speed * 1.5,
          ];

          // Limitar el área de movimiento
          const maxDistance = isMobile.current ? 8 : 12;
          if (Math.abs(newPos[0]) > maxDistance) {
            newPos[0] = Math.sign(newPos[0]) * maxDistance;
          }
          if (Math.abs(newPos[2]) > maxDistance) {
            newPos[2] = Math.sign(newPos[2]) * maxDistance;
          }

          // Actualizar rotación para mirar hacia donde huye
          const angle = Math.atan2(fleeDirection.x, fleeDirection.z);
          ref.rotation.y = angle + Math.PI;

          // Actualizar posición en el estado
          setParticipantPositions((prev) => ({
            ...prev,
            [participant]: newPos,
          }));

          // Aplicar la posición al objeto
          ref.position.set(...newPos);
        } else {
          // Si no hay ganador o el ganador fue eliminado, volver al centro
          const current = new THREE.Vector3(
            ...participantPositions[participant]
          );
          const distanceToCenter = current.distanceTo(centerPosition);

          if (distanceToCenter > 3) {
            // Si está lejos del centro
            const directionToCenter = new THREE.Vector3()
              .subVectors(centerPosition, current)
              .normalize();

            const speed = participantSpeeds.current[participant] || 0.05;
            const newPos: [number, number, number] = [
              current.x + directionToCenter.x * speed,
              0,
              current.z + directionToCenter.z * speed,
            ];

            // Actualizar rotación para mirar hacia el centro
            const angle = Math.atan2(directionToCenter.x, directionToCenter.z);
            ref.rotation.y = angle;

            // Actualizar posición en el estado
            setParticipantPositions((prev) => ({
              ...prev,
              [participant]: newPos,
            }));

            // Aplicar la posición al objeto
            ref.position.set(...newPos);
          } else {
            // Si está cerca del centro, moverse aleatoriamente
            if (
              !participantTargets.current[participant] ||
              current.distanceTo(
                new THREE.Vector3(
                  ...(participantTargets.current[participant] || [0, 0, 0])
                )
              ) < 0.5
            ) {
              participantTargets.current[participant] = getRandomPosition(
                isMobile.current
              );
            }

            // Mover hacia el objetivo aleatorio
            const target = new THREE.Vector3(
              ...(participantTargets.current[participant] || [0, 0, 0])
            );
            const direction = new THREE.Vector3()
              .subVectors(target, current)
              .normalize();

            // Actualizar posición
            const speed = participantSpeeds.current[participant] || 0.05;
            const newPos: [number, number, number] = [
              current.x + direction.x * speed,
              0,
              current.z + direction.z * speed,
            ];

            // Actualizar rotación para mirar hacia donde se mueve
            const angle = Math.atan2(direction.x, direction.z);
            ref.rotation.y = angle;

            // Actualizar posición en el estado
            setParticipantPositions((prev) => ({
              ...prev,
              [participant]: newPos,
            }));

            // Aplicar la posición al objeto
            ref.position.set(...newPos);
          }
        }
      }
    });

    // Actualizar el intervalo para el siguiente frame
    updateInterval.current =
      (updateInterval.current + 1) %
      Math.ceil(participants.length / batchSize.current);
  });

  return null;
};

// Componente para manejar la animación de los participantes que no fueron seleccionados
interface CelebrationAnimationProps {
  participants: string[];
  winner: string | null;
  participantRefs: React.MutableRefObject<Record<string, THREE.Group | null>>;
}

const CelebrationAnimation = ({
  participants,
  winner,
  participantRefs,
}: CelebrationAnimationProps) => {
  const { stage } = useAnimationStore();
  const celebrationTime = useRef(0);
  const participantCelebrationTimes = useRef<Record<string, number>>({});

  useFrame(() => {
    const deltaTime = 0.016; // Aproximadamente 60fps
    celebrationTime.current += deltaTime;

    if (stage === "celebrating") {
      // Solo celebrar en la etapa de celebración
      participants.forEach((participant) => {
        if (participant !== winner && participantRefs.current[participant]) {
          const ref = participantRefs.current[participant];
          if (!ref) return;

          // Inicializar tiempo de celebración para este participante si no existe
          if (!participantCelebrationTimes.current[participant]) {
            participantCelebrationTimes.current[participant] =
              Math.random() * Math.PI; // Fase aleatoria
          }

          // Actualizar tiempo de celebración
          participantCelebrationTimes.current[participant] += deltaTime;
          const particleTime = participantCelebrationTimes.current[participant];

          // Animar todo el grupo como una unidad
          ref.position.y = Math.abs(Math.sin(particleTime * 5)) * 0.5;
          ref.rotation.y += deltaTime * 2;
          ref.rotation.z = Math.sin(particleTime * 5) * 0.1;

          // Animar brazos si existen (como parte del grupo)
          if (ref.children.length >= 3) {
            const arms = ref.children[2] as THREE.Group;
            if (arms && arms.isGroup) {
              arms.rotation.x = Math.sin(particleTime * 8) * 0.3;
            }
          }
        }
      });
    }
  });

  return null;
};

// Componente para manejar la animación de Raphael
interface RaphaelAnimationProps {
  targetPosition?: [number, number, number];
  raphaelRef: React.MutableRefObject<THREE.Group | null>;
  swordRef: React.MutableRefObject<THREE.Group | null>;
  initialPosition: [number, number, number];
}

const RaphaelAnimation = ({
  targetPosition,
  raphaelRef,
  swordRef,
  initialPosition,
}: RaphaelAnimationProps) => {
  const {
    stage,
    setRaphaelDistanceToTarget,
    advanceToNextStage,
    setRaphaelHasReachedTarget,
  } = useAnimationStore();

  const celebrationTime = useRef(0);
  const runningTime = useRef(0);
  const lastKnownTarget = useRef<[number, number, number] | undefined>(
    undefined
  );
  const attackStartTime = useRef<number | null>(null);
  const afterAttackStartTime = useRef<number | null>(null);
  const hasStartedRunning = useRef(false);

  useFrame(({ clock }) => {
    if (!raphaelRef.current) return;

    const group = raphaelRef.current;
    const sword = swordRef.current;
    const time = clock.getElapsedTime();
    const deltaTime = 0.016; // Aproximadamente 60fps

    // Actualizar tiempo de ejecución
    runningTime.current += deltaTime;

    // Guardar el último objetivo conocido
    if (targetPosition) {
      lastKnownTarget.current = [...targetPosition];
    }

    switch (stage) {
      case "idle": // Posición inicial
        group.position.set(...initialPosition);
        group.rotation.set(0, 0, 0);
        if (sword) {
          sword.rotation.set(0, 0, 0);
        }
        celebrationTime.current = 0;
        attackStartTime.current = null;
        afterAttackStartTime.current = null;
        hasStartedRunning.current = false;
        setRaphaelHasReachedTarget(false);
        break;

      case "preparation": // Preparación
        // Ligero movimiento
        group.position.y = initialPosition[1] + Math.sin(time * 3) * 0.05;

        // Avanzar a la siguiente etapa después de un breve tiempo
        if (!hasStartedRunning.current) {
          hasStartedRunning.current = true;
          setTimeout(() => {
            advanceToNextStage();
          }, 1000);
        }
        break;

      case "running": // Acercándose al ganador - CORRER GRADUALMENTE
        if (lastKnownTarget.current) {
          // Obtener posición actual y objetivo
          const target = new THREE.Vector3(...lastKnownTarget.current);
          const current = new THREE.Vector3(
            group.position.x,
            group.position.y,
            group.position.z
          );

          // Calcular dirección y distancia
          const direction = new THREE.Vector3()
            .subVectors(target, current)
            .normalize();
          const distance = current.distanceTo(target);

          // Actualizar la distancia en el store
          setRaphaelDistanceToTarget(distance);

          // Si está lo suficientemente cerca, avanzar a la etapa de ataque
          if (distance < 1.5) {
            // Posicionar exactamente frente al objetivo
            const finalPos = new THREE.Vector3(...lastKnownTarget.current);
            finalPos.x -= direction.x * 1.0;
            finalPos.z -= direction.z * 1.0;

            // Actualizar posición
            group.position.set(finalPos.x, initialPosition[1], finalPos.z);

            // Asegurar que mire hacia el objetivo
            const angle = Math.atan2(direction.x, direction.z);
            group.rotation.y = angle;

            // Marcar como alcanzado y avanzar a la etapa de ataque
            setRaphaelHasReachedTarget(true);
            advanceToNextStage();
            attackStartTime.current = time;
            break;
          }

          // MOVIMIENTO GRADUAL: Velocidad más alta para asegurar que llegue
          const speed = 0.15; // Velocidad aumentada para asegurar que llegue

          // Calcular nueva posición
          const newX = group.position.x + direction.x * speed;
          const newZ = group.position.z + direction.z * speed;

          // Aplicar nueva posición al grupo directamente
          group.position.x = newX;
          group.position.z = newZ;

          // Animación de correr
          group.position.y =
            initialPosition[1] +
            Math.abs(Math.sin(runningTime.current * 10)) * 0.2;

          // Asegurar que mire hacia donde se mueve
          const moveAngle = Math.atan2(direction.x, direction.z);
          group.rotation.y = moveAngle;
        }
        break;

      case "attacking": // Atacando con la espada
        if (sword) {
          // Asegurarse de que esté mirando al objetivo
          if (lastKnownTarget.current) {
            const target = new THREE.Vector3(...lastKnownTarget.current);
            const current = new THREE.Vector3(
              group.position.x,
              group.position.y,
              group.position.z
            );
            const direction = new THREE.Vector3()
              .subVectors(target, current)
              .normalize();

            // Actualizar rotación para mirar hacia el objetivo
            const angle = Math.atan2(direction.x, direction.z);
            group.rotation.y = angle;
          }

          // Movimiento de ataque con la espada más agresivo
          sword.rotation.z =
            Math.PI / 4 + (Math.sin(time * 15) * Math.PI) / 1.5;

          // Añadir movimiento al cuerpo durante el ataque
          group.position.y = initialPosition[1] + Math.sin(time * 10) * 0.1;
          group.rotation.z = Math.sin(time * 8) * 0.1;

          // Avanzar a la siguiente etapa después de un tiempo
          if (attackStartTime.current && time - attackStartTime.current > 1.5) {
            advanceToNextStage();
            afterAttackStartTime.current = time;
          }
        }
        break;

      case "afterAttack": // Después del corte
        if (sword) {
          // Volver la espada a la posición normal
          sword.rotation.z = Math.PI / 4;
        }
        // Retroceder un poco
        group.position.x -= 0.02;
        if (group.position.x < initialPosition[0]) {
          group.position.x = initialPosition[0];
        }

        // Avanzar a la siguiente etapa después de un tiempo
        if (
          afterAttackStartTime.current &&
          time - afterAttackStartTime.current > 1.5
        ) {
          advanceToNextStage();
        }
        break;

      case "celebrating": // Celebrando
        celebrationTime.current += deltaTime;

        // Saltar de alegría más alto
        group.position.y =
          initialPosition[1] +
          Math.abs(Math.sin(celebrationTime.current * 5)) * 0.7;

        // Girar sobre sí mismo más rápido
        group.rotation.y += 0.1;

        if (sword) {
          // Agitar la espada en celebración más enérgicamente
          sword.rotation.z =
            Math.PI / 4 +
            (Math.sin(celebrationTime.current * 12) * Math.PI) / 2;
        }
        break;
    }
  });

  return null;
};

// Optimizar el renderizado de participantes
const ThreeScene = ({
  winner,
  participants,
  isAnimating,
  onAnimationComplete,
}: ThreeSceneProps) => {
  const { stage, showBlood, showFireworks, startAnimation, stopAnimation } =
    useAnimationStore();

  const animationCompleted = useRef(false);
  const isMobile = useRef(window.innerWidth < 768);

  // Posiciones de los participantes
  const [participantPositions, setParticipantPositions] = useState<
    Record<string, [number, number, number]>
  >({});
  const participantRefs = useRef<Record<string, THREE.Group | null>>({});
  const participantTargets = useRef<Record<string, [number, number, number]>>(
    {}
  );
  const participantSpeeds = useRef<Record<string, number>>({});

  // Referencias para Raphael
  const raphaelRef = useRef<THREE.Group | null>(null);
  const swordRef = useRef<THREE.Group | null>(null);

  // Generar nubes estáticas una sola vez
  const staticClouds = useMemo(() => {
    return Array.from({ length: isMobile.current ? 15 : 25 }).map((_, i) => {
      const scale = 2 + Math.random() * 2;
      const x = (Math.random() - 0.5) * 30;
      const y = 6 + Math.random() * 4;
      const z = (Math.random() - 0.5) * 30;
      return (
        <mesh
          key={`cloud-${i}`}
          position={[x, y, z]}
          scale={[scale, scale * 0.4, scale]}
          castShadow={false}
          receiveShadow={false}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color="white"
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      );
    });
  }, []); // Solo se genera una vez

  // Generar pasto estático una sola vez
  const staticGrass = useMemo(() => {
    return Array.from({ length: isMobile.current ? 300 : 600 }).map((_, i) => {
      const radius = Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
      const rotation = Math.random() * Math.PI;
      const scale = 0.1 + Math.random() * 0.15;
      return (
        <mesh
          key={`grass-${i}`}
          position={[x, 0.1, z]}
          rotation={[0, rotation, 0]}
          scale={[scale, scale, scale]}
          castShadow={false}
          receiveShadow={false}
        >
          <planeGeometry args={[0.1, 0.4]} />
          <meshStandardMaterial
            color={Math.random() > 0.5 ? "#3a7a33" : "#4a8a43"}
            side={THREE.DoubleSide}
            transparent={false}
          />
        </mesh>
      );
    });
  }, []); // Solo se genera una vez

  // Detectar cambios en el tamaño de la pantalla
  useEffect(() => {
    const handleResize = () => {
      isMobile.current = window.innerWidth < 768;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Inicializar o actualizar posiciones de los participantes
  useEffect(() => {
    const newPositions: Record<string, [number, number, number]> = {
      ...participantPositions,
    };

    // Asignar posiciones a nuevos participantes
    participants.forEach((participant) => {
      if (!newPositions[participant]) {
        newPositions[participant] = getRandomPosition(isMobile.current);
        participantSpeeds.current[participant] = 0.03 + Math.random() * 0.02; // Velocidad aleatoria
      }
    });

    // Eliminar participantes que ya no están en la lista
    Object.keys(newPositions).forEach((name) => {
      if (!participants.includes(name)) {
        delete newPositions[name];
        delete participantRefs.current[name];
        delete participantTargets.current[name];
        delete participantSpeeds.current[name];
      }
    });

    setParticipantPositions(newPositions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  // Manejar cambios en isAnimating
  useEffect(() => {
    if (isAnimating && !animationCompleted.current) {
      // Iniciar animación
      startAnimation();
      animationCompleted.current = false;
    } else if (!isAnimating) {
      // Detener animación
      stopAnimation();
      animationCompleted.current = false;
    }
  }, [isAnimating, startAnimation, stopAnimation]);

  // Manejar cambios en la etapa de animación
  useEffect(() => {
    // Si llegamos a la etapa de celebración, notificar que la animación ha terminado
    if (stage === "celebrating" && !animationCompleted.current) {
      animationCompleted.current = true;
      onAnimationComplete();
    }
  }, [stage, onAnimationComplete]);

  // Calcular posiciones según el tamaño de la pantalla
  const getRaphaelPosition = (): [number, number, number] => {
    return isMobile.current ? [-5, 0, -5] : [-8, 0, -8];
  };

  const getWinnerPosition = (): [number, number, number] => {
    return winner
      ? participantPositions[winner] ||
          (isMobile.current ? [2, 0, 0] : [3, 0, 0])
      : [0, 0, 0];
  };

  const getBloodPosition = (): [number, number, number] => {
    const winnerPos = getWinnerPosition();
    return [winnerPos[0], winnerPos[1] + 1, winnerPos[2]];
  };

  // Función para renderizar participantes en lotes
  const renderParticipants = () => {
    const batchSize = isMobile.current ? 20 : 30;
    const batches = [];

    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = participants.slice(i, i + batchSize);
      batches.push(
        <group key={`batch-${i}`}>
          {batch.map((participant) => (
            <StickFigure
              key={participant}
              ref={(ref) => {
                participantRefs.current[participant] = ref;
              }}
              position={participantPositions[participant] || [0, 0, 0]}
              animationStage={0}
              isWinner={participant === winner}
              name={participant}
              hasSword={false}
              isRunning={stage !== "idle" && participant !== winner}
            />
          ))}
        </group>
      );
    }

    return batches;
  };

  return (
    <div className="canvas-container">
      <Canvas
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          precision: "lowp",
        }}
        camera={{ position: [0, 5, 10], fov: 50 }}
        shadows
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={["#87CEEB"]} />
        <fog attach="fog" args={["#87CEEB", 15, 30]} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={25}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
          rotateSpeed={0.2}
          enableDamping={true}
          dampingFactor={0.05}
          autoRotate={false}
        />

        {/* Nubes estáticas */}
        <group>{staticClouds}</group>

        <ResponsiveCamera />

        {/* Componente de animación de participantes */}
        <ParticipantsAnimation
          winner={winner}
          participants={participants}
          participantPositions={participantPositions}
          participantRefs={participantRefs}
          participantTargets={participantTargets}
          participantSpeeds={participantSpeeds}
          isMobile={isMobile}
          setParticipantPositions={setParticipantPositions}
        />

        {/* Componente de animación de Raphael */}
        <RaphaelAnimation
          targetPosition={winner ? getWinnerPosition() : undefined}
          raphaelRef={raphaelRef}
          swordRef={swordRef}
          initialPosition={getRaphaelPosition()}
        />

        {/* Componente de celebración */}
        <CelebrationAnimation
          participants={participants}
          winner={winner}
          participantRefs={participantRefs}
        />

        {/* Raphael - siempre con nombre */}
        <StickFigure
          ref={(el) => {
            raphaelRef.current = el;
          }}
          position={getRaphaelPosition()}
          animationStage={0} // No usamos la animación interna, la manejamos con RaphaelAnimation
          isWinner={false}
          name="Rafa"
          hasSword={true}
          swordRef={swordRef}
          targetPosition={winner ? getWinnerPosition() : undefined}
        />

        {/* Renderizar participantes en lotes */}
        {renderParticipants()}

        {/* Sangre del corte */}
        {showBlood && <BloodSplatter position={getBloodPosition()} />}

        {/* Fuegos artificiales - ahora continúan indefinidamente */}
        {showFireworks && <Fireworks />}

        {/* Suelo estático optimizado */}
        <group position={[0, -0.5, 0]}>
          {/* Base del pasto */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial
              color="#2d5a27"
              metalness={0.1}
              roughness={0.8}
            />
          </mesh>

          {/* Detalles del pasto estáticos */}
          <group>{staticGrass}</group>
        </group>

        {/* Ambiente */}
        <Environment preset="sunset" />
      </Canvas>
    </div>
  );
};

// Componente para la sangre que salpica
const BloodSplatter = ({
  position,
}: {
  position: [number, number, number];
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Vector3[]>([]);
  const velocitiesRef = useRef<THREE.Vector3[]>([]);
  const rotationsRef = useRef<THREE.Vector3[]>([]);
  const rotationSpeedsRef = useRef<THREE.Vector3[]>([]);
  const particleCount = 75; // Reducido de 100 a 75 para mejor rendimiento
  const isMobile = useRef(window.innerWidth < 768);

  // Inicializar partículas
  useEffect(() => {
    particlesRef.current = [];
    velocitiesRef.current = [];
    rotationsRef.current = [];
    rotationSpeedsRef.current = [];

    // Detectar si es móvil para ajustar rendimiento
    isMobile.current = window.innerWidth < 768;
    const actualParticleCount = isMobile.current ? 50 : particleCount;

    for (let i = 0; i < actualParticleCount; i++) {
      // Posición inicial
      particlesRef.current.push(new THREE.Vector3(0, 0, 0));

      // Velocidad inicial - más explosiva
      const angle = Math.random() * Math.PI * 2;
      const upwardBias = Math.random() * 0.5 + 0.2; // Bias hacia arriba
      const speed = Math.random() * 0.2 + 0.1;

      velocitiesRef.current.push(
        new THREE.Vector3(
          Math.cos(angle) * speed * 2,
          upwardBias + Math.random() * 0.3,
          Math.sin(angle) * speed * 2
        )
      );

      // Rotación inicial
      rotationsRef.current.push(
        new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
      );

      // Velocidad de rotación
      rotationSpeedsRef.current.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.15, // Reducido para mejor rendimiento
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15
        )
      );
    }
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;

    // Actualizar cada partícula
    for (let i = 0; i < particlesRef.current.length; i++) {
      if (!particlesRef.current[i]) continue;

      // Aplicar gravedad
      velocitiesRef.current[i].y -= 0.01;

      // Actualizar posición
      particlesRef.current[i].add(velocitiesRef.current[i]);

      // Rebote en el suelo
      if (particlesRef.current[i].y < -2) {
        particlesRef.current[i].y = -2;
        velocitiesRef.current[i].y = -velocitiesRef.current[i].y * 0.6; // Rebote con pérdida de energía

        // Fricción en el suelo
        velocitiesRef.current[i].x *= 0.92; // Más fricción para mejor rendimiento
        velocitiesRef.current[i].z *= 0.92;

        // Reducir velocidad angular al rebotar
        rotationSpeedsRef.current[i].multiplyScalar(0.9);
      }

      // Rebote en paredes imaginarias - límites más cercanos
      if (Math.abs(particlesRef.current[i].x) > 8) {
        // Reducido de 10 a 8
        velocitiesRef.current[i].x = -velocitiesRef.current[i].x * 0.8;
      }

      if (Math.abs(particlesRef.current[i].z) > 8) {
        // Reducido de 10 a 8
        velocitiesRef.current[i].z = -velocitiesRef.current[i].z * 0.8;
      }

      // Actualizar rotación
      rotationsRef.current[i].x += rotationSpeedsRef.current[i].x;
      rotationsRef.current[i].y += rotationSpeedsRef.current[i].y;
      rotationsRef.current[i].z += rotationSpeedsRef.current[i].z;

      // Aplicar fricción a la rotación - más agresiva
      rotationSpeedsRef.current[i].multiplyScalar(0.97);
    }

    // Actualizar los hijos del grupo
    if (groupRef.current.children.length === particlesRef.current.length) {
      for (let i = 0; i < particlesRef.current.length; i++) {
        const mesh = groupRef.current.children[i] as THREE.Mesh;
        mesh.position.copy(particlesRef.current[i]);
        mesh.rotation.set(
          rotationsRef.current[i].x,
          rotationsRef.current[i].y,
          rotationsRef.current[i].z
        );
      }
    }
  });

  const createBloodParticles = () => {
    const particles = [];
    const actualParticleCount = isMobile.current ? 50 : particleCount;

    for (let i = 0; i < actualParticleCount; i++) {
      // Tamaños más variados pero ligeramente reducidos
      const size = Math.random() * 0.25 + 0.05;

      // Formas variadas (esferas y cubos para representar trozos)
      const isChunk = Math.random() > 0.7;

      // Colores variados de rojo
      const color = new THREE.Color(
        0.8 + Math.random() * 0.2, // R
        Math.random() * 0.2, // G
        Math.random() * 0.2 // B
      );

      particles.push(
        <mesh key={`blood-${i}`} position={[0, 0, 0]}>
          {isChunk ? (
            <boxGeometry args={[size, size, size]} />
          ) : (
            <sphereGeometry args={[size, 8, 8]} />
          )}
          <meshStandardMaterial color={color} />
        </mesh>
      );
    }

    return particles;
  };

  return (
    <group ref={groupRef} position={position}>
      {createBloodParticles()}
    </group>
  );
};

export default ThreeScene;
