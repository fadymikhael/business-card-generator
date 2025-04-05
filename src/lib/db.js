import { openDB } from 'idb';

const DB_NAME = 'businessCardsDB';
const STORE_NAME = 'cards';
const DB_VERSION = 2;

let dbInstance = null;

async function getDB() {
  if (!dbInstance) {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('lastName', 'lastName', { unique: false });
          store.createIndex('profession', 'profession', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        } else if (oldVersion < 2) {
          console.warn("Le store existe mais n'a pas été modifié car accès limité dans idb");
        }
      },
      blocked() {
        console.warn('Database is blocked by another open tab.');
      },
      blocking() {
        console.warn('This tab is blocking others.');
      }
    });
  }
  return dbInstance;
}

export async function initDB() {
  try {
    return await getDB();
  } catch (error) {
    console.error('Failed to initialize DB:', error);
    throw error;
  }
}

export async function saveCard(cardData) {
  if (!cardData.firstName || !cardData.lastName) {
    throw new Error("Les champs prénom et nom sont obligatoires.");
  }

  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  try {
    const completeData = {
      ...cardData,
      firstName: cardData.firstName.trim(),
      lastName: cardData.lastName.trim().toLowerCase(),
      profession: cardData.profession?.trim().toLowerCase() || '',
      createdAt: cardData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const id = await tx.store.put(completeData);
    await tx.done;
    return id;
  } catch (error) {
    console.error('Error saving card:', error);
    throw error;
  }
}

export async function getCards() {
  const db = await getDB();
  try {
    const tx = db.transaction(STORE_NAME);
    const index = tx.store.index('createdAt');
    return await index.getAll();
  } catch (error) {
    console.error('Error getting cards:', error);
    throw error;
  }
}

export async function getCard(id) {
  const db = await getDB();
  try {
    return await db.get(STORE_NAME, id);
  } catch (error) {
    console.error('Error getting card:', error);
    throw error;
  }
}

export async function updateCard(id, updates) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  try {
    const store = tx.store;
    const card = await store.get(id);
    if (!card) throw new Error('Card not found');

    const updatedCard = {
      ...card,
      ...updates,
      lastName: updates.lastName?.toLowerCase() || card.lastName,
      profession: updates.profession?.toLowerCase() || card.profession,
      updatedAt: new Date().toISOString()
    };
    await store.put(updatedCard);
    await tx.done;
    return updatedCard;
  } catch (error) {
    console.error('Error updating card:', error);
    throw error;
  }
}

export async function deleteCard(id) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  try {
    await tx.store.delete(id);
    await tx.done;
  } catch (error) {
    console.error('Error deleting card:', error);
    throw error;
  }
}

export async function searchCards(query) {
  const db = await getDB();
  try {
    const lowerQuery = query.toLowerCase();

    const [lastNameResults, professionResults] = await Promise.all([
      db.getAllFromIndex(
        STORE_NAME,
        'lastName',
        IDBKeyRange.bound(lowerQuery, lowerQuery + '\uffff')
      ),
      db.getAllFromIndex(
        STORE_NAME,
        'profession',
        IDBKeyRange.bound(lowerQuery, lowerQuery + '\uffff')
      )
    ]);

    const resultsMap = new Map();
    [...lastNameResults, ...professionResults].forEach(card => {
      resultsMap.set(card.id, card);
    });

    return Array.from(resultsMap.values());
  } catch (error) {
    console.error('Error searching cards:', error);
    throw error;
  }
}
