# VoltScope Dashboard Design Direction

## Three stylistic approaches

### Theme Name: Instrument Atelier
Very Brief Intro: A refined industrial-laboratory dashboard with warm paper, graphite ink, and electric teal accents. It feels like a precision instrument translated into a calm, editorial interface.
Probability: 0.07

### Theme Name: Signal Noir
Very Brief Intro: A restrained dark monitoring console using carbon surfaces, amber alerts, and cyan traces. It emphasizes operational focus and live anomaly detection without becoming cyberpunk.
Probability: 0.04

### Theme Name: Field Manual
Very Brief Intro: A daylight engineering field guide with blueprint blue, safety orange, and annotated panels. It makes technical concepts approachable through diagrams, labels, and tactile documentation cues.
Probability: 0.08

## Selected approach: Instrument Atelier

### Design Movement
Contemporary Swiss editorial design fused with industrial instrumentation and scientific field-notebook aesthetics.

### Core Principles
1. Make every metric feel measured, not decorative; use clear hierarchy, restrained surfaces, and visible units.
2. Pair calm editorial whitespace with precise signal traces, annotation marks, and compact technical labels.
3. Treat the waveform as the hero visual language: thin lines, calibrated axes, and deliberate color mapping.
4. Prefer asymmetrical layouts and split-panels over generic centered dashboard cards.

### Color Philosophy
The base is warm mineral paper and ink graphite, evoking a printed engineering report rather than a sterile SaaS panel. VoltScope teal is the ownable signal color: energetic enough to communicate electricity, but controlled enough for long sessions. Class colors are semantic and restrained: slate for normal, amber for sag, coral for swell, violet-blue for harmonics, and moss for flicker. Red is reserved for warnings, not routine data.

### Layout Paradigm
Use a left rail for orientation and a wide content canvas for analysis. The top of the page is an editorial “instrument header” with the project claim and system status. Below it, use a dominant split between a waveform inspection stage and an event ledger. Lower sections alternate wide charts with narrow annotation columns, avoiding a monotonous grid of identical cards.

### Signature Elements
1. A thin vertical “calibration rail” with ticks, section numbers, and live status dots.
2. A waveform baseline motif that appears as a small signal trace beside section headings.
3. Technical annotation chips using uppercase micro-labels, hairline borders, and unit-aware values.

### Interaction Philosophy
Interactions should feel like operating a measurement instrument: explicit, reversible, and informative. Changing a disturbance selector updates the signal, feature readout, and model interpretation together. Hover states reveal exact values; buttons use short labels and never hide important state. The dashboard should explain what changed instead of relying on motion alone.

### Animation
Use 180–240ms ease-out transitions for panels, tabs, and selected classes. Let waveform traces draw in with a subtle 500ms reveal when the selected disturbance changes. Use a short opacity/translate entrance for the first viewport only. Avoid animated numbers that imply live telemetry; use a gentle pulse only for the “model ready” status dot. Respect reduced-motion preferences.

### Typography System
Use Fraunces for display headlines and section titles, paired with IBM Plex Sans for interface text and IBM Plex Mono for measurements, units, and code-like labels. Display titles are compact and editorial, with sentence case. Body text stays at 14–16px with generous line-height. Measurement values use mono numerals and clear decimal alignment.

### Brand Essence
VoltScope is a visual power-quality lab for students, engineers, and reviewers who need to see how waveform behavior becomes a model decision. It is measured, legible, and explanatory. Personality adjectives: precise, curious, grounded.

### Brand Voice
Headlines are declarative and specific. CTAs are verbs that describe the instrument action. Microcopy explains the consequence of a choice without hype.

Example lines:
- “Read the waveform before you read the score.”
- “Change the disturbance. Watch the evidence move.”

### Wordmark & Logo
Use a compact symbol combining a vertical voltage trace and a circular scope aperture: three ascending waveform ticks enter a thin ring, with the middle trace breaking the ring to imply measurement crossing into interpretation. The mark is symbol-only in the UI; the “VoltScope” wordmark uses Fraunces with a custom-tightened “Volt” and a mono-spaced “Scope” treatment.

### Signature Brand Color
VoltScope Teal: `#0E7C78`. It is the bridge between electrical energy and calm analytical trust.

## Implementation reminder

Every page/component should reinforce Instrument Atelier: warm paper, graphite ink, VoltScope teal, editorial split layouts, calibrated waveform traces, and precise unit-aware labels. When uncertain, ask: “Does this choice make the dashboard feel more like a trustworthy measurement instrument, or more like a generic admin template?”
