import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  ImageRun, PageNumber, PageBreak, LevelFormat, TabStopType,
} from 'docx'
import { FullFormData } from './types'
import { LOGO_DOCX_B64 } from './logo'

const NAVY  = "0D1F35"
const TEAL  = "1FBCA1"
const WHITE = "FFFFFF"
const LGRAY = "F5F5F5"
const MGRAY = "CCCCCC"
const DGRAY = "444444"

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: MGRAY }
const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder }

function fmt(v: string) {
  const n = parseFloat(v) || 0
  return '$' + n.toLocaleString('en-AU')
}
function fmtApprox(v: string) {
  const n = parseFloat(v) || 0
  return n === 0 ? '$0' : '~$' + n.toLocaleString('en-AU')
}

const r   = (text: string, opts: any = {}) => new TextRun({ text, size: 22, font: "Arial", color: DGRAY, ...opts })
const rb  = (text: string, opts: any = {}) => r(text, { bold: true, color: NAVY, ...opts })

function p(text: string, opts: any = {}) {
  return new Paragraph({ spacing: { before: 80, after: 160 }, children: [r(text, opts)] })
}
function h1(text: string) {
  return new Paragraph({
    spacing: { before: 480, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 4 } },
    children: [new TextRun({ text, bold: true, size: 44, font: "Arial", color: NAVY })],
  })
}
function h2(text: string) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: NAVY })],
  })
}
function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 80 },
    children: [r(text)],
  })
}
function numbered(text: string) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 60, after: 120 },
    children: [r(text, { size: 20 })],
  })
}
function spacer(n = 160) {
  return new Paragraph({ spacing: { before: n, after: 0 }, children: [r("")] })
}

function twoCol(rows: [string, string][], w = 9026) {
  const c1 = Math.floor(w * 0.42), c2 = w - c1
  return new Table({
    width: { size: w, type: WidthType.DXA }, columnWidths: [c1, c2],
    rows: rows.map(([label, value], i) => new TableRow({
      children: [
        new TableCell({
          borders: allBorders, width: { size: c1, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 80 },
          children: [new Paragraph({ children: [rb(label)] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: c2, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 80 },
          children: [new Paragraph({ children: [r(value)] })],
        }),
      ],
    })),
  })
}

function dataTable(headers: string[], rows: string[][], colWidths: number[], w = 9026) {
  const mkH = (text: string, w2: number) => new TableCell({
    borders: allBorders, width: { size: w2, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: "Arial", color: WHITE })] })],
  })
  const mkC = (text: string, w2: number, ri: number, ci: number) => new TableCell({
    borders: allBorders, width: { size: w2, type: WidthType.DXA },
    shading: { fill: ri % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 80 },
    children: [new Paragraph({
      alignment: ci > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 20, font: "Arial", color: ci === 0 ? NAVY : DGRAY, bold: ci === 0 })],
    })],
  })
  return new Table({
    width: { size: w, type: WidthType.DXA }, columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => mkH(h, colWidths[i])) }),
      ...rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => mkC(cell, colWidths[ci], ri, ci)) })),
    ],
  })
}

