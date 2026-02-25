# ESR Routing Error Fix

## Error Message
```
Cannot match any routes. URL Segment: 'ESR'
```

## Root Cause
The error shows Angular is trying to navigate to '/ESR' (uppercase) but your route is defined as '/esr' (lowercase).

## Solution

### Check Your app-routing.module.ts

Make sure line 20 in `C:\Users\45453684\Desktop\Rdhm_ui\rdh-master-ui\src\app\app-routing.module.ts` has:

```typescript
{ path:'esr', loadChildren:()=>import('./feature/ESR/esr.module').then(m=>m.EsrModule)}
```

**NOT:**
```typescript
{ path:'ESR', loadChildren:()=>import('./feature/ESR/esr.module').then(m=>m.EsrModule)}
```

### Verify Your Navigation Component

In your actual navigation component file (the one in your Angular project, not the sample Nav-bar.html), ensure the ESR link uses lowercase:

```html
<li class="nav-item">
    <a class="nav-link" [routerLink]="['/esr']" [routerLinkActive]="['active']">ESR</a>
</li>
```

**NOT:**
```html
<li class="nav-item">
    <a class="nav-link" [routerLink]="['/ESR']" [routerLinkActive]="['active']">ESR</a>
</li>
```

## Where to Check

Based on your folder structure, your navigation component is likely in one of these locations:

1. `src/app/core/component/nav-bar/` or similar
2. `src/app/shared/components/navigation/` or similar
3. `src/app/app.component.html` (if navigation is in main component)

## Steps to Fix

1. **Find your navigation component** - Search for "Workflow Details" in your project files to locate the actual navigation HTML
2. **Update the ESR link** to use lowercase `/esr`
3. **Verify app-routing.module.ts** has lowercase `path:'esr'`
4. **Save all files** and the dev server should auto-reload
5. **Click ESR** in the navigation bar

## Quick Search Command

Run this in your project directory to find the navigation file:
```bash
cd C:\Users\45453684\Desktop\Rdhm_ui\rdh-master-ui
grep -r "Workflow Details" src/app --include="*.html"
```

This will show you which file contains your navigation menu.

## Expected Result

After fixing, clicking ESR should navigate to:
- URL: `http://localhost:4200/#/esr`
- Default child route: `http://localhost:4200/#/esr/category-data`
