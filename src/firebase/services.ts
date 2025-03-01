import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./config";

// Interfaces para los tipos de datos
export interface Participant {
  name: string;
  timesSelected: number;
  lastSelected?: Date;
}

// Interfaz para los timestamps de Firestore
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface ParticipantList {
  id: string;
  name: string;
  participants: Participant[];
  createdAt: Date;
  updatedAt: Date;
}

// Interfaz para los datos de Firestore
interface FirestoreData {
  id: string;
  name: string;
  participants: Participant[];
  createdAt: FirestoreTimestamp | Date;
  updatedAt: FirestoreTimestamp | Date;
}

// Colecciones en Firestore
const LISTS_COLLECTION = "participantLists";

// Funciones para manejar las listas de participantes
export const saveLists = async (
  listName: string,
  participants: string[]
): Promise<string> => {
  try {
    const listRef = doc(collection(db, LISTS_COLLECTION));
    const listId = listRef.id;

    const participantObjects: Participant[] = participants.map((name) => ({
      name,
      timesSelected: 0,
    }));

    const list: ParticipantList = {
      id: listId,
      name: listName,
      participants: participantObjects,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(listRef, list);
    return listId;
  } catch (error) {
    console.error("Error saving list:", error);
    throw error;
  }
};

export const getLists = async (): Promise<ParticipantList[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, LISTS_COLLECTION));
    const lists: ParticipantList[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreData;
      // Convertir timestamps de Firestore a Date
      data.createdAt =
        data.createdAt instanceof Date
          ? data.createdAt
          : new Date((data.createdAt as FirestoreTimestamp).seconds * 1000);
      data.updatedAt =
        data.updatedAt instanceof Date
          ? data.updatedAt
          : new Date((data.updatedAt as FirestoreTimestamp).seconds * 1000);

      lists.push(data as ParticipantList);
    });

    return lists;
  } catch (error) {
    console.error("Error getting lists:", error);
    throw error;
  }
};

export const getListById = async (
  listId: string
): Promise<ParticipantList | null> => {
  try {
    const docRef = doc(db, LISTS_COLLECTION, listId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreData;
      // Convertir timestamps de Firestore a Date
      data.createdAt =
        data.createdAt instanceof Date
          ? data.createdAt
          : new Date((data.createdAt as FirestoreTimestamp).seconds * 1000);
      data.updatedAt =
        data.updatedAt instanceof Date
          ? data.updatedAt
          : new Date((data.updatedAt as FirestoreTimestamp).seconds * 1000);

      return data as ParticipantList;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting list:", error);
    throw error;
  }
};

export const updateList = async (list: ParticipantList): Promise<void> => {
  try {
    const docRef = doc(db, LISTS_COLLECTION, list.id);

    // Actualizar la fecha de modificación
    list.updatedAt = new Date();

    await updateDoc(docRef, { ...list });
  } catch (error) {
    console.error("Error updating list:", error);
    throw error;
  }
};

export const deleteList = async (listId: string): Promise<void> => {
  try {
    const docRef = doc(db, LISTS_COLLECTION, listId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting list:", error);
    throw error;
  }
};

export const markParticipantAsSelected = async (
  listId: string,
  participantName: string
): Promise<ParticipantList> => {
  try {
    const list = await getListById(listId);

    if (!list) {
      throw new Error(`List with ID ${listId} not found`);
    }

    // Encontrar el participante y actualizar su contador
    const updatedParticipants = list.participants.map((participant) => {
      if (participant.name === participantName) {
        return {
          ...participant,
          timesSelected: participant.timesSelected + 1,
          lastSelected: new Date(),
        };
      }
      return participant;
    });

    // Actualizar la lista con los participantes actualizados
    const updatedList = {
      ...list,
      participants: updatedParticipants,
      updatedAt: new Date(),
    };

    await updateList(updatedList);
    return updatedList;
  } catch (error) {
    console.error("Error marking participant as selected:", error);
    throw error;
  }
};

export const getEligibleParticipants = (
  list: ParticipantList
): Participant[] => {
  // Filtrar participantes que han sido seleccionados menos de 4 veces
  return list.participants.filter(
    (participant) => participant.timesSelected < 4
  );
};

export const resetParticipantSelections = async (
  listId: string
): Promise<ParticipantList> => {
  try {
    const list = await getListById(listId);

    if (!list) {
      throw new Error(`List with ID ${listId} not found`);
    }

    // Resetear el contador de todos los participantes
    const resetParticipants = list.participants.map((participant) => ({
      ...participant,
      timesSelected: 0,
      lastSelected: undefined,
    }));

    // Actualizar la lista con los participantes reseteados
    const updatedList = {
      ...list,
      participants: resetParticipants,
      updatedAt: new Date(),
    };

    await updateList(updatedList);
    return updatedList;
  } catch (error) {
    console.error("Error resetting participant selections:", error);
    throw error;
  }
};