export async function buildDocument(d: FullFormData): Promise<Buffer> {
  const c1Name  = [d.c1_first, d.c1_last].filter(Boolean).join(' ') || '[PRIMARY CLIENT]'
  const c2Name  = [d.c2_first, d.c2_last].filter(Boolean).join(' ')
  const clients = c2Name ? `${c1Name} & ${c2Name}` : c1Name
  const totalAssets = (d.assets || []).reduce((s, a) => s + (parseFloat(a.val) || 0), 0)
  const totalLiabs  = (d.liabilities || []).reduce((s, l) => s + (parseFloat(l.val) || 0), 0)
  const netPos = totalAssets - totalLiabs
  const entity  = d.entity_name  || '[ENTITY NAME]'
  const eType   = d.entity_type  || '[ENTITY TYPE]'
  const address = d.entity_address || '[ADDRESS]'
  const adviser = d.adviser_name || '[ADVISER NAME]'
  const date    = d.proposal_date || '[DATE]'
  const invAmt  = d.invest_amount ? fmt(d.invest_amount) : '[INVESTMENT AMOUNT]'
  const vehicle = d.portfolio_vehicle || eType

  // Logo image
  const logoBytes = Buffer.from(LOGO_DOCX_B64, 'base64')

  const logoRun = new ImageRun({
    data: logoBytes,
    transformation: { width: 130, height: 71 },
    type: 'png',
  })

  // Personal details table
  const personalTable = (() => {
    const w = 9026
    const cols = [Math.floor(w*0.36), Math.floor(w*0.32), w - Math.floor(w*0.36) - Math.floor(w*0.32)]
    const mkHdr = (text: string, w2: number) => new TableCell({
      borders: allBorders, width: { size: w2, type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: "Arial", color: WHITE })] })],
    })
    const mkCell = (text: string, w2: number, i: number, isLabel = false) => new TableCell({
      borders: allBorders, width: { size: w2, type: WidthType.DXA },
      shading: { fill: i % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: isLabel, size: 20, font: "Arial", color: isLabel ? NAVY : DGRAY })] })],
    })
    const rows2 = [
      ["Age",               d.c1_age        || '–', d.c2_age        || '–'],
      ["Marital Status",    "Married",               "Married"],
      ["Current Health",    d.c1_health     || '–', d.c2_health     || '–'],
      ["Employment Status", d.c1_employment || '–', d.c2_employment || '–'],
      ["Annual Income",     d.c1_income ? fmt(d.c1_income) : '–', d.c2_income ? fmt(d.c2_income) : '–'],
    ]
    return new Table({
      width: { size: w, type: WidthType.DXA }, columnWidths: cols,
      rows: [
        new TableRow({ children: [mkHdr("", cols[0]), mkHdr(c1Name, cols[1]), mkHdr(c2Name || '–', cols[2])] }),
        ...rows2.map((row, i) => new TableRow({ children: [mkCell(row[0], cols[0], i, true), mkCell(row[1], cols[1], i), mkCell(row[2], cols[2], i)] })),
      ],
    })
  })()

  const assetRows = [
    ...(d.assets || []).map(a => [a.desc || '–', a.own || 'Joint', fmt(a.val)]),
    ["Total", "Joint", fmt(String(totalAssets))],
  ]
  const liabRows = [
    ...(d.liabilities || []).map(l => [l.desc || '–', l.own || 'Joint', fmtApprox(l.val)]),
    ["Total", "Joint", fmtApprox(String(totalLiabs))],
    ["Net Financial Position", "Joint", fmt(String(netPos))],
  ]

  const feesTable = (() => {
    const w = 9026
    const cols = [2000, 1200, 1500, 1300, 3026]
    const mkH = (text: string, w2: number) => new TableCell({
      borders: allBorders, width: { size: w2, type: WidthType.DXA },
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: "Arial", color: WHITE })] })],
    })
    const mkC = (text: string, w2: number, ri: number) => new TableCell({
      borders: allBorders, width: { size: w2, type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? LGRAY : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: "Arial", color: DGRAY })] })],
    })
    const feeData = [
      ["Brokerage / commission","You","FinClear Execution Ltd","On each transaction","3 BPS (0.03%) AU equities, min $12 per note. 5 BPS (0.05%) international, min $20 per trade."],
      ["Management Fee","You","Your Adviser & Market Partners","Monthly in arrears","1.08% p.a. (plus GST) of average portfolio value. Minimum $3,000 (plus GST) per annum."],
      ["Custody — intl equities","You","FinClear Execution Ltd","While holding intl assets","3 BPS (0.03%) of intl holdings. Minimum $5/month per account."],
      ["Custody — unlisted bonds","You","Perpetual Corporate Trustees","While holding bonds","3 BPS (0.03%) of bond holdings. Minimum $5/month per account."],
    ]
    return new Table({
      width: { size: w, type: WidthType.DXA }, columnWidths: cols,
      rows: [
        new TableRow({ children: ["What benefit?","Who pays?","To whom?","When?","How much?"].map((h, i) => mkH(h, cols[i])) }),
        ...feeData.map((row, ri) => new TableRow({ children: row.map((cell, ci) => mkC(cell, cols[ci], ri)) })),
      ],
    })
  })()

  const doc = new Document({
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    styles: { default: { document: { run: { font: "Arial", size: 22, color: DGRAY } } } },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
            spacing: { before: 0, after: 120 },
            tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
            children: [
              logoRun,
              new TextRun({ text: "\t", size: 18, font: "Arial" }),
              new TextRun({ text: "Investment Program", size: 18, font: "Arial", color: DGRAY }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
            spacing: { before: 120, after: 0 },
            tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
            children: [
              new TextRun({ text: "Market Partners Pty Limited is a Corporate Authorised Representative of Market Matters Pty Limited, Australian Financial Services Licence 488 798", size: 16, font: "Arial", color: "999999" }),
              new TextRun({ text: "\t", size: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "999999" }),
            ],
          })],
        }),
      },
      children: [
        // COVER
        new Paragraph({ spacing: { before: 320, after: 240 }, children: [new ImageRun({ data: logoBytes, transformation: { width: 200, height: 110 }, type: 'png' })] }),
        new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: "INVESTMENT PROGRAM", bold: true, size: 60, font: "Arial", color: NAVY })] }),
        new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 6 } }, spacing: { before: 0, after: 480 }, children: [new TextRun({ text: "Markets evolve. Trust endures.", size: 24, font: "Arial", color: TEAL, italics: true })] }),
        twoCol([
          ["Prepared for", clients],
          ["Entity", `${entity} (${eType})`],
          ["Date", date],
          ["Prepared by", adviser],
          ["Authorised Representative", "Market Partners Financial Services Pty Limited"],
        ]),
        spacer(800),
        // COVER LETTER
        p(date),
        spacer(80),
        p(entity),
        p(`<${eType} A/C>`),
        p(address),
        spacer(160),
        p(`Dear ${clients},`),
        spacer(80),
        p("This Investment Program acts as a record of the financial proposal provided to you as a \"wholesale\" client (see section 1). It is important that you read my proposal carefully and confirm that my understanding of your needs and circumstances is correct."),
        p("In preparing this Investment Program, I may have incorporated certain statements and information from documents previously provided to you or accompanying this Investment Program. Copies of any such documents can be obtained free of charge by contacting my office by telephone or email during business hours."),
        p("The detailed proposal is based on your current financial position, objectives and personal information. If your circumstances change, or economic or market conditions change significantly, my proposal may no longer be suitable, so you should not act on any recommendations without first discussing them with me."),
        p("I am happy to clarify any outstanding issues or concerns you may have."),
        spacer(480),
        p("Yours sincerely,"),
        spacer(640),
        p(adviser),
        p("Authorised Representative"),
        p("Market Partners Financial Services Pty Limited"),
        new Paragraph({ children: [new PageBreak()] }),
        // 1. WHOLESALE
        h1("1. Your status as a Wholesale Client"),
        p("Australian law draws a distinction between \"wholesale\" and \"retail\" clients aimed at bolstering protections for retail clients in the financial advice process. At the same time, allowing clients to be classified as wholesale enables those with the skills, desire and experience to participate in wholesale markets and invest in more complex products."),
        p("The law is less prescriptive about the advice process for wholesale clients, which means compliance obligations are significantly reduced. Wholesale clients are not required to receive prescribed disclosure documents such as a Financial Services Guide, Statement of Advice or Product Disclosure Statement."),
        p("Wholesale clients do not benefit from certain consumer protections in the Future of Financial Advice reforms, but do have access to a wider range of investments, including certain IPOs and share placements limited to wholesale clients only."),
        p("A minimum level of sophistication in financial matters allows the client to assess:"),
        bullet("The merits of the product or service;"),
        bullet("The value of the product or service;"),
        bullet("The risks associated with holding the product;"),
        bullet("The client's own information needs; and"),
        bullet("The adequacy of the information given by the licensee and the product issuer."),
        spacer(160),
        p("If you have any concerns about your classification as a wholesale client, contact Market Partners Compliance on (02) 9188 4964 or compliance@marketpartners.com.au."),
        new Paragraph({ children: [new PageBreak()] }),
        // 2. SCOPE
        h1("2. Proposal scope"),
        p(`We have agreed that the scope of this proposal is restricted to the amount invested at Market Partners, linked Cash Management Accounts and linked custodian accounts administered by Market Partners. The approximate initial investment is ${invAmt}, held within your ${vehicle} (${entity}).`),
        p("Funds are to be invested into the following products:"),
        ...(d.products || []).map((pr: string) => bullet(pr)),
        spacer(160),
        p("Where you are investing jointly, the proposal relates to the account as a whole. The purpose of this document is to help you understand and decide whether to execute the attached Managed Portfolio Service Agreement (\"MPS Agreement\")."),
        spacer(240),
        h2("Portfolio Assets"),
        p("Unless otherwise agreed, Market Partners or your Adviser will have discretion to invest the funds in the following financial products without prior reference to you:"),
        bullet("Listed and unlisted shares and other securities, including ETFs, listed investment trusts and companies, bonds and company options;"),
        bullet("Basic deposit products (cash management accounts and term deposits up to 5 years);"),
        bullet("Non-basic deposit products (term deposits over 5 years);"),
        bullet("ASIC-registered managed investment schemes;"),
        bullet("Hybrid securities including convertible preference shares and convertible notes."),
        spacer(160),
        p("We shall not invest in derivatives, unregistered managed investment schemes, or non-limited recourse products such as contracts for difference or other leveraged OTC derivatives."),
        spacer(160),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [rb("LIMITATIONS")] }),
        p(`We confirm the following limitations on the Portfolio Assets: ${d.limitations_text || 'None'}`),
        new Paragraph({ children: [new PageBreak()] }),
        // 3. PERSONAL CIRCUMSTANCES
        h1("3. Personal Circumstances"),
        spacer(80),
        personalTable,
        spacer(320),
        new Paragraph({ spacing: { before: 160, after: 80 }, children: [rb("Lifestyle & Investment Assets")] }),
        dataTable(["Asset", "Ownership", "Value"], assetRows, [4513, 2256, 2257]),
        spacer(320),
        new Paragraph({ spacing: { before: 160, after: 80 }, children: [rb("Lifestyle & Investment Liabilities")] }),
        dataTable(["Liability", "Owner", "Amount"], liabRows, [4513, 2256, 2257]),
        spacer(320),
        h2("3.1 Your investment timeframe"),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [rb("Why we ask: "), r("Investments in financial products can be volatile, particularly in the short term. The longer the timeframe, the greater the probability of meeting your objectives.")] }),
        bullet(`You have an investment timeframe of ${d.inv_timeframe}.`),
        h2("3.2 Your investment experience"),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [rb("Why we ask: "), r("Knowing your investment experience enables us to recommend appropriate investments.")] }),
        bullet(`You have ${d.inv_experience} of experience investing in listed equities and other Non-Derivative Products and are well aware of, and accept, the associated risks.`),
        h2("3.3 Your attitude to market movements and losses (risk tolerance)"),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [rb("Why we ask: "), r("The more you tolerate short-term volatility, the greater the prospect of achieving higher returns through growth asset exposure.")] }),
        bullet(`${d.risk_tolerance} – You are a balanced investor targeting medium to long-term financial goals. You require an investment strategy that accounts for tax and inflation. Calculated risks are acceptable to achieve good returns.`),
        spacer(80),
        p("You confirmed your understanding of, and comfort with, the above risk profile. This profile is applicable to investment recommendations within the scope of this proposal and may not reflect your broader attitude to investment outside this scope."),
        h2("3.4 Needs, Goals and Objectives"),
        p(`You would like portfolio recommendations regarding ${invAmt} held in your ${vehicle} (${entity}).`),
        p(d.goals_text || "Given your broader asset position and stage of life, capital preservation and reliable income are increasingly important considerations. While long-term growth remains relevant to ensure your assets outpace inflation and support future needs, this should be balanced by generating sustainable income and reducing the impact of large market drawdowns."),
        spacer(160),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [rb(`Primary Objective – ${d.inv_objective}`)] }),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [rb("Balance of income and growth – "), r("your objective is to achieve returns from a mix of listed asset classes with regard to both income and growth.")] }),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [rb("Suitability – "), r("You are looking for a well-rounded portfolio and are willing to accept some trade-off between growth and income.")] }),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [rb("Risks – "), r("As with any portfolio containing growth assets, you will be exposed to some capital risk and short-term volatility.")] }),
        new Paragraph({ children: [new PageBreak()] }),
        // 4. PROPOSAL
        h1("4. Proposal"),
        p("Based on your instructions, the scope of this proposal, and your relevant personal circumstances as at the date of this document, our proposal and basis is as follows:"),
        spacer(80),
        dataTable(
          ["Asset Class", "Allocation Range", "No. of Holdings"],
          [
            ["Australian Equities", `${d.au_eq_min}–${d.au_eq_max}%`, "15–25 holdings"],
            ["International Equities", `${d.int_eq_min}–${d.int_eq_max}%`, "10–20 holdings"],
            ["Domestic Listed Property", `${d.prop_min}–${d.prop_max}%`, "0–5 holdings"],
            ["Listed Debt, Hybrids, Bonds & Income", `${d.debt_min}–${d.debt_max}%`, "5–10 holdings"],
            ["Fixed Income", `${d.fixed_min}–${d.fixed_max}%`, "2–5 holdings"],
            ["Cash", `${d.cash_min}–${d.cash_max}%`, "–"],
          ],
          [4000, 2500, 2526],
        ),
        spacer(240),
        h2("Why have we provided the above proposal?"),
        p("In the allocation to domestic equities, the 15–25 holdings provide flexibility to gain exposure to several opportunities and diversify across various stocks and sectors, whilst each position retains the ability to generate alpha. Predominantly, investments will be made in large capitalisation companies with a track record of paying dividends to support your income objective."),
        p("In the allocation to international equities, the 10–20 holdings provide growth potential in large multinational companies that diversify the portfolio away from Australia. Currency fluctuations can have both positive and negative impacts on returns."),
        p(`The allocations provide a diversified range of assets structured for a combination of growth and income, with a mild tilt towards growth, aiming to provide a return above the cash rate over the long term in line with your ${d.inv_timeframe} investment horizon.`),
        p("Income assets — including debt, hybrids, bonds and others — make up approximately 35% of the portfolio allocation, in line with a balanced income and growth goal with a mild skew to growth."),
        ...(d.extra_notes ? [p(`Additional notes: ${d.extra_notes}`)] : []),
        p("Investment opportunities will be sourced from a range of providers, including Market Matters, Bloomberg, LSEG, Sandstone, and a wide range of broker research."),
        spacer(240),
        h2("4.1 Risks of acting on this proposal"),
        p("A risk of acting on this proposal is that investing in securities entails a greater level of risk than other traditional investments such as a bank deposit. Other key risks include:"),
        bullet("Investment returns from financial products in the form of capital gains and income are not guaranteed."),
        bullet("The historical performance of a financial product may not be repeated or realised in the future."),
        bullet("Investment income, capital gains and losses are assessable to the account holder for income tax purposes under the relevant tax legislation."),
        bullet("Depending on the market for a particular financial product, it may be difficult or impossible to realise your investment as a result of insufficient liquidity."),
        bullet("If you invest in hybrid securities, these may involve greater risk than equity or debt securities. Each hybrid has a unique return and risk profile based on its terms, timeframe and interest rate."),
        bullet("Securities available via an IPO may involve greater risk than listed securities as they lack a proven track record and have not yet been subject to the continuous disclosure obligations of the Corporations Act 2001."),
        new Paragraph({ children: [new PageBreak()] }),
        // 5. FEES
        h1("5. Fees, charges and other important information"),
        h2("5.1 Conflicts of interest"),
        p("Market Partners, authorised representatives (including your Adviser) or employees may have interests in and earn fees or brokerage from dealing in financial products, the subject of this document."),
        h2("5.2 Instructions to Market Partners"),
        p("You may provide specific instructions to Market Partners or change this document at any time in person, by telephone, post, or email. Any changes must be agreed with Market Partners."),
        h2("5.3 Remuneration, commission and other benefits"),
        spacer(80),
        feesTable,
        spacer(320),
        h2("5.4 Important information and warnings"),
        ...[
          "This document only takes into consideration those personal circumstances known to your Adviser as at the date of this document. If you have not provided full details, this document may not be appropriate to your circumstances and you will need to assess its suitability yourself.",
          "This document may cease to be appropriate if your relevant personal circumstances change. Inform your Adviser in writing immediately of any changes after the date of this document.",
          "This document may be based on incomplete or inaccurate information. Before you act, carefully consider its appropriateness, completeness and accuracy in light of your personal circumstances.",
          "Investment performance and returns are influenced by many factors including company performance, sector conditions, and the national and global economy. Market Partners does not guarantee the future performance of any investment. Any investment in securities involves risk of loss of capital.",
          "This document may set out estimates of future cash dividends and distributions. These estimates should not be relied on as an accurate guide to future performance. Past performance is no guarantee of future performance.",
          "Estimates of gross yield are before tax and assume benefits from franking credits.",
          "Each paragraph of this important information section shall be deemed separate and severable. If any paragraph is found to be illegal or unenforceable, this shall not invalidate any other paragraphs.",
          "Your Adviser is not a registered tax agent. To determine how this proposal could affect your tax position, seek separate advice from your accountant or a registered tax agent.",
          "Capital Gains Tax (CGT) may be payable as a result of implementing this investment program. Selling a product within 12 months of purchase will likely incur additional CGT liability.",
        ].map((text: string) => numbered(text)),
        spacer(400),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
          spacing: { before: 240, after: 80 },
          children: [r("We look forward to assisting you with your investment needs. If you have any queries, please contact us on (02) 9188 4964 or email portfolio@marketpartners.com.au", { italics: true, size: 20 })],
        }),
        spacer(480),
        twoCol([
          ["Firm", "Market Partners Financial Services Pty Limited"],
          ["Address", "Suite 4, Level 11, 54 Miller Street, North Sydney NSW 2060"],
          ["Phone", "+61 2 9188 4964"],
          ["Email", "portfolio@marketpartners.com.au"],
          ["AFSL", "488 798 (Market Matters Pty Limited)"],
        ]),
      ],
    }],
  })

  return Packer.toBuffer(doc)
}
