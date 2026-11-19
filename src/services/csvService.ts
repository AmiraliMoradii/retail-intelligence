import Papa from "papaparse";
import type { InventoryRecord } from "@/types";

export const REQUIRED_COLUMNS = ["product_id", "product_name", "date", "ordered_quantity", "sold_quantity"] as const;
export const OPTIONAL_COLUMNS = ["category", "current_stock", "supplier_lead_time", "unit_cost"] as const;
export const MAX_CSV_BYTES = 5 * 1024 * 1024;

export type CsvIssueCode = "invalid_type" | "too_large" | "empty" | "missing_column" | "invalid_value" | "parse_error";

export interface CsvIssue {
  code: CsvIssueCode;
  message: string;
  row?: number;
  column?: string;
}

export interface CsvParseResult {
  ok: boolean;
  fileName: string;
  sizeBytes: number;
  columns: string[];
  missingRequired: string[];
  presentOptional: string[];
  unknownColumns: string[];
  rows: Record<string, string>[];
  records: InventoryRecord[];
  issues: CsvIssue[];
  /** Number of distinct products and months covered, for the confirmation step. */
  productCount: number;
  dateRange: { from: string; to: string } | null;
}

const normalise = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");

/** File-level checks that run before parsing. Messages are written for store managers. */
export function validateCsvFile(file: File): CsvIssue | null {
  if (!/\.csv$/i.test(file.name)) {
    return { code: "invalid_type", message: "Unsupported file format. Please upload a CSV file." };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { code: "too_large", message: "This file is larger than 5 MB. Please split it into smaller files and try again." };
  }
  return null;
}

const QUANTITY_COLUMNS = ["ordered_quantity", "sold_quantity", "current_stock", "supplier_lead_time"] as const;

function isValidQuantity(v: string) {
  return /^\d+(\.0+)?$/.test(v.trim());
}

function isValidDate(v: string) {
  return /^\d{4}-\d{2}(-\d{2})?$/.test(v.trim()) && !Number.isNaN(new Date(v.trim().length === 7 ? `${v}-01` : v).getTime());
}

/**
 * Parses and validates an inventory CSV in the browser with PapaParse.
 * Row numbers in messages count data rows (the header is not counted), matching what a
 * manager sees when they open the file in a spreadsheet and ignore the header line.
 */
export function parseInventoryCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalise,
      complete: (results) => resolve(validateParsed(file.name, file.size, results.meta.fields ?? [], results.data)),
      error: () =>
        resolve({
          ...emptyResult(file.name, file.size),
          issues: [{ code: "parse_error", message: "We couldn't read this file. Check that it is a comma-separated CSV and try again." }],
        }),
    });
  });
}

function emptyResult(fileName: string, sizeBytes: number): CsvParseResult {
  return {
    ok: false,
    fileName,
    sizeBytes,
    columns: [],
    missingRequired: [],
    presentOptional: [],
    unknownColumns: [],
    rows: [],
    records: [],
    issues: [],
    productCount: 0,
    dateRange: null,
  };
}

export function validateParsed(
  fileName: string,
  sizeBytes: number,
  fields: string[],
  data: Record<string, string>[],
): CsvParseResult {
  const result = emptyResult(fileName, sizeBytes);
  const columns = fields.filter(Boolean);
  result.columns = columns;
  result.rows = data;
  result.missingRequired = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  result.presentOptional = OPTIONAL_COLUMNS.filter((c) => columns.includes(c));
  result.unknownColumns = columns.filter(
    (c) => !(REQUIRED_COLUMNS as readonly string[]).includes(c) && !(OPTIONAL_COLUMNS as readonly string[]).includes(c),
  );

  if (columns.length === 0 || data.length === 0) {
    result.issues.push({ code: "empty", message: "The selected file contains no records." });
    return result;
  }
  for (const col of result.missingRequired) {
    result.issues.push({ code: "missing_column", column: col, message: `Missing required column: ${col}.` });
  }
  if (result.missingRequired.length) return result;

  const records: InventoryRecord[] = [];
  data.forEach((row, i) => {
    const rowNo = i + 1;
    for (const col of ["product_id", "product_name"] as const) {
      if (!row[col]?.trim()) {
        result.issues.push({ code: "invalid_value", row: rowNo, column: col, message: `Row ${rowNo} is missing a ${col} value.` });
      }
    }
    if (!isValidDate(row.date ?? "")) {
      result.issues.push({
        code: "invalid_value",
        row: rowNo,
        column: "date",
        message: `Row ${rowNo} contains an invalid date value. Use YYYY-MM-DD.`,
      });
    }
    for (const col of QUANTITY_COLUMNS) {
      const v = row[col];
      if (v === undefined || (v.trim() === "" && !(REQUIRED_COLUMNS as readonly string[]).includes(col))) continue;
      if (!isValidQuantity(v)) {
        result.issues.push({ code: "invalid_value", row: rowNo, column: col, message: `Row ${rowNo} contains an invalid ${col} value.` });
      }
    }
    if (row.unit_cost?.trim() && !/^\d+(\.\d+)?$/.test(row.unit_cost.trim())) {
      result.issues.push({ code: "invalid_value", row: rowNo, column: "unit_cost", message: `Row ${rowNo} contains an invalid unit_cost value.` });
    }
    records.push({
      product_id: row.product_id?.trim() ?? "",
      product_name: row.product_name?.trim() ?? "",
      date: row.date?.trim() ?? "",
      ordered_quantity: Number(row.ordered_quantity),
      sold_quantity: Number(row.sold_quantity),
      category: row.category?.trim() || undefined,
      current_stock: row.current_stock?.trim() ? Number(row.current_stock) : undefined,
      supplier_lead_time: row.supplier_lead_time?.trim() ? Number(row.supplier_lead_time) : undefined,
      unit_cost: row.unit_cost?.trim() ? Number(row.unit_cost) : undefined,
    });
  });

  result.records = records;
  result.productCount = new Set(records.map((r) => r.product_id)).size;
  const dates = records.map((r) => r.date).filter(Boolean).sort();
  result.dateRange = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
  result.ok = result.issues.length === 0;
  return result;
}

/** Fetch one of the bundled sample files from /public/samples and run it through the same parser. */
export async function loadSampleCsv(name: string): Promise<File> {
  const res = await fetch(`${import.meta.env.BASE_URL}samples/${name}`);
  const text = await res.text();
  return new File([text], name, { type: name.endsWith(".csv") ? "text/csv" : "text/plain" });
}

export function downloadCsv(fileName: string, rows: Record<string, unknown>[] | unknown[][], header?: string[]) {
  const csv = header ? Papa.unparse({ fields: header, data: rows as unknown[][] }) : Papa.unparse(rows as Record<string, unknown>[]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
