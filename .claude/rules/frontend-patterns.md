# Frontend UI & Data Fetching Patterns

This project uses TanStack Query with Suspense for a smooth user experience. Follow these rules for all data-driven components.

## 1. Data Fetching

- **ALWAYS** use `useSuspenseQuery` or `useSuspenseInfiniteQuery` instead of `useQuery`.
- This ensures that components only render when data is ready, avoiding "undefined" checks in your JSX.

## 2. Granular Loading States (Suspense over Route Skeletons)

- **DO NOT** use `pendingComponent` in `createFileRoute` for the whole page unless the entire page content is data-dependent.
- **ALWAYS** wrap individual data-fetching components with `<Suspense fallback={<ComponentSkeleton />}>`.
- **Reason**: This allows the "shell" of the page (static titles, headers, sidebars) to render immediately, while only the dynamic parts show a skeleton. This prevents the user from seeing a completely blank page.

```typescript
// ✅ CORRECT - Partial Loading with Suspense
function MyPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Page Title</h1>
        <p className="text-sm">This static text shows up immediately.</p>
      </header>

      <Suspense fallback={<ListSkeleton />}>
        <DataDependentList />
      </Suspense>
    </div>
  );
}

function DataDependentList() {
  // Component only renders when data is ready
  const { data } = useSuspenseQuery(myOptions());
  return <ul>{data.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}
```

## 3. Mutations

- Use `useMutation` for any data-modifying actions (POST/PATCH/DELETE).
- Always provide feedback via `toast` and invalidate relevant queries on `onSuccess`.

## 4. UI Components

- Use components from `@workspace/ui` (shadcn).
- Prefer composition and sub-components over massive single-file components.
- Use the `HugeiconsIcon` component for all iconography.
