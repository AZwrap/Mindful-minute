// jest.setup.js

// 1. Polyfill window and global objects for React Native
global.window = {};
global.window.window = global.window;

// 2. Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 3. Mock Firebase Firestore
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
  initializeFirestore: jest.fn(),
}));

// 4. Mock Firebase Config
jest.mock('./src/firebaseConfig', () => ({
  db: {},
  auth: {},
}));

// 5. Mock Native Modules that often crash tests
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Silence specific React Native warnings during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0].includes('TurboModuleRegistry')) return;
  originalConsoleError(...args);
};