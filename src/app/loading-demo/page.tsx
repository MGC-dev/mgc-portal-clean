"use client";

import React, { useState } from "react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoadingDemoPage() {
  const [showDefault, setShowDefault] = useState(false);
  const [showMinimal, setShowMinimal] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  const triggerDemo = (variant: "default" | "minimal" | "pulse") => {
    if (variant === "default") {
      setShowDefault(true);
      setTimeout(() => setShowDefault(false), 3000);
    } else if (variant === "minimal") {
      setShowMinimal(true);
      setTimeout(() => setShowMinimal(false), 3000);
    } else if (variant === "pulse") {
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Loading Overlay Demo
          </h1>
          <p className="text-gray-600">
            Test the new professional loading overlay variants
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Variant</CardTitle>
              <CardDescription>
                Professional overlay with smooth animations and backdrop blur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => triggerDemo("default")}
                className="w-full"
              >
                Show Default Loading
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Minimal Variant</CardTitle>
              <CardDescription>
                Clean and lightweight overlay for subtle loading states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => triggerDemo("minimal")}
                variant="outline"
                className="w-full"
              >
                Show Minimal Loading
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pulse Variant</CardTitle>
              <CardDescription>
                Enhanced overlay with pulsing animations and gradient background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => triggerDemo("pulse")}
                variant="secondary"
                className="w-full"
              >
                Show Pulse Loading
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 bg-white/70 backdrop-blur-sm rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Smooth enter/exit animations with Framer Motion</li>
            <li>• Multiple variants for different use cases</li>
            <li>• Professional backdrop blur effects</li>
            <li>• Responsive design with proper mobile support</li>
            <li>• Customizable labels and messaging</li>
            <li>• Improved visual hierarchy and typography</li>
          </ul>
        </div>
      </div>

      {/* Loading Overlays */}
      <LoadingOverlay 
        show={showDefault} 
        label="Processing your request..." 
        variant="default" 
      />
      <LoadingOverlay 
        show={showMinimal} 
        label="Loading..." 
        variant="minimal" 
      />
      <LoadingOverlay 
        show={showPulse} 
        label="Analyzing data" 
        variant="pulse" 
      />
    </div>
  );
}