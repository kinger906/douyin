export interface ModuleDefinition {
  id: string;
  isEnabled(flags: Record<string, boolean>): boolean;
}

export const shopModule: ModuleDefinition = {
  id: 'shop',
  isEnabled(flags: Record<string, boolean>) {
    return flags.shop === true;
  },
};
