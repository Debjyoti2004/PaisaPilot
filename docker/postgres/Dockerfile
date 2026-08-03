FROM postgres:16-alpine

# Install backup tools
RUN apk add --no-cache \
    bash \
    dcron \
    gzip \
    curl

# Create backup directory
RUN mkdir -p /backups && chmod 755 /backups

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy backup script
COPY backup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh

# Copy cron config
COPY crontab /etc/crontabs/postgres

EXPOSE 5432

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["postgres"]
