# Style Design Guidelines

This document outlines best practices and modern approaches for professional styling in the Amadeus Anomaly Detection application.

## Design Principles

### 1. Mobile-First Responsive Design
- Design for mobile devices first, then progressively enhance for larger screens
- Use flexible layouts with relative units (`%`, `em`, `rem`, `vw`, `vh`)
- Implement CSS media queries for different breakpoints
- Test on multiple device sizes

### 2. Accessibility (WCAG AA Compliance)
- Maintain minimum color contrast ratio of 4.5:1 between text and backgrounds
- Provide visible focus indicators for keyboard users
- Respect `prefers-reduced-motion` preference
- Don't rely on color alone to convey information—use additional visual or textual cues
- Ensure designs work at 200% zoom levels
- Use semantic HTML elements (`<header>`, `<main>`, `<nav>`, etc.)

### 3. Performance Optimization
- Minimize CSS through minification and compression
- Use efficient CSS selectors
- Minimize reflows with `transform` and `opacity` for animations
- Enable hardware acceleration with `will-change`
- Implement critical CSS inlining

## Modern CSS Frameworks & Libraries

### Recommended: Tailwind CSS

**Why Tailwind CSS:**
- Utility-first approach enables rapid development
- Consistent design system through utility classes
- Small bundle size when purged
- Excellent documentation and community support
- Seamlessly integrates with Angular

**Setup:**
```bash
ng add tailwindcss
```

**Usage Pattern:**
```html
<div class="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Click Me
  </button>
</div>
```

### Alternative: Angular Material

**Why Angular Material:**
- Pre-built Material Design components
- Comprehensive component library
- Consistent theming support
- Can combine with Tailwind for enhanced functionality

**Setup:**
```bash
ng add @angular/material
```

## CSS Architecture Best Practices

### 1. Organize Stylesheets

**Structure:**
```
styles/
├── base/
│   ├── reset.css
│   ├── typography.css
│   └── variables.css
├── components/
│   ├── buttons.css
│   ├── tables.css
│   └── cards.css
├── layout/
│   ├── header.css
│   ├── grid.css
│   └── container.css
└── utilities/
    ├── spacing.css
    └── colors.css
```

### 2. Use CSS Custom Properties (Variables)

**Benefits:**
- Maintain consistency across project
- Easy theming support
- Centralized design tokens

**Example:**
```css
:root {
  /* Colors */
  --color-primary: #2a5298;
  --color-secondary: #1e3c72;
  --color-success: #10b981;
  --color-error: #dc3546;
  --color-warning: #fbb923;
  
  --color-text-primary: #1e3c72;
  --color-text-secondary: #2c3e50;
  --color-background: #ffffff;
  --color-background-alt: #f8f9fa;
  
  /* Typography */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --line-height-base: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-base: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.25);
  
  /* Transitions */
  --transition-fast: 150ms;
  --transition-base: 200ms;
  --transition-slow: 300ms;
}
```

### 3. Naming Conventions (BEM Methodology)

**Block Element Modifier Pattern:**
```css
/* Block */
.card { }

/* Element */
.card-header { }
.card-body { }
.card-footer { }

/* Modifier */
.card-primary { }
.card-large { }
.card-compact { }
```

**Example Usage:**
```html
<div class="card card-primary">
  <div class="card-header">Title</div>
  <div class="card-body">Content</div>
</div>
```

## Dashboard UI Design Patterns

### Data Tables Best Practices

**Key Requirements:**
1. **Finding records** by specific criteria
2. **Comparing data** across rows
3. **Viewing, editing, or adding** single row data
4. **Taking bulk actions** on records

**Design Guidelines:**
- Use sticky headers for long tables
- Implement hover states for rows
- Provide clear visual hierarchy (headers vs data cells)
- Support sorting indicators
- Use zebra striping for readability
- Ensure adequate cell padding (minimum 0.75rem)
- Implement responsive horizontal scroll for mobile

**Example Structure:**
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.data-table thead {
  background: #f8f9fa;
  position: sticky;
  top: 0;
  font-weight: 600;
}

.data-table th {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid #2a5298;
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}
```

### Cards & Containers

**Best Practices:**
- Use consistent padding (1.5rem - 2rem)
- Implement subtle shadows for depth
- Use border radius for modern feel (8px - 12px)
- Provide adequate spacing between elements

**Example:**
```css
.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 2px solid #2a5298;
}
```

### Typography Hierarchy

**Recommended Scale:**
- `h1`: 3rem (48px) - Page titles
- `h2`: 1.5rem (24px) - Section titles
- `h3`: 1.25rem (20px) - Subsection titles
- `body`: 1rem (16px) - Base text
- `small`: 0.875rem (14px) - Secondary text

**Font Weights:**
- `700` - Headings
- `600` - Subheadings
- `500` - Emphasis
- `400` - Body text

**Line Heights:**
- `1.5` - Headings
- `1.6` - Body text
- `1.75` - Relaxed text

## Color System

### Primary Palette

**Current Colors:**
- Primary: `#2a5298` (Blue)
- Secondary: `#1e3c72` (Dark Blue)
- Success: `#10b981` (Green)
- Error: `#dc3546` (Red)
- Warning: `#fbb923` (Orange)

