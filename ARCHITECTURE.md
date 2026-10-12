# ULTRON Architecture & Technical Overview

## Project Overview

**ULTRON** is a standalone Next.js application that provides a futuristic, Iron Man-inspired holographic AI assistant interface. It combines cutting-edge frontend graphics (Three.js), computer vision (MediaPipe), and conversational AI (OpenAI-compatible API) in a single, production-ready codebase.

**Key Features:**
- Animated holographic orb with post-processing (Unreal Bloom, chromatic aberration)
- Real-time hand gesture recognition and pinch-based gesture controls
- Voice and text chat powered by OpenAI API
- Responsive pointer/touch/keyboard input handling
- Bounded, approval-gated local actions (reminders only; no arbitrary execution)

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20.9+ | JavaScript execution |
| **Framework** | Next.js 15+ (App Router) | Server & client routing |
| **Language** | TypeScript 5.8+ | Type safety |
| **UI Framework** | React 19+ | Component system |
| **Styling** | Tailwind CSS 3.4+ | Utility-first CSS |
| **3D Graphics** | Three.js 0.176+ | WebGL rendering |
| **3D Components** | React Three Fiber 9.1+ | React abstraction for Three.js |
| **3D Assets** | Drei 10.0+ | Reusable Three.js components & helpers |
| **Vision** | MediaPipe Tasks Vision 0.10+ | Hand landmark detection |
| **UI Controls** | Next.js Fonts | System fonts (Jet Brains Mono, Space Grotesk) |

## Architecture

### 1. Core Rendering Pipeline (`lib/orbScene.ts`)

The holographic orb is the visual centerpiece, rendered with Three.js and highly optimized for performance:

```
┌─────────────────────────────────────┐
│      Three.js Rendering Engine      │
├─────────────────────────────────────┤
│ - Scene with FogExp2 (depth effect)  │
│ - Ambient + point lighting           │
│ - 5 rotating wireframe shells        │
│ - Golden spiral particle core        │
│ - 1250+ dust particles               │
│ - 4 animated scan rings              │
│ - 28 orbiting debris fragments       │
│ - 4 text sprites (code labels)       │
│ - 6 HUD scan lines                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Post-Processing Pipeline       │
├─────────────────────────────────────┤
│ - RenderPass (base scene)            │
│ - UnrealBloomPass (luminosity glow)  │
│ - ShaderPass (chromatic aberration)  │
│ - EffectComposer (frame merge)       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Canvas (WebGL 2.0 / OpenGL ES 3)  │
└─────────────────────────────────────┘
```

**Key Features:**
- **Color Space**: sRGB output with ACESFilmicToneMapping for cinematic look
- **Bloom Radius**: 1.18 with strength 0.64 for sci-fi glow
- **Chromatic Aberration**: 0.0012 shift for subtle lens distortion
- **Animation Loop**: 60 FPS with smooth easing on all transforms
- **Responsive**: Auto-scales to container; ResizeObserver tracks size changes
- **Cleanup**: Full disposal of geometries, materials, and textures on unmount

### 2. Input Handling (`components/JarvisOrb.tsx`)

Multi-modal input system with priority fallback:

```
User Action → Mode Check → Handler → Orb Update
                ↓
         ┌──────┴──────┐
         ↓             ↓
    [Hands]      [Pointer/Touch]
    (if enabled)    (default)
         ↓             ↓
      Pinch       Drag, Wheel,
      Two-Hand    Keyboard
      Span            ↓
         │         setRotation
         ├────────────┤
         └────────────┤
                      ↓
                 orb.current?.setRotation(x, y)
                 orb.current?.setZoom(zoom)
```

**Modes:**
1. **Pointer Mode** (default)
   - Mouse drag: rotate
   - Mouse wheel / trackpad: zoom
   - Touch drag: rotate
   - Two-finger pinch: zoom
   
2. **Hands Mode** (optional, requires camera)
   - Single-hand pinch: drag to rotate orb
   - Two-hand pinch: spread/contract to zoom
   - Hysteresis threshold: prevents jitter (pinch start 0.045, end 0.065)

**Keyboard Shortcuts:**
- `G`: Toggle input mode
- `R`: Reset rotation (0.12, 0.3) and zoom (1.0)
- `+` / `-`: Adjust zoom level

### 3. Hand Tracking (`lib/handTracker.ts`)

MediaPipe-based real-time hand landmark detection:

```
Browser Camera
      ↓
[HTMLVideoElement]
      ↓
MediaPipe HandLandmarker
(2 hands, 21 landmarks each)
      ↓
┌─────────────────────────────┐
│  Hand Tracking State        │
├─────────────────────────────┤
│ - pinching: boolean         │
│ - position: {x,y} | null    │
│ - twoHandSpan: number|null  │
│ - hands: count              │
└─────────────────────────────┘
      ↓
Update Handler (React state)
      ↓
orb.setRotation / orb.setZoom
```

