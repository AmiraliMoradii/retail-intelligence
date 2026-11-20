# Inventory Evaluation Preview

## GitHub metadata

**Description**

Grocery inventory evaluation app with store-scoped CSV imports, sales history, reorder calculations, and a sample-data demo.

**Topics**

inventory-management, retail-analytics, react, typescript, sqlite, csv-import

**Release notes for v0.3.0-preview.1**

- Open a synthetic grocery store in the browser without creating an account.
- Try valid and invalid inventory CSVs, inspect product history, and check the reorder calculation.
- Run the self-hosted inventory workflow with SQLite and store-specific access.
- Contribute under the MIT license. Aisle traffic and demand forecasts remain simulated in the demo.

## Contributor issues

The [GitHub issue tracker](https://github.com/AmiraliMoradii/retail-intelligence/issues) contains the current assignments and status.

### Add a sample CSV for dated stock updates

Labels are `documentation` and `good first issue`.

- Add synthetic fixtures for an initial stock count, a newer count for the same SKU, and a late file containing an older count.
- Document the resulting stock date and monthly totals after each import.
- Use the same SKUs and dates in the fixtures and walkthrough.

### Cover viewer permissions in the browser

Label is `help wanted`.

- Provision a viewer and manager in the browser test fixture.
- Sign in as the viewer and verify that the import form is absent and saved product history and reorder calculation still work.
- Verify that switching between viewer and manager sessions does not display another user's inventory.

### Rehearse inventory recovery on the pilot host

Label is `help wanted`.

- Run the documented backup and recovery procedure on staging with two synthetic stores.
- Record elapsed recovery time and reconcile store totals and a known reorder calculation.
- Confirm that sessions issued before the restore can no longer access the inventory.

## Launch post for developers

I built Retail Intelligence for a University of Calgary course and am sharing an evaluation preview. The online demo lets you import a sample inventory CSV and see its effect on product history and reorder quantities. There is also a self-hosted workflow with SQLite and store-level access. If you are interested in inventory tooling, the dated stock CSV issue is a small place to start. I would also welcome reproducible accessibility or data import reports.

## Feedback request for store managers

I’m testing a grocery inventory tool that imports monthly sales and stock counts from CSV. The sample store shows how an import changes product history and the reorder calculation. When you correct a sale or stock count from a previous month, how does your export represent the change? A description or made-up example is enough.

## Measure participation

The pre-launch check on November 20, 2026 recorded 0 stars, 0 forks, and an empty issue tracker before the three maintainer issues were opened. Immediately before sharing the demo, record a fresh snapshot including issues with outside participation and outside pull requests. Compare on days 7, 14, and 30. If the owner records GitHub traffic, retain each dated 14-day snapshot so the early activity remains visible. Note reproducible issues and store feedback alongside the counts.
