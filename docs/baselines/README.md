# Visual quality baselines

These screenshots are captured from `http://localhost:1118/?seed=414` after the loading overlay is removed.

- `seed-414-front.jpg`, `seed-414-side.jpg`, `seed-414-back.jpg`: desktop fixed-camera audit views.
- `mobile-390x844.jpg`: mobile layout with the editor collapsed and virtual movement controls visible.

Regenerate them whenever rendering, camera framing, character geometry, materials, or responsive layout changes. Review intentional visual diffs together with `src/export/qualityBaseline.js` and the automated geometry/material budgets.
