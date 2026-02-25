import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EsrViewComponent } from './esr-view.component';
import { CategoryDataComponent } from './category-data.component';

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
        component: CategoryDataComponent
      },
      {
        path: 'grouping-data',
        component: CategoryDataComponent
      },
      {
        path: 'grouping-structure',
        component: CategoryDataComponent
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
