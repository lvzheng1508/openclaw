#!/bin/bash
# Quick weather lookup via wttr.in

show_help() {
  cat <<EOF
Usage: weather.sh <city1> [city2...] [--format compact|minimal]

Formats:
  default     - Full weather with forecast
  compact     - One-line summary
  minimal     - Just temperature

Examples:
  weather.sh Beijing
  weather.sh Beijing Shanghai Tokyo
  weather.sh Beijing --format compact
EOF
}

if [ $# -eq 0 ]; then
  show_help
  exit 1
fi

# Parse arguments
cities=()
format="default"

while [ $# -gt 0 ]; do
  case "$1" in
    --format)
      format="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      cities+=("$1")
      shift
      ;;
  esac
done

if [ ${#cities[@]} -eq 0 ]; then
  echo "Error: No cities specified"
  show_help
  exit 1
fi

# Query each city
for city in "${cities[@]}"; do
  case "$format" in
    compact)
      curl -s "wttr.in/${city}?format=%l:+%c+%t+(体感+%f),+%w+风,+%h+湿度"
      echo ""
      ;;
    minimal)
      result=$(curl -s "wttr.in/${city}?format=%l:+%t")
      echo "$result"
      ;;
    default|*)
      echo "=== $city ==="
      curl -s "wttr.in/${city}"
      echo ""
      ;;
  esac
done
