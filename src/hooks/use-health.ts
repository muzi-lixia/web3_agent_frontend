import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { mockHealth } from '@/lib/mock';
import { useAppStore } from '@/store/app-store';
import type { HealthPayload } from '@/types';

export interface BackendStatus {
  health: HealthPayload | null;
  ready: 'ready' | 'not_ready' | 'unknown';
  latencyMs: number;
  online: boolean;
  mock: boolean;
  error?: string;
}

export function useBackendHealth() {
  const mockMode = useAppStore((state) => state.mockMode);

  const healthQuery = useQuery({
    queryKey: ['health', 'summary', mockMode],
    queryFn: async (): Promise<BackendStatus> => {
      if (mockMode) {
        return {
          health: mockHealth(),
          ready: 'ready',
          latencyMs: 9,
          online: true,
          mock: true,
        };
      }
      try {
        const result = await api.health();
        return {
          health: result.data,
          ready: 'unknown',
          latencyMs: result.latencyMs,
          online: true,
          mock: false,
        };
      } catch (error) {
        return {
          health: null,
          ready: 'unknown',
          latencyMs: 0,
          online: false,
          mock: false,
          error: error instanceof Error ? error.message : '服务不可达',
        };
      }
    },
    refetchInterval: 30_000,
    retry: 0,
    staleTime: 10_000,
  });

  const readyQuery = useQuery({
    queryKey: ['health', 'ready', mockMode],
    queryFn: async (): Promise<'ready' | 'not_ready' | 'unknown'> => {
      if (mockMode) return 'ready';
      try {
        const result = await api.ready();
        return result.data.status;
      } catch {
        return 'unknown';
      }
    },
    refetchInterval: 120_000,
    retry: 0,
    staleTime: 60_000,
  });

  const status = healthQuery.data;
  return {
    status: status
      ? { ...status, ready: status.mock ? status.ready : (readyQuery.data ?? 'unknown') }
      : null,
    isLoading: healthQuery.isLoading,
    refetch: healthQuery.refetch,
  };
}
