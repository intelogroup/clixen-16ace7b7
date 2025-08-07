# Performance Budgets & Optimization

This document defines performance targets and optimization strategies for the Clixen MVP frontend.

## 1. Bundle Size Budget
- Aim for an initial JavaScript bundle ≤ 200 KB gzipped for first-time load.
- Monitor budgets using `rollup-plugin-filesize` or `webpack-bundle-analyzer`.

## 2. Code-Splitting & Lazy Loading
- Split non-critical modules (e.g., deployment status, history views) into separate chunks.
- Lazy-load chat history and dashboard components behind user actions.

## 3. Caching & HTTP Best Practices
- Leverage HTTP caching headers for static assets served via Netlify (immutable and long max-age).
- Use service workers or Prefetch for predictive loading (optional).

## 4. Monitoring & Metrics
- Integrate Lighthouse CI in the GitHub Actions pipeline to track performance regressions.
- Capture Core Web Vitals (LCP, FID, CLS) via web-vitals library and report to analytics.
