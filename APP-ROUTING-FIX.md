# App Routing Module Fix

In your `src/app/app-routing.module.ts`, make these changes:

## Line 19 - Add missing comma after workflow route:
```typescript
{ path:'workflow', loadChildren:()=>import('./feature/workflow-view/workflow-view.module').then(m=>m.WorkflowViewModule)},
```

## Line 20 - Fix ESR route (change module name from WorkflowViewModule to EsrModule):
```typescript
{ path:'esr', loadChildren:()=>import('./feature/ESR/esr.module').then(m=>m.EsrModule)}
```

## Complete corrected routes array:
```typescript
const routes: Routes = [
  { path: 'dashboard', loadChildren: () => import('./feature/dashboard/dashboard.module').then(m => m.DashboardModule) },
  { path: 'referencedata', loadChildren: () => import('./feature/reference-data/reference-data.module').then(m => m.ReferenceDataModule) },
  { path: 'administration', loadChildren: () => import('./feature/administration/administration.module').then(m => m.AdministrationModule) },
  { path: 'dataset', loadChildren: () => import('./feature/data-set/data-set.module').then(m => m.DataSetModule) },
  { path: 'create-mappings', loadChildren: () => import('./feature/mapping/mapping.module').then(m => m.MappingModule) },
  { path: 'edit-mappings', loadChildren: () => import('./feature/edit-mapping/edit-mapping.module').then(m => m.EditMappingModule) },
  { path: 'searchlist', loadChildren: () => import('./feature/search-list/search-list.module').then(m => m.SearchListModule) },
  { path: 'managed-system', loadChildren: () => import('./feature/managed-system/managed-system.module').then(m => m.ManagedSystemModule) },
  { path: '', redirectTo: 'dashboard/dashboardScreen', pathMatch: 'full' },
  { path: 'add-remove-att-trans', loadChildren: () => import('./feature/add-remove-att-trans/add-remove-att-trans.module').then(m => m.AddRemoveAttTransModule) },
  { path: 'edit-dataset', loadChildren: () => import('./feature/edit-dataset/edit-dataset.module').then(m => m.EditDatasetModule) },
  { path: 'task-notification', loadChildren: () => import('./core/component/task-notifications/task-notifications.module').then(m => m.TaskNotificationsModule)},
  { path: 'multi-dimensional-mapping', loadChildren: () => import('./feature/multi-dimensional-mapping/multi-dimensional-mapping.module').then(m => m.MultiDimensionalMappingModule) },
  { path:'workflow', loadChildren:()=>import('./feature/workflow-view/workflow-view.module').then(m=>m.WorkflowViewModule)},
  { path:'esr', loadChildren:()=>import('./feature/ESR/esr.module').then(m=>m.EsrModule)}
];
```
