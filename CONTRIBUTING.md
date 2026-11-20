# Contributing to Retail Intelligence

Start with the sample store and an open issue. If you find a bug, include the page, the steps to reproduce it, and what you expected to see. Use synthetic product records in CSVs, screenshots, logs, and test fixtures.

Use Node.js 24 and run `npm ci` and `npm run dev` to start the local demo. See the [README](README.md) for the self-hosted inventory setup. Before opening a pull request, run the verification commands in the README and describe any browser checks you performed.

- For CSV work, include a small fixture with expected totals and stock dates.
- For UI work, show the affected route and check it with a keyboard and a phone-width viewport.
- For store-mode changes, cover permission checks and verify that a rejected request leaves the database unchanged.

Project code is available under the [MIT license](LICENSE). Dependencies and the bundled [Inter font](public/INTER-LICENSE.txt) retain their own licenses.
