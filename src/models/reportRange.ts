export function reportRangeError(from: string, to: string): string {
  const date = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  if (!date(from) || !date(to)) return "Selecciona ambas fechas válidas.";
  if (to < from) return "Hasta no puede ser anterior a Desde.";
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 365)
    return "El período no puede superar 366 días.";
  return "";
}
