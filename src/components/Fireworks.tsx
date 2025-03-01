import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  trail?: boolean;
  trailPositions?: THREE.Vector3[];
}

const Fireworks = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [fireworks, setFireworks] = useState<Particle[][]>([]);
  const frameCount = useRef(0);
  const isMobile = useRef(window.innerWidth < 768);

  // Límites para optimización
  const MAX_FIREWORKS = isMobile.current ? 5 : 10; // Limitar número de fuegos artificiales simultáneos
  const MAX_PARTICLES_TOTAL = isMobile.current ? 500 : 1000; // Limitar número total de partículas
  const particleCountRef = useRef(0); // Contador de partículas activas

  // Detectar cambios en el tamaño de la pantalla
  useEffect(() => {
    const handleResize = () => {
      isMobile.current = window.innerWidth < 768;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Crear un nuevo fuego artificial
  const createFirework = () => {
    // Calcular cuántas partículas podemos crear sin exceder el límite
    const currentParticleCount = particleCountRef.current;
    const maxNewParticles = MAX_PARTICLES_TOTAL - currentParticleCount;

    // Si no podemos crear más partículas, devolver un array vacío
    if (maxNewParticles <= 0) {
      return [];
    }

    // Ajustar la cantidad de partículas según el espacio disponible
    const baseParticleCount = isMobile.current ? 60 : 100;
    const variableParticleCount = isMobile.current ? 20 : 50;
    const desiredParticleCount =
      baseParticleCount + Math.floor(Math.random() * variableParticleCount);

    // Usar el mínimo entre lo que queremos y lo que podemos
    const particleCount = Math.min(desiredParticleCount, maxNewParticles);

    const particles: Particle[] = [];

    // Ajustar posición según el tamaño de la pantalla
    const xRange = isMobile.current ? 10 : 20;
    const yMin = isMobile.current ? 3 : 5;
    const yMax = isMobile.current ? 8 : 15;
    const zRange = isMobile.current ? 6 : 10;

    const position = new THREE.Vector3(
      (Math.random() - 0.5) * xRange,
      yMin + Math.random() * (yMax - yMin),
      (Math.random() - 0.5) * zRange
    );

    // Paleta de colores más amplia y vibrante (mantenemos los colores)
    const colors = [
      "#ff0000",
      "#ff3300",
      "#ff6600",
      "#ff9900",
      "#ffcc00",
      "#ffff00",
      "#ccff00",
      "#66ff00",
      "#00ff00",
      "#00ff66",
      "#00ffcc",
      "#00ffff",
      "#00ccff",
      "#0099ff",
      "#0066ff",
      "#0033ff",
      "#0000ff",
      "#3300ff",
      "#6600ff",
      "#9900ff",
      "#cc00ff",
      "#ff00ff",
      "#ff00cc",
      "#ff0099",
      "#ff0066",
      "#ff0033",
      "#ffffff",
      "#ffdddd",
      "#ddffdd",
      "#ddddff",
    ];

    // Seleccionar un color principal para este fuego artificial
    const isMulticolor = Math.random() > 0.7;
    const mainColor = colors[Math.floor(Math.random() * colors.length)];

    // Ajustar velocidad y tamaño según el dispositivo
    const speedMultiplier = isMobile.current ? 0.8 : 1.2;

    // Tipo de explosión (radial, en anillo, en espiral, etc.)
    const explosionType = Math.floor(Math.random() * 4); // 0-3

    // Limitar la cantidad de partículas con estela para mejorar rendimiento
    const maxTrailParticles = isMobile.current ? 5 : 15;
    let trailParticlesCount = 0;

    for (let i = 0; i < particleCount; i++) {
      let angle1 = 0;
      let angle2 = 0;
      let speed = 0;
      let velocity;
      let x = 0;
      let y = 0;
      let t = 0;

      // Diferentes patrones de explosión
      switch (explosionType) {
        case 0: // Explosión radial estándar
          angle1 = Math.random() * Math.PI * 2;
          angle2 = Math.random() * Math.PI * 2;
          speed = (0.1 + Math.random() * 0.2) * speedMultiplier;

          velocity = new THREE.Vector3(
            Math.sin(angle1) * Math.cos(angle2) * speed,
            Math.sin(angle1) * Math.sin(angle2) * speed,
            Math.cos(angle1) * speed
          );
          break;

        case 1: // Explosión en anillo (más plana)
          angle1 = Math.random() * Math.PI * 2;
          speed = (0.1 + Math.random() * 0.2) * speedMultiplier;

          velocity = new THREE.Vector3(
            Math.cos(angle1) * speed,
            (Math.random() * 0.1 - 0.05) * speed, // Menos movimiento vertical
            Math.sin(angle1) * speed
          );
          break;

        case 2: // Explosión en espiral
          angle1 = Math.random() * Math.PI * 2;
          angle2 = (i * (Math.PI * 2)) / particleCount; // Distribución uniforme
          speed = (0.1 + Math.random() * 0.15) * speedMultiplier;

          velocity = new THREE.Vector3(
            Math.cos(angle2) * speed,
            Math.sin(angle1) * 0.1 * speed,
            Math.sin(angle2) * speed
          );
          break;

        case 3: // Explosión con forma de corazón
          angle1 = (i * (Math.PI * 2)) / particleCount; // Distribución uniforme
          speed = (0.05 + Math.random() * 0.15) * speedMultiplier;

          // Ecuación paramétrica de un corazón
          t = angle1;
          x = 16 * Math.pow(Math.sin(t), 3);
          y =
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t);

          velocity = new THREE.Vector3(
            x * speed * 0.01,
            y * speed * 0.01,
            (Math.random() - 0.5) * speed * 0.5
          );
          break;

        default:
          angle1 = Math.random() * Math.PI * 2;
          angle2 = Math.random() * Math.PI * 2;
          speed = (0.1 + Math.random() * 0.2) * speedMultiplier;

          velocity = new THREE.Vector3(
            Math.sin(angle1) * Math.cos(angle2) * speed,
            Math.sin(angle1) * Math.sin(angle2) * speed,
            Math.cos(angle1) * speed
          );
      }

      // Tamaño variable de partículas
      const particleSize = isMobile.current
        ? 0.03 + Math.random() * 0.08
        : 0.05 + Math.random() * 0.12;

      // Color variable (con probabilidad de ser multicolor)
      const color = isMulticolor
        ? colors[Math.floor(Math.random() * colors.length)]
        : mainColor;

      // Algunas partículas tienen estelas (limitadas para mejor rendimiento)
      const hasTrail =
        trailParticlesCount < maxTrailParticles && Math.random() > 0.8;
      if (hasTrail) trailParticlesCount++;

      // Vida más corta para mejor rendimiento
      const maxLife = 0.8 + Math.random() * 0.7;

      particles.push({
        position: position.clone(),
        velocity,
        color,
        size: particleSize,
        life: 1.0,
        maxLife,
        trail: hasTrail,
        trailPositions: hasTrail ? [position.clone()] : undefined,
      });
    }

    // Actualizar el contador de partículas
    particleCountRef.current += particles.length;

    return particles;
  };

  // Actualizar los fuegos artificiales
  useFrame(() => {
    frameCount.current += 1;

    // Crear nuevos fuegos artificiales periódicamente si no excedemos el límite
    const interval = isMobile.current ? 40 : 30; // Reducido para mejor rendimiento
    if (
      frameCount.current % interval === 0 &&
      fireworks.length < MAX_FIREWORKS
    ) {
      setFireworks((prev) => [...prev, createFirework()]);
    }

    // Actualizar y eliminar fuegos artificiales
    setFireworks((prev) => {
      // Actualizar partículas
      const updated = prev.map((firework) => {
        const updatedFirework = firework
          .map((particle) => {
            // Actualizar posición
            particle.position.add(particle.velocity);

            // Aplicar gravedad (más suave para efecto más flotante)
            particle.velocity.y -= 0.001;

            // Guardar posición para estela si tiene
            if (particle.trail && particle.trailPositions) {
              particle.trailPositions.push(particle.position.clone());
              // Limitar el tamaño de la estela
              if (particle.trailPositions.length > 5) {
                // Reducido para mejor rendimiento
                particle.trailPositions.shift();
              }
            }

            // Reducir vida
            particle.life -= 0.015; // Más rápido para mejor rendimiento

            return particle;
          })
          .filter((particle) => particle.life > 0);

        // Actualizar contador de partículas
        particleCountRef.current -= firework.length - updatedFirework.length;

        return updatedFirework;
      });

      // Eliminar fuegos artificiales vacíos
      return updated.filter((firework) => firework.length > 0);
    });
  });

  // Limpiar los fuegos artificiales al desmontar
  useEffect(() => {
    return () => {
      setFireworks([]);
      particleCountRef.current = 0;
    };
  }, []);

  // Optimización: usar instancias para partículas similares
  const renderFireworks = () => {
    // Agrupar partículas por color para usar instancias
    const particlesByColor: Record<string, Particle[]> = {};

    fireworks.forEach((firework) => {
      firework.forEach((particle) => {
        if (!particle.trail) {
          // Solo agrupar partículas sin estela
          if (!particlesByColor[particle.color]) {
            particlesByColor[particle.color] = [];
          }
          particlesByColor[particle.color].push(particle);
        }
      });
    });

    return (
      <>
        {/* Renderizar partículas agrupadas por color usando instancias */}
        {Object.entries(particlesByColor).map(([color, particles]) => {
          // Crear matrices para cada partícula
          const matrices = particles.map((particle) => {
            const matrix = new THREE.Matrix4();
            matrix.setPosition(particle.position);
            matrix.scale(
              new THREE.Vector3(
                particle.size * particle.life,
                particle.size * particle.life,
                particle.size * particle.life
              )
            );
            return matrix;
          });

          return (
            <instancedMesh
              key={`instances-${color}`}
              args={[undefined, undefined, particles.length]}
              onUpdate={(self) => {
                // Actualizar todas las matrices de instancia
                const mesh = self as THREE.InstancedMesh;
                matrices.forEach((matrix, idx) => {
                  mesh.setMatrixAt(idx, matrix);
                });
                mesh.instanceMatrix.needsUpdate = true;
              }}
            >
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} />
            </instancedMesh>
          );
        })}

        {/* Renderizar partículas con estela individualmente */}
        {fireworks.map((firework, fireworkIndex) => (
          <group key={`firework-${fireworkIndex}`}>
            {firework
              .filter((p) => p.trail)
              .map((particle, particleIndex) => (
                <group key={`particle-trail-${fireworkIndex}-${particleIndex}`}>
                  {/* Partícula principal */}
                  <mesh
                    position={[
                      particle.position.x,
                      particle.position.y,
                      particle.position.z,
                    ]}
                  >
                    <sphereGeometry
                      args={[particle.size * particle.life, 8, 8]}
                    />
                    <meshBasicMaterial
                      color={particle.color}
                      transparent
                      opacity={particle.life}
                    />
                  </mesh>

                  {/* Estela */}
                  {particle.trail &&
                    particle.trailPositions &&
                    particle.trailPositions.length > 1 && (
                      <line>
                        <bufferGeometry>
                          <bufferAttribute
                            attach="attributes-position"
                            count={particle.trailPositions.length}
                            array={
                              new Float32Array(
                                particle.trailPositions.flatMap((p) => [
                                  p.x,
                                  p.y,
                                  p.z,
                                ])
                              )
                            }
                            itemSize={3}
                          />
                        </bufferGeometry>
                        <lineBasicMaterial
                          color={particle.color}
                          transparent
                          opacity={particle.life * 0.5}
                          linewidth={1}
                        />
                      </line>
                    )}
                </group>
              ))}
          </group>
        ))}
      </>
    );
  };

  return <group ref={groupRef}>{renderFireworks()}</group>;
};

export default Fireworks;
