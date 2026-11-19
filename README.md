# Copy Code Location

Copy code with its file path and exact line range, formatted as a Markdown code
block for sharing with LLMs, documentation, issues, and code reviews.

## Features

- Copy code with a workspace-relative or absolute file path.
- Fall back to the current line when no text is selected.
- Fall back to an absolute path when the file is outside the workspace or no
  workspace is open.
- Label unsaved, untitled files using their editor name.
- Copy multiple selections as separate path-labelled Markdown code blocks.
- Preserve accurate line ranges when a multiline selection ends at column zero
  of the following line.
- Add a language identifier for Markdown syntax highlighting.
- Use a code fence longer than every backtick sequence in the copied code.
- Copy complete JSON object selections unchanged when enabled in Settings.
- Toggle partial-selection plain-text fallback from the status bar or settings.
- Toggle optional `Ctrl+C` relative-path copy from the status bar or settings.
- Paste clipboard text as a Markdown code block.

## Copy Output

Given a selection in `packages/client/src/client/streamableHttp.ts`, relative
path copy produces:

````markdown
packages/client/src/client/streamableHttp.ts:221-224
```ts
const headers = await this._commonHeaders();
headers.set('Accept', 'text/event-stream');
```
````

Absolute path copy uses the full file-system path:

````markdown
D:\GitHub\project\packages\client\src\client\streamableHttp.ts:221-224
```ts
const headers = await this._commonHeaders();
headers.set('Accept', 'text/event-stream');
```
````

When no text is selected, both copy commands include the complete current line
and report it using the compact `path:line` form:

````markdown
packages/client/src/client/streamableHttp.ts:221
```ts
const headers = await this._commonHeaders();
```
````

The `copy-code-location.locationFormat` dropdown controls the location above
each code block. Its default, `line`, shows `path:line` or `path:start-end`.
Choose `lineAndColumn` to include one-based start and inclusive end columns,
such as `path/to/file.c:12:5-18:23`. Choose
`lineAndColumnForPartialLines` to show line numbers for every selection and
column numbers only when the selection includes a partial line. A selection
contains complete lines when it starts at column zero and ends at a line's end
or the next line's start; the current-line fallback also counts as a complete
line. Automatic word fallback also applies when the location format includes
columns.

When multiple selections or cursors are active, each effective range is copied
as its own path-labelled code block. Empty selections fall back to their
respective current lines, and duplicate ranges are included only once. The
blocks retain VS Code's selection order and are separated by one blank line.

## Keyboard Shortcuts

| Command | Windows/Linux | macOS |
| --- | --- | --- |
| Copy Code with Relative Path | `Ctrl+C` when Path Copy is enabled | `Cmd+C` when Path Copy is enabled |
| Plain copy | `Ctrl+Shift+C` when Path Copy is enabled | `Cmd+Shift+C` when Path Copy is enabled |
| Paste as Code Block | `Ctrl+Alt+Shift+V` | `Ctrl+Alt+Shift+V` |

Relative and absolute path copy remain available from the Command Palette and
editor context menu, without separate default shortcuts. To customize shortcuts,
open **Preferences: Open Keyboard Shortcuts** and search for the command title.

## Optional Ctrl+C Relative-Path Copy

The **Path Copy** item on the right side of the status bar controls whether the
extension overrides `Ctrl+C` in text editors:

- `Path Copy` disabled: `Ctrl+C` uses the standard VS Code copy action.
- `Path Copy` enabled: `Ctrl+C` runs **Copy Code with Relative Path**, and
  `Ctrl+Shift+C` uses the standard VS Code copy action. On macOS, these are
  `Cmd+C` and `Cmd+Shift+C`.

The enabled item is shown in a theme-aware green color. The setting is disabled
by default and persists across VS Code restarts.

The override applies only when a text editor has focus. It does not replace
`Ctrl+C` in the integrated terminal, search boxes, settings inputs, or other
non-editor controls.

When the override is enabled and no text is selected, `Ctrl+C` copies the
current line with its path and line number.

