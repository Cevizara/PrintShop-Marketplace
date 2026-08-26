import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Korisnik } from '../models/models';
import { API } from './api';

/** Podaci koje bilo koji prijavljen korisnik čita i menja nad SVOJIM nalogom. */
export interface PodaciProfila {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  institutionName?: string;
  institutionAddress?: string;
  institutionCity?: string;
  registrationNumber?: string;
  taxId?: string;
  lat?: string;
  lng?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  /**
   * U putanji nema identifikatora: server "me" čita iz tokena. Da je ovde
   * stajao id, klijent bi mogao da pošalje tuđi.
   */
  mojProfil() {
    return this.http.get<Korisnik>(`${API}/users/me`);
  }

  sacuvajProfil(podaci: PodaciProfila) {
    return this.http.put<{ message: string; user: Korisnik }>(`${API}/users/me`, podaci);
  }

  /** Slika ide kao FormData, jer je fajl. */
  promeniSliku(slika: File) {
    const podaci = new FormData();
    podaci.append('profileImage', slika);
    return this.http.post<{ message: string; user: Korisnik }>(`${API}/users/me/image`, podaci);
  }
}
