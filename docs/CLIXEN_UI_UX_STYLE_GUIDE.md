# Clixen UI/UX Style Guide

This document defines the core design tokens for color, typography, spacing, and iconography to ensure consistency across the Clixen MVP.

## 1. Color Palette
| Name            | Token              | Hex      |
|-----------------|--------------------|----------|
| Primary Accent  | --color-primary    | #1A73E8  |
| Text Primary    | --color-text       | #333333  |
| Text Secondary  | --color-secondary  | #555555  |
| Background      | --color-bg         | #F5F5F5  |
| Border / Divider| --color-border     | #E0E0E0  |

## 2. Typography
| Element         | Size  | Weight | Line Height |
|-----------------|-------|--------|-------------|
| Heading 1 (H1)  | 24px  | 600    | 32px        |
| Heading 2 (H2)  | 20px  | 500    | 28px        |
| Body (Regular)  | 16px  | 400    | 24px        |
| Caption / Small | 14px  | 400    | 20px        |

## 3. Spacing Scale
| Token           | Size  |
|-----------------|-------|
| xs              | 4px   |
| sm              | 8px   |
| md              | 16px  |
| lg              | 24px  |
| xl              | 32px  |

## 4. Iconography
- **Status Icons**: 16×16px (✔️, ❌, ⏳)
- **UI Icons**: 24×24px (back arrow, new chat, deploy)

## 5. Logo Usage
| Variant         | Size     | Usage                             |
|-----------------|----------|-----------------------------------|
| Full Logo       | 100×100px| Authentication and splash screens |
| Compact Logo    | 40×40px  | Header and nav bars               |

---
## 6. Accessibility & Internationalization
- **WCAG 2.1 AA compliance**: Ensure color contrast, keyboard navigation, and ARIA roles are implemented for all interactive components.
- **Screen readers**: Include semantic markup and live-region announcements for dynamic chat updates.
- **i18n readiness**: Externalize all text strings and use a translation library (e.g., react-i18next) with locale fallbacks.

---
_Keep these tokens and guidelines in a shared design tokens file (e.g., tokens.json or Figma Styles) for engineering handoff._
