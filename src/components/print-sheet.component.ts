import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import QRCode from 'qrcode';

@Component({
  selector: 'app-print-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col">
      <!-- Actions Bar (Hidden on print) -->
      <div class="p-4 border-b bg-white flex justify-between items-center print:hidden shadow-sm z-20">
        <div>
          <h2 class="text-lg font-bold text-gray-800">Visualização de Impressão</h2>
          <p class="text-sm text-gray-500">
            Modelo: <strong class="text-gray-800">{{ dataService.currentTemplate()?.name }}</strong>
          </p>
        </div>
        <button 
          (click)="print()"
          class="bg-medical-600 hover:bg-medical-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <span class="material-icons">print</span> Imprimir
        </button>
      </div>

      <!-- Printable Area -->
      <div class="flex-1 overflow-auto bg-gray-100 p-4 md:p-8 print:p-0 print:bg-white print:overflow-visible flex justify-center">
        
        <div id="printable-area" class="bg-white w-full max-w-[21cm] min-h-[29.7cm] p-8 md:p-12 shadow-lg print:shadow-none print:w-full">
          
          <!-- Header -->
          <div class="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 class="text-3xl font-bold uppercase tracking-wide text-black mb-2">Nota de Sala Cirúrgica</h1>
              <div class="text-lg font-semibold text-gray-800 mb-4">{{ dataService.currentTemplate()?.name }}</div>
              <div class="text-sm text-gray-600 mt-2 space-y-1">
                <p>Data: _____/_____/_______</p>
                <p>Sala: __________________</p>
                <p>Paciente: __________________________________________________</p>
              </div>
            </div>
            <div class="text-right">
              @if(qrCodeUrl()) {
                <img [src]="qrCodeUrl()" alt="QR Code Identificação do Modelo" class="w-24 h-24 print:filter-none">
              } @else {
                <div class="border-2 border-black p-2 w-24 h-24 flex items-center justify-center text-center text-xs font-mono">
                  Gerando QR...
                </div>
              }
            </div>
          </div>

          <!-- Table -->
          <table class="w-full border-collapse border-2 border-black">
            <thead>
              <tr class="bg-gray-100 print:bg-gray-100">
                <th class="border border-black p-3 text-left w-24 font-bold text-black uppercase text-sm">Código</th>
                <th class="border border-black p-3 text-left font-bold text-black uppercase text-sm">Descrição do Material</th>
                <th class="border border-black p-3 text-center w-32 font-bold text-black uppercase text-sm">Qtd. Consumo</th>
              </tr>
            </thead>
            <tbody>
              @for (item of dataService.materials(); track item.id) {
                <tr>
                  <td class="border border-black p-3 font-mono text-sm">{{ item.code }}</td>
                  <td class="border border-black p-3 text-sm">{{ item.name }}</td>
                  <!-- High contrast box for handwriting -->
                  <td class="border border-black p-2 relative">
                     <div class="w-full h-8 border border-gray-300 bg-white"></div>
                  </td>
                </tr>
              }
              <!-- Extra empty rows for manual addition -->
              @for (i of [1,2,3,4,5]; track i) {
                <tr>
                  <td class="border border-black p-3"></td>
                  <td class="border border-black p-3 text-gray-400 italic text-xs pt-4">Outros: ________________________</td>
                  <td class="border border-black p-2">
                     <div class="w-full h-8 border border-gray-300 bg-white"></div>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Footer -->
          <div class="mt-8 pt-4 border-t border-black flex justify-between text-sm text-gray-600">
            <div class="w-1/3 text-center">
              <div class="border-b border-black mb-2 h-8"></div>
              <p>Assinatura do Circulante</p>
            </div>
            <div class="w-1/3 text-center">
              <div class="border-b border-black mb-2 h-8"></div>
              <p>Assinatura do Cirurgião</p>
            </div>
          </div>
          
          <div class="mt-8 text-center text-xs text-gray-400 font-mono">
            Gerado por Scanner NS - {{ dataService.currentTemplate()?.name }}
          </div>

        </div>

      </div>
    </div>
  `
})
export class PrintSheetComponent {
  dataService = inject(DataService);
  qrCodeUrl = signal<string>('');

  constructor() {
    effect(async () => {
      const template = this.dataService.currentTemplate();
      if (template) {
        const qrData = JSON.stringify({
          id: template.id,
          name: template.name,
        });
        try {
          const url = await QRCode.toDataURL(qrData, { 
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 96 // 96x96 pixels
          });
          this.qrCodeUrl.set(url);
        } catch (err) {
          console.error('Failed to generate QR code', err);
          this.qrCodeUrl.set(''); // Clear on error
        }
      }
    });
  }

  print() {
    window.print();
  }
}