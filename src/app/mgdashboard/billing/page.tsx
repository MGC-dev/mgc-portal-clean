"use client";

export default function BillingPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8">
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Billing &amp; Invoices</h2>
      </div>
      <div className="bg-white rounded-2xl border border-black/[0.07] p-6 sm:p-8">
        <p className="text-gray-700">No invoices at the moment</p>
      </div>
    </div>
  );
}
