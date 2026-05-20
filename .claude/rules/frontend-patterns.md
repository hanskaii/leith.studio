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

## 4. Component Co-location & Skeletons

Every data-fetching component extracted from a route **must** have two files:

| File                              | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `-components/<name>.tsx`          | The real component (uses `useSuspenseQuery`)   |
| `-components/<name>-skeleton.tsx` | The loading placeholder (pure markup, no data) |

The route file wraps the real component in `<Suspense fallback={<NameSkeleton />}>`.

```
routes/(app)/_app/posts/
├── -components/
│   ├── post-list.tsx          ← real component, uses useSuspenseQuery
│   └── post-list-skeleton.tsx ← skeleton placeholder
└── index.tsx                  ← page shell + <Suspense fallback={<PostListSkeleton />}>
```

```typescript
// -components/post-list-skeleton.tsx
import { Skeleton } from "@workspace/ui";

export function PostListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

// -components/post-list.tsx
export function PostList() {
  const { data } = useSuspenseQuery(postsQueryOptions());
  return <ul>{data.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}

// index.tsx
function PostsPage() {
  return (
    <div>
      <h1>Posts</h1>
      <Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </Suspense>
    </div>
  );
}
```

Rules:

- **Never** inline a skeleton as an anonymous function inside `fallback={}` — always name it and keep it in `-components/`.
- **Never** put the skeleton in the same file as the real component — they are separate files so the page shell imports only what it needs without pulling in query dependencies.
- Skeleton files must use the `Skeleton` component from `@workspace/ui`. No raw `animate-pulse` divs — import `{ Skeleton } from "@workspace/ui"` instead.
- Skeleton files must contain **only** static markup. No hooks, no queries, no props beyond optional `className`.

## 5. UI Components

- Use components from `@workspace/ui` (shadcn).
- Prefer composition and sub-components over massive single-file components.
- Use the `HugeiconsIcon` component for all iconography.
