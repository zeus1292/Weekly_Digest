// Storage interface for ResearchLens
// Currently using in-memory storage for simplicity
// Can be extended with database storage if needed

export interface IStorage {
  // Add storage methods here if needed in the future
  // For now, the app doesn't require persistent storage
}

export class MemStorage implements IStorage {
  constructor() {
    // Initialize storage if needed
  }
}

export const storage = new MemStorage();
