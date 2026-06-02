FROM rigbox-base
# Freeze the Python deps into the image so deploys don't re-run pip.
RUN pip install --break-system-packages --no-cache-dir \
      fastapi uvicorn pydantic httpx
