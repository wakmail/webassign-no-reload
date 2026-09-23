# webassign-no-reload

A userscript and Chrome extension for WebAssign. When you press Submit Answer or Save on one question, the page no longer reloads. The script sends the answer in the background and updates only what changed: the marks, the score, and the attempt count. You keep your place on the page.

## Features

* **No reload on submit.** Submit and Save for a single question update that question in place.
* **Tutorials too.** Tutorial steps update without a reload as well.
* **Enter submits.** Pressing Enter in an answer box submits that question. Shift+Enter still adds a new line.
* **Scroll back.** If something does need a full reload, such as Submit Assignment, the page jumps straight back to the question you were on.
* **Math Pad search.** A search box in the Math Pad header finds any symbol across every tab. Type a name like pi, sqrt, theta, or ohm, then click a result or press Enter to insert it.
* **Autofocus next** (off by default). After a correct answer, the cursor moves to the next empty answer box.

## Install

Pick one. Don't use both at once, or every submit runs twice.

### Chrome extension (works on Chromebooks)

1. On this repo's GitHub page, click **Code**, then **Download ZIP**.
2. Unzip it. On a Chromebook, open the ZIP in the Files app and copy the folder inside to My files.
3. Go to `chrome://extensions` and turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the unzipped folder.

To update, download the ZIP again, replace the old folder, and click the reload arrow on the extension's card. After changing a setting in the script, click that reload arrow too.

### Userscript

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
| `PAD_SEARCH` | `true` | Add a symbol search box to the Math Pad |

If a tutorial behaves strangely, set `NO_RELOAD_TUTORIALS` to `false`. Tutorials will then reload normally, and scroll back still keeps your place.

## Releasing a new version

Bump the version in both places so they match: `@version` at the top of the script and `"version"` in `manifest.json`.

## Safety

The script never sends an answer twice. If anything unexpected comes back from the server, it falls back to a normal page load instead of resubmitting. Submit Assignment is never intercepted.
