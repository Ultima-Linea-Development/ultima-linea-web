"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const UNDO_TOAST_DURATION = 5000;

type PendingTask = {
  restore: () => void;
  commit: () => Promise<void>;
};

export function usePendingDelete() {
  const pendingRef = useRef<PendingTask | null>(null);
  const [deleteToast, setDeleteToast] = useState("");

  const commitPending = useCallback(async () => {
    const task = pendingRef.current;
    pendingRef.current = null;
    if (!task) return;
    await task.commit();
  }, []);

  const flushPendingDelete = useCallback(async () => {
    if (!pendingRef.current) {
      setDeleteToast("");
      return;
    }
    setDeleteToast("");
    await commitPending();
  }, [commitPending]);

  const scheduleDelete = useCallback(
    async (options: {
      message: string;
      restore: () => void;
      commit: () => Promise<void>;
    }) => {
      if (pendingRef.current) {
        await flushPendingDelete();
      }

      pendingRef.current = {
        restore: options.restore,
        commit: options.commit,
      };
      setDeleteToast(options.message);
    },
    [flushPendingDelete]
  );

  const undoDelete = useCallback(() => {
    const task = pendingRef.current;
    if (!task) {
      setDeleteToast("");
      return;
    }

    task.restore();
    pendingRef.current = null;
    setDeleteToast("");
  }, []);

  const dismissDeleteToast = useCallback(() => {
    void flushPendingDelete();
  }, [flushPendingDelete]);

  useEffect(() => {
    return () => {
      void commitPending();
    };
  }, [commitPending]);

  return {
    deleteToast,
    undoDuration: UNDO_TOAST_DURATION,
    scheduleDelete,
    undoDelete,
    dismissDeleteToast,
    flushPendingDelete,
  };
}
