import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Ljuska koristi RouterLink i AuthService (koji zavisi od HttpClient-a),
      // pa oba moraju postojati u testnom okruzenju.
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('treba da se kreira', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('prikazuje naziv aplikacije u zaglavlju', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.znak-ime')?.textContent).toContain('Printing House');
  });

  it('neprijavljenom korisniku nudi prijavu i registraciju', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const tekst = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(tekst).toContain('Prijava');
    expect(tekst).toContain('Registracija');
  });
});
