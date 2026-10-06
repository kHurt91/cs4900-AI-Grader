FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data static staticfiles

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["./start.sh"]