When `copy-code-location.autoWordFallback` is enabled, selecting only part of
one line—such as a function name—copies the selection as plain text. The
fallback is used only when the selected text, after trimming its surrounding
whitespace, is strictly shorter than the complete current line after the same
trimming. Selecting the whole trimmed line, or selecting more than one line,
retains the path, line number, and Markdown code fence.

Automatic word fallback and Relative Path Copy Mode have persistent controls on
the right side of the status bar. The controls show the effective setting and
update immediately when the setting is changed elsewhere. Clicking either
control saves its setting in the current workspace configuration.

When `copy-code-location.jsonObjectFallback` is enabled, a selection that is
exactly one valid JSON object after trimming surrounding whitespace is also
copied unchanged as plain text. Arrays, primitive JSON values, incomplete
objects, and content with text before or after the object retain normal path
formatting. This option is available only in Settings and has no status bar
control.

## Path Behavior

Relative-path copy asks VS Code which workspace folder contains the current
document:

- If the document belongs to an open workspace folder, the copied path is
  relative to that folder.
- If no workspace is open, the copied path falls back to the absolute path.
- If a workspace is open but the document is outside every workspace folder,
  the copied path also falls back to the absolute path.

Path separators in relative paths are normalized to `/`. Lowercase Windows
drive letters in absolute paths are normalized to uppercase.

For an untitled file that has not been saved, both copy commands use the
editor name with an `[unsaved]` marker instead of a file path. For example,
line 12 of `Untitled-1` is labelled `[unsaved] Untitled-1:12`. The code fence
uses the language selected for that untitled document.

## Commands

The following commands are available from the Command Palette:

- **Copy Code with Relative Path**
- **Copy Code with Absolute Path**
- **Paste as Code Block**
- **Toggle Ctrl+C Relative Path Copy**

The relative and absolute copy commands are also available from the editor
context menu.

## Settings

### `copy-code-location.autoWordFallback`

Copy a partial single-line selection as plain text, without its path, line
number, language marker, or Markdown code fence.

- Type: boolean
- Default: `true`

### `copy-code-location.jsonObjectFallback`

Copy a complete valid JSON object as plain text, without its path, line number,
language marker, or Markdown code fence. Surrounding whitespace and an optional
UTF-8 BOM are ignored only while recognizing the object; the clipboard keeps
the original selected text.

- Type: boolean
- Default: `true`
- UI: Settings only

### `copy-code-location.locationFormat`

Choose the location displayed above each code block:

| Value | Complete lines | Partial lines |
| --- | --- | --- |
| `line` (default) | Path and line numbers | Path and line numbers |
| `lineAndColumn` | Path, line, and column numbers | Path, line, and column numbers |
| `lineAndColumnForPartialLines` | Path and line numbers | Path, line, and column numbers |

Complete lines include the current-line fallback when no text is selected.
Automatic word fallback applies to partial single-line selections with every
location format. Complete JSON objects still copy as plain text when
their fallback setting is enabled. Existing values of `showColumnNumbers` and
`omitLineNumbersForCompleteLines`, along with the earlier path-only dropdown
choices, are moved to the matching option on activation. Line numbers are
preserved for complete-line selections.

### `copy-code-location.relativePathCopyMode`

Use Relative Path Copy Mode so `Ctrl+C` copies selected code with its relative
path instead of invoking the standard VS Code copy action.

- Type: boolean
- Default: `false`

### `copy-code-location.trailingNewlines`

Number of newline characters appended after the closing code fence.

- Type: integer
- Default: `1`
- Minimum: `0`
- Maximum: `10`

## Shortcut Conflicts

User-defined keyboard shortcuts take precedence over extension defaults. Other
extensions can also contribute overlapping shortcuts.

If a shortcut does not run the expected command:

1. Run **Developer: Toggle Keyboard Shortcuts Troubleshooting**.
2. Press the shortcut.
3. Inspect which command and `when` condition VS Code selected.
4. Open **Preferences: Open Keyboard Shortcuts** to change the binding if
   needed.
