import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import type { ImportBatch, OrderRecommendation, Product } from "@/types";
import { MAX_CSV_BYTES, validateCsvFile } from "@/services/csvService";

interface Store {
  id: string;
  name: string;
  role: "viewer" | "manager";
}

interface Session {
  user: { email: string };
  stores: Store[];
}

interface ReorderResult extends OrderRecommendation {
  stockDate: string;
}

interface Inventory {
  products: (Product & { stockKnown: boolean; stockDate: string | null })[];
  imports: ImportBatch[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (response.status === 204) return undefined as T;
  const content = await response.json().catch(() => null);
  if (!response.ok || content === null) {
    throw new Error(content?.error ?? "The inventory service is unavailable. Check that the server is running.");
  }
  return content as T;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

const field = "block w-full rounded border border-border bg-background px-3 py-2";
const action = "rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60";

export default function StoreInventoryPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [storeId, selectStore] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    document.title = "Store inventory · Retail Intelligence";
    const abort = new AbortController();
    fetch("/api/session", { signal: abort.signal })
      .then(async (response) => {
        if (response.status === 401) return;
        if (!response.ok) throw new Error("The inventory service is unavailable.");
        setSession(await response.json() as Session);
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      setSession(await request<Session>("/session", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      }));
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await request("/session", { method: "DELETE" });
      setSession(null);
      selectStore("");
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  const store = session?.stores.find((candidate) => candidate.id === storeId) ?? session?.stores[0];
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <Link className="underline" to="/login">Open the sample-data demo</Link>
      <h1 className="text-3xl font-semibold">Store inventory</h1>
      {error && <p role="alert">{error}</p>}
      {session ? (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <p>Signed in as {session.user.email}</p>
            <button className="underline" onClick={() => void signOut()} disabled={busy}>Sign out</button>
          </div>
          {store ? (
            <>
              <label className="block max-w-sm">Store
                <select className={field} value={store.id} onChange={(event) => selectStore(event.target.value)}>
                  {session.stores.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <StoreInventory key={store.id} store={store} />
            </>
          ) : <p>Your account has no store access.</p>}
        </>
      ) : (
        <form className="max-w-sm space-y-4" onSubmit={signIn}>
          <p>Sign in with an account provisioned for your store.</p>
          <label className="block">Email<input className={field} name="email" type="email" autoComplete="username" required /></label>
          <label className="block">Password<input className={field} name="password" type="password" autoComplete="current-password" required /></label>
          <button className={action} disabled={busy}>Sign in</button>
        </form>
      )}
    </main>
  );
}

function StoreInventory({ store }: { store: Store }) {
  const path = `/stores/${encodeURIComponent(store.id)}`;
  const [inventory, setInventory] = useState<Inventory>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recommendation, setRecommendation] = useState<ReorderResult>();
  useEffect(() => {
    const abort = new AbortController();
    request<Inventory>(`${path}/inventory`, { signal: abort.signal })
      .then(setInventory)
      .catch((error: unknown) => {
        if (!abort.signal.aborted) setError(message(error));
      });
    return () => abort.abort();
  }, [path]);

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("csv");
    if (!(file instanceof File)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const issue = validateCsvFile(file);
      if (issue) throw new Error(issue.message);
      const batch = await request<ImportBatch>(`${path}/imports`, {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, csv: await file.text() }),
      });
      form.reset();
      setRecommendation(undefined);
      setNotice(`Imported ${batch.rowCount} rows from ${batch.fileName}.`);
      setInventory(await request<Inventory>(`${path}/inventory`));
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  async function reorder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setRecommendation(undefined);
    try {
      setRecommendation(await request<ReorderResult>(`${path}/reorder`, {
        method: "POST",
        body: JSON.stringify({
          productId: form.get("product"),
          forecastDemand: Number(form.get("forecastDemand")),
          safetyStock: Number(form.get("safetyStock")),
          incomingStock: Number(form.get("incomingStock")),
        }),
      }));
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  const stockProducts = inventory?.products.filter((product) => product.stockKnown);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <p role="status">{notice}</p>
      {store.role === "manager" && (
        <form className="space-y-3 rounded border p-4" onSubmit={importCsv}>
          <h2 className="text-xl font-semibold">Import inventory</h2>
          <p>Upload a CSV up to {MAX_CSV_BYTES / 1024 / 1024} MiB. Each product and month in the file replaces the saved totals for that month. Include a dated stock count to calculate reorder quantities.</p>
          <label className="block">Inventory CSV<input className={field} type="file" name="csv" accept=".csv" required /></label>
          <button className={action} disabled={busy || !inventory}>Import CSV</button>
        </form>
      )}
      <section className="space-y-3" aria-labelledby="products-title">
        <h2 id="products-title" className="text-xl font-semibold">Products and sales history</h2>
        {!inventory && !error && <p role="status">Loading inventory…</p>}
        {inventory?.products.length === 0 && <p>No products imported yet.</p>}
        {inventory?.products.map((product) => (
          <details key={product.id} className="rounded border p-3">
            <summary className="cursor-pointer">
              {product.name} ({product.id}) · {product.stockKnown ? `${product.currentStock} in stock${product.stockDate ? ` as of ${product.stockDate}` : ""}` : "Stock unknown"}
            </summary>
            <table className="mt-3 w-full text-left">
              <caption className="sr-only">Monthly history for {product.name}</caption>
              <thead><tr><th scope="col">Month</th><th scope="col">Ordered</th><th scope="col">Sold</th></tr></thead>
              <tbody>
                {product.history.map((entry) => (
                  <tr key={entry.month}><td>{entry.month}</td><td>{entry.orderedQuantity}</td><td>{entry.soldQuantity}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </section>
      {stockProducts && stockProducts.length > 0 && (
        <form className="space-y-3 rounded border p-4" onSubmit={reorder} onChange={() => setRecommendation(undefined)}>
          <h2 className="text-xl font-semibold">Reorder calculator</h2>
          <p>Use the same planning period for demand and incoming stock. The calculation uses the store’s latest imported stock.</p>
          <label className="block">Product
            <select name="product" className={field}>
              {stockProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>Expected demand<input className={field} type="number" name="forecastDemand" min="0" required /></label>
            <label>Safety stock<input className={field} type="number" name="safetyStock" min="0" defaultValue="0" required /></label>
            <label>Incoming stock<input className={field} type="number" name="incomingStock" min="0" defaultValue="0" required /></label>
          </div>
          <button className={action} disabled={busy}>Calculate reorder</button>
          <output className="block">
            {recommendation && (
              <>
                <strong>Recommended order: {recommendation.recommendedOrder} units</strong>
                <span className="block">
                  {recommendation.forecastDemand} demand + {recommendation.safetyStock} safety stock −{" "}
                  {recommendation.currentStock} on hand as of {recommendation.stockDate} −{" "}
                  {recommendation.incomingStock} incoming. The minimum order is zero.
                </span>
              </>
            )}
          </output>
        </form>
      )}
      <section className="space-y-3" aria-labelledby="imports-title">
        <h2 id="imports-title" className="text-xl font-semibold">Import history</h2>
        {inventory?.imports.length === 0 && <p>No imports yet.</p>}
        <ul className="space-y-1">
          {inventory?.imports.map((batch) => (
            <li key={batch.id}>{batch.fileName} · {batch.rowCount} rows · {new Date(batch.importedAt).toLocaleString()}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
