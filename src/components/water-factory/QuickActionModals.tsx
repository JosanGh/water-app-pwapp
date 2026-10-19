import { useState } from "react";
import type { FormEvent } from "react";
import type { AppData, PaymentMethod } from "../../lib/types";
import { uid, todayISO, fmtGHS } from "../../lib/helpers";
import { X, Droplet, ShoppingCart, Building } from "lucide-react";

type ToastTone = "ok" | "warn" | "info";
type AppMutation = (
  updater: (prev: AppData) => AppData,
  title: string,
  details: string,
) => void;

interface QuickActionModalsProps {
  modalType: "production" | "sale" | "deposit" | null;
  onClose: () => void;
  mutate: AppMutation;
  showToast: (msg: string, type?: ToastTone) => void;
  sessionName?: string;
  sessionId?: string;
}

interface ModalFormProps {
  onClose: () => void;
  mutate: AppMutation;
  showToast: (msg: string, type?: ToastTone) => void;
  sessionName: string;
  sessionId?: string;
}

export function QuickActionModals({
  modalType,
  onClose,
  mutate,
  showToast,
  sessionName = "User",
  sessionId,
}: QuickActionModalsProps) {
  if (!modalType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121E23] rounded-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        {modalType === "production" && (
          <ProductionRunModal
            onClose={onClose}
            mutate={mutate}
            showToast={showToast}
            sessionName={sessionName}
            sessionId={sessionId}
          />
        )}
        {modalType === "sale" && (
          <SaleModal
            onClose={onClose}
            mutate={mutate}
            showToast={showToast}
            sessionName={sessionName}
            sessionId={sessionId}
          />
        )}
        {modalType === "deposit" && (
          <DepositModal
            onClose={onClose}
            mutate={mutate}
            showToast={showToast}
            sessionName={sessionName}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}

function ProductionRunModal({
  onClose,
  mutate,
  showToast,
  sessionName,
  sessionId,
}: ModalFormProps) {
  const [date, setDate] = useState(todayISO());
  const [rollsUsed, setRollsUsed] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [packingBagsUsed, setPackingBagsUsed] = useState("");
  const [bagsProduced, setBagsProduced] = useState("");
  const [leakageBags, setLeakageBags] = useState("0");
  const [freeBags, setFreeBags] = useState("0");
  const [operator, setOperator] = useState(sessionName || "User");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const rolls = Number(rollsUsed);
    const kg = Number(weightKg);
    const bagsUsed = Number(packingBagsUsed);
    const produced = Number(bagsProduced);
    const leak = Number(leakageBags) || 0;
    const free = Number(freeBags) || 0;

    if (
      !Number.isFinite(rolls) ||
      !Number.isFinite(kg) ||
      !Number.isFinite(bagsUsed) ||
      !Number.isFinite(produced) ||
      rolls <= 0 ||
      kg <= 0 ||
      bagsUsed <= 0 ||
      produced <= 0
    ) {
      showToast("Please enter valid roll and bag production numbers", "warn");
      return;
    }

    mutate(
      (prev: AppData) => ({
        ...prev,
        productionRuns: [
          {
            id: uid(),
            date,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            rollsUsed: rolls,
            weightKg: kg,
            packingBagsUsed: bagsUsed,
            bagsProduced: produced,
            leakageBags: leak,
            freeBags: free,
            operator,
            shift: "Day",
            recordedBy: sessionName || "User",
            recordedByUserId: sessionId,
          },
          ...(prev.productionRuns || []),
        ],
      }),
      "Logged Production Run",
      `${produced} bags produced using ${rolls} rolls (${kg} kg)`,
    );

    showToast(`Production run recorded: ${produced} bags produced!`);
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 space-y-4 text-gray-800 dark:text-gray-100"
    >
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2 text-[#0B3B45] dark:text-cyan-400">
          <Droplet size={20} />
          <h3 className="font-bold text-base">Record Floor Production Run</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Run Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Machine Operator
          </label>
          <input
            type="text"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Rolls Used (Count)
          </label>
          <input
            type="number"
            min="1"
            value={rollsUsed}
            onChange={(e) => {
              setRollsUsed(e.target.value);
              // auto-estimate 30kg per roll if untouched
              setWeightKg(String(Number(e.target.value) * 30));
            }}
            className="inp mt-1"
            required
          />
        </div>
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Material Weight Used (Kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Packing Bags Used
          </label>
          <input
            type="number"
            min="1"
            value={packingBagsUsed}
            onChange={(e) => setPackingBagsUsed(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
        <div>
          <label className="font-semibold text-emerald-700 dark:text-emerald-400 font-bold">
            Bags Produced (Sellable)
          </label>
          <input
            type="number"
            min="1"
            value={bagsProduced}
            onChange={(e) => setBagsProduced(e.target.value)}
            className="inp mt-1 font-bold"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-rose-600 dark:text-rose-400">
            Leakages (Bags)
          </label>
          <input
            type="number"
            min="0"
            value={leakageBags}
            onChange={(e) => setLeakageBags(e.target.value)}
            className="inp mt-1"
          />
        </div>
        <div>
          <label className="font-semibold text-amber-600 dark:text-amber-400">
            Giveaways / Promo Bags
          </label>
          <input
            type="number"
            min="0"
            value={freeBags}
            onChange={(e) => setFreeBags(e.target.value)}
            className="inp mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1">
          Save Production Run
        </button>
      </div>
    </form>
  );
}

function SaleModal({
  onClose,
  mutate,
  showToast,
  sessionName,
  sessionId,
}: ModalFormProps) {
  const [date, setDate] = useState(todayISO());
  const [customerName, setCustomerName] = useState("");
  const [bagsSold, setBagsSold] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [leakageBags, setLeakageBags] = useState("0");
  const [freeBags, setFreeBags] = useState("0");

  const bags = Number(bagsSold) || 0;
  const price = Number(unitPrice) || 0;
  const totalAmount = bags * price;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (bags <= 0 || !customerName.trim()) {
      showToast("Enter valid customer name and bags sold", "warn");
      return;
    }

    const cashAmount = paymentMethod === "Cash" ? totalAmount : 0;
    const momoAmount = paymentMethod === "Mobile Money" ? totalAmount : 0;
    const bankAmount = paymentMethod === "Bank Deposit" ? totalAmount : 0;

    mutate(
      (prev: AppData) => ({
        ...prev,
        sales: [
          {
            id: uid(),
            date,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            customerName: customerName.trim(),
            bagsSold: bags,
            unitPrice: price,
            totalAmount,
            paymentMethod,
            cashAmount,
            momoAmount,
            bankAmount,
            leakageBags: Number(leakageBags) || 0,
            freeBags: Number(freeBags) || 0,
            recordedBy: sessionName || "User",
            recordedByUserId: sessionId,
          },
          ...(prev.sales || []),
        ],
      }),
      "Logged Sachet Sale",
      `${bags} bags sold to ${customerName} for ${fmtGHS(totalAmount)} via ${paymentMethod}`,
    );

    showToast(`Sale recorded: ${bags} bags for ${fmtGHS(totalAmount)}!`);
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 space-y-4 text-gray-800 dark:text-gray-100"
    >
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <ShoppingCart size={20} />
          <h3 className="font-bold text-base">Record Sachet Water Sale</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Sale Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Customer / Depot
          </label>
          <input
            type="text"
            placeholder="e.g. Madina Retail Outlet"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Bags Sold
          </label>
          <input
            type="number"
            min="1"
            value={bagsSold}
            onChange={(e) => setBagsSold(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Unit Price (GH₵ / bag)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Payment Channel
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="inp mt-1"
          >
            <option value="Cash">Cash (Direct Handover)</option>
            <option value="Mobile Money">
              Mobile Money (MTN / Telecel / AT)
            </option>
            <option value="Bank Deposit">Bank Transfer / Deposit</option>
          </select>
        </div>
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
            Calculated Total
          </span>
          <p className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400 mt-0.5">
            {fmtGHS(totalAmount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-rose-600 dark:text-rose-400">
            Leakages During Supply
          </label>
          <input
            type="number"
            min="0"
            value={leakageBags}
            onChange={(e) => setLeakageBags(e.target.value)}
            className="inp mt-1"
          />
        </div>
        <div>
          <label className="font-semibold text-amber-600 dark:text-amber-400">
            Free Bags Given
          </label>
          <input
            type="number"
            min="0"
            value={freeBags}
            onChange={(e) => setFreeBags(e.target.value)}
            className="inp mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1">
          Record Sale
        </button>
      </div>
    </form>
  );
}

function DepositModal({
  onClose,
  mutate,
  showToast,
  sessionName,
  sessionId,
}: ModalFormProps) {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || !bankName.trim()) {
      showToast("Enter a positive deposit amount", "warn");
      return;
    }

    mutate(
      (prev: AppData) => ({
        ...prev,
        bankDeposits: [
          {
            id: uid(),
            date,
            amount: amt,
            bankName,
            reference,
            depositedBy: sessionName || "User",
            depositedByUserId: sessionId,
            source: "Manager",
          },
          ...(prev.bankDeposits || []),
        ],
      }),
      "Logged Bank Deposit",
      `${fmtGHS(amt)} deposited into ${bankName} (Ref: ${reference})`,
    );

    showToast(`Bank deposit of ${fmtGHS(amt)} recorded!`);
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 space-y-4 text-gray-800 dark:text-gray-100"
    >
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
          <Building size={20} />
          <h3 className="font-bold text-base">Record Bank Deposit</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Deposit Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Deposit Amount (GH₵)
          </label>
          <input
            type="number"
            step="1"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Bank Name
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
        <div>
          <label className="font-semibold text-gray-600 dark:text-gray-300">
            Slip / Ref Number
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="inp mt-1"
            required
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1">
          Record Bank Deposit
        </button>
      </div>
    </form>
  );
}
