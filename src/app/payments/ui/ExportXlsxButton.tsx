"use client";

export default function ExportXlsxButton() {
    async function handleExport() {
        try {
        const res = await fetch("/api/export/xlsx");
        if (!res.ok) throw new Error("Error al exportar");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Resumen_y_Cuotas.xlsx";
        a.click();
        window.URL.revokeObjectURL(url);
        } catch (e) {
        console.error(e);
        alert("Error al generar el archivo Excel");
        }
    }

    return (
        <button
        onClick={handleExport}
        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 shadow-sm transition"
        >
        Exportar Excel
        </button>
    );
}
