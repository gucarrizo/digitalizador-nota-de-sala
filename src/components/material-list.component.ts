import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Material } from '../services/data.service';

@Component({
  selector: 'app-material-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 h-full flex flex-col max-w-5xl mx-auto w-full">
      <header class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Gerenciador de Kits</h2>
        <p class="text-gray-500">Defina os modelos de impressão para cada tipo de cirurgia.</p>
      </header>

      <!-- Template Selector / Manager -->
      <div class="bg-medical-50 border border-medical-100 p-4 rounded-xl mb-6 shadow-sm">
        <div class="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
          
          <div class="flex-1 w-full md:w-auto">
            <label class="block text-xs font-bold text-medical-800 uppercase tracking-wider mb-1">Modelo Selecionado</label>
            
            <div class="flex items-center gap-2">
              @if (isEditingTemplate()) {
                <input 
                  type="text" 
                  [(ngModel)]="editTemplateName" 
                  class="flex-1 block w-full px-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm rounded-md shadow-sm border"
                  (keydown.enter)="saveTemplateEdit()"
                >
                <button (click)="saveTemplateEdit()" class="bg-green-500 text-white p-2 rounded-md hover:bg-green-600 shadow-sm" title="Salvar Nome">
                  <span class="material-icons text-sm block">check</span>
                </button>
                <button (click)="cancelTemplateEdit()" class="bg-white border border-gray-300 text-gray-600 p-2 rounded-md hover:bg-gray-50 shadow-sm" title="Cancelar">
                  <span class="material-icons text-sm block">close</span>
                </button>
              } @else {
                <div class="relative flex-1">
                  <select 
                    [ngModel]="dataService.currentTemplateId()" 
                    (ngModelChange)="dataService.selectTemplate($event)"
                    class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm rounded-md shadow-sm border"
                  >
                    @for (tmpl of dataService.templates(); track tmpl.id) {
                      <option [value]="tmpl.id">{{ tmpl.name }}</option>
                    }
                  </select>
                </div>
                <button 
                  (click)="startTemplateEdit()"
                  class="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors shadow-sm"
                  title="Renomear Modelo"
                >
                  <span class="material-icons text-sm block">edit</span>
                </button>
              }
            </div>
          </div>

          <div class="flex gap-2">
            @if (isCreatingTemplate()) {
              <div class="flex gap-2 items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <input 
                  type="text" 
                  [(ngModel)]="newTemplateName" 
                  placeholder="Nome do novo modelo"
                  class="px-2 py-1 text-sm outline-none border-none w-40"
                  (keydown.enter)="saveNewTemplate()"
                  autoFocus
                >
                <button (click)="saveNewTemplate()" class="bg-green-500 text-white p-1 rounded hover:bg-green-600">
                  <span class="material-icons text-sm">check</span>
                </button>
                <button (click)="isCreatingTemplate.set(false)" class="text-gray-400 hover:text-gray-600 p-1">
                  <span class="material-icons text-sm">close</span>
                </button>
              </div>
            } @else {
              <button 
                (click)="isCreatingTemplate.set(true); newTemplateName.set('')"
                class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                <span class="material-icons text-sm">add</span> Novo Modelo
              </button>
            }

            <button 
              (click)="deleteCurrentTemplate()"
              [disabled]="dataService.templates().length <= 1"
              class="bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-2 px-3 rounded-lg transition-colors shadow-sm"
              title="Excluir Modelo Atual"
            >
              <span class="material-icons">delete_forever</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Add Material Form -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 relative">
        <div class="absolute -top-3 left-4 bg-white px-2 text-xs font-semibold text-gray-500">
          Adicionar Item ao modelo "{{ dataService.currentTemplate().name }}"
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mt-2">
          <div class="md:col-span-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input 
              type="text" 
              [(ngModel)]="newCode" 
              placeholder="Ex: SUT-001"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none transition-all"
            >
          </div>
          <div class="md:col-span-7">
            <label class="block text-sm font-medium text-gray-700 mb-1">Descrição do Material</label>
            <input 
              type="text" 
              [(ngModel)]="newName" 
              placeholder="Ex: Fio de Sutura..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none transition-all"
              (keydown.enter)="add()"
            >
          </div>
          <div class="md:col-span-2">
            <button 
              (click)="add()"
              [disabled]="!newCode() || !newName()"
              class="w-full bg-medical-600 hover:bg-medical-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span class="material-icons text-sm">add_circle</span> Adicionar
            </button>
          </div>
        </div>
      </div>

      <!-- Material List -->
      <div class="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <table class="w-full text-left border-collapse">
          <thead class="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th class="p-4 font-semibold text-gray-600 border-b">Código</th>
              <th class="p-4 font-semibold text-gray-600 border-b">Descrição</th>
              <th class="p-4 font-semibold text-gray-600 border-b text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (item of dataService.materials(); track item.id) {
              <tr class="hover:bg-gray-50 transition-colors group">
                
                @if (editingMaterialId() === item.id) {
                  <!-- Edit Mode -->
                  <td class="p-3">
                    <input 
                      [(ngModel)]="editMaterialCode" 
                      class="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-medical-500"
                    >
                  </td>
                  <td class="p-3">
                    <input 
                      [(ngModel)]="editMaterialName" 
                      class="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-medical-500"
                    >
                  </td>
                  <td class="p-3 text-right flex justify-end gap-1">
                     <button (click)="saveMaterialEdit()" class="text-green-600 bg-green-50 hover:bg-green-100 p-2 rounded-full" title="Salvar">
                       <span class="material-icons text-sm block">check</span>
                     </button>
                     <button (click)="cancelMaterialEdit()" class="text-gray-500 bg-gray-50 hover:bg-gray-100 p-2 rounded-full" title="Cancelar">
                       <span class="material-icons text-sm block">close</span>
                     </button>
                  </td>
                } @else {
                  <!-- Display Mode -->
                  <td class="p-4 text-gray-800 font-medium">{{ item.code }}</td>
                  <td class="p-4 text-gray-600">{{ item.name }}</td>
                  <td class="p-4 text-right flex justify-end gap-1">
                    <button 
                      (click)="startMaterialEdit(item)"
                      class="text-blue-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Editar"
                    >
                      <span class="material-icons text-sm block">edit</span>
                    </button>
                    <button 
                      (click)="dataService.removeMaterial(item.id)"
                      class="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Remover"
                    >
                      <span class="material-icons text-sm block">delete</span>
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="p-12 text-center text-gray-400">
                  <span class="material-icons text-4xl mb-2 text-gray-300">format_list_bulleted</span>
                  <p>Este modelo não possui materiais cadastrados.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class MaterialListComponent {
  dataService = inject(DataService);
  
  // Material Inputs (New)
  newCode = signal('');
  newName = signal('');

  // Template Edit State
  isCreatingTemplate = signal(false);
  newTemplateName = signal('');
  
  isEditingTemplate = signal(false);
  editTemplateName = signal('');

  // Material Edit State
  editingMaterialId = signal<string | null>(null);
  editMaterialCode = signal('');
  editMaterialName = signal('');

  // --- Template Logic ---

  saveNewTemplate() {
    if (this.newTemplateName().trim()) {
      this.dataService.addTemplate(this.newTemplateName().trim());
      this.isCreatingTemplate.set(false);
      this.newTemplateName.set('');
    }
  }

  deleteCurrentTemplate() {
    const current = this.dataService.currentTemplate();
    if (confirm(`Tem certeza que deseja excluir o modelo "${current.name}"?`)) {
      this.dataService.removeTemplate(current.id);
    }
  }

  startTemplateEdit() {
    this.editTemplateName.set(this.dataService.currentTemplate().name);
    this.isEditingTemplate.set(true);
  }

  saveTemplateEdit() {
    if (this.editTemplateName().trim()) {
      this.dataService.updateTemplateName(this.dataService.currentTemplateId(), this.editTemplateName().trim());
      this.isEditingTemplate.set(false);
    }
  }

  cancelTemplateEdit() {
    this.isEditingTemplate.set(false);
  }

  // --- Material Logic ---

  add() {
    if (this.newCode() && this.newName()) {
      this.dataService.addMaterial(this.newCode(), this.newName());
      this.newCode.set('');
      this.newName.set('');
    }
  }

  startMaterialEdit(item: Material) {
    this.editingMaterialId.set(item.id);
    this.editMaterialCode.set(item.code);
    this.editMaterialName.set(item.name);
  }

  saveMaterialEdit() {
    const id = this.editingMaterialId();
    if (id && this.editMaterialCode() && this.editMaterialName()) {
      this.dataService.updateMaterial(id, this.editMaterialCode(), this.editMaterialName());
      this.editingMaterialId.set(null);
    }
  }

  cancelMaterialEdit() {
    this.editingMaterialId.set(null);
  }
}