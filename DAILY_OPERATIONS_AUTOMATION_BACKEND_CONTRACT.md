# Daily Operations Automation Backend Contract

This document outlines the API service paths, payload definitions, response schemas, status transitions, invalidation rules, and usage requirements for the exception-driven Daily Operations control center.

---

## 1. Endpoints & Payloads

All endpoints belong to the `ops` base namespace and target a specific operational date/warehouse combination or operation instance.

### 1.1 `openOperation`
*   **Method**: `POST`
*   **Path**: `/ops/daily-operations/open`
*   **Description**: Authoritatively opens the daily operational session for a specific warehouse and date. If the session doesn't exist, it is initialized.
*   **Payload**:
    ```json
    {
      "warehouse_id": "string (UUID)",
      "delivery_date": "string (YYYY-MM-DD)"
    }
    ```
*   **Response**:
    ```json
    {
      "operation": {
        "id": "uuid-1234",
        "warehouse_id": "wh-uuid",
        "warehouse_name": "Surat Main",
        "delivery_date": "2026-07-23",
        "status": "open",
        "opened_at": "2026-07-22T20:00:00Z"
      }
    }
    ```

### 1.2 `confirmCleanPacking`
*   **Method**: `POST`
*   **Path**: `/ops/daily-operations/:operationId/orders/:orderId/confirm-clean-packing`
*   **Description**: Atomically marks all packing items inside an order as verified, sets missing and damaged quantities to 0, updates the order status to `packed`, and triggers sequence event audits.
*   **Payload**: Empty
*   **Response**:
    ```json
    {
      "order_id": "uuid",
      "status": "packed",
      "packed_items_count": 5,
      "audit_logged": true
    }
    ```

### 1.3 `generateDeliveryPlan`
*   **Method**: `POST`
*   **Path**: `/ops/daily-operations/:operationId/delivery-plan/generate`
*   **Description**: Asynchronously evaluates coordinates and customer density to compile an optimal route plan and proposed rider runs.
*   **Payload**: Empty
*   **Response**:
    ```json
    {
      "status": "generated",
      "proposed_runs_count": 4,
      "unassigned_orders_count": 0
    }
    ```

### 1.4 `proposedDeliveryPlan`
*   **Method**: `GET`
*   **Path**: `/ops/daily-operations/:operationId/delivery-plan/proposed`
*   **Description**: Returns the currently calculated proposed plan.
*   **Response**:
    ```json
    {
      "proposed_runs": [
        {
          "rider_id": "rider-uuid",
          "rider_name": "Ramesh Kumar",
          "orders_count": 8,
          "areas_covered": ["Adajan", "Pal"],
          "expected_cod_paise": 150000,
          "estimated_duration_mins": 90
        }
      ],
      "unassigned_orders_count": 0
    }
    ```

### 1.5 `approveDeliveryPlan`
*   **Method**: `POST`
*   **Path**: `/ops/daily-operations/:operationId/delivery-plan/approve`
*   **Description**: Approves the proposed plan, authoritatively creating active Delivery Runs and assigning their riders.
*   **Payload**: Empty
*   **Response**:
    ```json
    {
      "status": "approved",
      "created_runs_count": 4
    }
    ```

### 1.6 `reconcileCodVariance`
*   **Method**: `POST`
*   **Path**: `/ops/daily-operations/:operationId/runs/:runId/reconcile-cod`
*   **Description**: Reconciles cash variance for a driver run. Used only when reported cash differs from expected cash.
*   **Payload**:
    ```json
    {
      "reported_cod_paise": 150000,
      "handed_over_cod_paise": 150000,
      "notes": "Difference resolved via UPI"
    }
    ```
*   **Response**:
    ```json
    {
      "run_id": "uuid",
      "reconciled": true,
      "cod_variance_paise": 0
    }
    ```

### 1.7 `evaluateAutoClose`
*   **Method**: `POST`
*   **Path**: `/ops/daily-operations/:operationId/evaluate-auto-close`
*   **Description**: Evaluates readiness conditions (procurement complete, packing complete, dispatches handed over, COD reconciled) and closes the daily operation if criteria are met.
*   **Payload**: Empty
*   **Response**:
    ```json
    {
      "status": "closed",
      "auto_closed": true
    }
    ```

---

## 2. Order Status Transitions

The system operates strictly on the following state flow:

```
[ placed ] (Unlocked Draft State)
    │
    ▼ (Triggered by Lock Orders)
[ locked ] (Demand Finalized & Procurement forecast Frozen)
    │
    ▼ (Triggered by Start Packing)
[ accepted ] (Packing in Progress)
    │
    ▼ (Triggered by Complete Packing / Confirm Clean Packing)
[ packed ] (Verified and ready for dispatch run loading)
    │
    ▼ (Triggered by Rider Handover)
[ out_for_delivery ] (Rider Dispatched)
    │
    ├──────────────────────────┐
    ▼ (Successful delivery)    ▼ (Rider reported issue)
[ delivered ]              [ failed / returned ]
```

---

## 3. Query Key Invalidations

Mutations triggered in Daily Operations MUST invalidate the following query scopes to maintain a reactive control center:

| Mutation | Query Keys Invalidated |
| :--- | :--- |
| `confirmCleanPacking` | `["ops", "dailyOperations"]`, `["ops", "orders"]` |
| `generateDeliveryPlan` | `["ops", "dailyOperations"]`, `["ops", "dailyOperations", "proposedDeliveryPlan"]` |
| `approveDeliveryPlan` | `["ops", "dailyOperations"]`, `["ops", "orders"]`, `["reports"]`, `["dashboard"]` |
| `reconcileCodVariance` | `["ops", "dailyOperations"]`, `["reports"]` |
| `evaluateAutoClose` | `["ops", "dailyOperations"]`, `["dashboard"]` |
