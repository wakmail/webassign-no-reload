# webassign-no-reload

A userscript for WebAssign. When you press Submit Answer or Save on one question, the page no longer reloads. The script sends the answer in the background and updates only what changed: the marks, the score, and the attempt count. You keep your place on the page.

## Features

* **No reload on submit.** Submit and Save for a single question update that question in place.
* **Tutorials too.** Tutorial steps update without a reload as well.
* **Enter submits.** Pressing Enter in an answer box submits that question. Shift+Enter still adds a new line.
* **Scroll back.** If something does need a full reload, such as Submit Assignment, the page jumps straight back to the question you were on.
* **Autofocus next** (off by default). After a correct answer, the cursor moves to the next empty answer box.

## Install

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open `webassign-no-reload.user.js` in this repo and click **Raw**. Your userscript manager will offer to install it.

## Settings

Each feature has a switch at the top of the script. Set it to `true` or `false`:

| Setting | Default | What it does |
| --- | --- | --- |
| `ENTER_TO_SUBMIT` | `true` | Enter in an answer box submits that question |
| `AUTOFOCUS_NEXT` | `false` | Jump to the next empty box after a correct answer |
| `SCROLL_BACK` | `true` | Return to your question after any full reload |
| `NO_RELOAD_TUTORIALS` | `true` | Update tutorial steps without a reload |

If a tutorial behaves strangely, set `NO_RELOAD_TUTORIALS` to `false`. Tutorials will then reload normally, and scroll back still keeps your place.

## Safety

The script never sends an answer twice. If anything unexpected comes back from the server, it falls back to a normal page load instead of resubmitting. Submit Assignment is never intercepted.
