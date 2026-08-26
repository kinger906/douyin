export interface ModuleDefinition {
  id: string;
  isEnabled(flags: Record<string, boolean>): boolean;
}

export const liveModule: ModuleDefinition = {
  id: 'live',
  isEnabled(flags: Record<string, boolean>) {
    return flags.live === true;
  },
};
