export const MENU_CSV_TEMPLATE_COLUMNS = [
  "menuDate",
  "rice",
  "sideDish",
  "fruit",
  "calories",
  "protein",
  "carbohydrate",
  "fat",
] as const;

export type MenuCsvTemplateColumn = (typeof MENU_CSV_TEMPLATE_COLUMNS)[number];

export interface ParsedMenuCsvRow {
  menuDate: string;
  rice: string | null;
  sideDish: string | null;
  fruit: string | null;
  calories: string | null;
  protein: string | null;
  carbohydrate: string | null;
  fat: string | null;
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

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
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

const validateHeaders = (headers: string[]) => {
  if (headers.length !== MENU_CSV_TEMPLATE_COLUMNS.length) {
    throw new CsvValidationError(
      `Kolom CSV tidak sesuai template. Gunakan kolom: ${MENU_CSV_TEMPLATE_COLUMNS.join(", ")}`,
    );
  }

  const normalizedHeaders = headers.map((header) => header.trim());
  const hasInvalidOrder = normalizedHeaders.some((header, index) => header !== MENU_CSV_TEMPLATE_COLUMNS[index]);

  if (hasInvalidOrder) {
    throw new CsvValidationError(
      `Kolom CSV tidak sesuai template. Gunakan kolom: ${MENU_CSV_TEMPLATE_COLUMNS.join(", ")}`,
    );
  }
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
  validateHeaders(headers);

  const rows: ParsedMenuCsvRow[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = splitCsvLine(line);

    if (cells.length !== MENU_CSV_TEMPLATE_COLUMNS.length) {
      throw new CsvValidationError(
        `Baris ${rowNumber}: jumlah kolom tidak sesuai template (${MENU_CSV_TEMPLATE_COLUMNS.length} kolom)`
      );
    }

    if (cells.every((cell) => cell.length === 0)) {
      return;
    }

    const [menuDate, rice, sideDish, fruit, calories, protein, carbohydrate, fat] = cells;

    if (!isValidDate(menuDate)) {
      throw new CsvValidationError(`Baris ${rowNumber}: menuDate harus berformat YYYY-MM-DD`);
    }

    rows.push({
      menuDate,
      rice: normalizeOptionalText(rice),
      sideDish: normalizeOptionalText(sideDish),
      fruit: normalizeOptionalText(fruit),
      calories: normalizeNumericCell(calories, "calories", rowNumber),
      protein: normalizeNumericCell(protein, "protein", rowNumber),
      carbohydrate: normalizeNumericCell(carbohydrate, "carbohydrate", rowNumber),
      fat: normalizeNumericCell(fat, "fat", rowNumber),
    });
  });

  if (!rows.length) {
    throw new CsvValidationError("File CSV tidak memiliki data menu yang valid");
  }

  return rows;
};
