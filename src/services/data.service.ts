import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { StorageService } from './storage.service';

export interface Material {
  id: string;
  code: string;
  name: string;
}

export interface Template {
  id: string;
  name: string;
  materials: Material[];
}

export type ItemStatus = 'verified' | 'error' | 'empty';

export interface ScanResult {
  code: string;
  name: string;
  quantity: number;
  status: ItemStatus;
}

export interface ScanSession {
  id: string;
  timestamp: Date;
  imageUrl: string; // Base64 image for verification
  items: ScanResult[];
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Cirurgia Geral (Padrão)',
    materials: [
      { id: '1', code: 'SUT-001', name: 'Fio de Sutura Nylon 3-0' },
      { id: '2', code: 'SUT-002', name: 'Fio de Sutura Vicryl 4-0' },
      { id: '3', code: 'BIST-15', name: 'Lâmina de Bisturi nº 15' },
      { id: '4', code: 'GZ-101', name: 'Compressa de Gaze (Pacote)' },
      { id: '5', code: 'LUV-75', name: 'Luva Cirúrgica 7.5' },
      { id: '6', code: 'SER-10', name: 'Seringa 10ml' },
    ]
  },
  {
    id: '2',
    name: 'Ortopedia - Pequeno Porte',
    materials: [
      { id: '10', code: 'SUT-NYL', name: 'Fio Nylon 2-0 Agulhado' },
      { id: '11', code: 'FAIXA-SM', name: 'Faixa de Smarch' },
      { id: '12', code: 'ALGODAO', name: 'Algodão Ortopédico' },
      { id: '13', code: 'GESSO-15', name: 'Atadura Gessada 15cm' },
    ]
  }
];

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private storageService = inject(StorageService);

  // --- Templates & Materials Database ---
  private templatesSignal = signal<Template[]>(this.storageService.loadTemplates() || DEFAULT_TEMPLATES);
  private sessionsSignal = signal<ScanSession[]>(this.storageService.loadSessions() || []);
  
  currentTemplateId = signal<string>('1');

  // Expose templates list for selection
  templates = computed(() => this.templatesSignal());
  currentTemplate = computed(() => 
    this.templatesSignal().find(t => t.id === this.currentTemplateId()) || this.templatesSignal()[0]
  );
  materials = computed(() => this.currentTemplate()?.materials || []);

  // --- Scanning Sessions (Captured Data) ---
  sessions = computed(() => this.sessionsSignal());

  // Consolidated View
  consolidatedResults = computed(() => {
    const allSessions = this.sessionsSignal();
    const map = new Map<string, ScanResult>();

    for (const session of allSessions) {
      for (const item of session.items) {
        const key = item.code || item.name;
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.quantity += item.quantity;
        } else {
          map.set(key, { ...item });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  });
  
  constructor() {
    // Effect to auto-save templates to local storage on change
    effect(() => {
      this.storageService.saveTemplates(this.templatesSignal());
    });
    // Effect to auto-save sessions to local storage on change
    effect(() => {
      this.storageService.saveSessions(this.sessionsSignal());
    });
  }

  // --- Template Management ---

  addTemplate(name: string) {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name,
      materials: []
    };
    this.templatesSignal.update(list => [...list, newTemplate]);
    this.currentTemplateId.set(newTemplate.id);
  }

  updateTemplateName(id: string, newName: string) {
    this.templatesSignal.update(list => 
      list.map(t => t.id === id ? { ...t, name: newName } : t)
    );
  }

  removeTemplate(id: string) {
    const list = this.templatesSignal();
    if (list.length <= 1) return;

    this.templatesSignal.update(l => l.filter(t => t.id !== id));
    
    if (this.currentTemplateId() === id) {
      this.currentTemplateId.set(this.templatesSignal()[0].id);
    }
  }

  selectTemplate(id: string) {
    this.currentTemplateId.set(id);
  }

  // --- Material Management (Within Current Template) ---

  addMaterial(code: string, name: string) {
    const currentId = this.currentTemplateId();
    const newMaterial: Material = {
      id: crypto.randomUUID(),
      code,
      name
    };

    this.templatesSignal.update(list => 
      list.map(t => {
        if (t.id === currentId) {
          return { ...t, materials: [...t.materials, newMaterial] };
        }
        return t;
      })
    );
  }

  updateMaterial(materialId: string, newCode: string, newName: string) {
    const currentId = this.currentTemplateId();
    this.templatesSignal.update(list => 
      list.map(t => {
        if (t.id === currentId) {
          const updatedMaterials = t.materials.map(m => 
            m.id === materialId ? { ...m, code: newCode, name: newName } : m
          );
          return { ...t, materials: updatedMaterials };
        }
        return t;
      })
    );
  }

  removeMaterial(materialId: string) {
    const currentId = this.currentTemplateId();
    this.templatesSignal.update(list => 
      list.map(t => {
        if (t.id === currentId) {
          return { ...t, materials: t.materials.filter(m => m.id !== materialId) };
        }
        return t;
      })
    );
  }

  // --- Session Management ---

  addSession(imageUrl: string, items: ScanResult[]) {
    const newSession: ScanSession = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      imageUrl,
      items
    };
    this.sessionsSignal.update(list => [newSession, ...list].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }

  deleteSession(id: string) {
    this.sessionsSignal.update(list => list.filter(s => s.id !== id));
  }

  updateSessionItem(sessionId: string, itemCode: string, newQuantity: number) {
    this.sessionsSignal.update(list => {
      return list.map(session => {
        if (session.id === sessionId) {
          const updatedItems = session.items.map(item => {
            if (item.code === itemCode) {
              const newStatus: ItemStatus = newQuantity > 0 ? 'verified' : 'empty';
              return { ...item, quantity: newQuantity, status: newStatus };
            }
            return item;
          });
          return { ...session, items: updatedItems };
        }
        return session;
      });
    });
  }

  toggleItemStatus(sessionId: string, itemCode: string) {
    this.sessionsSignal.update(list => {
      return list.map(session => {
        if (session.id === sessionId) {
          const updatedItems = session.items.map(item => {
            if (item.code === itemCode) {
              let nextStatus: ItemStatus = 'error';
              if (item.status === 'error') {
                 nextStatus = item.quantity > 0 ? 'verified' : 'empty';
              }
              return { ...item, status: nextStatus };
            }
            return item;
          });
          return { ...session, items: updatedItems };
        }
        return session;
      });
    });
  }

  // --- Export Helpers ---

  getExportStringTSV(): string {
    const data = this.consolidatedResults();
    const headers = "Código\tDescrição do Material\tQuantidade Total";
    const rows = data.map(item => `${item.code}\t${item.name}\t${item.quantity}`);
    return [headers, ...rows].join('\n');
  }

  getExportStringCSV(): string {
    const data = this.consolidatedResults();
    const headers = "Código,Descrição do Material,Quantidade Total";
    const rows = data.map(item => `"${item.code.replace(/"/g, '""')}","${item.name.replace(/"/g, '""')}",${item.quantity}`);
    return [headers, ...rows].join('\n');
  }

  getLocalBackupData(): string {
    return this.storageService.getAllDataAsJson();
  }
}