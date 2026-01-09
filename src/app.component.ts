import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialListComponent } from './components/material-list.component';
import { PrintSheetComponent } from './components/print-sheet.component';
import { ScanAnalyzerComponent } from './components/scan-analyzer.component';

type Tab = 'setup' | 'print' | 'scan';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MaterialListComponent, PrintSheetComponent, ScanAnalyzerComponent],
  template: `
    <!-- Top Navigation Bar (Hidden when printing) -->
    <nav class="bg-white border-b border-gray-200 px-4 py-3 print:hidden shadow-sm z-30">
      <div class="max-w-6xl mx-auto flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-medical-600 rounded-lg flex items-center justify-center text-white">
            <span class="material-icons text-sm">medical_services</span>
          </div>
          <h1 class="font-bold text-gray-800 tracking-tight hidden md:block">Surgical Note Scanner</h1>
        </div>
        
        <div class="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button 
            (click)="currentTab.set('setup')"
            class="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            [class.bg-white]="currentTab() === 'setup'"
            [class.text-medical-700]="currentTab() === 'setup'"
            [class.shadow-sm]="currentTab() === 'setup'"
            [class.text-gray-500]="currentTab() !== 'setup'"
          >
            <span class="material-icons text-lg">edit_note</span>
            <span class="hidden sm:inline">Planejamento</span>
          </button>
          
          <button 
            (click)="currentTab.set('print')"
            class="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            [class.bg-white]="currentTab() === 'print'"
            [class.text-medical-700]="currentTab() === 'print'"
            [class.shadow-sm]="currentTab() === 'print'"
            [class.text-gray-500]="currentTab() !== 'print'"
          >
            <span class="material-icons text-lg">print</span>
            <span class="hidden sm:inline">Imprimir</span>
          </button>
          
          <button 
            (click)="currentTab.set('scan')"
            class="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            [class.bg-white]="currentTab() === 'scan'"
            [class.text-medical-700]="currentTab() === 'scan'"
            [class.shadow-sm]="currentTab() === 'scan'"
            [class.text-gray-500]="currentTab() !== 'scan'"
          >
            <span class="material-icons text-lg">qr_code_scanner</span>
            <span class="hidden sm:inline">Digitalizar</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-hidden relative bg-gray-50">
      
      @switch (currentTab()) {
        @case ('setup') {
          <app-material-list class="block h-full overflow-hidden" />
        }
        @case ('print') {
          <app-print-sheet class="block h-full overflow-hidden" />
        }
        @case ('scan') {
          <app-scan-analyzer class="block h-full overflow-hidden" />
        }
      }

    </main>

    <!-- External Styles for Material Icons -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  `,
  styles: []
})
export class AppComponent {
  currentTab = signal<Tab>('setup');
}
