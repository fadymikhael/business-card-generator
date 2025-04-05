import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function generatePDF(cardData, template) {
  const doc = new jsPDF({ unit: 'mm', format: [85, 55], compress: true });

  doc.setProperties({
    title: `Carte de visite - ${cardData.lastName}`,
    subject: 'Carte de visite professionnelle',
    author: `${cardData.firstName} ${cardData.lastName}`,
    keywords: 'business, card, contact'
  });

  applyTemplate(doc, cardData, template);
  return doc;
}

function applyTemplate(doc, cardData, template) {
  const colors = {
    background: [28, 28, 60],
    text: [255, 255, 255],
    light: [200, 200, 200]
  };

  const fullName = `${cardData.firstName.toUpperCase()} ${cardData.lastName.toUpperCase()}`;
  const profession = cardData.profession || '';
  const addressLines = doc.splitTextToSize(cardData.address || '', 60);
  const email = cardData.email || '';
  const phone = cardData.phone || '';


  if (template === 'custom') {
    // Fond bleu nuit
    doc.setFillColor(...colors.background);
    doc.rect(0, 0, 85, 55, 'F');

    // Logo en haut à gauche
    if (cardData.logoUrl) {
      try {
        doc.addImage(cardData.logoUrl, 'PNG', 5, 5, 15, 15);
      } catch (e) {
        console.warn('Erreur logo :', e);
      }
    }

    // Nom complet
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(fullName, 42.5, 22, { align: 'center' });

    // Profession
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(profession, 42.5, 30, { align: 'center' });

    // Adresse + Email
    doc.setTextColor(...colors.light);
    doc.setFontSize(9);
    doc.text(addressLines, 42.5, 38, { align: 'center' });
    doc.text(email, 42.5, 45, { align: 'center' });
    doc.text(phone, 10, 53);

    // QR Code
    if (cardData.qrCodeUrl) {
      try {
        doc.addImage(cardData.qrCodeUrl, 'JPEG', 65, 36, 16, 16);
      } catch (e) {
        console.warn("QR Code invalide :", e);
      }
    }

    return;
  }

  // Fallback pour les autres modèles
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);

  const defaultLines = [
    `${cardData.title} ${cardData.firstName} ${cardData.lastName}`,
    cardData.profession,
    cardData.email,
    ...doc.splitTextToSize(cardData.address || '', 65)
  ];

  doc.text(defaultLines, 10, 20);
}
