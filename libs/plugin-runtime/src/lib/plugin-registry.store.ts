import { Injectable, signal } from '@angular/core';
import { PluginLoadState } from './plugin-runtime.types';

export interface PluginRegistryEntry {
  pluginKey: string;
  state: PluginLoadState;
  loadedAt?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class PluginRegistryStore {
  private readonly entriesSignal = signal<Record<string, PluginRegistryEntry>>({});
  readonly entries = this.entriesSignal.asReadonly();

  setState(pluginKey: string, state: PluginLoadState, error?: string): void {
    this.entriesSignal.update((entries) => ({
      ...entries,
      [pluginKey]: {
        pluginKey,
        state,
        loadedAt: state === 'active' ? new Date().toISOString() : entries[pluginKey]?.loadedAt,
        error,
      },
    }));
  }

  state(pluginKey: string): PluginLoadState | undefined {
    return this.entriesSignal()[pluginKey]?.state;
  }
}
