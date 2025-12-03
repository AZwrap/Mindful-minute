import { useJournalStore } from '../journalStore';
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