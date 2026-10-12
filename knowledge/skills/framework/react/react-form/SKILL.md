---
name: react-form
description: Build or change a form in a React codebase - fields, labels, client and server validation, submission, pending and error states, double-submit protection, tests - using the form library the project already has. Use when asked to add or change a form, an input field, validation, or what happens on submit.
---

# React Form

The procedure for adding or changing one form. Forms are where most React bugs reach users: lost input, double submissions, errors shown on the wrong field, numbers that arrive as strings. Work through every step.

## Step 0: Read the context

1. Read `AGENTS.md` and the `.claude/rules/react-*.md` files, especially each file's **Project-specific** section. Where they and the existing code disagree with this skill, they win.
2. Find 1–2 existing forms and identify the project's approach. Follow it; do not introduce another:

   | Approach | Signals |
   |---|---|
   | React Hook Form | `react-hook-form` in `package.json`, `useForm`, `register`/`Controller`, often a resolver (`@hookform/resolvers` + Zod/Yup) |
   | Formik | `formik`, `<Formik>`/`useFormik` |
   | TanStack Form | `@tanstack/react-form`, `useForm` with `form.Field` |
   | Framework actions | Next.js Server Actions (`'use server'`), React Router/Remix `action` + `<Form>` |
   | React 19 form actions | `<form action={fn}>`, `useActionState`, `useFormStatus` |
   | Plain controlled state | `useState` per field, `onSubmit` with `preventDefault` |

3. Note from those forms: where the validation schema lives, how fields are rendered (design-system inputs, a `FormField` wrapper), how errors are shown, how submission calls the API, and what happens on success (toast, redirect, cache invalidation).
4. Read the API contract for the submission (types, OpenAPI, the server's validation rules): required fields, types, lengths, formats, and the shape of its validation-error response.
5. If the request does not say what happens on success, which fields are required, or whether the form edits existing data, ask.

**Done when:** you know the form approach, the field list with each field's type and constraints, and the success behaviour.

## Step 1: Schema & default values

- Define validation in the project's schema library, or the form library's rules, mirroring the server's constraints. Client validation is for feedback; the server still validates.
- Type the form values from the schema (`z.infer<typeof schema>`) when the project does this.
- Convert input types explicitly: an `<input type="number">` value is a string (`valueAsNumber` in React Hook Form, `z.coerce.number()` in Zod — which turns an empty field into `0`, so pair it with a required check or preprocess `''` to `undefined`); an empty optional field is `''`, not `undefined`. Decide whether empty means "unset" and convert before submitting.
- Every field has a default value (`''`, `false`, `[]`), so inputs are controlled from the first render. For an edit form whose data loads asynchronously, render the form after the data arrives, or `reset(data)` once it does; `defaultValues` are read only on the first render.

**Done when:** the schema type-checks and every field has a default.

## Step 2: Fields

- A real `<form>` with a submit button, so Enter submits and the browser's autofill works.
- Each field has a visible `<label>` tied to it, the right `type` (`email`, `tel`, `password`, `number`, `date`), `autoComplete` (`email`, `current-password`, `new-password`, `name`, `postal-code`…), and `inputMode` where the keyboard matters.
- An error message under each field, linked with `aria-describedby` and `aria-invalid` on the field.
- Use the design system's inputs; for third-party inputs (date pickers, selects, rich text) use the form library's controller (`Controller`/`useController` in React Hook Form) rather than wiring state by hand.
- File inputs are uncontrolled; read the `File` from the event or the form data.
- Every non-submit button inside the form has `type="button"`.

**Done when:** the form renders with every field labelled, and the typecheck passes.

## Step 3: Submission

- Block a second submission while the first is pending: disable the submit button from the library's state (`formState.isSubmitting`, the third value of `useActionState`, or `pending` from `useFormStatus` in a child of the form), and show progress on it.
- Map the server's validation errors onto their fields (`setError` in React Hook Form, returned state from an action); show any other error as a form-level message the user can act on. The user's input must survive an error.
- On success: do what the request specified (redirect, close, reset), and invalidate or update the cached queries that show this data, the way neighbouring mutations do.
- With framework or React 19 actions, the action itself validates and authorizes on the server; do not trust that only your form calls it.
- After a failed client validation, focus moves to the first invalid field (React Hook Form does this by default; check the others).

**Done when:** a manual or tested submission reaches the API with the expected payload, and errors land on their fields.

## Step 4: Tests

Write tests with the project's runner and render helper, filling fields through their labels with `user-event` if the project has it. At minimum:

| Case | Verify |
|---|---|
| Valid submission | The request/action receives exactly the expected values (types converted), and the success behaviour happens |
| Client validation | Submitting with a required field empty or invalid shows the message on that field and sends nothing |
| Server validation error | A mocked 422 (or the action's error state) shows the message on the right field; input is kept |
| Server/network failure | A form-level error is shown; input is kept |
| Double submit | Clicking submit twice while pending sends one request |
| Edit form | Fields are pre-filled from the loaded data |

Run the new tests, then the full suite, in single-run mode.

## Step 5: Wrap up

1. Run the project's lint, typecheck and format scripts on the changed files.
2. If a browser tool is available, fill the form in the dev server with the keyboard only (Tab, typing, Enter), submit valid and invalid data, and check the console.
3. Report:
   - Files created/changed
   - Fields with their validation, and where client and server rules differ (if anything could not be mirrored)
   - Success and error behaviour, and the cache updates added
   - Tests added and the output of the test run
