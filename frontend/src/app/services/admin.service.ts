import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Korisnik } from '../models/models';
import { API } from './api';

/** Pozivi koje sme da napravi samo administrator. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  zahteviZaRegistraciju() {
    return this.http.get<Korisnik[]>(`${API}/users/requests`);
  }

  obradiZahtev(userId: string, approve: boolean) {
    return this.http.post<{ message: string; user: Korisnik }>(
      `${API}/users/requests/resolve`,
      { userId, approve }
    );
  }
}
