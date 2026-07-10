import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-24 justify-center relative">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Login
            </h1>
            <p className="text-zinc-500 text-[15px]">
              Welcome back! Please enter your details.
            </p>
          </div>

          <LoginForm />

          <div className="text-center pt-2">
            <p className="text-[14px] text-zinc-500">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-[#0071e3] hover:text-[#0077ed] font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Graphic/Image */}
      <div className="hidden lg:flex w-1/2 bg-zinc-50 items-center justify-center relative overflow-hidden border-l border-zinc-100">
         <div
           className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 grayscale"
           style={{ backgroundImage: `url('/modern-office-building.png')` }}
         />
         <div className="absolute inset-0 bg-gradient-to-br from-[#264f5e]/90 to-[#1a3340]/95" />
         
         <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 text-white">
            <div className="inline-flex items-center gap-5 mb-12 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl">
              <Image
                src="/logo.png"
                alt="MG Consulting logo"
                width={60}
                height={60}
                className="object-contain drop-shadow-lg"
              />
              <div className="w-[1px] h-12 bg-white/20 rounded-full" />
              <div className="flex flex-col items-start text-left">
                <span className="text-2xl font-semibold tracking-tight text-white leading-tight">
                  MG Consulting Firm
                </span>
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Empowering your business</h2>
            <p className="text-white/80 max-w-md text-lg">
              Access your client portal to manage documents, view contracts, and get support.
            </p>
         </div>
      </div>
    </div>
  );
}
