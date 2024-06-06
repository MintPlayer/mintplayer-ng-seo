import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaService {

  public isPwa() {
    return window && window.matchMedia('(display-mode: standalone)').matches;
  }
  
}
