# Cloud Flight

HomeMistTransition renders one continuous full-viewport atmospheric mist field
in Three.js, blending photographic wisps with domain-warped fractal vapor.
There are no repeated rows of cloud sprites. Opening Home at the top plays a one-second automatic mist
descending reveal once its texture is ready, then clears to the hero without adding scroll
distance. Scrolling immediately cancels this reveal; reduced motion skips it.
Scrolling advects the continuous vapor upward, producing a downward journey
without camera zoom or separated cloud bands.
The gallery arrives after 210svh of cloud passage. Lenis smooths the homepage's
wheel and touch motion. The hero camera follows a continuous GSAP timeline.
Mouse movement and touch drags stir the vapor locally, leaving soft curling
displacement trails that dissipate smoothly. Input does not tilt or move the camera. Touch
listeners are passive so normal scrolling and controls stay available.
Reduced motion uses native scrolling and omits the cloud passage.

## Asset

The current cloud-mist-v2.webp was generated with the built-in image generation
tool and exported to 1024px WebP with alpha. The uploaded video guided its soft
fog density and eased sideways camera motion.

Prompt: A photorealistic isolated atmospheric fog bank on a genuine transparent
background for a 3D interactive website, wide landscape 3:2. Thin diffuse white
and very pale blue vapor spreading horizontally. Soft rolling wisps and translucent
mist filaments, gently varying vapor density, much of the bank partly transparent.
Shallow low-lying cloud forms with delicate small billows, no towering clouds,
mountainous silhouette, hard edges, or chunky cumulus mounds. Cool daylight softly
illuminates the fog from above. Airy and calm atmospheric scattering. The whole
bank fits within the frame with fully transparent margins on all four sides.
No sky, scenery, objects, text, painted checkerboard, or opaque rectangle.
Preserve detailed vapor while keeping its density light and silhouette horizontal.

### Previous Asset

cloud-bank.webp was generated with the built-in image generation tool and
compressed to 1024px WebP, preserving alpha transparency.

Prompt: Create a single wide photorealistic white cumulus cloud bank as an
isolated transparent-background VFX sprite for a 3D fly-through website.
One organic sprawling bank of fluffy clouds, viewed from within the sky at eye
level, wide landscape 3:2 ratio. Dense softly sculpted white lobes through the
middle, intricate vapor filaments and translucent wisps at all outer edges,
no rectangular crop edges, cloud fits within frame with transparent margins on
all four sides. Realistic three-dimensional volume and gentle daylight from
upper left, cool pale blue shading in recesses, luminous white highlights.
Moderate semitransparent fog density, irregular silhouette, natural atmospheric
scattering. No sky background, scenery, ground, mountains, text, sun, or other
objects. Genuine alpha transparency. Transparent falloff on all sides is essential.
