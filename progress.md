Original prompt: this is a game of the iron dom of israel defce the iran attack, make sure tel_aviv and jerusalem is a map of option you can choose to play and defence it and make the game stability

- Initialized work log.
- Reviewed `index.html`, `game.js`, and `style.css`.
- Planned changes:
  - Add city map selection (Tel Aviv / Jerusalem) in the menu/start flow.
  - Apply map-specific gameplay tuning and visuals.
  - Improve stability via safer resets, frame-time clamping, and runtime guards.
  - Expose `window.render_game_to_text` and `window.advanceTime(ms)` for deterministic testing.

- Implemented city map selection UI in menu (`Tel Aviv`, `Jerusalem`) and wired selection state in `game.js`.
- Added city presets for skyline, sky colors, and gameplay tuning (spawn pacing, missile speed, objective counts).
- Added reset hardening (`resetRuntimeState`), frame-delta clamping, and deterministic stepping hooks (`window.advanceTime`, `window.render_game_to_text`).
- Added robust image rendering guards (`naturalWidth` checks) and switched map backgrounds to `photos/Tel_aviv.png` / `photos/jerusalem.png`.
- Fixed an automation-flakiness issue by changing start button pulse animation to avoid transform scaling.
- Added third playable map option: `haifa` (UI button, preload, city config, runtime selection, SW cache entry).
- Updated background-map loading to include `photos/haifa.png` and verified `?city=haifa` startup selection.
- Removed opaque sprite rectangle artifacts by switching `iran_rocket`, `israel_rocket`, and `iron_dom` to guaranteed transparent vector-rendered sprites in-game.
- Verified via Playwright screenshots that:
  - Tel Aviv and Haifa gameplay run without console/page errors.
  - Enemy rocket, interceptor, and launcher render with no box background.
  - Haifa map renders as a selectable/launchable playable map.
- Fixed loader freeze at ~67% for `file://` usage:
  - Added fail-safe load completion path so image post-processing exceptions can never block loading.
  - Verified direct `file:///Users/aloniter/Iron_Dom_mobile-main%20copy/index.html` now reaches `loadedImages=9/9` and enters menu.
- Ensured game uses real sprite images for `iran_rocket`, `israel_rocket`, and `iron_dom`:
  - Added cleaned transparent sprite files (`*_clean.png`) and switched loader/preloads/SW cache to use them.
  - Re-enabled image sprite rendering (`useImageSprites=true`).
