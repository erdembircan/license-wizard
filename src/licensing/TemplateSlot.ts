export type TemplateSlot = {
  token: string;
  label: string;
};

export type SlotResolution = {
  values: Record<string, string>;
  missing: TemplateSlot[];
  unknown: string[];
};