**Workflow:**
1. User clicks "ENABLE CAMERA"
2. Browser requests camera permission
3. Stream is fed to MediaPipe HandLandmarker
4. Landmarks are detected on each frame (~30 FPS on GPU)
5. Pinch distance calculated between thumb (landmark 4) and index tip (landmark 8)
6. Hysteresis applied to prevent flickering (state persists unless threshold crossed)
7. Two-hand distance (index tips) determines zoom span
8. Updates trigger React state → orb animation

**Error Handling:**
- Missing camera: Falls back to pointer/touch
- MediaPipe model unavailable: Falls back to pointer/touch
- Permission denied: Graceful error message

### 4. Chat & Voice Interface (`components/ChatPanel.tsx`)

Conversational UI with voice input support:

```
┌──────────────────────────────────────┐
│     ChatPanel (React Component)      │
├──────────────────────────────────────┤
│  ┌─ Message History ─────────────┐  │
│  │ [USER >] message              │  │
│  │ [ULTRON >] response           │  │
│  │ [USER >] ...                  │  │
│  └───────────────────────────────┘  │
│  ┌─ Input Controls ──────────────┐  │
│  │ [Input Field]  [SEND]         │  │
│  │ [🎙️ VOICE]                   │  │
│  └───────────────────────────────┘  │
└──────────────────────────────────────┘
       ↓
   POST /api/chat
       ↓
┌──────────────────────────────────────┐
│     OpenAI API Chat Endpoint         │
├──────────────────────────────────────┤
│ - Input validation (char limit)      │
│ - Bearer token auth                  │
│ - Model inference (1024 tokens max)  │
│ - Temperature: 0.7 (balanced)        │
└──────────────────────────────────────┘
       ↓
   Response (text)
       ↓
   Display in chat history
```

**Features:**
- **Text Input**: Type and press Enter or SEND
- **Voice Input**: 
  - Uses Web Speech API (Chrome, Edge, Safari, Firefox)
  - Continuous: false (stops after one sentence)
  - Language: en-US (configurable)
- **Message Display**: Color-coded (orange for user, green for assistant)
- **Auto-scroll**: Scrolls to bottom on new messages
- **Error Handling**: Network failures and API errors displayed in chat

### 5. Backend API Routes

#### `/api/chat` (POST)

Forwards user messages to OpenAI-compatible endpoint.

**Request:**
```json
{
  "message": "Hello, ULTRON"
}
```

**Response:**
```json
{
  "reply": "Greetings. Systems online and ready for your commands."
}
```

**Validation:**
- Message required, non-empty
- Max length: `CHAT_MAX_INPUT_CHARS` (default 12000)
- API key checked before forwarding

**Error Responses:**
- 400: Missing or invalid message
- 503: API key not configured
- 500: Internal server error

#### `/api/tools` (POST)

Manages local reminders (the only local side effect).

**Actions:**

`create` — Create a reminder
```json
{
  "action": "create",
  "title": "Review code",
  "dueDate": "2026-10-25"
}
```
Response: `{ "reminder": { "id": "...", "title": "...", "dueDate": "...", "createdAt": "..." } }`

`list` — List all reminders
```json
{
  "action": "list"
}
```
Response: `{ "reminders": [...] }`

`delete` — Delete a reminder
```json
{
  "action": "delete",
  "id": "reminder-..."
}
```
Response: `{ "success": true }`

**Storage:**
- File: `data/reminders.json`
- Format: JSON array of reminder objects
- Access: Fixed path only; no directory traversal possible
- Concurrency: Not optimized for multi-process; suitable for development

### 6. Routing & Pages

**Next.js App Router Structure:**

```
app/
├── layout.tsx
│   └── Applies global styles, fonts, metadata
├── page.tsx
│   └── Renders <JarvisOrb /> component
├── globals.css
│   └── Tailwind, CSS custom properties, HUD styles
└── api/
    ├── chat/route.ts
    │   └── POST /api/chat
    └── tools/route.ts
        └── POST /api/tools
```

**Metadata & Viewport:**
- Title: "ULTRON // Interface"
- Description: "A holographic assistant interface..."
- Theme color: #070908 (dark void)
- Color scheme: dark

## State Management

**React Hooks** (no Redux/Zustand):

```typescript
// JarvisOrb.tsx
const [inputMode, setInputMode] = useState<"hands" | "pointer">("pointer");
const [cameraActive, setCameraActive] = useState(false);
const [rotation, setRotation] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
// ... other state

// ChatPanel.tsx
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState("");
const [loading, setLoading] = useState(false);
const [listening, setListening] = useState(false);
// ... other state
```

**Persistence:**
- Session-only (localStorage not used by default)
- Add `useLocalStorage` hook for persistent chat history if desired

## Security & Constraints

### ✅ What This Application CAN Do

