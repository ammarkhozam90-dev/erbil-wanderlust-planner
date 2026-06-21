import jsPDF from "jspdf";

interface PlanItem {
  startTime: string;
  name: string;
  area: string;
  description: string;
}

export function exportPDF(plan: PlanItem[]) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129);
  doc.text("ErbilGo — Your Planned Day", 20, 25);
  doc.setDrawColor(212, 175, 55);
  doc.line(20, 30, 190, 30);

  doc.setTextColor(40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString(), 20, 38);

  let y = 50;
  plan.forEach((item, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129);
    doc.text(`${item.startTime}`, 20, y);
    doc.setTextColor(20);
    doc.text(`${i + 1}. ${item.name}`, 45, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(item.area, 45, y + 5);
    const lines = doc.splitTextToSize(item.description, 145);
    doc.setTextColor(60);
    doc.text(lines, 45, y + 11);
    y += 11 + lines.length * 5 + 8;
  });

  doc.save(`erbilgo-plan-${Date.now()}.pdf`);
}

export function shareWhatsApp(plan: PlanItem[]) {
  const text =
    "🌟 *My ErbilGo Day Plan*\n\n" +
    plan
      .map((p, i) => `${i + 1}. *${p.startTime}* — ${p.name}\n   📍 ${p.area}\n   ${p.description}`)
      .join("\n\n") +
    "\n\n_Plan created with ErbilGo_";
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
