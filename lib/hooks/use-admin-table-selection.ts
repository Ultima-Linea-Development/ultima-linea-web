"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAdminTableSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirmIds, setBulkConfirmIds] = useState<string[] | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setBulkError("");
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    bulkConfirmIds,
    setBulkConfirmIds,
    bulkError,
    setBulkError,
    isBulkSubmitting,
    setIsBulkSubmitting,
    clearSelection,
  };
}

type UseAdminTableRowSelectionOptions = {
  visibleIds: string[];
  selectedIds: string[];
  onSelectionChange?: (ids: string[]) => void;
  selectableVisibleIds?: string[];
};

export function useAdminTableRowSelection({
  visibleIds,
  selectedIds,
  onSelectionChange,
  selectableVisibleIds,
}: UseAdminTableRowSelectionOptions) {
  const selectableIds = selectableVisibleIds ?? visibleIds;
  const selectedSet = new Set(selectedIds);
  const allVisibleSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = selectableIds.some((id) => selectedSet.has(id));
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  const handleToggleRow = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;
      if (selectedIds.includes(id)) {
        onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
        return;
      }
      onSelectionChange([...selectedIds, id]);
    },
    [onSelectionChange, selectedIds]
  );

  const handleToggleAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allVisibleSelected) {
      onSelectionChange(selectedIds.filter((id) => !selectableIds.includes(id)));
      return;
    }
    onSelectionChange(Array.from(new Set([...selectedIds, ...selectableIds])));
  }, [onSelectionChange, allVisibleSelected, selectedIds, selectableIds]);

  const isRowSelected = (id: string) => selectedSet.has(id);

  return {
    selectAllRef,
    allVisibleSelected,
    handleToggleRow,
    handleToggleAll,
    isRowSelected,
    selectedSet,
  };
}
