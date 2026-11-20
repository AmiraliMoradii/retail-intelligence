# Operating an inventory pilot

Use Node.js 24 and an inventory build from the same release as the backend. Keep the public sample-data demo on a separate deployment. In the pilot, mount a private durable directory for the SQLite database, put the service behind HTTPS, and set `RI_SECURE_COOKIE=1`. Keep the application port private to the reverse proxy. Restrict database and command-line access to named host operators and apply rate limits and health monitoring at the proxy.

Set the same absolute `RI_DB_PATH` for the server and operator commands. Give the service account write access to its database directory. A private directory is important because SQLite may create additional files alongside the database. Keep this directory outside the application's static file tree.

## Accounts and store access

Grant a manager first for each store. A viewer can read inventory and calculate reorder recommendations. A manager can also import inventory. Use `list-memberships` to confirm the active managers for each store. The commands record successful changes under the operating system account that ran them.

To create an account in Bash or Zsh, read a temporary password into a shell variable so it stays out of shell history and command arguments:

```bash
read -r -s retail_password
printf '%s\n' "$retail_password" |
  node backend/operator.mjs grant manager@pilot.example north "North Store" manager
unset retail_password
```

Use a unique password of at least 12 characters. Verify the recipient's identity before sharing temporary credentials through the store's approved secure channel. For an existing account, the grant command takes the same arguments and needs no password. The stored name for an existing store stays as entered when the store was created.

```bash
node backend/operator.mjs list-memberships
node backend/operator.mjs revoke employee@pilot.example north
node backend/operator.mjs disable-user employee@pilot.example
node backend/operator.mjs enable-user employee@pilot.example
node backend/operator.mjs list-audit
```

Revoking one membership takes effect immediately and keeps any other memberships. When replacing a store's last active manager, first grant manager access to the replacement. A disabled user keeps their membership records and cannot sign in. Enable an account only after confirming that its earlier memberships should be active again.

For recovery, verify the account holder's identity through the store's approved process. Pipe a new password into `node backend/operator.mjs reset-password employee@pilot.example` using the same Bash or Zsh pattern. A reset and a disable operation invalidate all sessions for that account.

The audit log records store creation, account and membership changes, successful imports, and restores. It records user IDs, store IDs, and import IDs as applicable. Collect proxy and host logs separately for rejected requests and operator command failures. Audit records contain no passwords or uploaded CSV content, but identifiers still warrant restricted access. Database write access allows a host operator to modify the database, so use an external protected log destination if the pilot requires independent audit retention.

## Back up and restore

Agree on the recovery point and recovery time with the store before launch. Assign who uploads, verifies, and expires encrypted off-host backups. Run the backup command before upgrading an existing database, on the agreed schedule, and before significant changes to store access. It uses SQLite's online backup API, so the application may keep serving traffic during the copy.

Create private backup and restore directories before running the commands. Use a fresh destination filename for each operation. Restore onto an isolated host or a directory the live service never opens.

```bash
node backend/backup.mjs backup /private-backups/inventory-2026-11-20.sqlite
node backend/backup.mjs restore /private-backups/inventory-2026-11-20.sqlite /isolated-recovery/inventory.sqlite
```

Both commands verify integrity and foreign keys. Restore runs schema upgrades on the isolated copy when needed, clears all application sessions, and records a restore event. Keep the backup encrypted in transit and at rest. It contains inventory, account records, password hashes, and hashed session tokens.

### Run a recovery drill

1. Start with a synthetic store, import a fixture, and record the product count, import count, sales totals for an agreed month, and the result of one reorder calculation. Keep the sample store separate from any real pilot data.
2. Back up the database while the application runs. Restore to a new protected path. Record the snapshot time, how long the restore took, and the checks that passed.
3. Run a loopback-only instance against the restored file. Confirm an earlier session cookie is rejected, sign in again, and compare the recorded counts, totals, and reorder result. Confirm the live service still uses its original database and sessions.
4. Before any real cutover, compare restored user access with the current approved roster. Changes after the snapshot can be lost. Apply intervening revocations and rotate credentials if needed. Stop the live service before switching its database path, retain the original securely, and verify the service on the restored database before allowing normal traffic.

`node --test backend/operations.test.mjs` runs the synthetic database-level recovery drill. Run the manual drill with the pilot hosting, encrypted storage, and recovery process before relying on either recovery target.
