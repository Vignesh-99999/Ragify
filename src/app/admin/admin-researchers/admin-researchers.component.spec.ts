import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminResearchersComponent } from './admin-researchers.component';

describe('AdminResearchersComponent', () => {
  let component: AdminResearchersComponent;
  let fixture: ComponentFixture<AdminResearchersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminResearchersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminResearchersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
