#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERFILE_PATH="${ROOT_DIR}/.docker/weasyprint-smoke.Dockerfile"
IMAGE_NAME="weasyprint-wrapper-smoke"

if [[ $# -gt 0 ]]; then
  VERSIONS=("$@")
else
  VERSIONS=("52.5" "53.3" "57.2" "60.2" "61.2" "62.3")
fi

failures=0

echo "Running WeasyPrint smoke matrix in Docker"
echo "Versions: ${VERSIONS[*]}"

for version in "${VERSIONS[@]}"; do
  image_tag="${IMAGE_NAME}:${version}"
  echo
  echo "=== [${version}] build image ==="

  if ! docker build \
    --file "${DOCKERFILE_PATH}" \
    --build-arg "WEASYPRINT_VERSION=${version}" \
    --tag "${image_tag}" \
    "${ROOT_DIR}"; then
    echo "FAIL [${version}] docker build"
    failures=$((failures + 1))
    continue
  fi

  echo "=== [${version}] run smoke test ==="
  if ! docker run --rm "${image_tag}"; then
    echo "FAIL [${version}] smoke test"
    failures=$((failures + 1))
    continue
  fi

  echo "PASS [${version}]"
done

echo
if [[ ${failures} -gt 0 ]]; then
  echo "Matrix completed with ${failures} failing version(s)"
  exit 1
fi

echo "Matrix completed successfully"
