# DailyVeg Admin Panel — Daily Operations Documentation

Aa document ma DailyVeg Admin Panel ma nava umerayela **Daily Operations Workspace** ni badhi j jankari, pratyek tab nu kaam, ane user roles (`admin` vs `warehouse_manager`) ni sachi mahiti aavel chhe.

---

## 1. Daily Operations Sha mate Che? (Why Daily Operations Exists)

DailyVeg e fresh vegetables ane daily grocery delivery app chhe. Roj sakh-bhaaji ane orders nu management karvu aek avghad kaam chhe. 

Phela aa badhi vastu alag alag screens par thi karvi padti hati. Have **Daily Operations** ek centralised workspace aape chhe jya thi:

* roj ketla orders aavya ane ketla orders lock thaya te khabar pade.
* mandi ma thi ketli vstu kharedvani chhe (Procurement) ane ketli aavi te track thai.
* warehouse ma items packing thai chhe ke nahi ane ketla incomplete packing chhe te dekhay.
* delivery partners (riders) mate delivery runs banavi ane emne orders handover thai.
* rider pase thi COD cash ketlo aavyo ane ketlo baaki chhe (COD Cash Reconciliation) te tally thai.
* kaini pan problem hoy (Payment failed, item shortage, delivery failed) to Exception ma track thai.
* divas na ante aakho divas close thai ane audit history joi shakay.

---

## 2. Page Nu Step-by-Step Overview

Daily Operations page ma top par ane badhi tabs ma aam kaam thai chhe:

### A. Top Navigation Header & Controls
1. **Delivery Date Selector**:
   * Quick buttons: `Today`, `Tomorrow`, `Prev`, `Next`.
   * Delivery Veg ma roj aavta divas (Tomorrow) na orders ni taiyari phela thi karvani hoy chhe, etle default Tomorrow select rehse, pan Today par ek click ma jai shakay chhe.
2. **Warehouse Selector**:
   * `admin` role mate badha warehouses nu dropdown aavse.
   * `warehouse_manager` mate emne assigned maathi pelethi warehouse auto-select thai jase.
3. **Refresh Ops Button**:
   * Aa button dabavathi backend ma refreshed operational statistics aavse. Aa mutation chalua hoy tyare button disable thai jaye chhe.
4. **Operation Status & Last Refreshed Time**:
   * Operational Status batavse: `open`, `closing_blocked`, `closed`, ya `reopened`.
   * Last refreshed IST time batavse.

---

## 3. Role and Work of Each Tab

Daily Operations page ma kul 7 tabs aavel chhe. Har ek tab nu potanu alag role ane kaam chhe:

---

### Tab 1: Overview Tab
* **Role/Purpose**: Divas ni aakhi operational status ek j screen par saral rite jova mate.
* **Kaam (Work)**:
  1. **8 Operational Stage Cards**:
     * Order Lock, Procurement, Packing, Dispatch & Runs, Delivery Execution, Operational Exceptions, COD Reconciliation, ane Daily Closing.
     * Pratyek card ma live backend status (`completed`, `in_progress`, `attention`, `not_started`), completed/total counts, ane blockers batavse.
  2. **Operational Metrics Cards**:
     * Total Orders, Locked, Unlocked, Accepted/Packing, Packed, Out for Delivery, Delivered, Delivery Failed, Unassigned, Open Exceptions, High/Critical Exceptions, Active Delivery Runs.
     * Koi pan card par click karvathi direct **OPS Orders** page par te specific filter sathe jova male chhe.
  3. **Delivery Partner Workload**:
     * Kai rider pase ketla total orders assigned chhe, ketla delivered thaya, ane ketla pending/failed chhe te live batavse.
  4. **Financial Summary Card** (Fakt `admin` mate):
     * Total sales, online paid, expected COD, procurement cost, general cost, ane estimated operating margin batavse.

---

### Tab 2: Procurement Tab
* **Role/Purpose**: Warehouse mate khet-mandi ya vendor pase thi ketli items kharedvani ane praapt thai te track karva mate.
* **Kaam (Work)**:
  1. **Procurement Items List**:
     * Product name, Pack label, Required Qty, Purchased Qty, Received Qty, Rejected Qty, Procurement Waste, Shortage, Excess, Unit Cost, Total Cost, Vendor Name, Bill Ref, Status (`pending`, `partial`, `completed`, `issue`, `not_required`), ane Notes.
  2. **Quick Shortcuts**:
     * `Pur. Exact`: Required quantity jitli j Purchased Qty fill thai jaye chhe.
     * `Rec. Exact`: Purchased/Required quantity jitli j Received Qty fill thai jaye chhe ane status `completed` thai jaye chhe.
  3. **Single Edit & Bulk Save**:
     * Pratyek row no edit button hoy chhe jya thi quantity, unit cost in rupees, vendor name, bill reference fill thai shake chhe.
     * Badhi rows ma direct numbers change kari ne **Save Drafts** button thi ek sathe bulk update kari shakay chhe.
  4. **Search & Filters**:
     * Product/Pack/Vendor search, Status Filter, ane `Shortage Only` filter button.
  5. **Print Execution Sheet**:
     * **Print Execution Sheet** button par click karvathi A4 portrait format ma mandi ma lai java mate printable procurement list ready thai jaye chhe.

