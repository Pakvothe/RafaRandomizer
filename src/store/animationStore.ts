import { create } from "zustand";

export type AnimationStage =
  | "idle" // Estado inicial
  | "preparation" // Preparación antes de correr
  | "running" // Corriendo hacia el ganador
  | "attacking" // Atacando con la espada
  | "afterAttack" // Después del ataque
  | "celebrating"; // Celebrando

interface AnimationState {
  // Estado general
  stage: AnimationStage;
  isAnimating: boolean;
  showBlood: boolean;
  showFireworks: boolean;

  // Estado específico de Rafa
  raphaelHasReachedTarget: boolean;
  raphaelDistanceToTarget: number;

  // Acciones
  setStage: (stage: AnimationStage) => void;
  startAnimation: () => void;
  stopAnimation: () => void;
  setShowBlood: (show: boolean) => void;
  setShowFireworks: (show: boolean) => void;
  setRaphaelHasReachedTarget: (reached: boolean) => void;
  setRaphaelDistanceToTarget: (distance: number) => void;

  // Utilidades
  advanceToNextStage: () => void;
}

export const useAnimationStore = create<AnimationState>((set, get) => ({
  // Estado inicial
  stage: "idle",
  isAnimating: false,
  showBlood: false,
  showFireworks: false,
  raphaelHasReachedTarget: false,
  raphaelDistanceToTarget: Infinity,

  // Acciones
  setStage: (stage) => set({ stage }),

  startAnimation: () =>
    set({
      isAnimating: true,
      stage: "preparation",
      showBlood: false,
      showFireworks: false,
      raphaelHasReachedTarget: false,
      raphaelDistanceToTarget: Infinity,
    }),

  stopAnimation: () =>
    set({
      isAnimating: false,
      stage: "idle",
      showBlood: false,
      showFireworks: false,
    }),

  setShowBlood: (show) => set({ showBlood: show }),

  setShowFireworks: (show) => set({ showFireworks: show }),

  setRaphaelHasReachedTarget: (reached) =>
    set({ raphaelHasReachedTarget: reached }),

  setRaphaelDistanceToTarget: (distance) =>
    set({
      raphaelDistanceToTarget: distance,
      // Si Rafa está lo suficientemente cerca y está corriendo, avanzar a la etapa de ataque
      raphaelHasReachedTarget: distance < 1.2 && get().stage === "running",
    }),

  // Avanzar a la siguiente etapa de animación
  advanceToNextStage: () => {
    const currentStage = get().stage;

    switch (currentStage) {
      case "idle":
        set({ stage: "preparation" });
        break;
      case "preparation":
        set({ stage: "running" });
        break;
      case "running":
        if (get().raphaelHasReachedTarget) {
          set({ stage: "attacking" });
        }
        break;
      case "attacking":
        set({ stage: "afterAttack", showBlood: true });
        break;
      case "afterAttack":
        set({ stage: "celebrating", showFireworks: true });
        break;
      default:
        break;
    }
  },
}));
