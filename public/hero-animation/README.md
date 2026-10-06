# Swimming Hero Layers

These layers were prepared with the built-in image generation tool from the
original hero painting, then encoded as WebP with preserved foreground alpha.
The generated extraction recreates some painted details; it is not a pixel-exact
mask of the original image. Both layers share the original wide composition.

## Foreground Prompt

Extract only the entire large pink and turquoise fish and its seated rider,
including fins, glowing branching forehead appendages, whiskers, tail, and foam
touching its outline. Preserve the original painted shape, colors, proportions,
pose, positions, and full 1361:644 composition. Make all other areas transparent.
Do not crop, recenter, zoom, redesign, add padding, text, or shadows.

## Background Prompt

Remove the entire fish, its fins, tail, whiskers, glowing forehead appendages,
and seated rider. Reconstruct their occupied area as continuous painted blue
water matching the surrounding brushwork, with small bubbles and pale water
curls. Preserve the outer water, top wave curls, corner details, original framing,
palette, and 1361:644 composition. Add no creatures, people, text, or new subject.

## Animation

SwimmingArtwork renders stationary water and a separate translucent fish mesh.
A travelling spine wave, tail rotation, independently phased fin strokes, and
gentle buoyancy create a continuous in-place swim. The original artwork remains
the fallback for reduced motion, unsupported WebGL, or failed layer loading.
