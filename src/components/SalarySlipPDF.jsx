import jsPDF from 'jspdf'

function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
        'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
        'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    if (num === 0) return 'Zero'

    function below100(n) {
        if (n < 20) return ones[n]
        return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    }

    function below1000(n) {
        if (n < 100) return below100(n)
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + below100(n % 100) : '')
    }

    let n = Math.floor(num)
    let result = ''
    const crore = Math.floor(n / 10000000); n %= 10000000
    const lakh = Math.floor(n / 100000); n %= 100000
    const thousand = Math.floor(n / 1000); n %= 1000

    if (crore) result += below100(crore) + ' Crore '
    if (lakh) result += below100(lakh) + ' Lakh '
    if (thousand) result += below1000(thousand) + ' Thousand '
    if (n) result += below1000(n)

    return result.trim()
}

function amountInWords(amount) {
    const rupees = Math.floor(amount)
    const paise = Math.round((amount - rupees) * 100)
    let words = numberToWords(rupees) + ' Rupees'
    if (paise > 0) words += ' and ' + numberToWords(paise) + ' Paise'
    return words + ' Only'
}

function buildSalarySlipDoc({ slip, employee }) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const navy = [27, 58, 107]
    const teal = [13, 115, 119]
    const lightGray = [244, 246, 250]
    const totalRowBg = [224, 238, 238]
    const white = [255, 255, 255]
    const black = [0, 0, 0]

    const fmt = (val) =>
        `Rs. ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    // ─── HEADER BANNER ───────────────────────────────────────────────────────
    const headerH = 52
    doc.setFillColor(...navy)
    doc.rect(0, 0, pageWidth, headerH, 'F')

    doc.setTextColor(...white)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Chessboard', margin, 20)

    doc.setTextColor(173, 216, 230)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('1018, SNS Atria Corporate Office, Vesu, Surat, Gujarat', margin, 30)

    doc.setTextColor(...white)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(
        `SALARY SLIP \u2013 ${monthNames[slip.month - 1]} ${slip.year}`,
        pageWidth - margin, 43, { align: 'right' }
    )

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    const rowH = 10

    function drawSectionHeader(label, y) {
        doc.setFillColor(...teal)
        doc.rect(margin, y, pageWidth - margin * 2, 10, 'F')
        doc.setTextColor(...white)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + 4, y + 7)
        return y + 10
    }

    function drawRow(leftLabel, leftVal, rightLabel, rightVal, y, shade) {
        if (shade) {
            doc.setFillColor(...lightGray)
            doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F')
        }
        const col2X = pageWidth / 2 + 4
        const labelW = 34
        doc.setTextColor(...black)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(leftLabel + ':', margin + 3, y + 7)
        doc.setFont('helvetica', 'normal')
        doc.text(leftVal, margin + labelW, y + 7)
        if (rightLabel) {
            doc.setFont('helvetica', 'bold')
            doc.text(rightLabel + ':', col2X, y + 7)
            doc.setFont('helvetica', 'normal')
            doc.text(rightVal, col2X + labelW, y + 7)
        }
        return y + rowH
    }

    function drawAmountRow(label, amount, y, shade) {
        if (shade) {
            doc.setFillColor(...lightGray)
            doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F')
        }
        doc.setTextColor(...black)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(label, margin + 3, y + 7)
        doc.text(fmt(amount), pageWidth - margin - 3, y + 7, { align: 'right' })
        return y + rowH
    }

    function drawTotalRow(label, amount, y) {
        doc.setDrawColor(...black)
        doc.setLineWidth(0.4)
        doc.line(margin, y, pageWidth - margin, y)
        doc.setFillColor(...totalRowBg)
        doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F')
        doc.setTextColor(...black)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + 3, y + 7)
        doc.text(fmt(amount), pageWidth - margin - 3, y + 7, { align: 'right' })
        return y + rowH
    }

    function drawSectionBorder(startY, height) {
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.rect(margin, startY, pageWidth - margin * 2, height, 'S')
    }

    // ─── EMPLOYEE DETAILS ─────────────────────────────────────────────────────
    let y = headerH + 6
    y = drawSectionHeader('EMPLOYEE DETAILS', y)
    const empRowsStart = y

    const str = (v) => (v !== undefined && v !== null && v !== '') ? String(v) : '—'

    const empPairs = [
        ['Name',       str(employee.name),         'Designation',   str(employee.designation)],
        ['Department', str(employee.department),    'Join Date',     str(employee.join_date)],
        ['Location',   str(employee.location || 'Surat'),      'Working Days',  str(slip.working_days ?? employee.working_days)],
        ['Paid Days',  str(slip.paid_days ?? employee.paid_days),     'LOP Days',      str(slip.lop_days ?? employee.lop_days)],
    ]

    empPairs.forEach(([l1, v1, l2, v2], i) => {
        y = drawRow(l1, v1, l2, v2, y, i % 2 === 1)
    })
    drawSectionBorder(empRowsStart, empPairs.length * rowH)

    // ─── EARNINGS ─────────────────────────────────────────────────────────────
    y += 6
    y = drawSectionHeader('EARNINGS', y)
    const earningsRowsStart = y

    const earningRows = [
        ['Basic Pay',              slip.basic_pay],
        ['HRA (House Rent Allowance)', slip.hra],
        ['Conveyance Allowance',   slip.conveyance_allowance],
        ['Special Allowance',      slip.special_allowance],
        ['Bonus / Incentive',      slip.bonus],
    ]
    const totalEarnings = earningRows.reduce((sum, [, v]) => sum + Number(v || 0), 0)

    earningRows.forEach(([label, val], i) => {
        y = drawAmountRow(label, val, y, i % 2 === 1)
    })
    y = drawTotalRow('Total Earnings', totalEarnings, y)
    drawSectionBorder(earningsRowsStart, earningRows.length * rowH + rowH)

    // ─── DEDUCTIONS ───────────────────────────────────────────────────────────
    y += 6
    y = drawSectionHeader('DEDUCTIONS', y)
    const deductionsRowsStart = y

    const deductionRows = [
        ['Advance Recovery', slip.advance_recovery],
        ['Other Deductions', slip.other_deductions],
    ]
    const totalDeductions = deductionRows.reduce((sum, [, v]) => sum + Number(v || 0), 0)

    deductionRows.forEach(([label, val], i) => {
        y = drawAmountRow(label, val, y, i % 2 === 1)
    })
    y = drawTotalRow('Total Deductions', totalDeductions, y)
    drawSectionBorder(deductionsRowsStart, deductionRows.length * rowH + rowH)

    // ─── NET PAY BAR ──────────────────────────────────────────────────────────
    y += 8
    const netPayBarH = 14
    doc.setFillColor(...navy)
    doc.rect(margin, y, pageWidth - margin * 2, netPayBarH, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('NET PAY', margin + 4, y + 9.5)
    doc.text(fmt(slip.net_pay), pageWidth - margin - 3, y + 9.5, { align: 'right' })
    y += netPayBarH + 7

    // Net Pay in Words
    doc.setTextColor(...black)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Net Pay in Words:', margin + 3, y)
    doc.setFont('helvetica', 'normal')
    const words = amountInWords(Number(slip.net_pay || 0))
    const splitWords = doc.splitTextToSize(words, pageWidth - margin * 2 - 42)
    doc.text(splitWords, margin + 42, y)

    // ─── FOOTER ───────────────────────────────────────────────────────────────
    const footerY = pageHeight - 14
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.4)
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
        `Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        margin, footerY
    )
    doc.text('This is a system generated salary slip.', pageWidth - margin, footerY, { align: 'right' })

    return { doc, filename: `salary-slip-${employee.name?.replace(/\s+/g, '-')}-${monthNames[slip.month - 1]}-${slip.year}.pdf` }
}

export function generateSalarySlipPDF({ slip, employee }) {
    const { doc, filename } = buildSalarySlipDoc({ slip, employee })
    doc.save(filename)
}

export function getSalarySlipPDFUrl({ slip, employee }) {
    const { doc } = buildSalarySlipDoc({ slip, employee })
    return doc.output('bloburl')
}
