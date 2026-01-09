import { Injectable, signal, computed } from '@angular/core';

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

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // --- Templates & Materials Database ---
  
  private templatesSignal = signal<Template[]>([
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
  ]);

  currentTemplateId = signal<string>('1');

  // Expose templates list for selection
  templates = computed(() => this.templatesSignal());

  // Expose current template metadata
  currentTemplate = computed(() => 
    this.templatesSignal().find(t => t.id === this.currentTemplateId()) || this.templatesSignal()[0]
  );

  // Computes the materials of the CURRENTLY selected template
  // This maintains compatibility with components that expect a list of materials
  materials = computed(() => this.currentTemplate()?.materials || []);

  // --- Scanning Sessions (Captured Data) ---
  private sessionsSignal = signal<ScanSession[]>([]);
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
          // Status logic for consolidation could be complex, keeping simple sum
        } else {
          map.set(key, { ...item });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  });

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
    if (list.length <= 1) return; // Prevent deleting the last one

    this.templatesSignal.update(l => l.filter(t => t.id !== id));
    
    // If we deleted the current one, switch to the first available
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

  addSession(imageUrl: string, rawItems: Omit<ScanResult, 'status'>[]) {
    // Determine initial status based on quantity
    const items: ScanResult[] = rawItems.map(item => ({
      ...item,
      status: item.quantity > 0 ? 'verified' : 'empty'
    }));

    const newSession: ScanSession = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      imageUrl,
      items
    };
    this.sessionsSignal.update(list => [newSession, ...list]);
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
              // If user manually updates value > 0, we consider it verified (corrected). 
              // If 0, it's empty.
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
              // Logic: 
              // Verified (Green) -> Error (Red)
              // Error (Red) -> Verified (Green) [Assuming user checked again]
              // Empty (White) -> Error (Red) [Maybe false negative?]
              
              let nextStatus: ItemStatus = 'verified';
              
              if (item.status === 'verified') nextStatus = 'error';
              else if (item.status === 'error') nextStatus = 'verified'; // or back to empty if qty 0?
              else if (item.status === 'empty') nextStatus = 'error'; 

              // Restore basic logic: if user marks "empty" as error, it implies it shouldn't be empty?
              // For simplicity: toggle between Error and the 'Natural' state based on quantity
              if (item.status === 'error') {
                 nextStatus = item.quantity > 0 ? 'verified' : 'empty';
              } else {
                 nextStatus = 'error';
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
}