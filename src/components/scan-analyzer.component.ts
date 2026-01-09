import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleGenAI } from '@google/genai';
import { DataService, ScanResult, ScanSession, ItemStatus } from '../services/data.service';

type ScanMode = 'scan' | 'verify' | 'review' | 'consolidated';

@Component({
  selector: 'app-scan-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-full flex flex-col w-full bg-gray-50 pb-20 md:pb-0">
      
      <!-- Sub-Navigation for Scan Module -->
      <div class="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap sticky top-0 z-20 shadow-sm shrink-0">
        <button 
          (click)="setMode('scan')"
          class="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border"
          [class]="mode() === 'scan' ? 'bg-medical-50 border-medical-200 text-medical-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
        >
          <span class="material-icons text-sm">add_a_photo</span> Nova
        </button>
        
        @if (mode() === 'verify') {
          <div class="px-4 py-2 rounded-full text-sm font-bold bg-yellow-100 border border-yellow-300 text-yellow-900 flex items-center gap-2 animate-pulse">
            <span class="material-icons text-sm">pending_actions</span> Pendente
          </div>
        }

        <button 
          (click)="setMode('review')"
          class="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border"
          [class]="mode() === 'review' ? 'bg-medical-50 border-medical-200 text-medical-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
        >
          <span class="material-icons text-sm">fact_check</span> 
          Histórico 
          @if (dataService.sessions().length > 0) {
            <span class="bg-gray-200 text-gray-700 px-1.5 rounded-md text-xs">{{ dataService.sessions().length }}</span>
          }
        </button>

        <button 
          (click)="setMode('consolidated')"
          class="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border"
          [class]="mode() === 'consolidated' ? 'bg-medical-50 border-medical-200 text-medical-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
        >
          <span class="material-icons text-sm">summarize</span> Relatório
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 relative w-full">
        
        <!-- MODE: SCAN -->
        @if (mode() === 'scan') {
          <div class="w-full h-full p-4 flex flex-col items-center justify-center animate-fade-in min-h-[500px]">
             <div class="max-w-xl w-full">
                <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 text-center relative overflow-hidden transition-all hover:border-medical-400 group">
                  
                  @if (currentPreview()) {
                    <div class="relative rounded-lg overflow-hidden border border-gray-300 bg-gray-100 aspect-[3/4] mb-4 shadow-inner">
                      <img [src]="currentPreview()" class="w-full h-full object-contain" alt="Preview">
                      <button 
                        (click)="clearCurrent()"
                        class="absolute top-2 right-2 bg-gray-900 text-white p-2 rounded-full hover:bg-black shadow-lg"
                      >
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  } @else {
                    <div class="py-12 border-2 border-dashed border-gray-300 rounded-xl mb-6 bg-gray-50">
                      <span class="material-icons text-6xl text-gray-400 mb-4">add_a_photo</span>
                      <h3 class="font-bold text-gray-900 text-lg">Capturar Nota</h3>
                      <p class="text-sm text-gray-600 mt-2 px-8">Toque para abrir a câmera ou escolher arquivo</p>
                    </div>
                  }

                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    (change)="onFileSelected($event)"
                    class="absolute inset-0 opacity-0 cursor-pointer z-0"
                    [disabled]="isAnalyzing()"
                  >

                  @if (currentPreview()) {
                    <button 
                      (click)="analyze()"
                      [disabled]="isAnalyzing()"
                      class="w-full bg-medical-600 hover:bg-medical-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 text-lg"
                    >
                      @if (isAnalyzing()) {
                        <span class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Processando...
                      } @else {
                        <span class="material-icons">auto_awesome</span>
                        Extrair Dados
                      }
                    </button>
                  }
                </div>

                @if (error()) {
                  <div class="mt-4 bg-red-100 text-red-900 p-4 rounded-xl border border-red-300 text-sm flex items-start gap-2 shadow-sm">
                    <span class="material-icons text-red-700">error</span>
                    <div>
                      <strong class="font-bold block">Erro na Leitura:</strong>
                      {{ error() }}
                    </div>
                  </div>
                }
             </div>
          </div>
        }

        <!-- MODE: VERIFY -->
        @if (mode() === 'verify') {
          <div class="flex flex-col lg:flex-row h-full animate-fade-in">
             <!-- Left: Image Viewer (Collapsible on Mobile) -->
             <div class="lg:w-1/2 bg-gray-800 relative p-4 flex items-center justify-center min-h-[300px] lg:h-auto">
                <img [src]="pendingImage()" class="max-w-full max-h-[400px] lg:max-h-full object-contain shadow-xl border-4 border-white rounded-lg" alt="Original">
                <div class="absolute bottom-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs shadow-md font-bold flex items-center gap-2">
                  <span class="material-icons text-sm">warning</span>
                  Conferência
                </div>
             </div>

             <!-- Right: Validation Data -->
             <div class="flex-1 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10 min-h-[500px]">
                <div class="p-4 border-b bg-yellow-50 flex justify-between items-center sticky top-0 z-20">
                   <div>
                     <h3 class="font-bold text-gray-900 text-lg">Confirmar Dados</h3>
                     <p class="text-xs text-gray-700">Edite as quantidades abaixo.</p>
                   </div>
                </div>

                <div class="flex-1 p-4 space-y-3 bg-gray-100 overflow-y-auto max-h-[60vh] lg:max-h-none">
                   @for (item of pendingItems(); track item.code) {
                      <div class="flex items-center gap-3 p-1 animate-slide-in-up">
                         <div 
                            class="flex-1 border-2 rounded-lg p-3 relative group select-none bg-white shadow-sm transition-colors"
                            [class.border-green-500]="item.status === 'verified'"
                            [class.bg-green-50]="item.status === 'verified'"
                            [class.border-gray-300]="item.status === 'empty'"
                            [class.bg-white]="item.status === 'empty'"
                            [class.border-red-500]="item.status === 'error'"
                            [class.bg-red-50]="item.status === 'error'"
                         >
                            <div class="flex justify-between items-center">
                               <div class="flex-1 pr-2">
                                  <div class="font-bold text-gray-900 text-sm leading-tight">{{ item.name }}</div>
                                  <div class="text-xs font-mono text-gray-500 mt-1">{{ item.code }}</div>
                               </div>
                               
                               <div class="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1 shadow-inner">
                                  <button 
                                    (click)="updatePendingQuantity(item.code, item.quantity - 1)"
                                    class="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number" 
                                    [ngModel]="item.quantity"
                                    (ngModelChange)="updatePendingQuantity(item.code, $event)"
                                    class="w-12 text-center font-bold text-xl outline-none bg-transparent text-gray-900"
                                    min="0"
                                  >
                                  <button 
                                    (click)="updatePendingQuantity(item.code, item.quantity + 1)"
                                    class="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold"
                                  >
                                    +
                                  </button>
                               </div>
                            </div>
                            
                            <!-- Status Indicator Icon -->
                            <div class="absolute -top-3 -left-2 shadow-sm rounded-full bg-white p-0.5" 
                                 (click)="togglePendingStatus(item.code)">
                              @if (item.status === 'verified') {
                                <span class="bg-green-600 text-white rounded-full p-1 block cursor-pointer">
                                  <span class="material-icons text-[16px] block">check</span>
                                </span>
                              } @else if (item.status === 'error') {
                                <span class="bg-red-600 text-white rounded-full p-1 block cursor-pointer">
                                  <span class="material-icons text-[16px] block">priority_high</span>
                                </span>
                              } @else {
                                <span class="bg-gray-400 text-white rounded-full p-1 block cursor-pointer">
                                  <span class="material-icons text-[16px] block">remove</span>
                                </span>
                              }
                            </div>
                         </div>
                      </div>
                   }
                </div>

                <!-- Verify Actions Sticky Footer -->
                <div class="p-4 border-t bg-white flex gap-3 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                  <button 
                    (click)="discardScan()"
                    class="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors flex justify-center items-center gap-2"
                  >
                    <span class="material-icons">delete</span>
                    <span class="hidden sm:inline">Descartar</span>
                  </button>
                  <button 
                    (click)="confirmScan()"
                    class="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-lg"
                  >
                    <span class="material-icons">check_circle</span>
                    Salvar
                  </button>
                </div>
             </div>
          </div>
        }

        <!-- MODE: REVIEW (HISTORY) -->
        @if (mode() === 'review') {
          <div class="flex flex-col md:flex-row h-full animate-fade-in">
            
            <!-- Sidebar: Thumbnails -->
            <div class="w-full md:w-72 bg-white border-r border-gray-200 p-4 flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:h-[calc(100vh-140px)] shrink-0 shadow-sm z-10">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 hidden md:block sticky top-0 bg-white pb-2">Digitalizações</h3>
              
              @for (session of dataService.sessions(); track session.id) {
                <button 
                  (click)="selectSession(session)"
                  class="relative rounded-lg overflow-hidden border-2 transition-all w-24 md:w-full aspect-square md:aspect-video shrink-0 group animate-slide-in-up bg-gray-100 shadow-sm"
                  [class.border-medical-600]="selectedSession()?.id === session.id"
                  [class.ring-2]="selectedSession()?.id === session.id"
                  [class.ring-medical-200]="selectedSession()?.id === session.id"
                  [class.border-gray-200]="selectedSession()?.id !== session.id"
                >
                  <img [src]="session.imageUrl" class="w-full h-full object-cover" alt="Thumb">
                  <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1 truncate text-center font-mono">
                    {{ session.timestamp | date:'HH:mm' }}
                  </div>
                  <button 
                    (click)="deleteSession(session.id, $event)"
                    class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md"
                    title="Excluir"
                  >
                    <span class="material-icons text-[14px] block">close</span>
                  </button>
                </button>
              } @empty {
                <div class="text-gray-400 text-sm text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-lg w-full">
                  Nenhuma imagem no histórico.
                </div>
              }
            </div>

            <!-- Detail View -->
            <div class="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
              @if (selectedSession(); as session) {
                <div class="flex-1 flex flex-col lg:flex-row overflow-hidden">
                  
                  <!-- Left: Image Viewer -->
                  <div class="lg:w-1/2 bg-gray-900 relative p-4 flex items-center justify-center min-h-[300px]">
                    <img [src]="session.imageUrl" class="max-w-full max-h-[400px] lg:max-h-[80vh] object-contain shadow-2xl" alt="Original">
                  </div>

                  <!-- Right: Editable Data -->
                  <div class="flex-1 lg:w-1/2 bg-white border-l border-gray-200 flex flex-col h-full">
                    <div class="p-4 border-b bg-white z-10 shadow-sm flex justify-between items-center sticky top-0">
                       <div>
                         <h3 class="font-bold text-gray-900">Detalhes da Nota</h3>
                         <p class="text-xs text-gray-500 font-mono">ID: {{ session.id.slice(0,8) }}</p>
                       </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                       @for (item of session.items; track item.code) {
                          <div class="flex items-center gap-3 p-1 animate-slide-in-up">
                             <div 
                                class="flex-1 border rounded-lg p-3 relative bg-white shadow-sm"
                                [class.border-green-500]="item.status === 'verified'"
                                [class.bg-green-50]="item.status === 'verified'"
                             >
                                <div class="flex justify-between items-center">
                                   <div class="pr-2">
                                      <div class="font-bold text-gray-900 text-sm">{{ item.name }}</div>
                                      <div class="text-xs font-mono text-gray-500">{{ item.code }}</div>
                                   </div>
                                   
                                   <div class="flex items-center bg-white rounded border border-gray-300">
                                      <input 
                                        type="number" 
                                        [ngModel]="item.quantity"
                                        (ngModelChange)="updateQuantity(session.id, item.code, $event)"
                                        class="w-16 px-2 py-1 text-center font-bold outline-none text-gray-900 bg-transparent"
                                        min="0"
                                      >
                                   </div>
                                </div>
                             </div>
                          </div>
                       }
                    </div>
                  </div>

                </div>
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                  <span class="material-icons text-5xl mb-4 text-gray-300">image_search</span>
                  <p class="text-lg">Selecione uma digitalização para revisar</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- MODE: CONSOLIDATED -->
        @if (mode() === 'consolidated') {
          <div class="p-4 md:p-8 w-full h-full overflow-y-auto animate-fade-in bg-gray-50 pb-24">
            <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div class="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-start gap-4 bg-white sticky top-0 z-10">
                <div class="flex-1">
                  <h2 class="text-2xl font-bold text-gray-900">Relatório Consolidado</h2>
                  <p class="text-gray-600 mt-1">Dados de todos os cartões (Nuvem e Local).</p>
                </div>
                
                <div class="flex flex-col gap-3 w-full md:w-auto">
                   <div class="grid grid-cols-2 gap-2">
                      <button 
                        (click)="copyToClipboard()"
                        class="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-100 flex items-center justify-center gap-2 text-sm transition-colors"
                        title="Copiar para colar no Google Sheets"
                      >
                        <span class="material-icons text-base">content_copy</span>
                        <span class="hidden sm:inline">Copiar</span>
                      </button>
                      
                      <button 
                        (click)="downloadCSV()"
                        class="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-100 flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                         <span class="material-icons text-base">download</span>
                         <span class="hidden sm:inline">CSV</span>
                      </button>
                   </div>
                   <button 
                      (click)="exportLocalData()"
                      class="px-3 py-2 bg-gray-700 border border-gray-800 text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center gap-2 text-sm transition-colors"
                      title="Exportar um backup de todos os dados salvos localmente"
                    >
                       <span class="material-icons text-base">save_alt</span>
                       <span>Exportar Backup Local</span>
                    </button>
                </div>
              </div>

              @if (dataService.sessions().length > 0) {
                <div class="overflow-x-auto">
                  <table class="w-full text-left min-w-[600px]">
                    <thead class="bg-gray-100 border-b border-gray-200 text-gray-700 uppercase text-xs tracking-wider font-bold">
                      <tr>
                        <th class="p-4">Código</th>
                        <th class="p-4">Descrição do Material</th>
                        <th class="p-4 text-right">Qtd. Total</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 text-sm">
                      @for (item of dataService.consolidatedResults(); track item.code) {
                        <tr class="hover:bg-gray-50 transition-colors animate-slide-in-up">
                          <td class="p-4 font-mono text-gray-600 font-medium">{{ item.code }}</td>
                          <td class="p-4 font-bold text-gray-900">{{ item.name }}</td>
                          <td class="p-4 text-right">
                            <span class="inline-block bg-medical-100 text-medical-800 px-4 py-1.5 rounded-full font-bold shadow-sm">
                              {{ item.quantity }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                    <tfoot class="bg-gray-50 border-t border-gray-200 font-medium text-gray-600">
                      <tr>
                        <td colspan="3" class="p-4 text-center text-xs">
                          Total de {{ totalItems() }} itens em {{ dataService.sessions().length }} cartões.
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              } @else {
                 <div class="p-16 text-center text-gray-400">
                    <span class="material-icons text-6xl mb-4 text-gray-300">cloud_off</span>
                    <p class="text-xl font-medium text-gray-600">Nenhum dado na nuvem.</p>
                    <button (click)="mode.set('scan')" class="mt-6 px-6 py-2 bg-medical-600 text-white rounded-lg font-bold shadow hover:bg-medical-700">
                      Iniciar Digitalização
                    </button>
                 </div>
              }
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class ScanAnalyzerComponent {
  dataService = inject(DataService);

  mode = signal<ScanMode>('scan');
  
  // Scan State
  currentPreview = signal<string | null>(null);
  currentBase64 = signal<string | null>(null);
  isAnalyzing = signal(false);
  error = signal<string | null>(null);

  // Verification Pending State
  pendingItems = signal<ScanResult[]>([]);
  pendingImage = signal<string | null>(null);

  // Review State (History)
  selectedSession = signal<ScanSession | null>(null);

  // Computed
  totalItems = computed(() => {
    return this.dataService.consolidatedResults().reduce((acc, curr) => acc + curr.quantity, 0);
  });

  constructor() {
    // Auto-select first session if exists when switching to review
    if (this.dataService.sessions().length > 0) {
      this.selectedSession.set(this.dataService.sessions()[0]);
    }
  }

  setMode(m: ScanMode) {
    if (this.mode() === 'verify' && m !== 'verify') {
      if (!confirm('Deseja sair sem salvar a digitalização atual?')) {
        return;
      }
      this.pendingItems.set([]);
      this.pendingImage.set(null);
    }
    this.mode.set(m);
  }

  // --- Scan Actions ---

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.currentPreview.set(result);
        const base64 = result.split(',')[1];
        this.currentBase64.set(base64);
        this.error.set(null);
      };
      
      reader.readAsDataURL(file);
    }
  }

  clearCurrent() {
    this.currentPreview.set(null);
    this.currentBase64.set(null);
    this.error.set(null);
  }

  async analyze() {
    if (!this.currentBase64()) return;

    this.isAnalyzing.set(true);
    this.error.set(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
      
      const prompt = `
        Atue como um especialista em OCR de documentos médicos manuscritos.
        Analise a imagem da "Nota de Sala Cirúrgica" fornecida.

        OBJETIVO: Extrair a tabela de materiais consumidos.

        REGRAS DE EXTRAÇÃO:
        1. **Itens Impressos**: A maioria dos itens já tem Código e Descrição impressos. O foco principal é ler o NÚMERO MANUSCRITO na coluna de Quantidade/Consumo.
           - Se a quantidade estiver vazia, for um traço (-) ou zero, retorne 0.
           - Se houver um número escrito (ex: 1, 2, 10), retorne esse número.

        2. **Itens Manuscritos ("Outros")**:
           - No final da lista, pode haver itens adicionados manualmente à caneta.
           - Leia a Descrição Manuscrita com cuidado. Se a descrição ocupar mais de uma linha visual, concatene o texto em uma única string.
           - Se não houver código para estes itens, gere "MANUAL-1", "MANUAL-2", etc.
           - Extraia a quantidade correspondente.

        3. **Correção de Ruído**:
           - Ignore assinaturas, datas ou carimbos sobrepostos à tabela se possível.
           - Foque estritamente nas linhas que parecem ser materiais e medicamentos.

        SAÍDA OBRIGATÓRIA:
        Retorne APENAS um JSON válido (Array de Objetos). Nenhuma formatação Markdown.
        Exemplo:
        [
          { "code": "SUT-01", "name": "Fio Nylon", "quantity": 1 },
          { "code": "MANUAL-1", "name": "Dreno Suctor 3.2mm", "quantity": 1 }
        ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: this.currentBase64()!
                }
              }
            ]
          }
        ]
      });

      const text = response.text();
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const data = JSON.parse(jsonString);
        
        if (Array.isArray(data)) {
          const rawItems = data as {code: string, name: string, quantity: number}[];
          
          const pending = rawItems.map(item => ({
            ...item,
            status: (item.quantity > 0 ? 'verified' : 'empty') as ItemStatus
          }));

          this.pendingItems.set(pending);
          this.pendingImage.set(this.currentPreview());
          
          this.clearCurrent();
          this.mode.set('verify');

        } else {
          throw new Error('Formato de resposta inválido');
        }
      } catch (e) {
        console.error(e);
        this.error.set('Falha ao ler dados. A imagem está nítida?');
      }

    } catch (err: any) {
      this.error.set('Erro na IA: ' + (err.message || 'Desconhecido'));
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  // --- Verify Actions ---

  updatePendingQuantity(code: string, newQty: any) {
    const val = parseInt(newQty, 10);
    if (isNaN(val)) return;

    this.pendingItems.update(items => 
      items.map(item => {
        if (item.code === code) {
          const newStatus: ItemStatus = val > 0 ? 'verified' : 'empty';
          return { ...item, quantity: val, status: newStatus };
        }
        return item;
      })
    );
  }

  togglePendingStatus(code: string) {
    this.pendingItems.update(items => 
      items.map(item => {
        if (item.code === code) {
          let nextStatus: ItemStatus = 'verified';
          if (item.status === 'verified') nextStatus = 'error';
          else if (item.status === 'error') nextStatus = (item.quantity > 0 ? 'verified' : 'empty');
          else if (item.status === 'empty') nextStatus = 'error';
          
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  }

  discardScan() {
    if(confirm('Tem certeza? Os dados desta leitura serão perdidos.')) {
      this.pendingItems.set([]);
      this.pendingImage.set(null);
      this.mode.set('scan');
    }
  }

  confirmScan() {
    const img = this.pendingImage();
    const items = this.pendingItems();

    if (img && items.length > 0) {
      this.dataService.addSession(img, items);
      this.pendingItems.set([]);
      this.pendingImage.set(null);
      this.mode.set('review');
      this.selectedSession.set(this.dataService.sessions()[0]);
    }
  }

  // --- Review Actions ---

  selectSession(session: ScanSession) {
    this.selectedSession.set(session);
  }

  deleteSession(id: string, event: Event) {
    event.stopPropagation();
    if(confirm('Tem certeza que deseja remover esta digitalização da nuvem?')) {
      this.dataService.deleteSession(id);
      if (this.selectedSession()?.id === id) {
        this.selectedSession.set(this.dataService.sessions()[0] || null);
      }
    }
  }

  updateQuantity(sessionId: string, code: string, newQty: any) {
    const val = parseInt(newQty, 10);
    if (!isNaN(val)) {
      this.dataService.updateSessionItem(sessionId, code, val);
    }
  }

  // --- Export Actions ---

  copyToClipboard() {
    const text = this.dataService.getExportStringTSV();
    navigator.clipboard.writeText(text).then(() => {
      alert('Dados copiados! Abra o Google Sheets e pressione Ctrl+V.');
    });
  }

  downloadCSV() {
    const csvContent = "data:text/csv;charset=utf-8," + this.dataService.getExportStringCSV();
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_scanner_ns.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportLocalData() {
    const jsonData = this.dataService.getLocalBackupData();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `backup_local_scanner_ns_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('Backup dos dados locais exportado com sucesso!');
  }
}