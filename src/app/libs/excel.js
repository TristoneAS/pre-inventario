import * as XLSX from "xlsx";

function formatFecha(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date
    .toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .replace(" AM", " a.m.")
    .replace(" PM", " p.m.");
}

function cellValue(column, row) {
  if (column.key === "fecha") return formatFecha(row.fecha);
  if (column.key === "auditado") return Number(row.serial_auditado) ? "Sí" : "No";
  const value = row[column.key];
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

export function excelResponse({ filename, sheetName, columns, rows }) {
  const data = [
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => cellValue(column, row))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  const body = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

  return new Response(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
