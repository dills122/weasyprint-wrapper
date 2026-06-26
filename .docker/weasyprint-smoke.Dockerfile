FROM node:22-bookworm-slim

ARG WEASYPRINT_VERSION
ARG PYDYF_VERSION

ENV DEBIAN_FRONTEND=noninteractive
ENV CI=1

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libgdk-pixbuf-2.0-0 \
  libffi-dev \
  shared-mime-info \
  fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --no-cache-dir --break-system-packages --upgrade pip \
  && if [ -n "${PYDYF_VERSION}" ]; then \
    python3 -m pip install --no-cache-dir --break-system-packages \
      "weasyprint==${WEASYPRINT_VERSION}" \
      "pydyf==${PYDYF_VERSION}"; \
  else \
    python3 -m pip install --no-cache-dir --break-system-packages \
      "weasyprint==${WEASYPRINT_VERSION}"; \
  fi \
  && weasyprint --version

WORKDIR /work

COPY . .
RUN npm ci

CMD ["npm", "run", "test:real"]
