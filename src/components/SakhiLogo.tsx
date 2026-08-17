import { useId } from "react";
import type { SVGProps } from "react";

/**
 * Official Sakhi AI brand mark — the gradient shield containing a woman's
 * profile silhouette with flowing hair, lotus petals, a floating dot, and a
 * radar/target icon. Use `SakhiMark` for icon-sized spots and `SakhiLogo` for
 * the full lockup with the "Sakhi AI" wordmark.
 */

function useGradientIds(prefix: string) {
  const raw = useId();
  const safe = raw.replace(/[^a-zA-Z0-9]/g, "");
  return {
    shield: `${prefix}-shield-${safe}`,
    ai: `${prefix}-ai-${safe}`,
  };
}

function MarkArtwork({ shieldId }: { shieldId: string }) {
  return (
    <>
      {/* Shield */}
      <path
        d="M256 40 C342 40 396 84 396 158 L396 238 C396 300 346 352 256 392 C166 352 116 300 116 238 L116 158 C116 84 170 40 256 40 Z"
        fill={`url(#${shieldId})`}
      />

      {/* Woman silhouette (profile facing right) */}
      <path
        d="M238 118 C266 118 280 138 278 160 C277 168 276 172 277 176 C281 180 283 186 281 190 C278 194 278 198 281 201 C278 204 276 207 273 209 C268 214 266 220 270 226 C264 232 260 236 262 242 C254 250 242 258 234 266 C226 258 220 250 218 240 C216 232 218 224 224 218 C216 212 212 204 214 194 C218 180 228 170 236 160 C230 148 228 136 232 124 Z"
        fill="#FFFFFF"
      />

      {/* Flowing hair waves */}
      <path
        d="M240 114 C208 104 186 114 178 130 C170 146 178 162 192 172 C200 178 210 178 218 174 C208 169 200 163 198 152 C196 140 204 128 220 122 C230 118 238 120 244 124 Z"
        fill="#FFFFFF"
      />
      <path
        d="M226 158 C196 154 186 162 184 174 C182 186 190 196 202 202 C192 200 184 192 184 182 C184 170 194 160 214 158 Z"
        fill="#FFFFFF"
      />
      <path
        d="M228 132 C206 126 194 132 190 142 C186 152 192 160 202 164 C194 162 188 156 188 148 C188 138 196 130 212 128 Z"
        fill="#FFFFFF"
      />

      {/* Lotus petals at the base */}
      <path d="M256 336 C248 314 248 292 256 280 C264 292 264 314 256 336 Z" fill="#FFFFFF" />
      <path d="M240 330 C226 310 222 294 226 282 C238 288 244 302 248 326 Z" fill="#FFFFFF" />
      <path d="M272 330 C286 310 290 294 286 282 C274 288 268 302 264 326 Z" fill="#FFFFFF" />
      <path d="M214 318 C202 298 200 284 206 274 C218 280 224 294 228 314 Z" fill="#FFFFFF" />
      <path d="M298 318 C310 298 312 284 306 274 C294 280 288 294 284 314 Z" fill="#FFFFFF" />
      <path d="M190 300 C180 284 180 272 188 264 C198 270 204 284 206 298 Z" fill="#FFFFFF" />
      <path d="M322 300 C332 284 332 272 324 264 C314 270 308 284 306 298 Z" fill="#FFFFFF" />

      {/* Floating dot above the petals */}
      <circle cx="256" cy="264" r="5.5" fill="#FFFFFF" />

      {/* Radar / target icon (upper right) */}
      <g strokeLinecap="round" fill="none">
        <path d="M306 108 A32 32 0 0 1 334 96" stroke="#A855F7" strokeWidth="6" />
        <path d="M366 130 A32 32 0 0 1 356 156" stroke="#A855F7" strokeWidth="6" />
        <path d="M314 156 A32 32 0 0 1 302 140" stroke="#A855F7" strokeWidth="6" />
        <path d="M317 111 A21 21 0 0 1 334 107" stroke="#F472B6" strokeWidth="5" />
        <path d="M355 126 A21 21 0 0 1 350 145" stroke="#F472B6" strokeWidth="5" />
        <path d="M324 151 A21 21 0 0 1 315 146" stroke="#F472B6" strokeWidth="5" />
        <path d="M325 119 A11 11 0 0 1 334 117" stroke="#C084FC" strokeWidth="4.5" />
      </g>
      <circle cx="334" cy="128" r="10.5" stroke="#A855F7" strokeWidth="3.5" fill="none" opacity="0.9" />
      <circle cx="334" cy="128" r="5" fill="#EC4899" />
    </>
  );
}

/** The shield mark alone — for icon boxes, headers and small brand spots. */
export function SakhiMark(props: SVGProps<SVGSVGElement>) {
  const ids = useGradientIds("sakhi");
  return (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sakhi AI" {...props}>
      <defs>
        <linearGradient id={ids.shield} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#FFA95E" />
          <stop offset="0.55" stopColor="#FF7B6B" />
          <stop offset="1" stopColor="#F0458F" />
        </linearGradient>
      </defs>
      <MarkArtwork shieldId={ids.shield} />
    </svg>
  );
}

/** Full logo lockup — shield mark plus the "Sakhi AI" wordmark. */
export function SakhiLogo(props: SVGProps<SVGSVGElement>) {
  const ids = useGradientIds("sakhi");
  return (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sakhi AI" {...props}>
      <defs>
        <linearGradient id={ids.shield} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#FFA95E" />
          <stop offset="0.55" stopColor="#FF7B6B" />
          <stop offset="1" stopColor="#F0458F" />
        </linearGradient>
        <linearGradient id={ids.ai} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#EC4899" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <MarkArtwork shieldId={ids.shield} />
      <text
        x="256"
        y="462"
        textAnchor="middle"
        fontFamily="'Poppins','Manrope','Segoe UI',Arial,sans-serif"
        fontSize="54"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        <tspan fill="#1E293B">Sakhi </tspan>
        <tspan fill={`url(#${ids.ai})`}>AI</tspan>
      </text>
    </svg>
  );
}
