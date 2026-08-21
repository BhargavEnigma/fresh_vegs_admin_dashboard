const TERMINAL_PROCUREMENT_STATUSES = new Set(["completed", "not_required"]);

const quantity = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function getProcurementActionFlow({
  item,
  isAdmin,
  isClosed,
  isUpdating,
  vendorManaged,
  assignmentsLocked,
  assignments = [],
}) {
  const status = item?.procurement_status || "pending";
  const isTerminal = TERMINAL_PROCUREMENT_STATUSES.has(status);
  const canMutate = Boolean(isAdmin && !isClosed && !isUpdating);
  const required = quantity(item?.required_quantity);
  const purchased = quantity(item?.purchased_quantity);

  const manualExecution = canMutate && !vendorManaged && !isTerminal;
  const canOpenVendorCheckIn =
    canMutate &&
    vendorManaged &&
    !isTerminal &&
    assignments.some((assignment) =>
      assignment?.status === "dispatched"
    );
  const canMarkPurchasedExact = manualExecution && required > 0 && purchased !== required;
  const canMarkReceivedExact = manualExecution && purchased > 0;
  const canEditInline = manualExecution;
  const canEditDetails = manualExecution;
  const canAssignVendor =
    canMutate && !isTerminal && !assignmentsLocked && !item?.has_unlocked_orders;

  return {
    canMarkPurchasedExact,
    canMarkReceivedExact,
    canEditInline,
    canEditDetails,
    canAssignVendor,
    canOpenVendorCheckIn,
    purchasedExactReason: vendorManaged
      ? "Purchased quantity comes from confirmed vendor assignments"
      : isTerminal
        ? "This procurement item is already finalized"
        : required <= 0
          ? "A target quantity is required first"
          : purchased === required
            ? "Purchased quantity already matches the target"
            : "Set purchased quantity exactly to the target",
    receivedExactReason: vendorManaged
      ? "Receive this item through Receive Goods"
      : isTerminal
        ? "This procurement item is already finalized"
        : purchased <= 0
          ? "Confirm the purchased quantity first"
          : "Set received quantity to the purchased quantity and complete procurement",
    editReason: vendorManaged
      ? "Vendor-managed execution is updated through Receive Goods"
      : isTerminal
        ? "This procurement item is already finalized"
        : "Edit procurement quantities",
    assignReason: (required <= 0 || status === "not_required")
      ? "Stock from warehouse fresh inventory already covers this requirement"
      : item?.has_unlocked_orders
        ? "Orders containing this item must be locked before assigning vendor"
        : assignmentsLocked
          ? "Vendor assignments are locked after vendor confirmation"
          : isTerminal
            ? "This procurement item is already finalized"
            : vendorManaged
              ? "Edit vendor assignment before confirmation"
              : "Assign a vendor",
  };
}

export function getProcurementDisplayStatus(item, assignments = []) {
  const backendStatus = item?.procurement_status || "pending";
  if (TERMINAL_PROCUREMENT_STATUSES.has(backendStatus) || assignments.length === 0) {
    return backendStatus;
  }

  const active = assignments.filter(
    (assignment) => !["cancelled", "rejected"].includes(assignment?.status)
  );
  if (active.length === 0) return backendStatus;

  if (active.every((assignment) => assignment.status === "received")) {
    const required = Number(item?.required_quantity || 0);
    const received = active.reduce((sum, a) => sum + Number(a.received_quantity || 0), 0);
    if (required > 0 && received < required) {
      return "partial";
    }
    return "completed";
  }
  if (active.some((assignment) => assignment.status === "received")) {
    return "partial";
  }

  const vendorFlow = [
    "dispatched",
    "confirmed",
    "approved",
    "quoted",
    "pending_quote",
    "assigned",
  ];
  return vendorFlow.find((status) =>
    active.some((assignment) => assignment.status === status)
  ) || backendStatus;
}
