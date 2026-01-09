import { Injectable } from '@angular/core';
import { Template, ScanSession } from './data.service';

const TEMPLATES_KEY = 'scanner_ns_templates';
const SESSIONS_KEY = 'scanner_ns_sessions';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  // --- Template Storage ---

  saveTemplates(templates: Template[]): void {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('Error saving templates to local storage', e);
    }
  }

  loadTemplates(): Template[] | null {
    try {
      const data = localStorage.getItem(TEMPLATES_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading templates from local storage', e);
      return null;
    }
  }

  // --- Session Storage ---

  saveSessions(sessions: ScanSession[]): void {
    try {
      // Custom replacer to handle Date objects correctly
      const replacer = (key: string, value: any) => {
        if (key === 'timestamp' && value) {
          return new Date(value).toISOString();
        }
        return value;
      };
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions, replacer));
    } catch (e) {
      console.error('Error saving sessions to local storage', e);
    }
  }

  loadSessions(): ScanSession[] | null {
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      if (!data) return null;

      // Custom reviver to restore Date objects
      const reviver = (key: string, value: any) => {
        if (key === 'timestamp' && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      };
      return JSON.parse(data, reviver);
    } catch (e) {
      console.error('Error loading sessions from local storage', e);
      return null;
    }
  }

  // --- Backup ---
  
  getAllDataAsJson(): string {
    const data = {
      templates: this.loadTemplates() || [],
      sessions: this.loadSessions() || [],
      backupDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2); // Pretty print JSON
  }
}