---

### Tab 3: Packing Tab
* **Role/Purpose**: Warehouse packing team mate orders pac-pack karva ane box status clear karva mate.
* **Kaam (Work)**:
  1. **Grouped Order Cards**:
     * Backend mathi aavta flat items ne frontend ma `order_id` thi group karvama aave chhe.
     * Dynamic Progress Bar batavse (e.g. 3/5 items packed - 60%).
  2. **Order Identification Hierarchy**:
     * Order par Daily Order Number (`#001`), Operational Order Code (`DV-XXXX`), Customer reference number, ane Customer name display thai chhe.
  3. **Start Packing Button**:
     * Order locked status ma hoy to `Start Packing` dabavathi order `accepted` status ma fero thai jaye chhe.
  4. **Packing Item Edit Modal**:
     * Packed Qty, Missing Qty, Damaged Qty, ane Note input kari shakay chhe. `Exact` shortcut thi 1-click packing thai shake chhe.
  5. **Complete Packing Button**:
     * Jyare badha items packed thai jaye tyare order status `packed` ma move thai jaye chhe.
     * Jo koi item incomplete hoy ane `admin` force-complete karva mange to **Admin Override Reason** compulsory aavse.
  6. **Print Packing Slip**:
     * Order wise **Print Slip** button thi customer box par lagavva mate printable packing slip print thai shake chhe.

---

### Tab 4: Dispatch & Runs Tab
* **Role/Purpose**: Delivery partners (riders) mate delivery runs banavava, orders assign karva, route sequence reorder karva ane rider ne handover karva mate.
* **Kaam (Work)**:
  1. **Create Delivery Run**:
     * Selected delivery date ane warehouse mate rider (Delivery Partner) select kari ne navo run banavayi shakay chhe.
  2. **Add Packed Orders**:
     * Warehouse ma ready thaye la packed orders ne run ma add kari shakay chhe (Je order biji koi run ma na hoy te j list ma aavse).
  3. **Sequence Reorder**:
     * Up / Down buttons thi rider mate delivery delivery order sequence change kari shakay chhe.
  4. **Handover Run**:
     * Rider ne parcel aapi ne **Handover** button dabavathi run status `in_progress` thai jaye chhe.
  5. **COD Reconcile Modal**:
     * Delivery thai gaya pachhi rider pase thi ketla COD cash aavya (Reported COD ane Handed-over cash in Rupees) te enter kari reconciliation thai shakay chhe.
  6. **Print Dispatch Manifest**:
     * Rider ne aapva mate A4 landscape format ma **Print Manifest** ready thai jaye chhe jema Customer name, phone, address, COD due amount, ane signature block hoy chhe.

---

### Tab 5: Exceptions Tab
* **Role/Purpose**: Operational daily errors, payment errors, delivery failure, packing mismatch, shortage, stuck orders, ane COD variance ne ek j jagya e handle karva mate.
* **Kaam (Work)**:
  1. **Client-side Filters**:
     * Severity filters: `Critical`, `High`, `Medium`, `Low`.
     * Category filters: `payment`, `refund`, `unassigned_order`, `delivery_failure`, `stuck_order`, `procurement_shortage`, `packing_mismatch`, `run_cod_variance`.
  2. **Log Manual Exception**:
     * Warehouse manager ya Admin pote manual exception title ane description sathe log kari shake chhe.
  3. **Resolve / Ignore Actions**:
     * Exception ne `Resolve` (Resolution Note sathe) ya `Ignore` kari shakay chhe.
  4. **View Source Navigation**:
     * Direct link button thi problem je order ya run par hoy tya ek click ma pahonchi shakay chhe.

---

### Tab 6: Reconciliation Tab
* **Role/Purpose**: Cash collection, online payments, pending refunds, ane warehouse inventory waste no hisab melavva mate.
* **Kaam (Work)**:
  1. **COD Cash Operational Metrics**:
     * Expected COD, Reported COD, Handed-Over Cash, Cash Variance, Pending/Failed Payments, ane Pending/Failed Refunds batavse.
  2. **Run-level COD Audit Table**:
     * Har ek delivery run no COD status batavse:
       * `Not Entered`: Reported ya handed-over cash haji bharva ma nathi aavyo.
       * `Matched`: COD cash variance ₹0.00 chhe.
       * `Variance`: Cash ma farak (shortage ya excess) chhe.
  3. **Admin Financial Summary** (Fakt `admin` mate):
     * Total Sales, Online Paid, Expected COD, Procurement Cost, Combined General Cost, Total Operations Cost, ane Estimated Operating Margin.
     * General Cost par link aapeli chhe jthi **Cost Management** page par jai ne packaging, delivery, misc. cost breakdown joi shakay chhe.
  4. **Inventory Waste & Spoilage Section**:
     * Spoilage, Damage, Quality reject, Excess, Packing loss, ya Customer return thi thaye la nuqsaan ne record karva mate.
     * **Record Waste** button thi quantity, reason, estimated loss rupees, ane note enter thai shake chhe (Append-only action with confirmation warning).

