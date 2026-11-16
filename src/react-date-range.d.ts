declare module "react-date-range" {
  import { ComponentType } from "react";
  export const DateRangePicker: ComponentType<{
    ranges: Array<{ startDate: Date; endDate: Date; key?: string }>;
    onChange: (item: { selection: { startDate: Date; endDate: Date } }) => void;
    [key: string]: unknown;
  }>;
  export const DateRange: ComponentType<unknown>;
  export const Calendar: ComponentType<unknown>;
  export const DefinedRange: ComponentType<unknown>;
}
