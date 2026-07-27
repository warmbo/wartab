# ═══════════════════════════════════════════════════
# WarTab — Dockerfile
# ═══════════════════════════════════════════════════
# Build:
#   docker build -t wartab .
#
# Run:
#   docker run -d \
#     --name wartab \
#     -p 8081:8081 \
#     -v wartab-config:/app/config.json \
#     -v wartab-notes:/app/notes \
#     -v wartab-uploads:/app/uploads \
#     wartab
#
# Run with custom port:
#   docker run -d --name wartab -p 3000:3000 wartab --port 3000
# ═══════════════════════════════════════════════════

FROM python:3-slim

LABEL org.opencontainers.image.title="WarTab"
LABEL org.opencontainers.image.description="Self-hosted new tab dashboard"
LABEL org.opencontainers.image.source="https://github.com/nousresearch/wartab"
LABEL org.opencontainers.image.licenses="MIT"

# Install dependencies (Pillow for image compression)
RUN pip install --no-cache-dir Pillow

# Create app user (non-root)
RUN groupadd -r wartab && useradd -r -g wartab -d /app -s /sbin/nologin wartab

# Copy application
COPY --chown=wartab:wartab . /app/
WORKDIR /app

# Create data directories
RUN mkdir -p /app/notes /app/uploads && chown -R wartab:wartab /app/notes /app/uploads

# Switch to non-root user
USER wartab

# Expose default port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8081/')" || exit 1

# Run server
ENTRYPOINT ["python3", "/app/server.py"]
CMD ["--port", "8081", "--bind", "0.0.0.0"]
