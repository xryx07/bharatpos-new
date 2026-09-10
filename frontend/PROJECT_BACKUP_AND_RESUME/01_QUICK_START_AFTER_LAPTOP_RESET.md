# 🚀 BharatPOS — Quick Start Guide (After Laptop Reset)

Welcome back! If you just formatted or reset your laptop, follow these steps to resume development immediately.

---

## 📥 1. Prerequisites to Install on Fresh Windows

1. **Node.js (LTS version 20 or higher):**
   - Download & install from: [https://nodejs.org/](https://nodejs.org/)
2. **Git:**
   - Download & install from: [https://git-scm.com/](https://git-scm.com/)
3. **VS Code (or preferred IDE):**
   - Download from: [https://code.visualstudio.com/](https://code.visualstudio.com/)

---

## 📂 2. Clone the Repository

Open PowerShell or Command Prompt and run:

```bash
git clone https://github.com/xryx07/bharatpos-new.git
cd bharatpos-new
```

---

## ⚡ 3. Install Dependencies & Run Frontend

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install all npm packages
npm install

# 3. Start Expo Web Dev Server
npx expo start --web
```

- Open your browser at: **`http://localhost:8081`**

---

## 🌐 4. Live Production Links

| Service | URL |
| :--- | :--- |
| **BharatPOS Main Web App** | **[https://bharatpos-new.vercel.app](https://bharatpos-new.vercel.app)** |
| **Public Customer Invoice Viewer** | **[https://bharatpos-new.vercel.app/invoice](https://bharatpos-new.vercel.app/invoice)** |
| **Super Admin Portal** | **[https://pos-admin-bharat.vercel.app](https://pos-admin-bharat.vercel.app)** |
| **GitHub Repository** | **[https://github.com/xryx07/bharatpos-new](https://github.com/xryx07/bharatpos-new)** |

---

## 🚀 5. How to Deploy to Vercel Production

Whenever you make updates and want to deploy live:

```bash
cd frontend
npx vercel --prod --token vcp_***_SAVED_IN_LOCAL_BACKUPFd10oROa --yes
```
