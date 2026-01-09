import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  imports: [
    CommonModule
  ],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class LoaderComponent {

  @Input() text: string = 'Cargando...';
  @Input() type: 'monkey' | 'dashboard' = 'monkey';
  @Input() headerSize: string = '5rem';

  cards = [1, 2, 3, 4];
  rows = [1, 2, 3, 4, 5];

  getLoaderHeight(): string {
    return `calc(100vh - ${this.headerSize})`;
  }

  get logo() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
      return 'images/logo/logo-blanco.svg'
    } else {
      return 'images/logo/logo-azul.svg'
    }
  }

}
