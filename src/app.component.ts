import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialListComponent } from './components/material-list.component';
import { PrintSheetComponent } from './components/print-sheet.component';
import { ScanAnalyzerComponent } from './components/scan-analyzer.component';
import { LoginComponent } from './components/login.component';
import { AuthService } from './services/auth.service';

type Tab = 'setup' | 'print' | 'scan';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MaterialListComponent, PrintSheetComponent, ScanAnalyzerComponent, LoginComponent],
  host: {
    'class': 'flex flex-col h-full'
  },
  template: `
    @if (!auth.isLoggedIn()) {
      <app-login />
    } @else {
      <!-- Top Navigation Bar (Hidden when printing) -->
      <nav class="bg-white border-b border-gray-200 px-4 py-2 print:hidden shadow-sm z-30 shrink-0">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          
          <!-- Logo & User Profile -->
          <div class="flex items-center justify-between w-full md:w-auto">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-medical-600 rounded-lg flex items-center justify-center text-white">
                <span class="material-icons text-sm">medical_services</span>
              </div>
              <h1 class="font-bold text-gray-900 tracking-tight text-lg">Scanner NS</h1>
            </div>

            <!-- Mobile Logout (Small Screens) -->
            <button (click)="auth.logout()" class="md:hidden text-gray-400">
               <span class="material-icons">logout</span>
            </button>
          </div>
          
          <!-- Navigation Tabs -->
          <div class="flex gap-1 bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            <button 
              (click)="currentTab.set('setup')"
              class="flex-1 md:flex-none px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              [class.bg-white]="currentTab() === 'setup'"
              [class.text-medical-700]="currentTab() === 'setup'"
              [class.shadow-sm]="currentTab() === 'setup'"
              [class.text-gray-600]="currentTab() !== 'setup'"
            >
              <span class="material-icons text-lg">edit_note</span>
              <span>Planejamento</span>
            </button>
            
            <button 
              (click)="currentTab.set('print')"
              class="flex-1 md:flex-none px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              [class.bg-white]="currentTab() === 'print'"
              [class.text-medical-700]="currentTab() === 'print'"
              [class.shadow-sm]="currentTab() === 'print'"
              [class.text-gray-600]="currentTab() !== 'print'"
            >
              <span class="material-icons text-lg">print</span>
              <span>Imprimir</span>
            </button>
            
            <button 
              (click)="currentTab.set('scan')"
              class="flex-1 md:flex-none px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              [class.bg-white]="currentTab() === 'scan'"
              [class.text-medical-700]="currentTab() === 'scan'"
              [class.shadow-sm]="currentTab() === 'scan'"
              [class.text-gray-600]="currentTab() !== 'scan'"
            >
              <span class="material-icons text-lg">qr_code_scanner</span>
              <span>Digitalizar</span>
            </button>
          </div>

          <!-- User Info (Desktop) -->
          <div class="hidden md:flex items-center gap-3 pl-4 border-l">
            <img [src]="auth.currentUser()?.avatarUrl" class="w-8 h-8 rounded-full border border-gray-200">
            <div class="text-xs">
              <div class="font-bold text-gray-900">{{ auth.currentUser()?.name }}</div>
              <div class="text-green-600 flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
              </div>
            </div>
            <button (click)="auth.logout()" class="ml-2 text-gray-400 hover:text-red-500" title="Sair">
              <span class="material-icons">logout</span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Content Area with Scroll -->
      <main class="flex-1 overflow-y-auto overflow-x-hidden relative bg-gray-50 w-full min-h-0">
        <div class="h-full"> <!-- Wrapper to ensure content expands -->
          @switch (currentTab()) {
            @case ('setup') {
              <app-material-list class="block h-full animate-fade-in" />
            }
            @case ('print') {
              <app-print-sheet class="block h-full animate-fade-in" />
            }
            @case ('scan') {
              <app-scan-analyzer class="block h-full animate-fade-in" />
            }
          }
        </div>
      </main>

      <!-- External Styles for Material Icons -->
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    }
  `
})
export class AppComponent {
  auth = inject(AuthService);
  currentTab = signal<Tab>('scan');
}