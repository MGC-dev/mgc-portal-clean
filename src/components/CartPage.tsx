"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PlanType = "Monthly" | "Yearly";

type CartItem = {
  id: number;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
};

interface SubscriptionCheckoutProps {
  selectedPlan: {
    name: string;
    price: string;
  } | null;
}

export default function SubscriptionCheckout({ selectedPlan }: SubscriptionCheckoutProps) {
  // ✅ Hooks MUST be inside component
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [planType, setPlanType] = useState<PlanType>("Monthly");
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
      setUserName(user?.user_metadata?.full_name ?? null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      const priceNumber = parseInt(selectedPlan.price.replace(/\D/g, "")) || 0;

      setCart([
        {
          id: 1,
          name: selectedPlan.name,
          monthlyPrice: priceNumber,
          yearlyPrice: priceNumber * 10,
        },
      ]);
    }
  }, [selectedPlan]);

  const subtotal = cart.reduce(
    (s, i) => s + (planType === "Monthly" ? i.monthlyPrice : i.yearlyPrice),
    0
  );
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const removeItem = (id: number) => setCart(cart.filter((i) => i.id !== id));

  const handlePayment = async () => {
    if (!selectedPlan) {
      alert("Please select a plan first.");
      return;
    }

    const priceNumber = parseInt(selectedPlan.price.replace(/\D/g, "")) || 0;

    if (!priceNumber) {
      alert("This plan requires manual sales contact.");
      return;
    }

    const res = await fetch("/api/zoho/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { email: userEmail, name: userName },
        subscription: {
          plan_name: selectedPlan.name,
          amount: priceNumber,
          billing_cycle: planType.toLowerCase(),
        }
      })
    });

    const data = await res.json();
    if (data.payment_url) window.location.href = data.payment_url;
    else alert("Subscription failed");
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT: Cart Summary */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-xl rounded-2xl p-8 h-fit lg:sticky top-8"
        >
          <h2 className="text-2xl font-bold mb-6">🛒 Your Subscription</h2>

          {/* Plan Toggle */}
          <div className="flex items-center justify-center mb-6">
            <span
              className={`px-4 py-2 rounded-l-lg cursor-pointer ${
                planType === "Monthly"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => setPlanType("Monthly")}
            >
              Monthly
            </span>
            <span
              className={`px-4 py-2 rounded-r-lg cursor-pointer ${
                planType === "Yearly"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => setPlanType("Yearly")}
            >
              Yearly <span className="text-green-500 font-semibold">(Save 20%)</span>
            </span>
          </div>

          {cart.length > 0 ? (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-4 border-b"
              >
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-gray-500">{planType}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <p className="font-semibold">
                    ₹
                    {planType === "Monthly"
                      ? item.monthlyPrice
                      : item.yearlyPrice}
                  </p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Your cart is empty.</p>
          )}

          <div className="space-y-2 mt-6">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (18%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-3 border-t">
              <span>Total</span>
              <span className="text-blue-600">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Payment */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-xl rounded-2xl p-8 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold mb-6">💳 Payment</h2>
            <p className="text-gray-500 mb-6">
              You will be redirected to Zoho’s secure checkout page to complete
              your <span className="font-semibold">{planType.toLowerCase()}</span> subscription.
            </p>
          </div>

          <button
            onClick={handlePayment}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 text-lg font-semibold shadow-lg"
          >
            Proceed to Payment
          </button>
        </motion.div>
      </div>
    </div>
  );
}
