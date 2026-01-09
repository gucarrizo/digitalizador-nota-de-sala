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
    <div class="h-full flex flex-col w-full bg-gray-50">
      
      <!-- Sub-Navigation for Scan Module -->
      <div class="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-4">
        <button 
          (click)="setMode('scan')"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border"
          [class]="mode() === 'scan' ? 'bg-medical-50 border-medical-200 text-medical-700' : 'border-transparent text-gray-500 hover:bg-gray-100'"
        >
          <span class="material-icons text-sm">add_a_photo</span> Nova Digitalização
        </button>
        
        @if (mode() === 'verify') {
          <div class="px-3 py-1.5 rounded-full text-sm font-bold bg-yellow-50 border border-yellow-200 text-yellow-700 flex items-center gap-2 animate-pulse">
            <span class="material-icons text-sm">pending_actions</span> Confirmação Pendente
          </div>
        }

        <button 
          (click)="setMode('review')"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border"
          [class]="mode() === 'review' ? 'bg-medical-50 border-medical-200 text-medical-700' : 'border-transparent text-gray-500 hover:bg-gray-100'"
        >
          <span class="material-icons text-sm">fact_check</span> 
          Histórico 
          @if (dataService.sessions().length > 0) {
            <span>({{ dataService.sessions().length }})</span>
          }
        </button>

        <button 
          (click)="setMode('consolidated')"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border"
          [class]="mode() === 'consolidated' ? 'bg-medical-50 border-medical-200 text-medical-700' : 'border-transparent text-gray-500 hover:bg-gray-100'"
        >
          <span class="material-icons text-sm">summarize</span> Consolidado
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-hidden relative">
        
        <!-- MODE: SCAN -->
        @if (mode() === 'scan') {
          <div class="h-full overflow-y-auto p-6 flex flex-col items-center justify-center">
             <div class="max-w-xl w-full">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center relative overflow-hidden transition-all hover:border-medical-400 group">
                  
                  @if (currentPreview()) {
                    <div class="relative rounded-lg overflow-hidden border border-gray-100 bg-gray-900 aspect-[3/4] mb-4">
                      <img [src]="currentPreview()" class="w-full h-full object-contain" alt="Preview">
                      <button 
                        (click)="clearCurrent()"
                        class="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                      >
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  } @else {
                    <div class="py-12 border-2 border-dashed border-gray-200 rounded-xl mb-6 group-hover:border-medical-300 transition-colors">
                      <span class="material-icons text-6xl text-gray-300 mb-4 group-hover:text-medical-400 transition-colors">add_a_photo</span>
                      <h3 class="font-medium text-gray-700 text-lg">Capturar Nota</h3>
                      <p class="text-sm text-gray-400 mt-2 px-8">Toque aqui para abrir a câmera ou enviar arquivo</p>
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
                      class="w-full bg-medical-600 hover:bg-medical-700 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-3"
                    >
                      @if (isAnalyzing()) {
                        <span class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Processando Imagem...
                      } @else {
                        <span class="material-icons">auto_awesome</span>
                        Extrair Dados
                      }
                    </button>
                  }
                </div>

                @if (error()) {
                  <div class="mt-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm flex items-start gap-2 animate-pulse">
                    <span class="material-icons text-red-500">error</span>
                    <div>
                      <strong class="font-bold block">Erro na Leitura:</strong>
                      {{ error() }}
                    </div>
                  </div>
                }
             </div>
          </div>
        }

        <!-- MODE: VERIFY (NEW STEP) -->
        @if (mode() === 'verify') {
          <div class="h-full flex flex-col lg:flex-row">
             <!-- Left: Image Viewer (Static) -->
             <div class="h-1/3 lg:h-full lg:w-1/2 bg-gray-900 relative p-4 flex items-center justify-center overflow-hidden">
                <img [src]="pendingImage()" class="max-w-full max-h-full object-contain shadow-2xl" alt="Original">
                <div class="absolute bottom-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs shadow-sm font-bold flex items-center gap-2">
                  <span class="material-icons text-sm">warning</span>
                  Modo de Verificação
                </div>
             </div>

             <!-- Right: Validation Data -->
             <div class="h-2/3 lg:h-full lg:w-1/2 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10">
                <div class="p-6 border-b bg-yellow-50 flex justify-between items-center">
                   <div>
                     <h3 class="font-bold text-gray-800 text-lg">Confirme os Dados Extraídos</h3>
                     <p class="text-sm text-gray-600">Verifique se as quantidades correspondem à imagem.</p>
                   </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                   @for (item of pendingItems(); track item.code) {
                      <div class="flex items-start gap-3 p-1">
                         <div 
                            (click)="togglePendingStatus(item.code)"
                            class="flex-1 border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md relative group select-none bg-white"
                            [class.bg-green-50]="item.status === 'verified'"
                            [class.border-green-400]="item.status === 'verified'"
                            [class.text-green-900]="item.status === 'verified'"
                            
                            [class.bg-white]="item.status === 'empty'"
                            [class.border-gray-200]="item.status === 'empty'"
                            [class.text-gray-400]="item.status === 'empty'"
                            
                            [class.bg-red-50]="item.status === 'error'"
                            [class.border-red-400]="item.status === 'error'"
                            [class.text-red-900]="item.status === 'error'"
                         >
                            <div class="flex justify-between items-start">
                               <div>
                                  <div class="font-medium text-sm">{{ item.name }}</div>
                                  <div class="text-xs font-mono opacity-70">{{ item.code }}</div>
                               </div>
                               
                               <div (click)="$event.stopPropagation()">
                                  <input 
                                    type="number" 
                                    [ngModel]="item.quantity"
                                    (ngModelChange)="updatePendingQuantity(item.code, $event)"
                                    class="w-16 px-2 py-1 border-b-2 text-center font-bold outline-none focus:ring-0 bg-transparent transition-colors"
                                    [class.border-green-300]="item.status === 'verified'"
                                    [class.focus:border-green-600]="item.status === 'verified'"
                                    [class.border-gray-300]="item.status === 'empty'"
                                    [class.border-red-300]="item.status === 'error'"
                                    min="0"
                                  >
                               </div>
                            </div>
                            
                            <div class="absolute -top-2 -left-2">
                              @if (item.status === 'verified') {
                                <span class="bg-green-500 text-white rounded-full p-0.5 shadow-sm block">
                                  <span class="material-icons text-[14px] block">check</span>
                                </span>
                              } @else if (item.status === 'error') {
                                <span class="bg-red-500 text-white rounded-full p-0.5 shadow-sm block">
                                  <span class="material-icons text-[14px] block">priority_high</span>
                                </span>
                              }
                            </div>
                         </div>
                      </div>
                   }
                </div>

                <!-- Verify Actions -->
                <div class="p-4 border-t bg-white flex gap-3">
                  <button 
                    (click)="discardScan()"
                    class="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors flex justify-center items-center gap-2"
                  >
                    <span class="material-icons">delete</span>
                    Descartar
                  </button>
                  <button 
                    (click)="confirmScan()"
                    class="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    <span class="material-icons">check_circle</span>
                    Confirmar e Salvar
                  </button>
                </div>
             </div>
          </div>
        }

        <!-- MODE: REVIEW (HISTORY) -->
        @if (mode() === 'review') {
          <div class="h-full flex flex-col md:flex-row">
            
            <!-- Sidebar: Thumbnails -->
            <div class="w-full md:w-64 bg-white border-r border-gray-200 overflow-y-auto p-4 flex md:flex-col gap-3 shrink-0 h-32 md:h-full">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 hidden md:block">Histórico</h3>
              
              @for (session of dataService.sessions(); track session.id) {
                <button 
                  (click)="selectSession(session)"
                  class="relative rounded-lg overflow-hidden border-2 transition-all w-20 md:w-full aspect-[3/4] md:aspect-video shrink-0 group"
                  [class.border-medical-500]="selectedSession()?.id === session.id"
                  [class.ring-2]="selectedSession()?.id === session.id"
                  [class.ring-medical-200]="selectedSession()?.id === session.id"
                  [class.border-transparent]="selectedSession()?.id !== session.id"
                >
                  <img [src]="session.imageUrl" class="w-full h-full object-cover" alt="Thumb">
                  <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate text-center">
                    {{ session.timestamp | date:'HH:mm:ss' }}
                  </div>
                  <button 
                    (click)="deleteSession(session.id, $event)"
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                    title="Excluir"
                  >
                    <span class="material-icons text-[12px] block">close</span>
                  </button>
                </button>
              } @empty {
                <div class="text-gray-400 text-sm text-center py-8 px-2 border-2 border-dashed border-gray-100 rounded-lg">
                  Nenhuma imagem no histórico.
                </div>
              }
            </div>

            <!-- Detail View -->
            <div class="flex-1 bg-gray-50 h-full overflow-hidden flex flex-col">
              @if (selectedSession(); as session) {
                <div class="h-full flex flex-col lg:flex-row">
                  
                  <!-- Left: Image Viewer -->
                  <div class="h-1/2 lg:h-full lg:w-1/2 bg-gray-900 relative p-4 flex items-center justify-center overflow-hidden">
                    <img [src]="session.imageUrl" class="max-w-full max-h-full object-contain shadow-2xl" alt="Original">
                    <div class="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm shadow-sm border border-white/20">
                      Original
                    </div>
                  </div>

                  <!-- Right: Editable Data -->
                  <div class="h-1/2 lg:h-full lg:w-1/2 bg-white border-l border-gray-200 flex flex-col">
                    <div class="p-4 border-b bg-white z-10 shadow-sm flex justify-between items-center">
                       <div>
                         <h3 class="font-bold text-gray-800">Conferência de Dados (Histórico)</h3>
                         <p class="text-xs text-gray-500">ID: {{ session.id.slice(0,8) }}</p>
                       </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 space-y-3">
                       @for (item of session.items; track item.code) {
                          <div class="flex items-start gap-3 p-1">
                             <div 
                                (click)="toggleStatus(session.id, item.code)"
                                class="flex-1 border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md relative group select-none"
                                [class.bg-green-50]="item.status === 'verified'"
                                [class.border-green-400]="item.status === 'verified'"
                                [class.text-green-900]="item.status === 'verified'"
                                
                                [class.bg-white]="item.status === 'empty'"
                                [class.border-gray-200]="item.status === 'empty'"
                                [class.text-gray-400]="item.status === 'empty'"
                                
                                [class.bg-red-50]="item.status === 'error'"
                                [class.border-red-400]="item.status === 'error'"
                                [class.text-red-900]="item.status === 'error'"
                             >
                                <div class="flex justify-between items-start">
                                   <div>
                                      <div class="font-medium text-sm">{{ item.name }}</div>
                                      <div class="text-xs font-mono opacity-70">{{ item.code }}</div>
                                   </div>
                                   
                                   <div (click)="$event.stopPropagation()">
                                      <input 
                                        type="number" 
                                        [ngModel]="item.quantity"
                                        (ngModelChange)="updateQuantity(session.id, item.code, $event)"
                                        class="w-16 px-2 py-1 border-b-2 text-center font-bold outline-none focus:ring-0 bg-transparent transition-colors"
                                        [class.border-green-300]="item.status === 'verified'"
                                        [class.focus:border-green-600]="item.status === 'verified'"
                                        [class.border-gray-300]="item.status === 'empty'"
                                        [class.border-red-300]="item.status === 'error'"
                                        min="0"
                                      >
                                   </div>
                                </div>

                                <div class="absolute -top-2 -left-2">
                                  @if (item.status === 'verified') {
                                    <span class="bg-green-500 text-white rounded-full p-0.5 shadow-sm block">
                                      <span class="material-icons text-[14px] block">check</span>
                                    </span>
                                  } @else if (item.status === 'error') {
                                    <span class="bg-red-500 text-white rounded-full p-0.5 shadow-sm block">
                                      <span class="material-icons text-[14px] block">priority_high</span>
                                    </span>
                                  }
                                </div>
                             </div>
                          </div>
                       }
                    </div>
                  </div>

                </div>
              } @else {
                <div class="h-full flex flex-col items-center justify-center text-gray-400">
                  <span class="material-icons text-4xl mb-2 text-gray-300">image_search</span>
                  <p>Selecione uma digitalização para revisar</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- MODE: CONSOLIDATED -->
        @if (mode() === 'consolidated') {
          <div class="h-full p-6 overflow-y-auto max-w-5xl mx-auto w-full">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div class="p-6 border-b border-gray-200 flex justify-between items-end bg-gray-50">
                <div>
                  <h2 class="text-2xl font-bold text-gray-800">Relatório Consolidado</h2>
                  <p class="text-gray-500">Soma total de todos os cartões digitalizados.</p>
                </div>
                <div class="text-right">
                  <div class="text-3xl font-bold text-medical-600">{{ totalItems() }}</div>
                  <div class="text-xs text-gray-500 uppercase font-bold">Total de Itens</div>
                </div>
              </div>

              @if (dataService.sessions().length > 0) {
                <table class="w-full text-left">
                  <thead class="bg-gray-100 border-b border-gray-200 text-gray-600 uppercase text-xs tracking-wider">
                    <tr>
                      <th class="p-4 font-semibold">Código</th>
                      <th class="p-4 font-semibold">Descrição do Material</th>
                      <th class="p-4 font-semibold text-right">Qtd. Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 text-sm">
                    @for (item of dataService.consolidatedResults(); track item.code) {
                      <tr class="hover:bg-gray-50 transition-colors">
                        <td class="p-4 font-mono text-gray-500">{{ item.code }}</td>
                        <td class="p-4 font-medium text-gray-800">{{ item.name }}</td>
                        <td class="p-4 text-right">
                          <span class="inline-block bg-medical-100 text-medical-800 px-3 py-1 rounded-full font-bold">
                            {{ item.quantity }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot class="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colspan="3" class="p-4 text-center text-xs text-gray-500">
                        Baseado em {{ dataService.sessions().length }} cartões digitalizados.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              } @else {
                 <div class="p-12 text-center text-gray-400">
                    <span class="material-icons text-5xl mb-4 text-gray-300">folder_open</span>
                    <p class="text-lg">Nenhum dado para consolidar.</p>
                    <button (click)="mode.set('scan')" class="mt-4 text-medical-600 font-medium hover:underline">
                      Realizar primeira digitalização
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

  // Verification Pending State (New)
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
    // If attempting to leave verify, confirm discard
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
        model: 'gemini-2.5-flash',
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
          // --- CHANGE FLOW: Do NOT add directly to service. Add to Pending State. ---
          
          const rawItems = data as {code: string, name: string, quantity: number}[];
          
          // Calculate initial status
          const pending = rawItems.map(item => ({
            ...item,
            status: (item.quantity > 0 ? 'verified' : 'empty') as ItemStatus
          }));

          this.pendingItems.set(pending);
          this.pendingImage.set(this.currentPreview());
          
          // Clear scan input state
          this.clearCurrent();
          
          // Go to Verify mode
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

  // --- Verify Actions (New) ---

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
      // Add to permanent history
      // Note: addSession usually calculates status again, but here we pass items with status already defined by the user in verify step.
      // We need to slightly adjust DataService or pass simpler items. 
      // Current DataService logic re-calculates status on addSession. 
      // For simplicity, we assume DataService respects the input or we let it verify > 0.
      // Actually, let's just push what we have.
      // DataService addSession takes Omit<ScanResult, 'status'>. 
      // We want to PRESERVE user edits (like marked errors).
      
      // Let's assume for now we save the quantities. 
      // If we want to persist the 'error' status, we'd need to update DataService.
      // For this implementation, we will save the quantities confirmed by the user.
      
      this.dataService.addSession(img, items);
      
      // Clear pending
      this.pendingItems.set([]);
      this.pendingImage.set(null);
      
      // Go to Review History to see it added
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
    if(confirm('Tem certeza que deseja remover esta digitalização?')) {
      this.dataService.deleteSession(id);
      if (this.selectedSession()?.id === id) {
        this.selectedSession.set(this.dataService.sessions()[0] || null);
      }
    }
  }

  updateQuantity(sessionId: string, code: string, newQty: any) {
    // Handle input event from ngModel
    const val = parseInt(newQty, 10);
    if (!isNaN(val)) {
      this.dataService.updateSessionItem(sessionId, code, val);
    }
  }

  toggleStatus(sessionId: string, code: string) {
    this.dataService.toggleItemStatus(sessionId, code);
  }
}