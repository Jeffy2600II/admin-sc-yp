"use client";

import { BottomSheetProvider } from "./bottom-sheet";

export function BottomSheetProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BottomSheetProvider>{children}</BottomSheetProvider>;
}
