---
name: quick-weather
description: "Quick weather lookup for multiple cities via wttr.in API with compact terminal output. Use when: user asks about weather for multiple cities, needs to compare weather between locations, needs compact weather output in terminal or script, or checking weather for travel planning."
metadata: { "openclaw": { "emoji": "⚡", "requires": { "bins": ["curl"] } } }
---

# Quick Weather

Quick weather lookup using wttr.in API with compact terminal output.

## Quick Start

Single city:

```bash
./scripts/weather.sh Beijing
```

Multiple cities:

```bash
./scripts/weather.sh Beijing Shanghai Tokyo
```

With format options:

```bash
./scripts/weather.sh Beijing --format compact
./scripts/weather.sh Beijing Shanghai --format minimal
```

## Formats

### Default

Full weather with current conditions and 3-day forecast.

### Compact (--format compact)

Single line: location, temperature, feels like, wind, humidity.

### Minimal (--format minimal)

Just the temperature: e.g., "Beijing: 11°C"

## Usage Examples

Check weather for where you're going:

```bash
./scripts/weather.sh Tokyo NewYork London
```

Compare cities for travel:

```bash
./scripts/weather.sh Beijing Shanghai --format compact
```

Quick check for today:

```bash
./scripts/weather.sh Beijing --format minimal
```

## Notes

- Uses wttr.in (no API key required)
- Supports most global cities
- Supports airport codes (e.g., ORD, PEK)
- Rate limited - don't spam requests