1. **Render 3D graphics** with Three.js
2. **Access user's webcam** (with explicit permission)
3. **Send text/voice to OpenAI** for conversational responses
4. **Create/read/delete reminders** in `data/reminders.json`
5. **Display rich UI** with animations and transitions

### ❌ What This Application CANNOT Do

1. **Execute shell commands** (PowerShell, bash, cmd, etc.)
2. **Access arbitrary files** (only `data/reminders.json`)
3. **Run Python, Node, or other scripts** locally
4. **Modify system settings** or registry
5. **Load plugins or DLLs** at runtime
6. **Make changes to the OS**

### Security Measures

- **Input Validation**: All API payloads validated before processing
- **No Eval/Exec**: Zero use of `eval()`, `Function()`, or child processes
- **Secrets Management**: API keys stored in `.env.local` only (not in version control)
- **CORS**: API routes are same-origin only
- **Rate Limiting**: None built-in (recommend adding for production)
- **Authentication**: None built-in (recommend adding for production)

## Performance Characteristics

### Build Time
- **Development**: ~3–5 seconds
- **Production**: ~10–15 seconds (includes optimization pass)

### Runtime
- **Initial Load**: ~280 kB First Load JS (split automatically)
- **Bundle Size (main page)**: ~177 kB
- **Bundle Size (API routes)**: ~127 kB each
- **Orb Rendering**: 60 FPS on modern GPU; ~10 FPS on low-end devices (graceful degradation)

### Memory
- **Process Memory**: ~100–150 MB (Node.js + Next.js runtime)
- **Browser Memory**: ~200–300 MB (depends on message history length)

## Deployment Guide

### Local Development
```bash
npm run dev
open http://localhost:3000
```

### Self-Hosted (Node.js)
```bash
npm run build
npm start
# Server listens on http://localhost:3000 by default
```

### Cloud Platforms (Vercel, Netlify, AWS, etc.)

1. Push code to GitHub
2. Connect repository to platform
3. Set environment variables: `OPENAI_API_KEY`, etc.
4. Deploy (platforms auto-detect Next.js)

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t ultron:latest .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... ultron:latest
```

## Future Enhancements

Possible additions (not included in base):
- Persistent message history (PostgreSQL, MongoDB)
- User authentication (JWT, OAuth)
- Rate limiting & abuse detection
- Streaming chat responses (SSE)
- Multi-modal input (images, documents)
- Localization (i18n)
- Dark/light theme toggle
- Settings panel
- Advanced gesture gestures (swipe, grab, etc.)

## Files at a Glance

| File | Lines | Purpose |
|------|-------|---------|
| `lib/orbScene.ts` | ~500 | Three.js holographic orb + post-processing |
| `lib/handTracker.ts` | ~200 | MediaPipe hand landmark tracking |
| `components/JarvisOrb.tsx` | ~250 | Main HUD component, input handling |
| `components/ChatPanel.tsx` | ~200 | Chat UI, voice input, message display |
| `app/api/chat/route.ts` | ~70 | Chat API endpoint |
| `app/api/tools/route.ts` | ~100 | Tools API (reminders) |
| `app/layout.tsx` | ~30 | Root layout, fonts, metadata |
| `app/page.tsx` | ~5 | Home page (renders JarvisOrb) |
| `app/globals.css` | ~150 | Global styles, Tailwind, HUD classes |
| **Total TypeScript/TSX** | ~1350 | Core logic |

## Testing

### Manual Testing Checklist

- [ ] Dev server starts: `npm run dev`
- [ ] Page loads at http://localhost:3000
- [ ] Orb renders and animates smoothly
- [ ] Drag rotates orb
- [ ] Scroll zooms orb
- [ ] Keyboard shortcuts work (G, R, +, -)
- [ ] Chat panel opens/closes
- [ ] Message sends (requires OPENAI_API_KEY)
- [ ] Voice button works (browser-dependent)
- [ ] Camera button works (browser permission flow)
- [ ] Type check passes: `npm run typecheck`
- [ ] Production build succeeds: `npm run build`

### Automated Testing (Not Included)

To add Jest + React Testing Library:
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest
```

Create `jest.config.js` and write unit tests for components, API routes, and utilities.

## Debugging Tips

1. **Browser DevTools (F12)**
   - Console: See client errors and API logs
   - Network: Monitor API calls and asset loading
   - Performance: Profile orb rendering performance
   - Sources: Step through TypeScript (with source maps)

2. **Next.js Build Output**
   - Run `npm run build` for production optimization warnings
   - Check `.next/static` for bundle analysis

3. **Environment Variables**
   - Use `console.log(process.env)` in API routes to verify config
   - Restart dev server after changing `.env.local`

4. **MediaPipe**
   - Check browser console for model download errors
   - Ensure WASM files are loading from CDN
   - Test with different lighting conditions for hand tracking accuracy

---

**Architecture Version**: 1.0  
**Last Updated**: October 2026  
**Status**: Production-Ready (bounded actions, no arbitrary execution)
