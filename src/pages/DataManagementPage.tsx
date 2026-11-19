import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Boxes, CalendarRange, Database, Download, FileSpreadsheet, History, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { CSVUploader, SAMPLE_FILES } from "@/components/uploads/CSVUploader";
import { VideoUploader } from "@/components/uploads/VideoUploader";
import { VideoLibrary } from "@/components/cameras/VideoLibrary";
import { useAppStore } from "@/store/useAppStore";
import { OPTIONAL_COLUMNS, REQUIRED_COLUMNS } from "@/services/csvService";
import { formatDateTime, formatMonth, formatNumber } from "@/utils/formatters";

const COLUMN_HELP: Record<string, string> = {
  product_id: "Your SKU or product code, e.g. P-1001",
  product_name: "Product name as shown to staff",
  date: "Record date in YYYY-MM-DD (aggregated by month)",
  ordered_quantity: "Units ordered from the supplier (whole number)",
  sold_quantity: "Units sold (whole number)",
  category: "Dairy, Bakery, Produce, Pantry, Beverages, Frozen or Snacks",
  current_stock: "Units on hand at that date",
  supplier_lead_time: "Days from order to delivery",
  unit_cost: "Cost per unit in dollars, e.g. 3.85",
};

function InventoryTab() {
  const importInventory = useAppStore((s) => s.importInventory);
  const pushNotification = useAppStore((s) => s.pushNotification);
  const importBatches = useAppStore((s) => s.importBatches);
  const products = useAppStore((s) => s.products);
  const dateFormat = useAppStore((s) => s.settings.dateFormat);

  const dataset = useMemo(() => {
    const months = products.flatMap((p) => p.history.map((h) => h.month)).sort();
    return {
      products: products.length,
      imported: products.filter((p) => p.importedAt).length,
      from: months[0],
      to: months[months.length - 1],
      monthCount: new Set(months).size,
      records: products.reduce((a, p) => a + p.history.length, 0),
    };
  }, [products]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upload inventory CSV</CardTitle>
              <CardDescription>
                Import historical sales and ordering records. Files are parsed and validated in your browser before anything is imported.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CSVUploader
              onImport={(result) => {
                const batch = importInventory(result.fileName, result.records);
                toast.success("Inventory data imported successfully.", {
                  description: `${batch.productIds.length} products updated${batch.newProductIds.length ? ` (${batch.newProductIds.length} new)` : ""}.`,
                });
                pushNotification({
                  kind: "inventory",
                  title: "Inventory data imported",
                  body: `${result.fileName}: ${formatNumber(result.records.length)} records for ${batch.productIds.length} products. Forecasts were recalculated.`,
                  href: "/inventory?imported=1",
                });
              }}
              successActions={
                <Button size="sm" asChild>
                  <Link to="/inventory?imported=1">
                    <Boxes /> View updated inventory
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4 text-muted-foreground" aria-hidden="true" /> Import history
              </CardTitle>
              <CardDescription>CSV files imported in this browser (stored locally).</CardDescription>
            </div>
          </CardHeader>
          <CardContent className={importBatches.length ? "px-0 pb-2" : undefined}>
            {importBatches.length === 0 ? (
              <EmptyState
                icon={FileSpreadsheet}
                title="No CSV files imported yet"
                description="Imported files appear here with the number of products they updated or added."
              />
            ) : (
              <Table>
                <caption className="sr-only">Inventory import history</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">File</TableHead>
                    <TableHead scope="col">Imported</TableHead>
                    <TableHead scope="col" className="text-right">
                      Rows
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Products updated
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Products added
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importBatches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-[16rem] truncate font-medium" title={b.fileName}>
                        {b.fileName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(b.importedAt, dateFormat)}</TableCell>
                      <TableCell className="text-right tabular">{formatNumber(b.rowCount)}</TableCell>
                      <TableCell className="text-right tabular">{b.productIds.length - b.newProductIds.length}</TableCell>
                      <TableCell className="text-right tabular">{b.newProductIds.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" aria-hidden="true" /> Current dataset
              </CardTitle>
              <CardDescription>What forecasts and recommendations are calculated from.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Products</dt>
                <dd className="text-lg font-semibold tabular">{formatNumber(dataset.products)}</dd>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Monthly records</dt>
                <dd className="text-lg font-semibold tabular">{formatNumber(dataset.records)}</dd>
              </div>
              <div className="col-span-2 rounded-lg bg-muted/60 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarRange className="size-3.5" aria-hidden="true" /> History covered
                </dt>
                <dd className="text-sm font-semibold">
                  {dataset.from && dataset.to ? `${formatMonth(dataset.from)} – ${formatMonth(dataset.to)} (${dataset.monthCount} months)` : "No history"}
                </dd>
              </div>
              <div className="col-span-2 rounded-lg bg-muted/60 p-3">
                <dt className="text-xs text-muted-foreground">Last import</dt>
                <dd className="text-sm font-semibold">
                  {importBatches[0] ? `${importBatches[0].fileName} · ${formatDateTime(importBatches[0].importedAt, dateFormat)}` : "Demo dataset only"}
                </dd>
              </div>
            </dl>
            {dataset.imported > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {dataset.imported} {dataset.imported === 1 ? "product includes" : "products include"} imported records.{" "}
                <Link to="/inventory?imported=1" className="font-medium text-primary hover:underline">
                  View them
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Required format</CardTitle>
              <CardDescription>One row per product per date. Header names are not case-sensitive.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Required columns</p>
              <ul className="space-y-1.5">
                {REQUIRED_COLUMNS.map((c) => (
                  <li key={c} className="text-sm">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] font-semibold">{c}</code>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{COLUMN_HELP[c]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Optional columns</p>
              <ul className="space-y-1.5">
                {OPTIONAL_COLUMNS.map((c) => (
                  <li key={c} className="text-sm">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{c}</code>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{COLUMN_HELP[c]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Example row</p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11.5px] leading-5 scrollbar-thin">
                {`product_id,product_name,date,ordered_quantity,sold_quantity,category,current_stock
P-1001,Milk 2%,2026-10-01,540,512,Dairy,96`}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sample files</p>
              <ul className="space-y-1">
                {SAMPLE_FILES.map((s) => (
                  <li key={s.file}>
                    <a
                      href={`${import.meta.env.BASE_URL}samples/${s.file}`}
                      download
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Download className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{s.file}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{s.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VideoTab() {
  const videos = useAppStore((s) => s.videos);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const counts = {
    processing: videos.filter((v) => v.status === "processing").length,
    completed: videos.filter((v) => v.status === "completed").length,
    failed: videos.filter((v) => v.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <Alert variant="warning" title="Video analytics processing is simulated in this prototype.">
        No computer-vision inference runs in Milestone 2. Processing shows how jobs will behave once the OpenCV → YOLO26 → ByteTrack pipeline is
        connected. Tip: a file name containing “corrupt” simulates a failed job.
      </Alert>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Upload video</CardTitle>
            <CardDescription>Add recorded CCTV footage, preview it, assign it to a camera and set the recording date.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <VideoUploader onAdded={setLastAdded} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Video sources</CardTitle>
            <CardDescription>Processing status for uploaded footage. Files stay in this browser and are not stored after a refresh.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Status summary">
            <Badge variant="secondary">{videos.length} total</Badge>
            {counts.processing > 0 && <Badge variant="default">{counts.processing} processing</Badge>}
            <Badge variant="success">{counts.completed} completed</Badge>
            {counts.failed > 0 && <Badge variant="destructive">{counts.failed} failed</Badge>}
          </div>
        </CardHeader>
        <CardContent className={videos.length ? "px-0 pb-1" : undefined}>
          <VideoLibrary highlightId={lastAdded} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DataManagementPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "video" ? "video" : "inventory";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<DemoBadge />}
        title="Data Management"
        description="Manage inventory datasets and video sources used for retail analytics."
      />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          next.set("tab", v);
          setParams(next);
        }}
      >
        <TabsList aria-label="Data type">
          <TabsTrigger value="inventory">
            <FileSpreadsheet aria-hidden="true" /> Inventory Data
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video aria-hidden="true" /> Video Data
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
        <TabsContent value="video">
          <VideoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
