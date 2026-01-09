import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-200 animate-fade-in">
        
        <div class="w-16 h-16 bg-medical-600 rounded-xl flex items-center justify-center text-white mx-auto mb-6 shadow-md">
          <span class="material-icons text-3xl">medical_services</span>
        </div>

        <h1 class="text-2xl font-bold text-gray-900 mb-2">Scanner NS</h1>
        <p class="text-gray-500 mb-8">Faça login para sincronizar suas notas cirúrgicas na nuvem.</p>

        <button 
          (click)="auth.login()"
          [disabled]="auth.isLoading()"
          class="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 border border-gray-300 rounded-lg shadow-sm transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
        >
          @if (auth.isLoading()) {
            <span class="animate-spin h-5 w-5 border-2 border-medical-600 border-t-transparent rounded-full"></span>
            <span class="text-gray-500">Conectando...</span>
          } @else {
            <img src="https://www.google.com/favicon.ico" alt="Google" class="w-5 h-5">
            <span class="group-hover:text-gray-900">Entrar com Google</span>
          }
        </button>

        <div class="mt-8 text-xs text-gray-400 border-t pt-4">
          <p>Ambiente Seguro • Criptografia Ponta a Ponta</p>
          <p class="mt-1">Versão 2.1.0 (Cloud Sync)</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  auth = inject(AuthService);
}