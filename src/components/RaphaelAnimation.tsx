import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAnimationStore } from "../store/animationStore";

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

          // Tiempo transcurrido desde el inicio del ataque
          const attackTime = attackStartTime.current
            ? time - attackStartTime.current
            : 0;
          const attackDuration = 1.0; // Duración más corta para un ataque más rápido
          const attackProgress = Math.min(attackTime / attackDuration, 1);

          // Movimiento de ataque con la espada vertical
          if (attackProgress < 0.3) {
            // Fase 1: Levantar la espada
            sword.rotation.x = -(attackProgress / 0.3) * Math.PI * 0.75;
            sword.rotation.z = Math.PI / 4;
            group.position.y = initialPosition[1] + 0.2; // Levantarse un poco
          } else if (attackProgress < 0.6) {
            // Fase 2: Golpe vertical rápido
            const swingProgress = (attackProgress - 0.3) / 0.3;
            sword.rotation.x = -Math.PI * 0.75 + swingProgress * Math.PI;
            sword.rotation.z = Math.PI / 4;
            group.position.y = initialPosition[1] + 0.2 - swingProgress * 0.1; // Bajar durante el golpe
            // Avanzar ligeramente durante el golpe
            if (lastKnownTarget.current) {
              const direction = new THREE.Vector3(...lastKnownTarget.current)
                .sub(new THREE.Vector3(group.position.x, 0, group.position.z))
                .normalize();
              group.position.x += direction.x * 0.05;
              group.position.z += direction.z * 0.05;
            }
          } else {
            // Fase 3: Recuperación
            const recoveryProgress = (attackProgress - 0.6) / 0.4;
            sword.rotation.x =
              Math.PI * 0.25 - recoveryProgress * Math.PI * 0.25;
            sword.rotation.z = Math.PI / 4;
            group.position.y =
              initialPosition[1] + 0.1 * (1 - recoveryProgress);
          }

          // Avanzar a la siguiente etapa después del tiempo de ataque
          if (attackProgress >= 1) {
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

export default RaphaelAnimation;
