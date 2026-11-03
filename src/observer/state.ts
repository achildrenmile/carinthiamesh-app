import { signal } from '@preact/signals'

export type ObserverState = 'off' | 'connecting' | 'online' | 'offline' | 'error'
export const observerState = signal<ObserverState>('off')
export const observerStats = signal({ sent: 0, buffered: 0, dropped: 0, lastError: '' })
