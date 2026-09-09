import fs from 'fs';
import path from 'path';

export class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this._data = null;
  }

  _read() {
    if (this._data !== null) return this._data;
    try {
      if (!fs.existsSync(this.filePath)) {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.filePath, '[]', 'utf8');
        this._data = [];
      } else {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this._data = JSON.parse(raw);
      }
    } catch {
      this._data = [];
    }
    return this._data;
  }

  _write() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this._data, null, 2), 'utf8');
  }

  getAll() {
    return this._read();
  }

  findById(id) {
    return this._read().find(item => item.id === id) || null;
  }

  upsert(id, data) {
    const arr = this._read();
    const idx = arr.findIndex(item => item.id === id);
    const record = { ...data, id };
    if (idx >= 0) {
      arr[idx] = record;
    } else {
      arr.push(record);
    }
    this._write();
    return record;
  }

  delete(id) {
    const arr = this._read();
    const len = arr.length;
    this._data = arr.filter(item => item.id !== id);
    if (this._data.length === len) return false;
    this._write();
    return true;
  }

  query(filterFn) {
    return this._read().filter(filterFn);
  }
}
