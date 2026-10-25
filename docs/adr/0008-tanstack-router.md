# ADR-0008: Code-based TanStack Router with route loaders (supersedes react-router-dom)

Date: 2026-10-25

## Decision
The web app uses `@tanstack/react-router` with code-based route definitions
co-located in each page file (`export const xRoute = createRoute({...})`) and a
single `src/router.tsx` that composes the tree.

- Role guards live in `beforeLoad` via `requireRole()`.
- Loaders prefetch the page's react-query data with
  `queryClient.ensureQueryData(...)`; components keep `useQuery` with the same
  key, so navigation renders instantly from cache and still refetches by
  staleness policy.

## Rationale
- Type-safe params/search (`/join/$joinCode`, `validateSearch` for `?join=`)
  and typed links replaced hand-built template strings.
- Guards in `beforeLoad` avoid rendering a page only to redirect; the loader
  warms the cache before the component mounts (no loading flash).
- Code-based routes keep pages in their existing files instead of a parallel
  `routes/` tree, which matched the project size.

## Consequences
- Route modules import `rootRoute` from `routes/__root.tsx`; `router.tsx`
  imports the pages. No cycles because the root module does not import pages.
- `defaultPreload: 'intent'` prefetches on hover, so loaders should stay cheap
  (they are single API calls).
- Any new page must export a route and be added to `routeTree`; the fallback
  splat route redirects unknown URLs to `/`.
