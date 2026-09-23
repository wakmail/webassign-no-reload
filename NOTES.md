# Notes

Personal reference. Not part of the script.

## Similar project: WebAssign Plus

https://github.com/22or/WebAssign-Plus (Chrome extension, MIT license)

No shared code. Checked `src/script.js` on 2026-09-23.

**Overlap with this script:** Enter to submit, autofocus next, instant scroll. Theirs does all of it after a full page reload.

**Ideas worth borrowing someday:**

* **Live math preview.** As you type, it loads WebAssign's own renderer into an image under the answer box: `/cgi-perl/symimage.cgi?size=4&expr=<escaped answer>`. It escapes the answer with `escape()` and then turns `+` into `%2B`. The box to hook is the input just before each `a.smPreview` link.
* **Hide the "Enter ..." tooltips** under text fields.

**If both run at once:** both listen for Enter, so one press might submit twice. Untested.
