export type AddOnService = {
  name: string;
  flag: boolean;
  amount: number;
};

function asRecord(source: unknown): Record<string, unknown> | null {
  if (typeof source === "string") {
    try {
      return asRecord(JSON.parse(source));
    } catch {
      return null;
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  return source as Record<string, unknown>;
}

function readList(source: unknown): unknown[] {
  if (Array.isArray(source)) return source;
  const record = asRecord(source);
  if (!record) return [];
  if (Array.isArray(record.addOnServices)) return record.addOnServices;
  const extra = asRecord(record.extraDetails);
  if (extra && Array.isArray(extra.addOnServices)) return extra.addOnServices;
  return [];
}

/** Catalog from a fare-search card, or the services stored on a booking. */
export function listAddOnServices(source: unknown): AddOnService[] {
  return readList(source)
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const amount = Number(row.amount);
      return {
        name: String(row.name || "").trim(),
        flag: row.flag === true || row.flag === "true",
        amount: Number.isFinite(amount) ? amount : 0,
      };
    })
    .filter((item) => item.name);
}

export function availableAddOnServices(source: unknown): AddOnService[] {
  return listAddOnServices(source).filter((item) => item.flag);
}

export function addOnTotal(selected: AddOnService[]): number {
  return selected.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function numberOrNull(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** Selected add-ons stored on a booking, including a JSON-string extraDetails. */
export function readBookedAddOns(extraDetails: unknown) {
  const record = asRecord(extraDetails);
  const services = listAddOnServices(record);
  return {
    services,
    addOnTotal: numberOrNull(record?.addOnTotal) ?? addOnTotal(services),
    fareBeforeAddOns: numberOrNull(record?.fareBeforeAddOns),
  };
}
