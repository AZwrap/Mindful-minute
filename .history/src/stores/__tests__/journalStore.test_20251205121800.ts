import { useJournalStore } from '../journalStore';

// 1. Mock Firebase Config to prevent app initialization errors
jest.mock('../../firebaseConfig', () => ({
  db: {}, 
  auth: {} 
}));

// 2. Mock Firestore methods
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // Returns dummy unsubscribe
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  arrayUnion: jest.fn((val) => [val]),
  addDoc: jest.fn(),
}));

import { setDoc } from 'firebase/firestore';

// Reset the store before each test to ensure a clean slate
const initialState = useJournalStore.getState();

describe('journalStore', () => {
  beforeEach(() => {
    useJournalStore.setState(initialState, true);
    jest.clearAllMocks(); // Clear tracking of mock function calls
  });

  it('should initialize with no current journal', () => {
    const { currentJournalId } = useJournalStore.getState();
    expect(currentJournalId).toBeNull();
  });

  it('createJournal should generate an ID and save to Firestore', async () => {
    // 1. Call the action
    const journalId = await useJournalStore.getState().createJournal('TestUser');

    // 2. Check if State updated
    const { currentJournalId, journalInfo } = useJournalStore.getState();
    
    expect(journalId).toBeDefined();
    expect(currentJournalId).toBe(journalId);
    expect(journalInfo.members).toEqual(['TestUser']);

    // 3. Check if Firebase was "called"
    // This ensures your app is actually trying to save the data
    expect(setDoc).toHaveBeenCalledTimes(1);
  });
});