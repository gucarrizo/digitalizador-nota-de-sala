import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isLoading = signal(false);

  login() {
    this.isLoading.set(true);
    // Simulating network delay for "Google Login"
    setTimeout(() => {
      this.currentUser.set({
        id: 'user_123',
        name: 'Dr. Usuário Exemplo',
        email: 'doutor@hospital.com',
        avatarUrl: 'https://ui-avatars.com/api/?name=Dr+Usuario&background=0D8ABC&color=fff'
      });
      this.isLoading.set(false);
    }, 1500);
  }

  logout() {
    this.currentUser.set(null);
  }

  isLoggedIn() {
    return this.currentUser() !== null;
  }
}