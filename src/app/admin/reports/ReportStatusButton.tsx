"use client";

import { useTransition } from "react";
import { setReportStatus } from "../actions";
import { btnGhostCls } from "../ui";

export function ReportStatusButton({ id, status }: { id: number; status: "open" | "closed" }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className={btnGhostCls}
      onClick={() => start(() => setReportStatus(id, status === "open" ? "closed" : "open"))}
    >
      {status === "open" ? "Close" : "Reopen"}
    </button>
  );
}
