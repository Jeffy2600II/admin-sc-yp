"use client";

import { RequestsView } from "./requests-view";

interface RequestDetailViewProps {
  requestId: string;
}

/**
 * Request detail view — wraps RequestsView and auto-opens the detail
 * bottom sheet for the given requestId on mount.
 */
export function RequestDetailView({ requestId }: RequestDetailViewProps) {
  return <RequestsView autoOpenRequestId={requestId} />;
}
