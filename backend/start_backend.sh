#!/bin/bash

set -e

# Navigate to backend folder
cd ~/Documents/PlatformIO/Projects/ServerSensei/backend

# Create virtual environment if it does not exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/Scripts/activate

# Install missing Python modules from requirements.txt
echo "Checking Python dependencies..."
python -m pip install -r requirements.txt

# Check if .env exists, if not create it
if [ ! -f .env ]; then
    echo "Creating .env file..."

    echo "APP_NAME=ServerSensei Backend" > .env
    echo "APP_VERSION=1.0.0" >> .env
    echo "DEBUG=True" >> .env
    echo "DATABASE_URL=mysql+pymysql://root:@localhost:3306/serversensei_db" >> .env
    echo "JWT_SECRET_KEY=your-super-secret-jwt-key-change-this" >> .env
    echo "JWT_ALGORITHM=HS256" >> .env
    echo "JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60" >> .env
fi

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Run the backend
echo "Starting ServerSensei backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload