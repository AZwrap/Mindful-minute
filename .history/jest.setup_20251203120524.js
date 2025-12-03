// jest.setup.js

// 1. Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 2. Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  arrayUnion: jest.fn((data) => data),
  initializeFirestore: jest.fn(),
}));

// 3. Mock Firebase Config
jest.mock('./src/firebaseConfig', () => ({
  db: {},
}));