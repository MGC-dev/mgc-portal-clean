"use client";
import { useState } from "react";

export default function ServiceAddOns() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Main content */}
        <main className="flex-1 flex flex-col">
          {/* Topbar */}

          {/* Service Add-ons */}
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Service Add-ons</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AddOnCard
                title="Priority Support"
                description="Get priority response times and dedicated support"
                price="$99/month"
                features={[
                  "24/7 support",
                  "Priority queue",
                  "Dedicated contact",
                ]}
                buttonText="Add to Plan"
                status="Available"
                available
              />
              <AddOnCard
                title="Advanced Analytics"
                description="Detailed insights and custom reporting"
                price="$149/month"
                features={[
                  "Custom dashboards",
                  "Advanced metrics",
                  "Export capabilities",
                ]}
                buttonText="Add to Plan"
                status="Available"
                available
              />
              <AddOnCard
                title="API Access"
                description="Integrate with your existing systems"
                price="$199/month"
                features={["REST API", "Webhooks", "Developer documentation"]}
                buttonText="Notify When Available"
                status="Coming Soon"
                available={false}
              />
            </div>
          </div>
        </main>
    </div>
  );
}

// Add-on cards
function AddOnCard({
  title,
  description,
  price,
  features,
  buttonText,
  status,
  available,
}: {
  title: string;
  description: string;
  price: string;
  features: string[];
  buttonText: string;
  status: string;
  available: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{title}</h2>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              available
                ? "bg-blue-300 text-blue-800"
                : "bg-green-300 text-green-800"
            }`}
          >
            {status}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <p className="text-lg font-bold mb-3">{price}</p>
        <ul className="space-y-1 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-center text-sm text-gray-700">
              <span className="text-green-600 mr-2">✔</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button
        className={`w-full py-3 rounded-[10px] font-medium text-sm transition-all ${
          available
            ? "bg-[#264f5e] text-white hover:bg-[#1f424e]"
            : "bg-[#f5f5f7] text-gray-400 cursor-not-allowed"
        }`}
        disabled={!available}
      >
        {buttonText}
      </button>
    </div>
  );
}
