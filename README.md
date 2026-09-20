# UnPrecompose 📤

The missing After Effects command: **undo a precompose**. Replaces the selected precomp layer(s) with the layers inside them — right where they were playing.

## What it does

Select one or more precomp layers, run the script, and:

1. Every layer inside the precomp is **copied into the current comp**, in the same stacking order, exactly where the precomp layer sat.
2. Each copy is **time-offset** by the precomp layer's start time, so everything plays at the same moment it did before.
3. Copies are **trimmed** to the range the precomp layer actually showed.
4. **Parenting, track mattes and locks** between the nested layers are rebuilt.
5. The precomp layer is **removed**, and the extracted layers are left selected.

It all happens inside a single undo step. The original precomp stays in the Project panel, untouched.

## Installation

### As a Regular Script
- Place `UnPrecompose.jsx` in your **Scripts** folder and run via **File → Scripts → UnPrecompose.jsx**:
  ```
  Windows: C:\Program Files\Adobe\Adobe After Effects [version]\Support Files\Scripts\
  macOS:   /Applications/Adobe After Effects [version]/Scripts/
  ```

### As a Hotkey (recommended)
- Keep the `.jsx` anywhere and trigger it from your hotkey tool of choice, e.g. AutoHotkey:
  ```ahk
  run, "<path-to-AfterFX.exe>" -r "C:\path\to\UnPrecompose.jsx"
  ```

## Usage

1. **Open a composition.**
2. **Select 1 or more precomp layers.**
3. **Run the script.**
4. **Done!** The precomp layer is gone and its contents are in your timeline, selected.

## Example

```
Before:                      After:
  1  Title                     1  Title
  2  [Logo Precomp]   →        2  Logo Glow
  3  Background                3  Logo Shape
                               4  Logo Shadow
                               5  Background
```

## What gets skipped

You'll get a single summary dialog at the end if any of these come up:

- **Not a precomp** — skipped.
- **Time-remapped precomp layer** — skipped (the inner timing can't be reproduced by a simple offset).
- **Stretched precomp layer** (anything other than 100%) — skipped, same reason.
- **Effects or masks on the precomp layer itself** — the layers are still extracted, but those effects/masks are lost with the precomp layer. You'll be warned.

## Notes

- **Transforms on the precomp layer are not carried over.** If the precomp layer was moved, scaled, rotated or faded, the extracted layers come out with their own original transforms. Works best on precomps that sit at their default transform and match the parent comp's size.
- Best results when the precomp and the parent comp share the same frame rate and dimensions.

## Requirements

- Adobe After Effects
- Track mattes that don't sit directly above their layer need After Effects 23.0 or newer (`setTrackMatte`); older versions fall back to the legacy matte behaviour.

## License

MIT
