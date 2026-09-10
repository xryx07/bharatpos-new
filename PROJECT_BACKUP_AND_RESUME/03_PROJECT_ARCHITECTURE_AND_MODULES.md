# 🏗️ BharatPOS — Architecture & Module Breakdown

BharatPOS is a modern, high-performance Point-of-Sale (POS), GST compliance, and double-entry accounting web platform built using **React Native / Expo Router** with **TypeScript**, **Paper MD3**, and **Firebase Realtime Database**.

---

## 📁 Project Structure

```
bharatpos-new/
├── frontend/
│   ├── api/                           # Vercel Serverless Functions
│   │   ├── send-whatsapp.js          # WhatsApp Digital Invoice API
│   │   └── send-sms.js               # Fast2SMS Gateway API
│   ├── src/
│   │   ├── app/                      # Expo Router App Pages
│   │   │   ├── (owner)/              # Owner / Merchant Console
│   │   │   │   ├── index.tsx         # Executive Dashboard & AI Copilot
│   │   │   │   ├── pos_billing.tsx   # Fast POS Terminal (0ms search, WhatsApp share)
│   │   │   │   ├── inventory.tsx     # Godowns & Multi-warehouse inventory
│   │   │   │   ├── products_management.tsx # Products List & Direct Add Modal
│   │   │   │   ├── barcode_generator.tsx   # EAN-13 / Code128 Barcode Generator
│   │   │   │   ├── profit_loss.tsx   # Executive Income Statement & Profit Ledger
│   │   │   │   ├── balance_sheet.tsx # Financial Position Statement
│   │   │   │   ├── day_book.tsx      # Daily Voucher Transactions Register
│   │   │   │   ├── cash_bank_book.tsx# Cash & Bank Book Ledgers
│   │   │   │   ├── journal_entry.tsx # Double-entry Journal Voucher Creator
│   │   │   │   ├── ledgers.tsx       # Chart of Accounts (Assets, Liab, Equity)
│   │   │   │   ├── gst_management.tsx# GSTR-1, GSTR-3B & E-Way / E-Invoice
│   │   │   │   ├── data_import.tsx   # Tally XML, Excel/CSV & OCR Importer
│   │   │   │   ├── reorder_list.tsx  # Automated Low Stock Reordering
│   │   │   │   ├── reports.tsx       # PDF & Excel Financial Reports
│   │   │   │   └── settings.tsx      # Shop Profile & Billing Configuration
│   │   │   ├── invoice.tsx           # Public Customer Digital Invoice Preview
│   │   │   └── (auth)/               # Authentication (Login / Signup)
│   │   ├── components/               # Reusable UI widgets & Modals
│   │   │   └── POSAssistantModal.tsx # AI Voice & Text Copilot
│   │   ├── constants/                # Theme tokens & Design System
│   │   │   └── designTokens.ts       # Emerald Green Minimal Design System
│   │   ├── lib/                      # Firebase adapter & Database abstractions
│   │   │   ├── firebase.ts           # Firebase SDK initialization
│   │   │   └── firestore_adapter.ts  # Firestore-to-RTDB compatibility layer
│   │   └── providers/                # React Context Providers
│   │       ├── AuthProvider.tsx      # User authentication context
│   │       ├── CartProvider.tsx      # Real-time POS cart calculation
│   │       └── ThemeProvider.tsx     # Emerald Green UI theme provider
│   ├── vercel.json                   # Vercel Routing & Serverless config
│   └── package.json                  # Dependencies
└── admin/                            # Super Admin SaaS Tenant Control Portal
```

---

## 🌟 Key Features Implemented

1. **⚡ Fast POS Terminal (`/pos_billing`):**
   - In-memory sub-millisecond barcode scan & name search (0ms).
   - Real-time stock deduction in both active memory and Firebase database upon billing.
   - 1-click **"Share Bill on WhatsApp"** dispatching digital invoice URLs (`/invoice?id=INV-XXXX`).

2. **🧾 Full GST Compliance Suite (`/gst_management`):**
   - Automated GSTR-1 preparation (B2B Supplies with GSTIN, B2C Small rate breakdown, HSN summaries).
   - Automated GSTR-3B summaries (Outward supplies, Eligible ITC, Net tax).
   - E-Invoice IRN registration & E-Way bill generation.

3. **📊 Tally Integration & Importer (`/data_import`):**
   - Tally XML import parser (`<STOCKITEM>`, `<RATE>`, `<COST>`, `<BARCODE>`).
   - Tally Cloud Sync with license handshake.
   - Excel / CSV & OCR Importer with binary data corruption safeguards.

4. **📚 Core Double-Entry Accounting:**
   - Double-entry Journal Vouchers (`/journal_entry`).
   - Chart of Accounts & General Ledgers (`/ledgers`).
   - Day Book Register (`/day_book`).
   - Cash & Bank Book (`/cash_bank_book`).
   - Executive Income Statement (`/profit_loss`).
   - Balance Sheet with auto-balancing (`/balance_sheet`).
