import { useState, useRef, useEffect } from "react";
import ThreeScene from "./ThreeScene";
import "../styles/Randomizer.css";
import {
  getLists,
  getListById,
  saveLists,
  markParticipantAsSelected,
  getEligibleParticipants,
  resetParticipantSelections,
  ParticipantList,
} from "../firebase/services";
import { useAnimationStore } from "../store/animationStore";

const Randomizer = () => {
  // Estado para los nombres y la entrada de texto
  const [names, setNames] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const { stopAnimation } = useAnimationStore();

  // Estado para el ganador y la animación
  const [winner, setWinner] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionTimerRef = useRef<number | null>(null);
  const [showWinnerSection, setShowWinnerSection] = useState(false);

  // Estado para las listas guardadas
  const [savedLists, setSavedLists] = useState<ParticipantList[]>([]);
  const [currentList, setCurrentList] = useState<ParticipantList | null>(null);
  const [listName, setListName] = useState("");
  const [showSavedLists, setShowSavedLists] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar las listas guardadas al iniciar
  useEffect(() => {
    const fetchLists = async () => {
      try {
        setIsLoading(true);
        const lists = await getLists();
        setSavedLists(lists);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching lists:", error);
        setIsLoading(false);
      }
    };

    fetchLists();
  }, []);

  // Efecto para mostrar la sección del ganador con animación
  useEffect(() => {
    if (winner || isSelecting) {
      setShowWinnerSection(true);
    } else {
      const timer = setTimeout(() => {
        setShowWinnerSection(false);
      }, 500); // Tiempo para la animación de salida
      return () => clearTimeout(timer);
    }
  }, [winner, isSelecting]);

  // Agregar un nombre a la lista
  const addName = () => {
    if (inputValue.trim() !== "") {
      setNames([...names, inputValue.trim()]);
      setInputValue("");
    }
  };

  // Eliminar un nombre de la lista
  const removeName = (index: number) => {
    const newNames = [...names];
    newNames.splice(index, 1);
    setNames(newNames);
  };

  // Guardar la lista actual
  const saveCurrentList = async () => {
    if (names.length === 0) {
      alert("No hay participantes para guardar");
      return;
    }

    if (!listName.trim()) {
      alert("Por favor, ingresa un nombre para la lista");
      return;
    }

    try {
      setIsLoading(true);
      const listId = await saveLists(listName, names);
      const lists = await getLists();
      setSavedLists(lists);

      // Seleccionar la lista recién creada
      const newList = lists.find((list) => list.id === listId) || null;
      setCurrentList(newList);

      setListName("");
      setIsLoading(false);
      alert("Lista guardada correctamente");
    } catch (error) {
      console.error("Error saving list:", error);
      setIsLoading(false);
      alert("Error al guardar la lista");
    }
  };

  // Cargar una lista guardada
  const loadList = async (listId: string) => {
    try {
      setIsLoading(true);
      const list = await getListById(listId);

      if (list) {
        setCurrentList(list);
        // Extraer solo los nombres para la lista actual
        setNames(list.participants.map((p) => p.name));
      }

      setShowSavedLists(false);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading list:", error);
      setIsLoading(false);
      alert("Error al cargar la lista");
    }
  };

  // Seleccionar un ganador aleatoriamente
  const selectWinner = async () => {
    if (names.length === 0) return;

    setIsSelecting(true);

    // Si tenemos una lista actual, filtrar participantes elegibles
    let eligibleNames = names;
    if (currentList) {
      const eligibleParticipants = getEligibleParticipants(currentList);

      // Si no hay participantes elegibles, mostrar mensaje
      if (eligibleParticipants.length === 0) {
        alert(
          "Todos los participantes han sido seleccionados 4 veces. Se reiniciarán los contadores."
        );
        try {
          const resetList = await resetParticipantSelections(currentList.id);
          setCurrentList(resetList);
          eligibleNames = resetList.participants.map((p) => p.name);
        } catch (error) {
          console.error("Error resetting selections:", error);
          setIsSelecting(false);
          return;
        }
      } else {
        eligibleNames = eligibleParticipants.map((p) => p.name);
      }
    }

    // Efecto de selección aleatoria
    let count = 0;
    const maxIterations = 20;
    let selectedName = "";

    const runSelection = () => {
      const randomIndex = Math.floor(Math.random() * eligibleNames.length);
      selectedName = eligibleNames[randomIndex];
      setWinner(selectedName);

      count++;

      if (count < maxIterations) {
        selectionTimerRef.current = window.setTimeout(
          runSelection,
          100 + count * 20
        );
      } else {
        setIsSelecting(false);
        setIsAnimating(true);

        // Si tenemos una lista actual, actualizar el contador del ganador
        if (currentList) {
          markParticipantAsSelected(currentList.id, selectedName)
            .then((updatedList) => {
              setCurrentList(updatedList);
            })
            .catch((error) => {
              console.error("Error marking participant as selected:", error);
            });
        }
      }
    };

    runSelection();
  };

  // Manejar la finalización de la animación
  const handleAnimationComplete = () => {
    // Ya no cambiamos isAnimating a false, para que siga la celebración
    // Solo marcamos que la animación principal ha terminado
  };

  // Reiniciar todo
  const resetAll = () => {
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current);
    }
    setWinner(null);
    setIsAnimating(false);
    setIsSelecting(false);

    // Reiniciar el estado de animación
    stopAnimation();

    // Asegurarnos de que los participantes estén disponibles para el siguiente sorteo
    if (currentList) {
      const eligibleParticipants = getEligibleParticipants(currentList);
      if (eligibleParticipants.length === 0) {
        resetParticipantSelections(currentList.id)
          .then((resetList) => {
            setCurrentList(resetList);
          })
          .catch((error) => {
            console.error("Error resetting selections:", error);
          });
      }
    }
  };

  // Determinar si mostrar el panel completo o solo el resultado
  const showFullPanel = !isAnimating && !isSelecting;
  const showResultOnly = (isAnimating || isSelecting) && showWinnerSection;

  return (
    <div className="App">
      <ThreeScene
        winner={winner}
        participants={names}
        isAnimating={isAnimating}
        onAnimationComplete={handleAnimationComplete}
      />

      <div className="controls-container">
        <div
          className={`randomizer-container ${
            showResultOnly ? "result-only" : ""
          }`}
        >
          {showFullPanel && (
            <>
              <h2>Rafa Randomizer</h2>

              {isLoading && <div className="loading">Cargando...</div>}

              {showSavedLists ? (
                <div className="saved-lists">
                  <h2>Listas Guardadas</h2>
                  {savedLists.length === 0 ? (
                    <p>No hay listas guardadas</p>
                  ) : (
                    <ul>
                      {savedLists.map((list) => (
                        <li key={list.id} className="saved-list-item">
                          <span>
                            {list.name} ({list.participants.length})
                          </span>
                          <button onClick={() => loadList(list.id)}>
                            Cargar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    className="secondary-button"
                    onClick={() => setShowSavedLists(false)}
                  >
                    Volver
                  </button>
                </div>
              ) : (
                <>
                  {currentList && (
                    <div className="current-list-info">
                      <p>
                        Lista actual: <strong>{currentList.name}</strong>
                      </p>
                      <p>
                        Participantes elegibles:{" "}
                        {getEligibleParticipants(currentList).length}/
                        {currentList.participants.length}
                      </p>
                    </div>
                  )}

                  <div className="input-section">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ingresa un nombre"
                      onKeyDown={(e) => e.key === "Enter" && addName()}
                    />
                    <button onClick={addName}>Agregar</button>
                  </div>

                  <div className="names-list">
                    <h2>Lista de Participantes ({names.length})</h2>
                    {names.length === 0 ? (
                      <p>No hay participantes. Agrega algunos nombres.</p>
                    ) : (
                      <ul>
                        {names.map((name, index) => (
                          <li key={index}>
                            {name}
                            {currentList && (
                              <span className="selection-count">
                                {currentList.participants.find(
                                  (p) => p.name === name
                                )?.timesSelected || 0}
                                /4
                              </span>
                            )}
                            <button onClick={() => removeName(index)}>✕</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="save-list-section">
                    <input
                      type="text"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder="Nombre de la lista"
                    />
                    <button onClick={saveCurrentList}>Guardar Lista</button>
                    <button
                      className="secondary-button"
                      onClick={() => setShowSavedLists(true)}
                    >
                      Ver Listas
                    </button>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="select-button"
                      onClick={selectWinner}
                      disabled={names.length === 0}
                    >
                      ¡Seleccionar Ganador!
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {showResultOnly && (
            <div className="result-container">
              <h2>El Ganador es:</h2>
              <div className="winner-name">{winner || "..."}</div>

              <button className="reset-button full-width" onClick={resetAll}>
                Reiniciar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Randomizer;
