import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { EsrRoutingModule } from './esr-routing.module';
import { EsrViewComponent } from './esr-view.component';
import { CategoryDataComponent } from './category-data.component';

@NgModule({
  declarations: [
    EsrViewComponent,
    CategoryDataComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModule,
    EsrRoutingModule
  ]
})
export class EsrModule { }
