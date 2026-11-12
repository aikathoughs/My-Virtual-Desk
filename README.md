# 🌙 NIGHTDESK — 3D Virtual Portfolio

> An interactive 3D portfolio experience built as a virtual night desk, designed to present academic and creative work in an immersive, visually engaging way.

---

## 📖 About

**NIGHTDESK** is a 3D virtual desk portfolio created for the *Great Books* course (4th Year, 1st Semester). It transforms a traditional portfolio into an interactive 3D environment — a glowing night desk where viewers can explore works, navigate through content, and experience a creative digital space.

Built with **React**, **Three.js**, and **Tailwind CSS v4**, the app runs entirely in the browser with real-time 3D rendering powered by `@react-three/fiber` and `@react-three/drei`.

---

## 🖼️ Preview

![NIGHTDESK 3D Portfolio Screenshot](public/images/screenshot.jpg)

> *An interactive 3D night desk where you can select DVD cases to explore Great Books entries, check your Student ID, and browse a literary notebook.*

---

## ✨ Features

- 🖥️ **Interactive 3D Night Desk** — Navigate a fully rendered 3D scene
- 💡 **Ambient Lighting & Atmosphere** — Night-mode aesthetic with dynamic lighting
- 📚 **Great Books Portfolio** — Showcases course work and reflections
- ⚡ **Blazing Fast** — Powered by Vite 8 with hot module replacement
- 🎨 **Modern Styling** — Tailwind CSS v4 utility-first design
- 📱 **Responsive** — Adapts to different screen sizes

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI Framework |
| Three.js | 0.187 | 3D Rendering Engine |
| @react-three/fiber | 9.8 | React renderer for Three.js |
| @react-three/drei | 10.7 | Three.js helpers & abstractions |
| Tailwind CSS | v4 | Utility-first styling |
| Vite | 8 | Build tool & dev server |
| TypeScript | 5.7 | Type safety |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** `v18+` → [Download here](https://nodejs.org/)
- **pnpm** (recommended) → Install via:
  ```bash
  npm install -g pnpm
  ```

### 1. Clone the Repository

```bash
git clone https://github.com/aikathoughs/My-Virtual-Desk.git
cd My-Virtual-Desk
```

### 2. Install Dependencies

```bash
pnpm install
```

> **Note:** If you prefer npm or yarn, you can use those too:
> ```bash
> npm install
> # or
> yarn install
> ```

### 3. Run the Development Server

```bash
pnpm run dev
```

The app will start at **[http://localhost:8443](http://localhost:8443)** 🎉

### 4. Build for Production

```bash
pnpm run build
```

The optimized build output will be in the `dist/` folder.

### 5. Preview the Production Build

```bash
pnpm run preview
```

---

## 📁 Project Structure

```
My-Virtual-Desk/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles & Tailwind CSS import
├── public/              # Static assets
├── index.html           # HTML shell
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies & scripts
└── README.md            # You are here!
```

---

## 🎮 How to Navigate

Once the app is running in your browser:

1. **Mouse drag** — Rotate and orbit around the 3D desk
2. **Scroll wheel** — Zoom in and out
3. **Click on objects** — Interact with desk items to view portfolio content

---

## 📜 Scripts Reference

| Command | Description |
|---|---|
| `pnpm run dev` | Start the development server with hot reload |
| `pnpm run build` | Build the project for production |
| `pnpm run preview` | Preview the production build locally |
| `pnpm run format` | Format source files with oxfmt |

---

## 👩‍🎓 About the Author

Created by **Aika** as part of the **Great Books** course portfolio requirement.

- GitHub: [@aikathoughs](https://github.com/aikathoughs)
- Repository: [My-Virtual-Desk](https://github.com/aikathoughs/My-Virtual-Desk)

---

## 📄 License

This project is for academic purposes. All rights reserved © 2026 Aika.

