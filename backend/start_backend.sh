#!/bin/bash

# Navigate to backend folder
cd ~/Documents/PlatformIO/Projects/ServerSensei/backend

# Activate virtual environment
source venv/Scripts/activate

# Check if .env exists, if not create it
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "DATABASE_URL=mysql+pymysql://root:@localhost:3306/serversensei" > .env
    echo "JWT_SECRET_KEY=your-super-secret-jwt-key-change-this" >> .env
fi

# Run the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload