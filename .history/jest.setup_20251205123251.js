// jest.setup.js
require('react-native-get-random-values');

// 1. Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 2. Mock Firebase
jest.mock('./src/firebaseConfig', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  arrayUnion: jest.fn((data) => [data]),
  addDoc: jest.fn(),
}));

// 3. Silence specific React Native warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0] && args[0].includes('TurboModuleRegistry')) return;
  originalConsoleError(...args);
};