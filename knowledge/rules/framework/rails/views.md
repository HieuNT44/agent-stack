---
paths:
  - "app/views/**/*"
  - "app/helpers/**/*.rb"
---

# Rails Views and Helpers

Views and helpers read loaded data only: no query, no write, no side effect.

## Views

- A view receives records ready to display from the controller; with Draper it never
  calls `.decorate` itself.
- Display strings go through `t`, never hardcoded.
- A reusable piece of UI with its own logic is a component where the project uses
  ViewComponent; otherwise a partial whose logic lives in a helper or decorator.
- No association read that the service object did not preload.

## Helpers

- Global helpers only: `application_helper.rb` and `<topic>_helper.rb`
  (`DateTimeHelper`, `MarkupHelper`). No helper per controller or screen; set
  `config.generators.helper = false`.
- A helper works on bare values (date and number format, truncation) or shared markup
  (icon, flash, breadcrumb).
- A helper never takes a model to read its attributes (→ decorator), never holds logic
  for one screen (→ decorator or component), and never reads instance variables.
- Every helper is loaded into every view, so two methods with the same name in two
  modules silently override each other. One module per topic (`DateTimeHelper`,
  `MoneyHelper`, `MarkupHelper`), and grep `app/helpers` for the name before adding a
  method. Formats of different topics go in different modules, even when one request
  asks for both (`DateTimeHelper#time_ago_text`, `NumberHelper#word_count_text`); never a
  catch-all `FormatHelper`.
- A helper returns a String (`*_text`) or safe HTML built with `content_tag`/`tag`
  (named by the UI element: `*_badge`, `*_icon`, `*_link`), never a record or a Hash.
- A string with a fixed pattern or symbol (`"5 min read"`, `"¥%{amount}"`, `"%{done}/%{total}"`)
  is an i18n key; the helper passes the values: `t("helpers.reading_time", count: minutes)`.
  The pattern is never built in Ruby.
- One spec file per helper module, one `describe` per method, `eq` on the output.

### Naming by return type

A helper's name says what it returns:

| Suffix | Returns | Example |
| --- | --- | --- |
| `xxx?` | Boolean | `weekend?(date)` |
| `xxx_at` | DateTime | `deadline_at(date)` |
| `xxx_on` | Date | `expires_on(start_on, days)` |
| `xxx_time_text` | a time of day as a String | `start_time_text(time)` → `"10:30"` |
| `xxx_duration` | `ActiveSupport::Duration` | `contract_duration(months)` |
| `xxx_text` | display String | `money_text(amount)`, `date_text(value)` |
| `xxx_count` | Integer | `remaining_count(total, used)` |
| `xxx_amount` | money, as Integer (smallest unit) or BigDecimal, never Float | `tax_amount(price)` |
| `xxx_range` | Range | `age_range(min, max)` |
| `xxx_ids` | Array of ids | `selected_ids(params_ids)` |
| `xxx_list` | Array of values that are not records | `month_list(year)` |
| `xxx_hash` | Hash | `address_hash(parts)` |
| `to_<type>` | the argument converted whole to another type | `to_boolean("1")` → `true` |

A record or a collection of records is never a helper's return value; where another
layer returns one, it is named by its model noun (`latest_article`, `articles`).