**Text Colors:**
- Primary: `#1e3c72`
- Secondary: `#2c3e50`
- Muted: `#666`

**Background Colors:**
- Primary: `#ffffff` (White)
- Secondary: `#f8f9fa` (Light Gray)
- Tertiary: `#e0e0e0` (Very Light Gray)

### Color Usage Guidelines

**Do:**
- Use semantic color names (`primary`, `success`, `error`)
- Maintain consistent contrast ratios
- Use background colors for sections

**Don't:**
- Use hard-coded hex values directly
- Rely on color alone for information
- Use low contrast for important text

## Spacing System

### Recommended Scale

**Base Unit: `rem` (relative to root font size)

**Scale:**
- `xs`: 0.25rem (4px)
- `sm`: 0.5rem (8px)
- `base`: 1rem (16px)
- `lg`: 1.5rem (24px)
- `xl`: 2rem (32px)
- `2xl`: 3rem (48px)

**Usage:**
- Use consistent spacing scale
- Apply spacing utilities for margins and padding
- Maintain visual rhythm

## Component-Specific Guidelines

### Buttons

**States:**
- Default: Primary color with white text
- Hover: Darker shade (10% darker)
- Active: Pressed state (slight transform)
- Disabled: Muted color with `cursor: not-allowed`

**Sizing:**
- Small: `padding: 0.5rem 1rem`
- Medium: `padding: 0.75rem 1.5rem` (default)
- Large: `padding: 1rem 2rem`

**Example:**
```css
.btn {
  padding: 0.75rem 1.5rem;
  background: #2a5298;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  background: #1e3c72;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

### Forms & Inputs

**Best Practices:**
- Provide clear labels
- Use consistent input heights (2.5rem minimum)
- Implement focus states (2px solid border)
- Show validation states clearly
- Group related fields

### Navigation

**Patterns:**
- Use sticky navigation for long pages
- Provide clear active states
- Implement mobile menu for small screens
- Use consistent spacing

## Responsive Breakpoints

### Recommended Breakpoints

```css
/* Mobile First (default) */
/* No media query needed */

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1280px) { }
```

**Usage Pattern:**
```css
.container {
  padding: 1rem; /* Mobile */
}

@media (min-width: 768px) {
  .container {
    padding: 2rem; /* Tablet+ */
  }
}
```

## Animation & Transitions

### Best Practices

**Duration:**
- Fast: `150ms` - Hover states
- Base: `200ms` - Default transitions
- Slow: `300ms` - Complex animations

**Easing:**
- Default: `ease-in-out`
- Enter: `ease-out`
- Exit: `ease-in`

**Properties:**
- Prefer `transform` and `opacity`
- Avoid animating `width`, `height`, `margin`, `padding`
- Use `will-change` for performance

**Example:**
```css
.card {
  transition: transform 0.2s ease-in-out, opacity 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  opacity: 0.95;
}
```

## Dark Mode Support

### Implementation

**CSS Variables Approach:**
```css
:root {
  --color-background: #ffffff;
  --color-text: #1e3c72;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1a1a1a;
    --color-text: #e0e0e0;
  }
}
```

**Class-Based Approach (Tailwind):**
```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

## Current App Assessment

### Strengths

✅ **Good Practices Already Implemented:**
- Responsive design with media queries
- Consistent spacing scale
- Clear typography hierarchy
- Proper table styling with hover states
- Error state styling
- Loading state indicators

### Areas for Improvement

**Recommendations:**

1. **Implement CSS Variables**
   - Current: Hard-coded colors throughout
   - Recommended: Extract to CSS custom properties

2. **Improve Color System**
   - Current: Limited semantic naming
   - Recommended: Expand semantic color system

3. **Enhance Shadows**
   - Current: Basic shadows
   - Recommended: More layered shadow system

4. **Add Focus States**
   - Current: Missing visible focus indicators
   - Recommended: Add 2px solid focus borders

5. **Improve Mobile Experience**
   - Current: Basic responsive
   - Recommended: Enhanced mobile menu, touch targets

6. **Consider Tailwind CSS**
   - Current: Custom CSS
   - Recommended: Evaluate Tailwind for faster development

## Implementation Priority

### High Priority

1. ✅ Extract colors to CSS variables
2. ✅ Add focus states for accessibility
3. ✅ Improve shadow system
4. ✅ Enhance mobile breakpoints

### Medium Priority

5. Consider Tailwind CSS integration
6. Add dark mode support
7. Improve animation system

### Low Priority

8. Refactor to BEM methodology
9. Add comprehensive spacing utilities

## Resources

- [Web.dev Patterns](https://web.dev/patterns)
- [Material Design Guidelines](https://m2.material.io/guidelines/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Angular Material](https://material.angular.io)
- [Dashboard Design Patterns](https://dashboarddesignpatterns.github.io/patterns.html)
- [WCAG Guidelines](https://www.w3.org/WAI/tips/designing/)

---

**Last Updated**: 2026-01-29
**Version**: 1.0
