import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  imports: [CommonModule],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.css'
})
export class LoadingComponent implements OnInit, OnDestroy {
  progress = 0;
  private intervalId: any;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startProgressBar();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private startProgressBar(): void {
    const duration = 7000; // 10 segundos
    const interval = 100; // Actualizar cada 100ms
    const increment = (interval / duration) * 100;

    this.intervalId = setInterval(() => {
      this.progress += increment;
      
      if (this.progress >= 100) {
        this.progress = 100;
        clearInterval(this.intervalId);
        
        // Esperar un poco antes de redirigir para mostrar el 100%
        setTimeout(() => {
          this.router.navigate(['/home']); // Cambia '/home' por la ruta de tu página principal
        }, 500);
      }
    }, interval);
  }
}