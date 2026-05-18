# TanStack Form & Query Patterns

Follow this proven pattern for all forms in the application to ensure consistency, type safety, and a premium UX.

## 1. The Core Pattern

Separation of concerns is mandatory:

1. **Mutation**: Define `useMutation` first to handle API calls.
2. **Form**: Define `useForm` to handle validation and submission logic.
3. **UI**: Use standardized components from `@workspace/ui`.

## 2. Implementation Steps

### Step A: Define the Mutation

Always define the mutation before the form. This handles loading states and success/error feedback.

```typescript
const mutation = useMutation({
	mutationFn: (data: MySchemaType) => api.post(data),
	onSuccess: () => {
		toast.success("Success!");
		queryClient.invalidateQueries({ queryKey: ["my-key"] });
	},
	onError: (err) => toast.error(err.message)
});
```

### Step B: Define the Form

Use Zod for validation and `mutateAsync` inside `onSubmit`.

```typescript
const form = useForm({
	defaultValues: { name: "" },
	validators: {
		onChange: MyZodSchema // Use Zod schema for validation
	},
	onSubmit: async ({ value }) => {
		await mutation.mutateAsync(value);
	}
});
```

### Step C: Standardized Field UI

Always wrap inputs using the `@workspace/ui` components in this specific hierarchy:
`Field` > `FieldLabel` > `FieldContent` > `Input` + `FieldError`.

```tsx
<form.Field name="name">
	{(field) => {
		const isInvalid =
			field.state.meta.isTouched && !field.state.meta.isValid;
		return (
			<Field data-invalid={isInvalid}>
				<FieldLabel htmlFor={field.name}>
					<FieldTitle>Username</FieldTitle>
				</FieldLabel>
				<FieldContent>
					<Input
						id={field.name}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={(e) => field.handleChange(e.target.value)}
						disabled={mutation.isPending}
					/>
					{isInvalid && (
						<FieldError errors={field.state.meta.errors} />
					)}
				</FieldContent>
			</Field>
		);
	}}
</form.Field>
```

## 3. Best Practices

1. **Validation Timing**: Use `onChange` for real-time feedback or `onBlur` for less intrusive validation.
2. **Loading State**: Disable all inputs and the submit button while `mutation.isPending` is true.
3. **Submit Button**: Use the `<Spinner />` component inside the submit button when pending.
4. **Zod Schemas**: Reuse Zod schemas between the backend (`zValidator`) and frontend (`validators`) for 100% consistency.
