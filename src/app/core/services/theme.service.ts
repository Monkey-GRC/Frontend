import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })

export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>('light');
  private themeLinkId = 'app-theme'; // ID del <link> en <head>
  private lightTheme = 'monkey-app-theme.css';
  private darkTheme = 'monkey-app-dark-theme.css';
  theme$ = this.themeSubject.asObservable();

  constructor() {
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'light';
    this.setTheme(savedTheme);
  }

  toggleTheme() {
    const newTheme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme) {
    this.themeSubject.next(theme);
    localStorage.setItem('theme', theme);
    let linkEl = document.getElementById(this.themeLinkId) as HTMLLinkElement;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.id = this.themeLinkId;
      document.head.appendChild(linkEl);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark:bg-gray-900');
      linkEl.href = this.darkTheme;
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark:bg-gray-900');
      linkEl.href = this.lightTheme;
    }
  }
}