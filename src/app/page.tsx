'use client';

import dynamic from 'next/dynamic';
import { useHashRouter } from '@/hooks/useHashRouter';
import { EntityDetailView } from '@/components/entity/EntityDetailView';

const GraphView = dynamic(() => import('@/components/graph/GraphView'), { ssr: false });

export default function Home() {
  const { route } = useHashRouter();

  if (route.startsWith('/entities/')) {
    const entityId = decodeURIComponent(route.replace('/entities/', ''));
    return <EntityDetailView entityId={entityId} />;
  }

  const viewMode = route.startsWith('/table') ? 'table' : 'graph';
  return <GraphView viewMode={viewMode} />;
}
