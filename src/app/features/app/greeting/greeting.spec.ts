import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Greeting } from './greeting';

describe('Greeting', () => {
  let component: Greeting;
  let fixture: ComponentFixture<Greeting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Greeting],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Greeting);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
