export const MENU_CSV_TEMPLATE_COLUMNS = [
  "menuDate",
  "rice",
  "sideDish",
  "fruit",
] as const;

export type MenuCsvTemplateColumn = (typeof MENU_CSV_TEMPLATE_COLUMNS)[number];

export interface ParsedMenuCsvRow {
  menuDate: string;
  rice: string | null;
  sideDish: string | null;
  fruit: string | null;
  calories?: string | null;
  protein?: string | null;
  carbohydrate?: string | null;
  fat?: string | null;
  fiber?: string | null;
}

export interface ParsedNutritionCsvRow {
  menuDate: string;
  calories: string | null;
  protein: string | null;
  carbohydrate: string | null;
  fat: string | null;
  fiber: string | null;
}

export class CsvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvValidationError";
  }
}

const normalizeCell = (value: string) => value.trim();

const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(currentCell);
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  cells.push(currentCell);
  return cells.map(normalizeCell);
};

const isValidIsoDate = (isoDate: string): boolean => {
  const parsedDate = new Date(`${isoDate}T00:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) return false;
  if (parsedDate.toISOString().slice(0, 10) !== isoDate) return false;

  return true;
};

const parseFlexibleDateToIso = (value: string): string | null => {
  const trimmedValue = value.trim().replace(/^["']|["']$/g, "");
  if (!trimmedValue.length) return null;

  const normalizedValue = trimmedValue
    .replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, "")
    .replace(/[.]/g, "-")
    .trim();

  const dayMonthYearMatch = normalizedValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayMonthYearMatch) {
    const [, first, second, yyyy] = dayMonthYearMatch;
    const firstNum = Number(first);
    const secondNum = Number(second);

    // Support DD/MM/YYYY and MM/DD/YYYY.
    // If one side > 12, that side is day. If both <= 12, default to DD/MM.
    let dd = first;
    let mm = second;
    if (firstNum <= 12 && secondNum > 12) {
      mm = first;
      dd = second;
    }

    const isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    return isValidIsoDate(isoDate) ? isoDate : null;
  }

  const yyyyMmDdMatch = normalizedValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yyyyMmDdMatch) {
    const [, yyyy, mm, dd] = yyyyMmDdMatch;
    const isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    return isValidIsoDate(isoDate) ? isoDate : null;
  }

  // Excel serial date (e.g. 45418)
  if (/^\d{4,6}(\.\d+)?$/.test(normalizedValue)) {
    const serial = Number(normalizedValue);
    if (!Number.isNaN(serial) && serial > 0) {
      const excelEpochMs = Date.UTC(1899, 11, 30);
      const wholeDays = Math.floor(serial);
      const date = new Date(excelEpochMs + wholeDays * 86400000);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      const isoDate = `${yyyy}-${mm}-${dd}`;
      if (isValidIsoDate(isoDate)) return isoDate;
    }
  }

  // Fallback for locale/text dates (e.g. 06-May-2026, 2026/5/6 00:00:00)
  const parsed = new Date(normalizedValue);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getUTCFullYear();
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getUTCDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;
    if (isValidIsoDate(isoDate)) return isoDate;
  }

  return null;
};

const normalizeOptionalText = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue.length ? trimmedValue : null;
};

const normalizeNumericCell = (value: string, fieldName: string, rowNumber: number) => {
  const trimmedValue = value.trim();

  if (!trimmedValue.length) {
    return null;
  }

  if (Number.isNaN(Number(trimmedValue))) {
    throw new CsvValidationError(`Baris ${rowNumber}: kolom ${fieldName} harus berupa angka`);
  }

  return trimmedValue;
};

const MENU_CSV_TEMPLATE_COLUMNS_WITH_NUTRITION = [
  "menuDate",
  "rice",
  "sideDish",
  "fruit",
  "calories",
  "protein",
  "carbohydrate",
  "fat",
  "fiber",
] as const;

type MenuCsvMode = "menu_only" | "menu_with_nutrition";

const validateHeaders = (headers: string[]): MenuCsvMode => {
  const normalizedHeaders = headers.map((header) => header.trim());
  const isMenuOnly =
    normalizedHeaders.length === MENU_CSV_TEMPLATE_COLUMNS.length &&
    normalizedHeaders.every((header, index) => header === MENU_CSV_TEMPLATE_COLUMNS[index]);

  if (isMenuOnly) return "menu_only";

  const isMenuWithNutrition =
    normalizedHeaders.length === MENU_CSV_TEMPLATE_COLUMNS_WITH_NUTRITION.length &&
    normalizedHeaders.every((header, index) => header === MENU_CSV_TEMPLATE_COLUMNS_WITH_NUTRITION[index]);

  if (isMenuWithNutrition) return "menu_with_nutrition";

  throw new CsvValidationError(
    `Kolom CSV tidak sesuai template. Gunakan kolom: ${MENU_CSV_TEMPLATE_COLUMNS.join(", ")} atau ${MENU_CSV_TEMPLATE_COLUMNS_WITH_NUTRITION.join(", ")}`
  );
};

export const parseMenuCsvContent = (content: string): ParsedMenuCsvRow[] => {
  const normalizedContent = content.replace(/^\uFEFF/, "").trim();

  if (!normalizedContent.length) {
    throw new CsvValidationError("File CSV kosong");
  }

  const lines = normalizedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    throw new CsvValidationError("File CSV kosong");
  }

  const headers = splitCsvLine(lines[0]);
  const mode = validateHeaders(headers);

  const rows: ParsedMenuCsvRow[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = splitCsvLine(line);

    const expectedColumns = mode === "menu_only"
      ? MENU_CSV_TEMPLATE_COLUMNS.length
      : MENU_CSV_TEMPLATE_COLUMNS_WITH_NUTRITION.length;

    if (cells.length !== expectedColumns) {
      throw new CsvValidationError(
        `Baris ${rowNumber}: jumlah kolom tidak sesuai template (${expectedColumns} kolom)`
      );
    }

    if (cells.every((cell) => cell.length === 0)) {
      return;
    }

    const [menuDate, rice, sideDish, fruit, calories, protein, carbohydrate, fat, fiber] = cells;

    const normalizedMenuDate = parseFlexibleDateToIso(menuDate);
    if (!normalizedMenuDate) {
      throw new CsvValidationError(`Baris ${rowNumber}: menuDate tidak valid ("${menuDate}")`);
    }

    const parsedRow: ParsedMenuCsvRow = {
      menuDate: normalizedMenuDate,
      rice: normalizeOptionalText(rice),
      sideDish: normalizeOptionalText(sideDish),
      fruit: normalizeOptionalText(fruit),
    };

    if (mode === "menu_with_nutrition") {
      parsedRow.calories = normalizeNumericCell(calories ?? "", "calories", rowNumber);
      parsedRow.protein = normalizeNumericCell(protein ?? "", "protein", rowNumber);
      parsedRow.carbohydrate = normalizeNumericCell(carbohydrate ?? "", "carbohydrate", rowNumber);
      parsedRow.fat = normalizeNumericCell(fat ?? "", "fat", rowNumber);
      parsedRow.fiber = normalizeNumericCell(fiber ?? "", "fiber", rowNumber);
    }

    rows.push(parsedRow);
  });

  if (!rows.length) {
    throw new CsvValidationError("File CSV tidak memiliki data menu yang valid");
  }

  return rows;
};

const NUTRITION_CSV_TEMPLATE_COLUMNS = [
  "menuDate",
  "calories",
  "protein",
  "carbohydrate",
  "fat",
  "fiber",
] as const;

export const parseNutritionCsvContent = (content: string): ParsedNutritionCsvRow[] => {
  const normalizedContent = content.replace(/^\uFEFF/, "").trim();

  if (!normalizedContent.length) {
    throw new CsvValidationError("File CSV kosong");
  }

  const lines = normalizedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    throw new CsvValidationError("File CSV kosong");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  if (
    headers.length !== NUTRITION_CSV_TEMPLATE_COLUMNS.length ||
    headers.some((header, index) => header !== NUTRITION_CSV_TEMPLATE_COLUMNS[index])
  ) {
    throw new CsvValidationError(
      `Kolom CSV nutrisi tidak sesuai template. Gunakan kolom: ${NUTRITION_CSV_TEMPLATE_COLUMNS.join(", ")}`
    );
  }

  const rows: ParsedNutritionCsvRow[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = splitCsvLine(line);

    if (cells.length !== NUTRITION_CSV_TEMPLATE_COLUMNS.length) {
      throw new CsvValidationError(
        `Baris ${rowNumber}: jumlah kolom tidak sesuai template (${NUTRITION_CSV_TEMPLATE_COLUMNS.length} kolom)`
      );
    }

    if (cells.every((cell) => cell.length === 0)) return;

    const [menuDate, calories, protein, carbohydrate, fat, fiber] = cells;
    const normalizedMenuDate = parseFlexibleDateToIso(menuDate);
    if (!normalizedMenuDate) {
      throw new CsvValidationError(`Baris ${rowNumber}: menuDate tidak valid ("${menuDate}")`);
    }

    rows.push({
      menuDate: normalizedMenuDate,
      calories: normalizeNumericCell(calories, "calories", rowNumber),
      protein: normalizeNumericCell(protein, "protein", rowNumber),
      carbohydrate: normalizeNumericCell(carbohydrate, "carbohydrate", rowNumber),
      fat: normalizeNumericCell(fat, "fat", rowNumber),
      fiber: normalizeNumericCell(fiber, "fiber", rowNumber),
    });
  });

  if (!rows.length) {
    throw new CsvValidationError("File CSV tidak memiliki data nutrisi yang valid");
  }

  return rows;
};



