"use client";

export default function DeleteLoanButton({ loanId }: { loanId: string }) {
    return (
        <form
            action={`/loans/${loanId}/delete`}
            method="post"
            onSubmit={(e) => {
                if (!confirm("¿Seguro que quieres borrar este préstamo?")) {
                    e.preventDefault();
                }
            }}
        >
            <button
                type="submit"
                className="px-3 py-1.5 rounded-xl text-xs font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition"
            >
                Borrar
            </button>
        </form>
    );
}
