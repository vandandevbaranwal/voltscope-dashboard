# VoltScope Dashboard

VoltScope is an interactive frontend dashboard for power-quality disturbance classification. It visualizes normal, sag, swell, harmonics, and flicker waveforms; displays RMS, THD, peak-to-peak, and standard-deviation features; shows model evaluation evidence; supports CSV upload and browser-side feature analysis; imports notebook accuracy JSON; and exports an HTML evaluation summary.

## Requirements

Install Node.js 18 or newer and pnpm. If pnpm is not installed, run `npm install -g pnpm`.

## Run on Windows, macOS, or Linux

Open a terminal in this project folder and run:

```bash
pnpm install
pnpm dev
```

Open the local URL printed in the terminal, usually `http://localhost:5173` or `http://localhost:3000`.

For a production build:

```bash
pnpm check
pnpm build
```

The build output is created in `dist/`. To preview the frontend build locally, run:

```bash
pnpm preview
```

## Using your project data

The dashboard includes a managed VoltScope CSV source. You can also click **Upload your CSV** and choose a CSV with 640 waveform columns followed by a `label` column. Valid labels are `normal`, `sag`, `swell`, `harmonics`, and `flicker`. The browser computes class-level RMS, THD, peak-to-peak, standard deviation, and representative traces locally.

To import notebook evaluation accuracy, click **Import metrics** and select a JSON file containing one of these keys: `accuracy`, `accuracy_score`, or `overall_accuracy`. Values may be supplied as either a fraction such as `0.998` or a percentage such as `99.8`.

Click **Export summary** to download the current class-level feature summary as an HTML report that can be opened in any browser and printed to PDF if required.

## Project structure

```text
client/src/pages/Home.tsx  Main dashboard and browser-side data logic
client/src/index.css       Instrument Atelier design system
client/index.html          Font loading and document shell
ideas.md                   Visual direction and brand decisions
todo.md                    Distribution checklist
```

The project is frontend-only. No backend, database, login, or external API key is required to run the dashboard locally.
