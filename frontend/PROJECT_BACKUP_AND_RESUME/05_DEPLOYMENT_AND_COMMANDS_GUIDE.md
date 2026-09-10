# 🛠️ BharatPOS — Commands & Deployment Cheat Sheet

## 📦 Useful Local Commands

### 1. Run Development Server
```bash
cd frontend
npm install
npx expo start --web
```

### 2. Verify TypeScript Compilation (Type Check)
```bash
cd frontend
npx tsc --noEmit
```

### 3. Deploy to Vercel Production
```bash
cd frontend
npx vercel --prod --token vcp_***_SAVED_IN_LOCAL_BACKUPFd10oROa --yes
```

### 4. Git Push to GitHub
```bash
git add .
git commit -m "Update features and documentation"
git push origin main
```
