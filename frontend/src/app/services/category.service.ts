import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Kategorija } from '../models/models';
import { API } from './api';

/**
 * Pun spisak kategorija sa potkategorijama.
 *
 * Ovo NIJE isto što i PublicService.kategorije(): ona vraća samo nazive
 * kategorija koje imaju proizvoda na stanju, jer tako traži padajuća lista na
 * početnoj strani. Ovde treba sve, sa potkategorijama - štamparu, da svrsta
 * novi proizvod.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  sve() {
    return this.http.get<Kategorija[]>(`${API}/categories`);
  }
}
