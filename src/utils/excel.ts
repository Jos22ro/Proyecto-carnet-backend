import ExcelJS from "exceljs";

export function buildMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0);
  return { start, end };
}

export function autosizeColumns(worksheet: ExcelJS.Worksheet, min = 12, max = 40) {
  worksheet.columns.forEach((col) => {
    let longest = col.header ? String(col.header).length : min;

    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const v: any = cell.value;
      const len = v == null ? 0 : String(v).length;
      if (len > longest) longest = len;
    });

    col.width = Math.max(min, Math.min(max, longest + 2));
  });
}
