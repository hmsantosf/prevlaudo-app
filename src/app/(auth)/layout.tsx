import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/prevaerus_logo_transparente.png" alt="prevAERUS" style={{ width: '100%', display: 'block', margin: '0', padding: '0' }} />
          <p className="text-sm text-gray-500" style={{ marginTop: '2px' }}>
            Revisão de Benefícios Previdenciários
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
