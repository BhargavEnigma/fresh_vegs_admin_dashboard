import React, { useState } from "react";
import {
  BookOpen,
  UserCheck,
  Warehouse,
  ClipboardList,
  Store,
  CheckCircle2,
  FileText,
  IndianRupee,
  Navigation,
  Languages,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export function VendorWorkflowGuide() {
  const [role, setRole] = useState("admin"); // 'admin' or 'manager'
  const [lang, setLang] = useState("gu"); // 'en' or 'gu'

  const steps = {
    admin: {
      en: [
        {
          title: "Register a New Vendor",
          nav: "Sidebar ➔ Admin Users/Vendors ➔ Vendors",
          desc: "Add a supplier profile. Click the 'Add vendor' button, enter company details, contact person, and phone number. Note: Phone numbers cannot be changed once added.",
          icon: Store,
          badge: "Step 1",
        },
        {
          title: "Map Products & Pricing",
          nav: "Sidebar ➔ Vendors ➔ Click 'Products' button on vendor row",
          desc: "Link the vegetables/fruits this vendor supplies. The vendor price starts at ₹0 and only the vendor can set it in the OPS mobile app. Capacity limits and lead time are optional.",
          icon: ClipboardList,
          badge: "Step 2",
        },
        {
          title: "Assign Procurement Quantities",
          nav: "Sidebar ➔ Daily Operations ➔ Procurement Tab",
          desc: "Allocate daily vegetable requirement quantities to specific vendors. You can use 'Auto Assign' for system-calculated quantities, or assign rows manually.",
          icon: FileText,
          badge: "Step 3",
        },
        {
          title: "Use the Vendor’s Saved Price",
          nav: "Sidebar ➔ Daily Operations ➔ Procurement Tab",
          desc: "Assignment automatically locks the vendor’s current per-KG or per-PC catalog price. Admin does not enter or approve a different price.",
          icon: IndianRupee,
          badge: "Step 4",
        },
      ],
      gu: [
        {
          title: "નવા વેન્ડરની નોંધણી (રજીસ્ટ્રેશન)",
          nav: "Sidebar (ડાબી બાજુની પટ્ટી) ➔ Vendors",
          desc: "નવો સપ્લાયર ઉમેરવા માટે. 'Add vendor' બટન પર ક્લિક કરો, કંપનીનું નામ, સંપર્ક વ્યક્તિ અને ફોન નંબર દાખલ કરો. (યાદ રાખો: ફોન નંબર પછીથી બદલી શકાશે નહીં).",
          icon: Store,
          badge: "પગલું ૧",
        },
        {
          title: "પ્રોડક્ટ અને ભાવો નકકી કરવા",
          nav: "Sidebar ➔ Vendors ➔ વેન્ડરની લાઇન પર રહેલ 'Products' બટન",
          desc: "વેન્ડર ક્યા શાકભાજી કે ફળ આપશે તે નક્કી કરો. ભાવ ₹0 થી શરૂ થાય છે અને OPS મોબાઇલ એપમાં ફક્ત વેન્ડર જ પોતાનો ભાવ સેટ કરી શકે છે. કેપેસિટી અને લીડ ટાઇમ વૈકલ્પિક છે.",
          icon: ClipboardList,
          badge: "પગલું ૨",
        },
        {
          title: "ડેઇલી ઓર્ડર આપવા (Procurement)",
          nav: "Sidebar ➔ Daily Operations ➔ Procurement ટેબ",
          desc: "રોજની જરૂરીયાત મુજબ ક્યા વેન્ડર પાસેથી કેટલું શાકભાજી લેવાનું છે તે સેટ કરો. ઓટોમેટિક સિસ્ટમ દ્વારા ફાળવવા 'Auto Assign' કરો અથવા હાથેથી કોન્ટીટી લખો.",
          icon: FileText,
          badge: "પગલું ૩",
        },
        {
          title: "વેન્ડરનો સેવ કરેલો ભાવ વાપરો",
          nav: "Sidebar ➔ Daily Operations ➔ Procurement ટેબ ➔ વેન્ડર એસાઇનમેન્ટ ટેબલ",
          desc: "એસાઇનમેન્ટ વખતે વેન્ડરનો હાલનો પ્રતિ KG અથવા પ્રતિ PC ભાવ આપમેળે લોક થાય છે. એડમિન અલગ ભાવ દાખલ કે મંજૂર કરતો નથી.",
          icon: IndianRupee,
          badge: "પગલું ૪",
        },
      ],
    },
    manager: {
      en: [
        {
          title: "Check Today's Assignments",
          nav: "Sidebar ➔ Daily Operations ➔ Receive Goods",
          desc: "Select the delivery date and select the vendor name from the dropdown list to see what vegetables they are scheduled to deliver to the warehouse.",
          icon: Warehouse,
          badge: "Step 1",
        },
        {
          title: "Record Received & Rejected Qty",
          nav: "Daily Operations ➔ Receive Goods ➔ Vendor Rows",
          desc: "When the delivery vehicle arrives, physically count the items. Enter good quality count in 'Received Qty' and spoiled or bad items in 'Rejected Qty'.",
          icon: ClipboardList,
          badge: "Step 2",
        },
        {
          title: "Submit Received Quantities",
          nav: "Daily Operations ➔ Receive Goods ➔ Click Submit",
          desc: "Click the submit button. This updates warehouse inventory and calculates payout from the vendor price locked when the assignment was created.",
          icon: CheckCircle2,
          badge: "Step 3",
        },
      ],
      gu: [
        {
          title: "આજના શેડ્યૂલ ચેક કરવા",
          nav: "Sidebar ➔ Daily Operations ➔ Receive Goods ટેબ",
          desc: "ડિલિવરી તારીખ પસંદ કરો અને ડ્રોપડાઉનમાંથી વેન્ડરનું નામ સિલેક્ટ કરો જેથી ખબર પડે કે વેન્ડર આજે કઈ પ્રોડક્ટ લાવવાનો છે.",
          icon: Warehouse,
          badge: "પગલું ૧",
        },
        {
          title: "માલ ગણવો અને એન્ટ્રી કરવી (Received / Rejected)",
          nav: "Daily Operations ➔ Receive Goods ➔ વેન્ડર પ્રોડક્ટ લાઇન",
          desc: "જ્યારે વેન્ડર માલ વેરહાઉસ લાવે ત્યારે ગણતરી કરો. સારો માલ 'Received Qty' માં લખો અને બગડેલો કે કેન્સલ કરેલો માલ 'Rejected Qty' માં લખો.",
          icon: ClipboardList,
          badge: "પગલું ૨",
        },
        {
          title: "માહિતી સબમિટ કરવી (Submit)",
          nav: "Daily Operations ➔ Receive Goods ➔ સબમિટ બટન",
          desc: "માહિતી ભરાઈ ગયા બાદ છેલ્લે સબમિટ બટન પર ક્લિક કરો. આનાથી વેરહાઉસનો સ્ટોક વધી જશે અને વેન્ડરનું પેમેન્ટ ઓટોમેટિક કેલ્ક્યુલેટ થશે.",
          icon: CheckCircle2,
          badge: "પગલું ૩",
        },
      ],
    },
  };

  const activeSteps = steps[role][lang];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1.5 border-dailyveg-200 bg-dailyveg-50/50 text-dailyveg-800 hover:bg-dailyveg-100 hover:text-dailyveg-900 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900">
          <BookOpen className="h-4 w-4" />
          <span>{lang === "gu" ? "વેન્ડર ગાઇડ" : "Vendor Guide"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <div className="bg-gradient-to-r from-dailyveg-600 to-emerald-600 p-6 text-white rounded-t-2xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 opacity-10">
            <BookOpen className="h-32 w-32" />
          </div>
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider">
                {lang === "gu" ? "સરળ માર્ગદર્શિકા" : "Operator Guide"}
              </span>
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-white mt-1">
              {lang === "gu" ? "વેન્ડર કામગીરી અને નેવિગેશન ફ્લો" : "Vendor Operations & Navigation Flow"}
            </DialogTitle>
            <p className="text-white/80 text-xs font-medium">
              {lang === "gu" 
                ? "વેન્ડર સેટઅપ, પ્રાઇસ અપ્રૂવલ અને વેરહાઉસ ચેક-ઇનની સ્ટેપ-બાય-સ્ટેપ સમજૂતી"
                : "Step-by-step documentation for registrations, assignments, locked vendor pricing, and check-ins"}
            </p>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/20">
          {/* Top Controls: Role & Language Selectors */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-slate-900 border p-3 rounded-2xl shadow-sm">
            {/* Role Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
              <button
                onClick={() => setRole("admin")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  role === "admin"
                    ? "bg-white text-dailyveg-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>{lang === "gu" ? "એડમિન રોલ" : "Admin Role"}</span>
              </button>
              <button
                onClick={() => setRole("manager")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  role === "manager"
                    ? "bg-white text-dailyveg-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Warehouse className="h-3.5 w-3.5" />
                <span>{lang === "gu" ? "વેરહાઉસ મેનેજર" : "Warehouse Manager"}</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2 justify-end">
              <span className="text-slate-400 dark:text-slate-500">
                <Languages className="h-4 w-4" />
              </span>
              <div className="flex border rounded-xl overflow-hidden p-0.5 bg-slate-50 dark:bg-slate-900">
                <button
                  onClick={() => setLang("en")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                    lang === "en"
                      ? "bg-dailyveg-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLang("gu")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                    lang === "gu"
                      ? "bg-dailyveg-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  ગુજરાતી
                </button>
              </div>
            </div>
          </div>

          {/* Stepper Flow Cards */}
          <div className="grid grid-cols-1 gap-4">
            {activeSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:border-dailyveg-400 dark:hover:border-dailyveg-800 transition-all duration-200 group"
                >
                  {/* Step Badge & Icon */}
                  <div className="flex md:flex-col items-center gap-3 shrink-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-dailyveg-500 text-white text-xs font-black shadow-md shadow-dailyveg-500/20">
                      {idx + 1}
                    </span>
                    <div className="p-3 bg-dailyveg-50 dark:bg-dailyveg-950/40 text-dailyveg-600 dark:text-dailyveg-400 rounded-2xl">
                      <StepIcon className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Step Description */}
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-slate-950 dark:text-white text-base">
                        {step.title}
                      </h4>
                      <Badge variant="outline" className="border-dailyveg-200 bg-dailyveg-50 text-dailyveg-800 font-extrabold dark:border-dailyveg-950 dark:bg-dailyveg-950/20 dark:text-dailyveg-400">
                        {step.badge}
                      </Badge>
                    </div>

                    {/* Navigation Path Block */}
                    <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                      <Navigation className="h-3.5 w-3.5 text-dailyveg-500 mt-0.5 shrink-0" />
                      <div className="text-xs font-semibold text-dailyveg-700 dark:text-dailyveg-400 flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-400 font-bold uppercase text-[9px]">
                          {lang === "gu" ? "મેનુ કયાં છે?" : "Where is this?"}
                        </span>
                        <span>{step.nav}</span>
                      </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Note Alert */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 rounded-2xl flex gap-3 text-xs text-amber-800 dark:text-amber-300">
            <div className="font-black text-sm">💡</div>
            <div className="space-y-1">
              <span className="font-extrabold block">
                {lang === "gu" ? "અગત્યની ઓપરેશનલ ટીપ:" : "Important Operational Tip:"}
              </span>
              <p className="font-medium leading-relaxed">
                {lang === "gu" 
                  ? "માલ રિસીવ કરતી વખતે એસાઇનમેન્ટમાં લોક થયેલો વેન્ડર ભાવ ચેક કરો. પેમેન્ટ ફક્ત સ્વીકારેલી માત્રા અને આ લોક થયેલા ભાવ પરથી ગણાય છે."
                  : "Check the locked vendor price before receiving. Payout is calculated only from the accepted quantity and the vendor price captured when the assignment was created."}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
