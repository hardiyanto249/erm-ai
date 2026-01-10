Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; go run main.go"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
