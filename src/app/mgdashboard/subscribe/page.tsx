"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useState } from "react";
import { CreditCard, Star, Crown } from "lucide-react";
import SubscriptionCheckout from "@/components/CartPage"; // ✅ import your CartPage component

export default function Subscribe() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string } | null>(null);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar (desktop + mobile) */}
      <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-6">
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
        </main>
      </div>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center  " style={{ backgroundColor: "#0000008a" }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full relative">
            {/* Close button */}
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              ✖
            </button>

            {/* CartPage Component */}
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
    <div className="bg-white rounded-xl shadow-md p-6 border flex flex-col justify-between hover:shadow-lg transition">
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
        className={`w-full py-2 rounded-md font-medium text-sm bg-${color}-600 text-white hover:bg-${color}-700`}
        onClick={() => onSubscribe({ name: title, price })}
      >
        {buttonText}
      </button>
    </div>
  );
}
