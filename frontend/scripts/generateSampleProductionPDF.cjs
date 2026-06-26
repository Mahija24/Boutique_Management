const fs = require('fs');
const { jsPDF } = require('jspdf');

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const buildProductionPDF = (order) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 12;
  const innerWidth = width - margin * 2;
  const customer = order.customer || {};
  const orderDate = formatDate(order.createdAt || order.orderDate || new Date());
  const deliveryDate = formatDate(order.deliveryDate);
  const items = order.items || [];
  const totalAmount = order.pricing?.totalAmount || items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  const advancePaid = Number(order.pricing?.advancePaid || 0);
  const balance = totalAmount - advancePaid;
  const stageCounts = items.reduce((acc, item) => {
    const stage = item.itemStatus || 'Pending';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const addPageNumber = () => {
    const pageNumber = doc.internal.getNumberOfPages();
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Page ${pageNumber}`, width - margin, height - 10, { align: 'right' });
  };

  const drawHeaderBlock = (title) => {
    let y = margin + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(13, 60, 153);
    doc.text("SUJA'S FASHIONS", width / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Ladies Wear • Bridal Blouses • Sarees', width / 2, y, { align: 'center' });
    y += 4;
    doc.text('Kids Wear • Customisation Of Outfits', width / 2, y, { align: 'center' });
    y += 4;
    doc.text('Plot No.2, Pammal Main Road', width / 2, y, { align: 'center' });
    y += 4;
    doc.text('Chennai - 600075', width / 2, y, { align: 'center' });
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin + 2, y);
    return y + 10;
  };

  const getMeasurementValue = (item, section, key) => {
    const measurements = item.measurements || {};
    if (measurements[section] && measurements[section][key] !== undefined && measurements[section][key] !== null) {
      return measurements[section][key];
    }
    if (measurements[`${section}_${key}`] !== undefined && measurements[`${section}_${key}`] !== null) {
      return measurements[`${section}_${key}`];
    }
    return '--';
  };

  const blouseMeasurementOrder = [
    { key: 'fullLength', label: 'Full Length' },
    { key: 'fullShoulder', label: 'Full Shoulder' },
    { key: 'shoulderStrap', label: 'Shoulder Strap' },
    { key: 'backNeckDepth', label: 'Back Neck Depth' },
    { key: 'frontNeckDepth', label: 'Front Neck Depth' },
    { key: 'point', label: 'Point' },
    { key: 'frontLength', label: 'Front Length' },
    { key: 'upperBust', label: 'Upper Bust' },
    { key: 'bustAround', label: 'Bust Around' },
    { key: 'waistAround', label: 'Waist Around' },
    { key: 'tummy', label: 'Tummy' },
    { key: 'seat', label: 'Seat' },
    { key: 'slitOpen', label: 'Slit Open' },
    { key: 'armHole', label: 'Arm Hole' },
    { key: 'armRound', label: 'Arm Round' },
    { key: 'sleeveLength', label: 'Sleeve Length' },
    { key: 'sleeveRound', label: 'Sleeve Round' },
    { key: 'biceps', label: 'Biceps' },
  ];

  const pantMeasurements = [
    { key: 'length', label: 'Length' },
    { key: 'hip', label: 'Hip' },
    { key: 'thigh', label: 'Thigh' },
    { key: 'knee', label: 'Knee' },
    { key: 'ankle', label: 'Ankle' },
  ];

  const skirtMeasurements = [
    { key: 'halfLength', label: 'Half Length' },
    { key: 'fullLength', label: 'Full Length' },
    { key: 'hip', label: 'Hip' },
    { key: 'seat', label: 'Seat' },
  ];

  const optionsList = [
    'Front Open',
    'Back Open',
    'Normal Cut',
    'Princess Cut',
    'Katori Cut',
    'Cross Cut',
    'Other',
  ];

  const drawItemPanel = (item, index, startY) => {
    const panelHeight = 160;
    const leftX = margin;
    const leftW = innerWidth * 0.62;
    const rightX = leftX + leftW + 6;
    const rightW = innerWidth - leftW - 6;

    doc.setDrawColor(13, 60, 153);
    doc.setLineWidth(0.7);
    doc.rect(leftX, startY, innerWidth, panelHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Item ${index + 1}: ${item.productType || item.designType || item.notes || `Item ${index + 1}`}`, leftX + 4, startY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Qty: ${item.quantity || 1}`, leftX + 4, startY + 14);
    doc.text(`Status: ${item.itemStatus || 'Pending'}`, leftX + 38, startY + 14);
    doc.text(`Delivery: ${formatDate(item.deliveryDate || order.deliveryDate)}`, leftX + leftW - 4, startY + 14, { align: 'right' });

    const sectionY = startY + 18;
    const sectionHeight = 72;
    doc.rect(leftX + 1, sectionY, leftW - 2, sectionHeight);
    doc.rect(rightX, sectionY, rightW, sectionHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BLOUSE / SALWAR / FROCK', leftX + 4, sectionY + 6);
    doc.text('OPTIONS', rightX + 4, sectionY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const rowsPerCol = 9;
    blouseMeasurementOrder.forEach((field, idx) => {
      const col = Math.floor(idx / rowsPerCol);
      const row = idx % rowsPerCol;
      const baseX = leftX + 4 + col * ((leftW - 10) / 2);
      const rowY = sectionY + 11 + row * 5.2;
      doc.text(`${idx + 1}. ${field.label}`, baseX, rowY);
      doc.text(String(getMeasurementValue(item, 'blouse', field.key)), baseX + 48, rowY);
    });

    optionsList.forEach((option, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      const x = rightX + 4 + col * (rightW / 2);
      const yPos = sectionY + 11 + row * 6;
      const selected = (item.options || []).includes(option);
      doc.text(option, x, yPos);
      doc.text(selected ? '✓' : '✗', x + 50, yPos);
    });

    const lowerY = sectionY + sectionHeight + 4;
    const notesBoxHeight = 20;
    const thumbAreaHeight = 22;
    const lowerHeight = panelHeight - sectionHeight - notesBoxHeight - thumbAreaHeight - 12;

    doc.rect(leftX + 1, lowerY, leftW - 2, lowerHeight);
    doc.rect(rightX, lowerY, rightW, lowerHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PANT', leftX + 4, lowerY + 6);
    doc.text('SKIRT', rightX + 4, lowerY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    pantMeasurements.forEach((field, idx) => {
      doc.text(`${field.label}: ${getMeasurementValue(item, 'pant', field.key)}`, leftX + 4, lowerY + 12 + idx * 5);
    });
    skirtMeasurements.forEach((field, idx) => {
      doc.text(`${field.label}: ${getMeasurementValue(item, 'skirt', field.key)}`, rightX + 4, lowerY + 12 + idx * 5);
    });

    const notesY = lowerY + lowerHeight + 4;
    doc.rect(leftX + 1, notesY, innerWidth - 2, notesBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Notes', leftX + 4, notesY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(item.notes || 'No additional notes', innerWidth - 8);
    doc.text(noteLines, leftX + 4, notesY + 11);

    const thumbs = [ ...(item.whiteboards || []), ...(item.referenceImages || item.images || []) ];
    if (thumbs.length) {
      const thumbYStart = notesY + notesBoxHeight + 6;
      const thumbSize = 20;
      const gap = 6;
      const perRow = Math.max(1, Math.floor((innerWidth - 8) / (thumbSize + gap)));
      thumbs.slice(0, perRow * 2).forEach((_, tIdx) => {
        const row = Math.floor(tIdx / perRow);
        const col = tIdx % perRow;
        const x = leftX + 4 + col * (thumbSize + gap);
        const y = thumbYStart + row * (thumbSize + gap);
        if (y + thumbSize > startY + panelHeight - 6) return;
        doc.rect(x, y, thumbSize, thumbSize);
        doc.setFontSize(8);
        doc.text(`${tIdx + 1}`, x + 3, y + 12);
      });
    }
  };

  const drawThumbnails = (title, data, startY) => {
    if (!data?.length) return startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, margin + 2, startY);
    const thumbSize = 30;
    const gap = 8;
    const perRow = 4;
    let thumbY = startY + 8;
    data.slice(0, 12).forEach((_, idx) => {
      const row = Math.floor(idx / perRow);
      const col = idx % perRow;
      const x = margin + col * (thumbSize + gap);
      const y = thumbY + row * (thumbSize + 16);
      doc.rect(x, y, thumbSize, thumbSize);
      doc.setFontSize(8);
      doc.text(`${idx + 1}`, x + 2, y + 6);
    });
    return thumbY + Math.ceil(Math.min(data.length, 12) / perRow) * (thumbSize + 16);
  };

  let y = drawHeaderBlock('Complete Production Report');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Customer Summary', margin + 2, y);
  y += 6;

  const summaryBoxHeight = 58;
  doc.setDrawColor(13, 60, 153);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, innerWidth, summaryBoxHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Customer: ${customer.name || order.customerName || 'N/A'}`, margin + 4, y + 8);
  doc.text(`Delivery: ${deliveryDate}`, margin + 4, y + 16);
  doc.text(`Items: ${items.length}`, margin + 4, y + 24);
  doc.text(`Order Type: ${order.orderType || 'N/A'}`, margin + 4, y + 32);
  doc.text(`Date: ${orderDate}`, width / 2 + 4, y + 8);
  doc.text(`Order ID: ${order.orderId || order._id || 'ORD-0000'}`, width / 2 + 4, y + 16);
  doc.text(`Total: ${formatMoney(totalAmount)}`, width / 2 + 4, y + 24);
  doc.text(`Balance: ${formatMoney(balance)}`, width / 2 + 4, y + 32);

  y += summaryBoxHeight + 8;
  const statusBoxHeight = 44;
  doc.rect(margin, y, innerWidth, statusBoxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Production Status', margin + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const statusList = ['Measurement done', 'Cutting', 'Stitching', 'Trial', 'Final adjustment', 'Ready', 'Delivered'];
  statusList.forEach((status, idx) => {
    const rowY = y + 14 + idx * 5;
    if (rowY < y + statusBoxHeight - 4) {
      doc.text(`${status}: ${stageCounts[status] || 0}`, margin + 4, rowY);
    }
  });

  y += statusBoxHeight + 8;
  const summaryTableHeight = 74;
  doc.rect(margin, y, innerWidth, summaryTableHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Item Summary', margin + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let lineY = y + 16;
  items.slice(0, 7).forEach((item) => {
    doc.text(item.productType || item.designType || item.notes || '-', margin + 4, lineY);
    doc.text(String(item.quantity || 1), width - margin - 44, lineY);
    doc.text(item.itemStatus || 'Pending', width - margin - 4, lineY, { align: 'right' });
    lineY += 7;
  });

  addPageNumber();

  const itemPanelsPerPage = 2;
  const panelSpacing = 6;
  let panelY = margin + 8;
  items.forEach((item, idx) => {
    if (idx % itemPanelsPerPage === 0) {
      doc.addPage();
      panelY = margin + 8;
    }
    drawItemPanel(item, idx, panelY);
    panelY += 160 + panelSpacing;
    if (idx % itemPanelsPerPage === itemPanelsPerPage - 1 || idx === items.length - 1) {
      addPageNumber();
    }
  });

  const whiteboards = items.flatMap((item) => item.whiteboards || []);
  const referenceImages = items.flatMap((item) => item.referenceImages || item.images || []);
  if (whiteboards.length || referenceImages.length) {
    doc.addPage();
    let thumbY = margin + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Whiteboards & Reference Images', margin + 2, thumbY);
    thumbY += 8;
    thumbY = drawThumbnails('Whiteboards', whiteboards, thumbY);
    if (thumbY + 40 > height - margin) {
      doc.addPage();
      thumbY = margin + 8;
    }
    thumbY += 6;
    thumbY = drawThumbnails('Reference Images', referenceImages, thumbY);
    addPageNumber();
  }

  return doc;
};

const order = {
  orderId: 'ORD-0001',
  customer: { name: 'Meenu Sharma' },
  orderDate: new Date().toISOString(),
  deliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  orderType: 'Readymade',
  pricing: { totalAmount: 11500, advancePaid: 3500 },
  items: [
    {
      productType: 'Lehenga',
      designType: 'Bridal',
      quantity: 1,
      itemStatus: 'Trial',
      deliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Gold embroidery with mirror work',
      options: ['Front Open', 'Princess Cut', 'Other'],
      measurements: {
        blouse: {
          fullLength: '20',
          fullShoulder: '14',
          shoulderStrap: '5',
          backNeckDepth: '8',
          frontNeckDepth: '10',
          point: '9',
          frontLength: '16',
          upperBust: '32',
          bustAround: '36',
          waistAround: '28',
          tummy: '32',
          seat: '38',
          slitOpen: '12',
          armHole: '16',
          armRound: '11',
          sleeveLength: '18',
          sleeveRound: '10',
          biceps: '12',
        },
        pant: { length: '42', hip: '38', thigh: '22', knee: '15', ankle: '10' },
        skirt: { halfLength: '24', fullLength: '40', hip: '38', seat: '45' },
      },
      whiteboards: ['board1', 'board2'],
      referenceImages: ['ref1', 'ref2', 'ref3'],
      totalCost: 7500,
    },
    {
      productType: 'Blouse',
      designType: 'Party wear',
      quantity: 1,
      itemStatus: 'Cutting',
      deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Silk blouse with lace sleeves',
      options: ['Back Open', 'Cross Cut'],
      measurements: {
        blouse: {
          fullLength: '14',
          fullShoulder: '15',
          shoulderStrap: '4.5',
          backNeckDepth: '7',
          frontNeckDepth: '9',
          point: '8',
          frontLength: '13',
          upperBust: '34',
          bustAround: '37',
          waistAround: '30',
          tummy: '33',
          seat: '39',
          slitOpen: '0',
          armHole: '16',
          armRound: '10',
          sleeveLength: '22',
          sleeveRound: '11',
          biceps: '13',
        },
        pant: { length: '0', hip: '0', thigh: '0', knee: '0', ankle: '0' },
        skirt: { halfLength: '0', fullLength: '0', hip: '0', seat: '0' },
      },
      whiteboards: ['board3'],
      referenceImages: ['ref4'],
      totalCost: 4000,
    },
  ],
};

const doc = buildProductionPDF(order);
const buffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync('sample-production-report.pdf', buffer);
console.log('sample-production-report.pdf generated');
