---
name: vue-form
description: Build or change a form in a Vue or Nuxt codebase - fields, labels, client and server validation, submission, pending and error states, double-submit protection, tests - using the form library the project already has. Use when asked to add or change a form, an input field, validation, or what happens on submit.
---

# Vue Form

The procedure for adding or changing one form. Forms are where most UI bugs reach users: lost input, double submissions, errors shown on the wrong field, numbers that arrive as strings. Work through every step.

## Step 0: Read the context

1. Read `AGENTS.md` and the `.claude/rules/vue-*.md` files, especially each file's **Project-specific** section. Where they and the existing code disagree with this skill, they win.
2. Find 1–2 existing forms and identify the project's approach. Follow it; do not introduce another:

   | Approach | Signals |
   |---|---|
   | VeeValidate | `vee-validate` in `package.json`, `useForm`/`useField` or `<Form>`/`<Field>`, often `toTypedSchema` with Zod/Yup |
   | FormKit | `@formkit/vue`, `<FormKit>` |
   | Vuelidate | `@vuelidate/core`, `useVuelidate` |
   | Inertia `useForm` | `@inertiajs/vue3`, `useForm({...})` with `form.post(...)`, `form.errors`, `form.processing`; validation runs on the server |
   | UI-library forms | the library's form component with `rules` (Element Plus, Naive UI, Vuetify, Nuxt UI `UForm`) |
   | Plain `v-model` | refs per field, a `validate()` function, `@submit.prevent` |

3. Note from those forms: where the validation schema lives, how fields are rendered (design-system inputs, a field wrapper), how errors are shown, how submission calls the API, and what happens on success (toast, redirect, refresh).
4. Read the API contract for the submission (types, OpenAPI, the server's validation rules): required fields, types, lengths, formats, and the shape of its validation-error response.
5. If the request does not say what happens on success, which fields are required, or whether the form edits existing data, ask.

**Done when:** you know the form approach, the field list with each field's type and constraints, and the success behaviour.

## Step 1: Schema & initial values

- Define validation in the project's schema library or form library, mirroring the server's constraints. Client validation is for feedback; the server still validates.
- Type the form values from the schema when the project does this.
- Convert input types explicitly. On Vue 3, `v-model` on a native `<input type="number">` already casts like `v-model.number`; on Vue 2, or through a wrapper component, you get whatever the input emits, usually a string. Either way an empty field stays `''`, and Zod's `z.coerce.number()` turns `''` into `0`. Decide what empty means and convert before submitting. `v-model.trim` for free-text fields where surrounding spaces are never meaningful.
- Every field starts with a value (`''`, `false`, `[]`). For an edit form whose data loads asynchronously, render the form after the data arrives, or reset the form with the loaded values (`resetForm({ values })` in VeeValidate); do not mutate the source object the data came from — copy it.

**Done when:** the schema type-checks and every field has an initial value.

## Step 2: Fields

- A real `<form @submit.prevent="onSubmit">` with a submit button, so Enter submits and autofill works.
- Each field has a visible `<label>` tied to it, the right `type` (`email`, `tel`, `password`, `number`, `date`), `autocomplete` (`email`, `current-password`, `new-password`, `name`, `postal-code`…), and `inputmode` where the keyboard matters.
- An error message under each field, linked with `aria-describedby`, and `aria-invalid` on the field.
- Use the design system's inputs; an input wrapper forwards `id` and `aria-*` to the real `<input>` and supports `v-model`.
- File inputs cannot use `v-model`; read the `File` from the `change` event.
- Every non-submit button inside the form has `type="button"`.

**Done when:** the form renders with every field labelled, and the typecheck passes.

## Step 3: Submission

- Block a second submission while the first is pending: disable the submit button from the library's state (`isSubmitting` in VeeValidate, `form.processing` in Inertia) or a local `pending` ref set in a `try`/`finally`, and show progress on it.
- Map the server's validation errors onto their fields (`setErrors` in VeeValidate, or the project's helper; Inertia's `useForm` fills `form.errors` on its own); show any other error as a form-level message the user can act on. The user's input must survive an error.
- On success: do what the request specified (redirect, close, reset), and refresh or invalidate what shows this data, the way neighbouring forms do.
- In Nuxt, submit with `$fetch` in the handler (not `useFetch`), and the server route validates and authorizes on its own.
- In Inertia, submit with `form.post`/`form.put` from `useForm`; the server validates, and an invalid submission redirects back with the errors instead of returning a 422.
- After a failed client validation, move focus to the first invalid field.

**Done when:** a manual or tested submission reaches the API with the expected payload, and errors land on their fields.

## Step 4: Tests

Write tests with the project's runner and mount helper, filling fields through their labels or the project's selectors, and awaiting each interaction. At minimum:

| Case | Verify |
|---|---|
| Valid submission | The request receives exactly the expected values (types converted), and the success behaviour happens |
| Client validation | Submitting with a required field empty or invalid shows the message on that field and sends nothing |
| Server validation error | A mocked 422 (Inertia: the page rendered with an `errors` prop) shows the message on the right field; input is kept |
| Server/network failure | A form-level error is shown; input is kept |
| Double submit | Clicking submit twice while pending sends one request |
| Edit form | Fields are pre-filled from the loaded data |

VeeValidate validates asynchronously: `await flushPromises()` after input or submit before asserting errors.

Run the new tests, then the full suite, in single-run mode.

## Step 5: Wrap up

1. Run the project's lint, typecheck and format scripts on the changed files.
2. If a browser tool is available, fill the form in the dev server with the keyboard only (Tab, typing, Enter), submit valid and invalid data, and check the console.
3. Report:
   - Files created/changed
   - Fields with their validation, and where client and server rules differ (if anything could not be mirrored)
   - Success and error behaviour, and the refreshes added
   - Tests added and the output of the test run
