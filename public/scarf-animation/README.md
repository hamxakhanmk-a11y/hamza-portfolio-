# Scarf Animation

ScarfMotion leaves the hero image intact and renders only two loose purple
scarf ends as folded Three.js silk ribbons. Their attachment points remain
fixed, with a slow 16-second rolling motion, modest twisting, and changing
surface lighting. The overlay follows the hero's existing image crop and zoom.
Reduced motion displays the original image; animation pauses offscreen and
when the browser tab is hidden.

The uploaded reference clip guided the rolling fabric motion; it is not used
as a site asset. The new fabric is procedural geometry, not copied stock media.

## Repair Asset

The built-in image generation tool produced scarf-repair.webp from a close-up
of the original artwork. Only two small masked areas are displayed, covering
the original dangling tips under the moving fabric. All other hero pixels
remain the original painting.

Prompt: Remove only the loose purple tip projecting left from the crossed
arms into blue water and the ribbon dangling below the bent legs over the
turquoise fish. Reconstruct matching painted water and fish surface. Preserve
the wrapped cloth, woman's face, body, limbs, hat, colors, brushwork, framing,
and proportions. Do not add fabric, transform the woman, or introduce objects.

## Water And Bubbles

heroWaterMotion uses the original artwork texture in the same Three.js renderer
as the scarf. A luminance/color mask selects pale painted water curls and foam;
paint-space outlines protect the fish and woman, and corner ornaments are
excluded. Slow travelling ripples and a restrained moving sheen animate those
foam over an 18-second cycle. The thin spiral lines at the right, bottom, and
left now move with the artwork's subdivided 3D surface: slow travelling folds
bend each complete curl in three dimensions over a 24-second cycle. Feathered
supports keep the surrounding painting continuous, and restrained fold lighting
adds depth without replacing the painted strokes. The ten large blue-white bubbles around
the fish's head have individually phased small drifts and size pulses; their
coral appendages stay fixed. Small bright water bubbles also follow the current.

The existing crop/zoom alignment, reduced-motion fallback, and offscreen/tab
pause apply to the entire composition. No additional generated image or stock
video is used for water or bubbles.
