import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResearchSearchComponent } from './research-search.component';

describe('ResearchSearchComponent', () => {
  let component: ResearchSearchComponent;
  let fixture: ComponentFixture<ResearchSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResearchSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResearchSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
