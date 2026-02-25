# ESR Integration into RDHM UI

## Overview
This integration adds the ESR (Enterprise Static Reference) UI functionality into the RDHM UI application. The ESR module provides Category Data Processing and related maintenance screens.

## Files Created

### Components
1. **esr-view.component.ts** - Main ESR view component with tab navigation
2. **esr-view.html** - Main ESR view template
3. **esr-view.component.css** - Styling for ESR main view

4. **category-data.component.ts** - Category Data Processing component
5. **category-data.component.html** - Category Data form template
6. **category-data.component.css** - Styling for Category Data screen

### Modules & Routing
7. **esr.module.ts** - ESR feature module
8. **esr-routing.module.ts** - ESR routing configuration

### Updated Files
9. **Nav-bar.html** - Added ESR navigation link

## Features Implemented

### Category Data Processing Screen
- **Left Sidebar Menu** with sections:
  - Category Maintenance (Category Data, Category Structure)
  - Grouping Maintenance (Grouping Data, Grouping Structure)
  - Default Site Code display

- **Main Form** with fields:
  - Category Code
  - Category Business Name
  - Category Site (dropdown)
  - As at Date (with date picker)
  - Category Code Display (readonly)
  - Category Key (readonly)

- **Action Buttons**:
  - Continue (red gradient button)
  - Find (gray gradient button)

### Design Features
- Pink and green diagonal striped background matching ESR UI
- Red gradient header matching HSBC branding
- Sidebar with red borders and headers
- Form validation using Angular Reactive Forms
- Responsive layout using Bootstrap grid

## Integration Steps

### 1. Add ESR Module to App Routing
In your main `app-routing.module.ts`, add:

```typescript
{
  path: 'esr',
  loadChildren: () => import('./esr/esr.module').then(m => m.EsrModule)
}
```

### 2. Ensure Dependencies
Make sure these packages are installed:
- `@angular/forms` (ReactiveFormsModule)
- `@ng-bootstrap/ng-bootstrap` (NgbModule)
- `bootstrap` (CSS framework)

### 3. File Organization
Recommended folder structure:
```
src/app/
  ├── esr/
  │   ├── esr.module.ts
  │   ├── esr-routing.module.ts
  │   ├── esr-view.component.ts
  │   ├── esr-view.html
  │   ├── esr-view.component.css
  │   ├── category-data.component.ts
  │   ├── category-data.component.html
  │   └── category-data.component.css
```

## Navigation
- Access ESR from the main navigation bar
- ESR menu item is located after "Workflow Details"
- Default route opens Category Data screen
- Tab navigation available for:
  - Category Data
  - Category Structure
  - Grouping Data
  - Grouping Structure
  - Default Site Code

## Future Enhancements
- Implement actual API integration for data fetching
- Add date picker functionality
- Implement Category Structure screen
- Implement Grouping Data screen
- Implement Grouping Structure screen
- Implement Default Site Code management
- Add form validation error messages
- Add loading states and error handling

## Notes
- The TypeScript files show Angular module import errors because the Angular dependencies need to be installed in the project
- The current implementation is a UI-only version; backend API integration will be needed
- The design closely matches the original ESR UI with HSBC branding
