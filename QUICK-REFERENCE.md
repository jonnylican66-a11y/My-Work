# ULTRON Quick Start Reference

## ⚡ 60-Second Startup

```powershell
# 1. Navigate to project
cd C:\path\to\ultron-interface

# 2. Install dependencies
npm install

# 3. Set up environment
Copy-Item .env.example .env.local
# → Edit .env.local and paste your OpenAI API key (OPENAI_API_KEY=sk-...)

# 4. Run dev server
npm run dev

# 5. Open browser
# http://localhost:3000
```

## 📋 File Reference

### Core Application Files
- **`app/page.tsx`** — Entry point; renders the holographic interface
- **`components/JarvisOrb.tsx`** — Main HUD component with all input handling
- **`components/ChatPanel.tsx`** — Chat UI and voice input panel
- **`app/api/chat/route.ts`** — OpenAI API bridge
- **`app/api/tools/route.ts`** — Local reminder tool

### Graphics & Vision
- **`lib/orbScene.ts`** — Three.js holographic orb (500+ lines of shaders, geometry, animation)
- **`lib/handTracker.ts`** — MediaPipe hand landmark tracking

### Configuration
- **`package.json`** — Dependencies, scripts, metadata
- **`tsconfig.json`** — TypeScript compiler options
- **`next.config.js`** — Next.js configuration
- **`tailwind.config.js`** — Tailwind CSS theme
- **`.env.example`** — Environment variable template (copy to `.env.local`)

### Documentation
- **`README.md`** — Project overview and feature list
- **`SETUP.md`** — Complete installation and configuration guide
- **`ARCHITECTURE.md`** — Deep technical architecture and design decisions
- **`QUICK-REFERENCE.md`** — This file

## 🎮 Controls Cheat Sheet

| Action | Control |
|--------|---------|
| Rotate orb | Drag mouse / touch drag |
| Zoom in/out | Mouse wheel / two-finger pinch |
| Toggle hand tracking | Press `G` key |
| Reset view | Press `R` key |
| Zoom in | Press `+` key |
| Zoom out | Press `-` key |
| Open chat | Click 💬 COMMS button (bottom-right) |
| Send message | Type and press Enter or SEND |
| Voice input | Click 🎙️ VOICE button in chat |
| Enable camera | Click "ENABLE CAMERA" (top-left) |

## 🔧 Common Tasks

### Check TypeScript Types
```powershell
npm run typecheck
```

### Build for Production
```powershell
npm run build
npm start
```

### Run in Production Mode
```powershell
npm run build
npm start  # Then open http://localhost:3000
```

### Debug Hand Tracking
1. Press `G` to enable hand tracking mode
2. Click "ENABLE CAMERA" button
3. Check browser console (F12) for MediaPipe errors
4. Ensure good lighting and hand visibility
5. Try different hand positions and pinch distances

### Troubleshoot Chat
1. Open browser console (F12 → Console tab)
2. Check for API errors
3. Verify `.env.local` contains a valid `OPENAI_API_KEY`
4. Restart dev server after changing `.env.local`

### Free Port 3000
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

## 📦 Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.3+ | Web framework |
| `react` | 19+ | UI library |
| `three` | 0.176+ | 3D graphics |
| `@react-three/fiber` | 9.1+ | React + Three.js |
| `@react-three/drei` | 10+ | Three.js helpers |
| `@mediapipe/tasks-vision` | 0.10+ | Hand tracking |
| `tailwindcss` | 3.4+ | CSS framework |
| `typescript` | 5.8+ | Type safety |

## 🌍 Environment Variables

**Required:**
```env
OPENAI_API_KEY=sk-...  # Your OpenAI API key
```

**Optional:**
```env
OPENAI_BASE_URL=https://api.openai.com/v1  # Custom endpoint (optional)
OPENAI_MODEL=gpt-4o-mini                    # Model name (optional)
CHAT_MAX_INPUT_CHARS=12000                  # Input limit (optional)
```

## 🚀 Deployment Shortcuts

### Vercel (Recommended for Next.js)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) and import repository
3. Add environment variables in project settings
4. Deploy (auto on git push)

### Docker
```bash
docker build -t ultron .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... ultron
```

### Heroku
```bash
heroku create my-ultron
heroku config:set OPENAI_API_KEY=sk-...
git push heroku main
```

## 🐛 Debugging Checklist

- [ ] `npm install` completes without errors
- [ ] `npm run typecheck` passes
- [ ] `npm run dev` starts on http://localhost:3000
- [ ] Orb renders and animates
- [ ] Chat opens/closes
- [ ] `.env.local` contains `OPENAI_API_KEY`
- [ ] Browser console (F12) shows no red errors
- [ ] Network tab shows successful `/api/chat` calls
- [ ] Hand tracking loads camera without errors

## 📞 Support Resources

**This Project:**
- Check `SETUP.md` for detailed installation help
- Check `ARCHITECTURE.md` for technical deep dives
- Inspect browser console (F12 → Console) for runtime errors

**External Resources:**
- [Next.js Docs](https://nextjs.org/docs)
- [Three.js Docs](https://threejs.org/docs)
- [MediaPipe Hand Tracking](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 📝 Notes

- **No arbitrary execution**: This app cannot run shell commands, scripts, or system binaries
- **Local reminder storage**: `data/reminders.json` stores reminders; it's file-based (not a database)
- **Development only**: The reminder system is not optimized for multi-user or concurrent access
- **API credentials**: Never commit `.env.local` to version control
- **HTTPS for production**: Use HTTPS in production deployments
- **Rate limiting**: Add rate limiting and authentication for public deployments

---

**Version**: 1.0.0 | **Updated**: October 2026
