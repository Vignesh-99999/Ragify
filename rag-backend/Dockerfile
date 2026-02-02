# 1. Use Python image
FROM python:3.10-slim

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy requirements file
COPY requirements.txt .

# 4. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy backend code
COPY . .

# 6. Expose Flask port
EXPOSE 5000

# 7. Run Flask app
CMD ["python", "app.py"]
