import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EsrViewComponent } from './esr-view.component';
import { CategoryDataComponent } from './category-data.component';
import { CategoryStructureComponent } from './category-structure.component';
import { GroupingDataComponent } from './grouping-data.component';
import { GroupingStructureComponent } from './grouping-structure.component';

const routes: Routes = [
  {
    path: '',
    component: EsrViewComponent,
    children: [
      {
        path: '',
        redirectTo: 'category-data',
        pathMatch: 'full'
      },
      {
        path: 'category-data',
        component: CategoryDataComponent
      },
      {
        path: 'category-structure',
        component: CategoryStructureComponent
      },
      {
        path: 'grouping-data',
        component: GroupingDataComponent
      },
      {
        path: 'grouping-structure',
        component: GroupingStructureComponent
      },
      {
        path: 'default-site-code',
        component: CategoryDataComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EsrRoutingModule { }
