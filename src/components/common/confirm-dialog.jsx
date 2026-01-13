import * as React from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

export function ConfirmDialog({ open, onOpenChange, title = "Are you sure?", description, confirmText = "Confirm", variant = "destructive", onConfirm }) {
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    try {
      setBusy(true);
      await onConfirm?.();
      onOpenChange?.(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={busy}>
            {busy ? "Working…" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
