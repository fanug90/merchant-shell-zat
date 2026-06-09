export type PluginLoadState =
  | 'loading'
  | 'active'
  | 'not-installed'
  | 'suspended'
  | 'incompatible'
  | 'failed';

export class PluginLoadError extends Error {
  constructor(message: string, public readonly pluginKey: string) {
    super(message);
    this.name = 'PluginLoadError';
  }
}
