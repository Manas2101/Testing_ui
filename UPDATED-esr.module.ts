import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { EsrRoutingModule } from './esr-routing.module';
import { EsrViewComponent } from './esr-view.component';
import { CategoryDataComponent } from './category-data.component';
import { CategoryStructureComponent } from './category-structure.component';
import { GroupingDataComponent } from './grouping-data.component';
import { GroupingStructureComponent } from './grouping-structure.component';

@NgModule({
  declarations: [
    EsrViewComponent,
    CategoryDataComponent,
    CategoryStructureComponent,
    GroupingDataComponent,
    GroupingStructureComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    EsrRoutingModule
  ]
})
export class EsrModule { }
