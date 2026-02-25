# ESR Module File Placement Guide

## Current Location (Wrong)
Your files are currently in: `/Users/kritikapandey/RDHM UI/`

## Correct Location
All ESR files should be in: `C:\Users\45453684\Desktop\Rdhm_ui\rdh-master-ui\src\app\feature\ESR\`

## Files to Move/Create

### 1. Copy these files to the ESR folder:

**From:** `/Users/kritikapandey/RDHM UI/`
**To:** `C:\Users\45453684\Desktop\Rdhm_ui\rdh-master-ui\src\app\feature\ESR\`

- `CORRECTED-esr.module.ts` → rename to `esr.module.ts`
- `esr-routing.module.ts` (keep as is)
- `esr-view.component.ts` (keep as is)
- `CORRECTED-esr-view.html` → rename to `esr-view.html`
- `esr-view.component.css` (keep as is)
- `category-data.component.ts` (keep as is)
- `category-data.component.html` (keep as is)
- `category-data.component.css` (keep as is)

### 2. Update app-routing.module.ts

**File:** `C:\Users\45453684\Desktop\Rdhm_ui\rdh-master-ui\src\app\app-routing.module.ts`

**Line 19:** Add comma at the end
```typescript
{ path:'workflow', loadChildren:()=>import('./feature/workflow-view/workflow-view.module').then(m=>m.WorkflowViewModule)},
```

**Line 20:** Change `WorkflowViewModule` to `EsrModule`
```typescript
{ path:'esr', loadChildren:()=>import('./feature/ESR/esr.module').then(m=>m.EsrModule)}
```

### 3. Update Nav-bar component

**File:** Your navigation component (likely in `src/app/core/component/` or similar)

Update the ESR link to use lowercase 'esr':
```html
<li class="nav-item">
    <a class="nav-link" [routerLink]="['/esr']" [routerLinkActive]="['active']">ESR</a>
</li>
```

## Key Changes Made

### 1. Removed NgbModule Dependencies
The original code used `ngbNav` which requires `@ng-bootstrap/ng-bootstrap`. Since this might not be installed, I've replaced it with standard Bootstrap nav tabs.

**Old (with NgbModule):**
```html
<ul ngbNav #nav="ngbNav" [(activeId)]="active" class="nav-tabs">
    <li [ngbNavItem]="1">
        <a ngbNavLink [routerLink]="...">
```

**New (standard Bootstrap):**
```html
<ul class="nav nav-tabs">
    <li class="nav-item">
        <a class="nav-link" [routerLink]="..." routerLinkActive="active">
```

### 2. Removed app-spinner and app-notification
These components need to be imported from your core module. For now, they're removed to avoid errors.

### 3. Added RouterModule to esr.module.ts
```typescript
import { RouterModule } from '@angular/router';
```

## Folder Structure Should Look Like:

```
rdh-master-ui/
└── src/
    └── app/
        ├── app-routing.module.ts (UPDATE THIS)
        ├── core/
        └── feature/
            └── ESR/                          (CREATE THIS FOLDER)
                ├── esr.module.ts
                ├── esr-routing.module.ts
                ├── esr-view.component.ts
                ├── esr-view.html
                ├── esr-view.component.css
                ├── category-data.component.ts
                ├── category-data.component.html
                └── category-data.component.css
```

## Steps to Fix:

1. Create folder: `src/app/feature/ESR`
2. Copy all 8 files listed above to that folder
3. Update `app-routing.module.ts` (2 changes on lines 19-20)
4. Save all files
5. Run `ng serve` or restart your dev server

## If You Want to Use Shared Components (Optional)

If you want to use `app-spinner` and `app-notification`, you need to:

1. Find where these components are declared (likely in a SharedModule or CoreModule)
2. Import that module in `esr.module.ts`:

```typescript
import { SharedModule } from '../../shared/shared.module'; // adjust path

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,  // Add this
    EsrRoutingModule
  ]
})
```
