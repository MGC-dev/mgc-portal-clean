"use client";

export default function BillingPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Billing &amp; Invoices</h2>
      </div>
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <p className="text-gray-700">No invoices at the moment</p>
      </div>
    </div>
  );
}
