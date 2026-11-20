# Inventory evaluation preview

## GitHub metadata

**Description**
Grocery inventory evaluation app with store-scoped CSV imports, sales history, reorder calculations, and a sample-data demo.

**Topics**
inventory-management, retail-analytics, react, typescript, sqlite, csv-import

**Release summary**
This preview adds a self-hosted store inventory workflow alongside the original browser demo. Store managers can import CSVs and review product history. Store members can calculate reorder quantities using on-hand stock and manually entered demand. The preview uses SQLite and locally provisioned accounts. Camera analysis and AI forecasting remain demo features.

## Contributor issue drafts

### Add a sample CSV for dated stock updates

Suggested labels are documentation and good first issue.

- Add synthetic fixtures showing an initial stock count, a newer snapshot for the same product, and a late file with an older count.
- Document the resulting stock date and monthly sales totals for each import.
- Use the same SKUs and dates in the fixture and walkthrough.

### Verify the store inventory UI in CI

Suggested label is help wanted.

- Start the app with a temporary database and two synthetic stores.
- Cover manager login, an invalid and valid import, product history, a reorder result, refresh, and logout.
- Run a narrow viewport case and retain browser diagnostics on failure. Keep test credentials and database files out of artifacts.

### Test inventory backup and restore

Suggested label is help wanted.

- Document how to back up SQLite while writes are active, including what must happen to WAL files.
- Restore to a temporary location and verify that accounts, memberships, and imported sales are available.
- Document session handling during recovery and record a successful restore drill.

## Launch post draft

I’m putting together an evaluation preview of Retail Intelligence, a grocery inventory project I developed for a University of Calgary course and first shared through faraz-hsn’s repository. The original sample-data dashboard is still there. The self-hosted preview adds separate store accounts, validated inventory CSVs, sales history, and a reorder calculator.

If you work with grocery inventory, I’d like to know how your exports represent corrections and dated stock counts. Try the demo with synthetic data and share what you would need before using a tool like this at work. Developers interested in inventory data or accessibility can start with the contributor issues.

Add the verified fork and demo URLs before posting.
