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

## 3D Animation

SwimmingArtwork now builds a true volumetric Three.js model with closed rounded
body geometry, thick beveled fins, curved tail lobes, eyes, luminous appendages,
and a sculpted rider. The previous foreground cutout is retained as an unused
reference asset. The water image remains the stationary background.

Physical materials, a scale bump texture, directional lighting, and shadows
reveal the model's depth. The swim cycle takes 14 seconds. Small tail and fin
rotations, a travelling body wave, and gentle buoyancy keep the movement subtle.
Pointer movement adds a restrained change of viewing angle. Reduced motion
freezes the swimming and pointer response; rendering pauses when offscreen or
when the browser tab is hidden. The original artwork is the WebGL fallback.

## Scale Texture Prompt

Built-in image generation was used for fish-scales.webp, a tileable grayscale
bump texture applied to the actual 3D body, not a replacement fish illustration.

Generate a flat square orthographic macro texture of very fine overlapping
rounded fish scales and delicate pearlescent ridges. Use regular staggered rows,
softly domed scales, consistent size, and tiny etched details. Grayscale only:
medium gray base, pale ridge highlights, darker recessed edges, low contrast,
even illumination. Seamlessly tileable in both axes. No perspective, visible
creature, silhouette, background, text, or border.
