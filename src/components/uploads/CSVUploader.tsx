import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileWarning,
  RotateCcw,
  UploadCloud,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  loadSampleCsv,
  MAX_CSV_BYTES,
  OPTIONAL_COLUMNS,
  parseInventoryCsv,
  REQUIRED_COLUMNS,
  validateCsvFile,
  type CsvParseResult,
} from "@/services/csvService";
import { latency } from "@/services/mockApi";
import { formatBytes, formatNumber } from "@/utils/formatters";
import { cn } from "@/lib/utils";

export const SAMPLE_FILES = [
  { file: "inventory_valid.csv", label: "Valid inventory file", hint: "36 rows · 3 products" },
  { file: "inventory_invalid_quantity.csv", label: "Invalid quantity (row 8)", hint: "Shows a row-level error" },
  { file: "inventory_missing_column.csv", label: "Missing sold_quantity column", hint: "Shows a column error" },
  { file: "inventory_empty.csv", label: "Empty file", hint: "Header only, no records" },
  { file: "inventory_notes.txt", label: "Wrong file type (.txt)", hint: "Shows a format error" },
] as const;

type Phase = "idle" | "reading" | "parsed" | "importing" | "imported";

export interface CSVUploaderProps {
  onImport: (result: CsvParseResult) => Promise<void> | void;
  /** Rendered in the success state, e.g. a "View updated inventory" button. */
  successActions?: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  /** Hide the sample-file helper menu. */
  hideSamples?: boolean;
}