---

### Tab 7: Closing & Audit Tab
* **Role/Purpose**: Daily operations ne aakha divas mate close karva, shift handover notes lakhta ane divas ni aakhi audit history jova mate.
* **Kaam (Work)**:
  1. **Handover Note**:
     * Next shift ya staff mate handover note lakhi ne save kari shakay chhe.
  2. **Backend Closing Checklist**:
     * `can_close` status batavse (Green: Ready for normal close, Red: Closing Blocked).
     * Active blockers ni list batavse (e.g. Unpacked orders, open high exceptions, un-reconciled runs).
  3. **Close Daily Operations**:
     * Normal close button thi daily operation closed state ma chale jay chhe.
  4. **Admin Force Close**:
     * Jo blockers hoy pan admin ne force close karvu hoy, to **Force Close Operation** button thi mandatory explanation reason aapi ne close kari shakay chhe.
  5. **Admin Reopen Operations**:
     * Closed operation ne fari thi open karva mate Admin **Reopen** button thi mandatory reason aapi reopen kari shake chhe (Phelathi thaye la close snapshot ni maahiti bachi rehse).
  6. **Operational Audit Event History**:
     * Aakhi chronological timeline batavse (Opened, procurement refreshed/updated, packing started/completed, run created/handed over/reconciled, exception created/resolved, waste recorded, closed, force closed, reopened) sathe user name ane IST timestamp.
  7. **Print Closing Summary**:
     * Aakhi daily closing summary report print karva mate button provided chhe.

---

## 4. Role-wise Permissions & Capabilities (Admin vs Warehouse Manager)

Niche aapela table ma batave la chhe ke kai role no user su kaam kari shake chhe:

| Feature / Functionality | Admin Role | Warehouse Manager Role | Explanation / Reason |
|---|:---:|:---:|---|
| **View Daily Operations Page** | Yes | Yes | Banne roles mate aa primary daily workspace chhe. |
| **Warehouse Selection** | Yes (Badha warehouses) | No (Auto-assigned) | Admin badha warehouse switch kari shake, jyare Manager potana assigned warehouse ma j kaam karse. |
| **Refresh Live Ops Data** | Yes | Yes | Banne live backend stats refresh kari shake chhe. |
| **Procurement Single/Bulk Update** | Yes | Yes | Mandi procurement entry banne roles kari shake. |
| **Start & Complete Packing** | Yes | Yes | Order packing complete banne kari shake. |
| **Incomplete Packing Override** | Yes (Override reason required) | No | Jo packing baaki hoy to fakt Admin j mandatory reason aapi complete kari shake. |
| **Create Delivery Run & Handover** | Yes | Yes | Rider run banavva ane handover karvu banne mate allowed chhe. |
| **Reconcile Run COD Cash** | Yes | Yes | Rider pase thi aavela cash ni entry banne kari shake. |
| **Log & Resolve/Ignore Exceptions** | Yes | Yes | Operations ni samasya solve karva banne mate accessible chhe. |
| **Record Inventory Waste** | Yes | Yes | Stock nuqsaan entry (append-only) banne karis hake. |
| **View Financial Summary & Margins** | Yes | No (Hidden) | Financial sales ane profit margins confidential hovathi backend Manager mate hide kare chhe. |
| **Normal Operations Close** | Yes | Yes (Fakt jo `can_close` True hoy) | Blockers na hoy to banne normal close kari shake. |
| **Admin Force Close (With Blockers)** | Yes (Reason required) | No | Blockers hova chhatav close karvani permission fakt Admin pase chhe. |
| **Reopen Closed Operation** | Yes (Reason required) | No | Bandh thaye la operation ne fari ma thi kholvani power fakt Admin pase chhe. |
| **Read-Only Mode when Closed** | Yes | Yes | Jyare status `closed` hoy tyare form fields lock thai jay chhe, print ane viewing chalu rahe chhe. |

---

## Summary

Aa **Daily Operations Workspace** DailyVeg app na daily delivery workflow (Procurement -> Packing -> Rider Dispatch -> COD Cash Reconciliation -> Daily Closing Audit) ne ek j jagya e thi saral ane transparent banave chhe.
