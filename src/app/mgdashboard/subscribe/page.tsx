"use client";

import { useState } from "react";
import { CreditCard, Star, Crown } from "lucide-react";
import SubscriptionCheckout from "@/components/CartPage"; // ✅ import your CartPage component

export default function Subscribe() {
  const [isCartOpen, setCartOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string } | null>(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Product Subscriptions</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <PlanCard
              icon={<CreditCard className="w-6 h-6 text-blue-600" />}
              title="Starter"
              price="$29/month"
              description="Essential tools for individuals and small teams."
              features={["Access to core features", "Email support", "Single user license"]}
              buttonText="Subscribe"
              color="blue"
              onSubscribe={(plan) => {
                setSelectedPlan(plan);
                setCartOpen(true);
              }}
            />

            {/* Intermediate */}
            <PlanCard
              icon={<Star className="w-6 h-6 text-green-600" />}
              title="Intermediate"
              price="$79/month"
              description="Advanced features for growing businesses."
              features={[
                "Everything in Basic",
                "Priority support",
                "Team collaboration",
                "Analytics dashboard",
              ]}
              buttonText="Subscribe"
              color="green"
              onSubscribe={(plan) => {
                setSelectedPlan(plan);
                setCartOpen(true);
              }}
            />

            {/* Advanced */}
            <PlanCard
              icon={<Crown className="w-6 h-6 text-purple-600" />}
              title="Advanced"
              price="Contact us"
              description="Custom solutions for large organizations."
              features={[
                "Everything in Intermediate",
                "Dedicated account manager",
                "Custom integrations",
                "Onboarding & training",
              ]}
              buttonText="Contact Sales"
              color="purple"
              onSubscribe={(plan) => {
                setSelectedPlan(plan);
                setCartOpen(true);
              }}
            />
          </div>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "#0000008a" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full relative">
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              ✖
            </button>
            <SubscriptionCheckout selectedPlan={selectedPlan} />
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  icon,
  title,
  price,
  description,
  features,
  buttonText,
  color,
  onSubscribe,
}: {
  icon: React.ReactNode;
  title: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  color: string;
  onSubscribe: (plan: { name: string; price: string }) => void;
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8 flex flex-col justify-between hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-all">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-${color}-100`}>
            {icon}
          </span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <p className="text-2xl font-bold mb-2">{price}</p>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <ul className="space-y-2 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center text-sm text-gray-700">
              <span className="text-green-600 mr-2">✔</span> {feature}
            </li>
          ))}
        </ul>
      </div>
      
      <button
        className={`w-full py-3 rounded-[10px] font-medium text-sm bg-[#264f5e] text-white hover:bg-[#1f424e] transition-all`}
        onClick={() => onSubscribe({ name: title, price })}
      >
        {buttonText}
      </button>
    </div>
  );
}
