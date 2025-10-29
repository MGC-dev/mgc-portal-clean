export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 p-8">
      <div className="max-w-xl w-full">
        <h1 className="text-3xl font-semibold">Account Suspended</h1>
        <p className="mt-4 text-gray-700">
          Your account has been suspended and access is temporarily disabled. If you believe this
          is an error or would like to request a review, please contact our support team.
        </p>
        <div className="mt-6 rounded border p-4 bg-gray-50">
          <p className="text-gray-800 text-sm">
            Email: <a className="text-blue-600 hover:underline" href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com"}`}>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com"}</a>
          </p>
          {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? (
            <p className="text-gray-800 text-sm mt-2">Phone: {process.env.NEXT_PUBLIC_SUPPORT_PHONE}</p>
          ) : null}
        </div>
        <p className="mt-6 text-sm text-gray-600">
          For privacy and security, we may ask you to verify account ownership when you reach out.
        </p>
      </div>
    </div>
  );
}