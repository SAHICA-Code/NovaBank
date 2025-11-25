import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-rose-50 to-emerald-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-xl border border-black/5 shadow-lg p-6 sm:p-8 text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2">
            <Image
              src="/logo.png"
              alt="Logo novabank"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 tracking-tight">
            Nova Bank
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controla tus préstamos, clientes y cuotas con un clic.
          </p>
        </div>

        {session?.user ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Conectado como{" "}
              <span className="font-medium text-indigo-600">
                {session.user.email}
              </span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href="/cliente"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 font-medium transition text-center"
              >
                Panel cliente
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border-2 border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 font-medium transition text-center bg-white"
              >
                Panel empresa
              </Link>
            </div>

            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="w-full mt-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-600 px-4 py-2.5 font-medium hover:bg-rose-100 transition"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent("/cliente")}`}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 font-medium transition text-center"
            >
              Acceso clientes
            </Link>
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent("/dashboard")}`}
              className="rounded-xl border-2 border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 font-medium transition text-center bg-white"
            >
              Acceso empresas
            </Link>
          </div>
        )}
        <p className="mt-5 text-[11px] text-gray-400">
          Cuenta de prueba demo@demo.com - demo123
        </p>
        <p className="mt-5 text-[11px] text-gray-400">
          &copy; 2025 SAHICA | Web hecha por Sara de <b> <a href="https://sahica.com" >SAHICA </a> </b> | admin@sahica.com
        </p>
      </div>
    </main>
  );
}
