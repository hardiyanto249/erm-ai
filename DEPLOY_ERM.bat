@echo off
title Deploy ERM Ziswaf to VPS
set REMOTE_USER=root
set REMOTE_IP=157.66.34.57
set REMOTE_PATH=/opt/erm-ziswaf

echo ---------------------------------------------------
echo       🚀 DEPLOYING ERM ZISWAF TO VPS 🚀
echo ---------------------------------------------------
echo Target Domain : erm-ai.centonk.my.id
echo VPS IP        : %REMOTE_IP%
echo ---------------------------------------------------
echo.

:: 1. Create directory on VPS
echo [*] Mempersiapkan direktori di VPS...
ssh %REMOTE_USER%@%REMOTE_IP% "mkdir -p %REMOTE_PATH%/config"

:: 2. Upload Backend Binary
echo [*] Mengunggah backend binary...
scp "backend/erm-backend" %REMOTE_USER%@%REMOTE_IP%:%REMOTE_PATH%/

:: 3. Upload Config & Env
echo [*] Mengunggah config & env...
scp "backend/config/prompts.yaml" %REMOTE_USER%@%REMOTE_IP%:%REMOTE_PATH%/config/
scp "backend/.env" %REMOTE_USER%@%REMOTE_IP%:%REMOTE_PATH%/

:: 4. Upload Frontend Dist
echo [*] Mengunggah frontend assets...
scp -r "frontend/dist" %REMOTE_USER%@%REMOTE_IP%:%REMOTE_PATH%/

:: 5. Restart via PM2
echo ---------------------------------------------------
echo       🔄 RESTARTING SERVICE (Via SSH) 🔄
echo ---------------------------------------------------
ssh %REMOTE_USER%@%REMOTE_IP% "cd %REMOTE_PATH% ; chmod +x erm-backend ; pm2 delete erm-ziswaf || true ; pm2 start ./erm-backend --name 'erm-ziswaf'"

echo.
echo ✅ DEPLOYMENT SELESAI!
echo Silakan cek: http://erm-ai.centonk.my.id
echo ---------------------------------------------------
pause
