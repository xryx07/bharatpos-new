@echo off
title BharatPOS - One-Click Production Deployment
cd /d "C:\Users\hp200\OneDrive\Documents\bharatpos\bharatpos-new"
echo ========================================================
echo    BharatPOS Production Deployment to Vercel
echo ========================================================
echo.
echo Step 1: Checking Vercel Authentication...
echo If a browser window opens, please click "Authorize" or log in.
echo.
call npx vercel login
echo.
echo Step 2: Deploying latest build to https://bharatpos-new.vercel.app ...
echo.
call npx vercel --prod --yes
echo.
echo ========================================================
echo    SUCCESS! Deployment is live at:
echo    https://bharatpos-new.vercel.app
echo ========================================================
echo.
pause
