import fs from 'fs';

export class StateStore {
  constructor(filePath = './status.json') {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return {};
    }
    try {
      const rawData = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      console.warn(`Failed to parse ${this.filePath}. Returning empty state.`);
      return {};
    }
  }

  save(newState) {
    fs.writeFileSync(this.filePath, JSON.stringify(newState, null, 2));
    console.log(`Updated state saved to ${this.filePath}`);
  }
}