export function CSVUploader({ onImport, successActions, confirmLabel = "Confirm import", className, hideSamples }: CSVUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [dragOver, setDragOver] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [file, setFile] = React.useState<{ name: string; size: number } | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CsvParseResult | null>(null);
  const inputId = React.useId();
  const statusId = React.useId();

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setFile(null);
    setFileError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (f: File) => {
    setFile({ name: f.name, size: f.size });
    setResult(null);
    const fileIssue = validateCsvFile(f);
    if (fileIssue) {
      setFileError(fileIssue.message);
      setPhase("parsed");
      return;
    }
    setFileError(null);
    setPhase("reading");
    // Simulated upload progress (files are read locally in the browser — nothing is sent anywhere).
    for (const p of [18, 42, 67, 88]) {
      setProgress(p);
      await latency(110);
    }
    const parsed = await parseInventoryCsv(f);
    setProgress(100);
    setResult(parsed);
    setPhase("parsed");
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const loadSample = async (name: string) => {
    const f = await loadSampleCsv(name);
    void handleFile(f);
  };

  const confirm = async () => {
    if (!result?.ok) return;
    setPhase("importing");
    await latency(700);
    await onImport(result);
    setPhase("imported");
  };

  const issues = fileError ? [{ message: fileError }] : (result?.issues ?? []);
  const hasErrors = issues.length > 0;
  const previewRows = result?.rows.slice(0, 10) ?? [];
  const previewCols = result?.columns ?? [];
  const errorRows = new Set(result?.issues.filter((i) => i.row).map((i) => i.row));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Live region announces state changes to assistive tech */}
      <p id={statusId} className="sr-only" aria-live="polite">
        {phase === "reading" && `Reading ${file?.name}`}
        {phase === "parsed" && !hasErrors && result && `${result.rows.length} records ready to import`}
        {phase === "imported" && "Inventory data imported successfully."}
      </p>

      {(phase === "idle" || phase === "reading") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver ? "border-primary bg-primary-soft" : "border-input bg-muted/40 hover:border-primary/50",
          )}
        >
          {phase === "reading" ? (
            <div className="w-full max-w-sm space-y-3" role="status">
              <FileSpreadsheet className="mx-auto size-8 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium">Reading {file?.name}…</p>
              <Progress value={progress} aria-label="Upload progress" />
              <p className="text-xs text-muted-foreground tabular">{progress}% · parsed locally in your browser</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <UploadCloud className="size-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold">Drag and drop your inventory CSV here</p>
              <p className="mt-1 text-xs text-muted-foreground">CSV only · up to {formatBytes(MAX_CSV_BYTES)} · first 10 rows are previewed before import</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button type="button" onClick={() => inputRef.current?.click()}>
                  <FileSpreadsheet /> Choose file
                </Button>
                {!hideSamples && <SampleMenu onPick={loadSample} />}
              </div>
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                tabIndex={-1}
                aria-label="Inventory CSV file"
                onChange={onInputChange}
              />
            </>
          )}
        </div>
      )}

      {(phase === "parsed" || phase === "importing") && file && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  hasErrors ? "bg-destructive-soft text-destructive-text" : "bg-success-soft text-success-text",
                )}
              >
                {hasErrors ? <FileWarning className="size-4.5" aria-hidden="true" /> : <FileSpreadsheet className="size-4.5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  {result && !fileError && ` · ${formatNumber(result.rows.length)} records · ${result.columns.length} columns`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasErrors ? (
                <Badge variant="destructive">
                  <XCircle aria-hidden="true" /> {issues.length === 1 ? "1 problem" : `${issues.length} problems`}
                </Badge>
              ) : (
                <Badge variant="success">
                  <CheckCircle2 aria-hidden="true" /> Ready to import
                </Badge>
              )}
            </div>
          </div>

          {hasErrors && (
            <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive-soft p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <XCircle className="size-4 text-destructive-text" aria-hidden="true" />
                {issues[0].message}
              </p>
              {issues.length > 1 && (
                <ul className="mt-2 ml-6 list-disc space-y-0.5 text-sm text-muted-foreground">
                  {issues.slice(1, 6).map((i, idx) => (
                    <li key={idx}>{i.message}</li>
                  ))}
                  {issues.length > 6 && <li>…and {issues.length - 6} more.</li>}
                </ul>
              )}
              <p className="mt-3 text-sm text-muted-foreground">Fix the file in your spreadsheet app, save it as CSV, and upload it again.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { reset(); setTimeout(() => inputRef.current?.click(), 0); }}>
                  <UploadCloud /> Upload corrected file
                </Button>
                <Button size="sm" variant="outline" onClick={reset}>
                  <RotateCcw /> Start over
                </Button>
              </div>
            </div>
          )}

          {result && !fileError && result.columns.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Column check</p>
              <ul className="flex flex-wrap gap-2" aria-label="Column validation">
                {REQUIRED_COLUMNS.map((c) => {
                  const ok = result.columns.includes(c);
                  return (
                    <li key={c}>
                      <Badge variant={ok ? "success" : "destructive"} className="font-mono text-[11px]">
                        {ok ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                        {c}
                        <span className="sr-only">{ok ? "present" : "missing (required)"}</span>
                      </Badge>
                    </li>
                  );
                })}
                {OPTIONAL_COLUMNS.map((c) => {
                  const ok = result.columns.includes(c);
                  return (
                    <li key={c}>
                      <Badge variant={ok ? "outline" : "secondary"} className="font-mono text-[11px]">
                        {ok ? <CheckCircle2 aria-hidden="true" /> : <MinusCircle aria-hidden="true" />}
                        {c}
                        <span className="sr-only">{ok ? "present (optional)" : "not included (optional)"}</span>
                      </Badge>
                    </li>
                  );
                })}
              </ul>
              {result.unknownColumns.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ignored columns: <span className="font-mono">{result.unknownColumns.join(", ")}</span>
                </p>
              )}
            </div>
          )}

          {previewRows.length > 0 && (
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">Preview</p>
                <p className="text-xs text-muted-foreground">
                  First {previewRows.length} of {formatNumber(result?.rows.length ?? 0)} records
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table wrapperClassName="max-h-80">
                  <caption className="sr-only">First 10 records of {file.name}</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="w-12">Row</TableHead>
                      {previewCols.map((c) => (
                        <TableHead key={c} scope="col" className="font-mono text-[11px] normal-case">
                          {c}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i} className={cn(errorRows.has(i + 1) && "bg-destructive-soft hover:bg-destructive-soft")}>
                        <TableCell className="text-xs text-muted-foreground tabular">
                          {errorRows.has(i + 1) && <XCircle className="mr-1 inline size-3.5 text-destructive-text" aria-label="Row has an error" />}
                          {i + 1}
                        </TableCell>
                        {previewCols.map((c) => (
                          <TableCell key={c} className="text-[13px] tabular">
                            {row[c] || <span className="text-subtle">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {result?.ok && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{formatNumber(result.rows.length)} records</strong> for{" "}
                <strong className="text-foreground">{result.productCount} products</strong>
                {result.dateRange && (
                  <>
                    {" "}
                    from {result.dateRange.from} to {result.dateRange.to}
                  </>
                )}
                . Matching product IDs are updated; new IDs are added.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={reset} disabled={phase === "importing"}>
                  Cancel
                </Button>
                <Button onClick={confirm} loading={phase === "importing"}>
                  {phase === "importing" ? "Importing…" : confirmLabel}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "imported" && result && (
        <Alert variant="success" title="Inventory data imported successfully.">
          {formatNumber(result.rows.length)} records for {result.productCount} products from <strong>{result.fileName}</strong> were added to
          your inventory. Forecasts and order recommendations have been recalculated.
          <div className="mt-3 flex flex-wrap gap-2">
            {successActions}
            <Button variant="outline" size="sm" onClick={reset}>
              <UploadCloud /> Import another file
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}

function SampleMenu({ onPick }: { onPick: (file: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline">
          Try a sample file <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-72">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Load a bundled sample into the uploader</DropdownMenuLabel>
        {SAMPLE_FILES.map((s) => (
          <DropdownMenuItem key={s.file} onSelect={() => onPick(s.file)}>
            <FileSpreadsheet />
            <span className="flex-1">
              <span className="block">{s.label}</span>
              <span className="block text-xs text-muted-foreground">{s.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`${import.meta.env.BASE_URL}samples/inventory_valid.csv`} download>
            <Download /> Download valid sample CSV
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
