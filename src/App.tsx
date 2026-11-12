import { useCallback, useEffect, useRef, useState } from "react";
import Scene from "./Scene";
import YouTubeCRT, { type YouTubeCRTController } from "./YouTubeCRT";
import { notebookCategories, notebookPages, projects, studentIdentity } from "./data";
import {
  dvdIsBusy,
  dvdIsInDrive,
  notebookIsActive,
  notebookIsAnimating,
  type CRTState,
  type DVDState,
  type HoverInfo,
  type NotebookState,
  type ThemeMode,
  type View,
} from "./interaction";
import { useSoundController, type SoundEffect } from "./sound";

type StepSpec = {
  next: DVDState;
  duration: number;
  sound?: SoundEffect;
};

const DVD_TIMELINE: Partial<Record<DVDState, StepSpec>> = {
  STARTUP: { next: "IDLE", duration: 3200 },
  DVD_SELECTED: { next: "CASE_OPENING", duration: 700, sound: "caseOpen" },
  CASE_OPENING: { next: "CASE_OPEN", duration: 750 },
  CASE_OPEN: { next: "DISC_REMOVING", duration: 420, sound: "discRemove" },
  DISC_REMOVING: { next: "DRIVE_OPENING", duration: 700, sound: "driveOpen" },
  DRIVE_OPENING: { next: "DISC_INSERTING", duration: 700, sound: "discInsert" },
  DISC_INSERTING: { next: "DISC_READING", duration: 1150, sound: "driveClose" },
  DISC_READING: { next: "PROJECT_LOADING", duration: 950, sound: "discRead" },
  PROJECT_READY: { next: "PROJECT_PLAYING", duration: 600, sound: "videoLoad" },
  DRIVE_EJECTING: { next: "DISC_RETURNING", duration: 850, sound: "discRemove" },
  DISC_RETURNING: { next: "CASE_CLOSING", duration: 1150, sound: "caseOpen" },
  CASE_CLOSING: { next: "RETURNING_TO_STACK", duration: 700 },
  RETURNING_TO_STACK: { next: "IDLE", duration: 800 },
};

export default function App() {
  const [view, setView] = useState<View>("desk");
  const [theme, setTheme] = useState<ThemeMode>("night");
  const [phase, setPhase] = useState<DVDState>("STARTUP");
  const [crtState, setCrtState] = useState<CRTState>("COMPUTER_IDLE");
  const [selected, setSelected] = useState<number | null>(null);
  const [lampOn, setLampOn] = useState(true);
  const [blindsOpen, setBlindsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [casesOpen, setCasesOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [qualityTier, setQualityTier] = useState<"high" | "balanced" | "mobile">("high");
  const [notebookTextScale, setNotebookTextScale] = useState(100); // 80..130 (%)
  const [notebookPageScroll, setNotebookPageScroll] = useState(0); // 0..1 within-page vertical scroll

  const handleHoverChange = useCallback((next: HoverInfo) => {
    setHoverInfo((prev) => {
      if (prev === null && next === null) return prev;
      if (prev && next && prev.id === next.id && prev.label === next.label) return prev;
      return next;
    });
  }, []);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const crtPortalRef = useRef<HTMLDivElement | null>(null);
  const ytControllerRef = useRef<YouTubeCRTController | null>(null);
  const queuedDvdRef = useRef<number | null>(null);

  const [notebookState, setNotebookState] = useState<NotebookState>("NOTEBOOK_CLOSED");
  const [notebookPage, setNotebookPage] = useState(1); // 1-indexed odd left spread page (1, 3, ..., 19)
  const [targetTurnPage, setTargetTurnPage] = useState<number | null>(null);
  const notebookLockRef = useRef(false);
  const notebookTimerRef = useRef<number | null>(null);

  const {
    enabled: soundOn,
    toggle: toggleSound,
    play: playSound,
    stopActive,
  } = useSoundController();

  const clearNotebookTimer = useCallback(() => {
    if (notebookTimerRef.current !== null) {
      window.clearTimeout(notebookTimerRef.current);
      notebookTimerRef.current = null;
    }
    notebookLockRef.current = false;
  }, []);

  useEffect(() => clearNotebookTimer, [clearNotebookTimer]);

  useEffect(() => {
    document.title = "MY VIRTUAL DESK — A Literary Journey Through Seven Great Books";
  }, []);

  // Detect adaptive graphics quality tier and mobile portrait/landscape orientation
  useEffect(() => {
    const updateViewportAndQuality = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
      const mobileViewport = w < 900 || (coarse && Math.min(w, h) < 760);
      const portrait = mobileViewport && h > w * 1.04;

      setIsMobilePortrait(portrait);
      if (!portrait) {
        setPortraitDismissed(false);
      }

      // Collapse the desk guide automatically on compact mobile screens so the 3D desk isn't covered
      if (w < 760 || h < 520) {
        setGuideOpen(false);
      }

      const cores = navigator.hardwareConcurrency ?? 8;
      if (coarse || w < 760) {
        setQualityTier("mobile");
      } else if (cores <= 4 || w < 1100) {
        setQualityTier("balanced");
      } else {
        setQualityTier("high");
      }
    };

    updateViewportAndQuality();
    window.addEventListener("resize", updateViewportAndQuality);
    window.addEventListener("orientationchange", updateViewportAndQuality);
    return () => {
      window.removeEventListener("resize", updateViewportAndQuality);
      window.removeEventListener("orientationchange", updateViewportAndQuality);
    };
  }, []);

  // Update document cursor when hovering interactive 3D objects
  useEffect(() => {
    document.body.style.cursor = hoverInfo ? "pointer" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [hoverInfo]);

  const startSystem = useCallback(() => {
    setPhase("IDLE");
    setCrtState("COMPUTER_IDLE");
    setView("desk");
  }, []);

  // Sync CRT state with physical disc detection and idle return
  useEffect(() => {
    if (phase === "DISC_READING") {
      setCrtState("DISC_DETECTED");
    } else if (
      phase === "IDLE" ||
      phase === "STARTUP" ||
      phase === "OFF" ||
      phase === "DRIVE_EJECTING"
    ) {
      setCrtState("COMPUTER_IDLE");
    }
  }, [phase]);

  const handlePlayerReadyAdvancePhase = useCallback(() => {
    setPhase((current) => (current === "PROJECT_LOADING" ? "PROJECT_READY" : current));
  }, []);

  // Coordinated sequential DVD state machine
  useEffect(() => {
    const step = DVD_TIMELINE[phase];
    if (!step) return;
    const timer = window.setTimeout(() => {
      if (step.sound) {
        playSound(step.sound);
      }
      if (phase === "RETURNING_TO_STACK" && step.next === "IDLE") {
        const nextQueued = queuedDvdRef.current;
        queuedDvdRef.current = null;
        if (nextQueued !== null) {
          setSelected(nextQueued);
          setPhase("DVD_SELECTED");
          return;
        }
        setSelected(null);
        setCrtState("COMPUTER_IDLE");
      }
      setPhase(step.next);
    }, step.duration);
    return () => window.clearTimeout(timer);
  }, [phase, playSound]);

  const selectDVD = useCallback(
    (index: number) => {
      if (notebookIsActive(notebookState)) return;
      // If another DVD is currently in the drive, stop its video, eject it first, and queue the new DVD
      if (dvdIsInDrive(phase) && selected !== null) {
        if (selected === index) {
          setCasesOpen(false);
          return;
        }
        queuedDvdRef.current = index;
        ytControllerRef.current?.stopAndClear();
        setCrtState("COMPUTER_IDLE");
        setCasesOpen(false);
        setAboutOpen(false);
        playSound("driveEject");
        setPhase("DRIVE_EJECTING");
        return;
      }
      if (phase !== "IDLE") return;
      queuedDvdRef.current = null;
      ytControllerRef.current?.stopAndClear();
      setSelected(index);
      setCrtState("COMPUTER_IDLE");
      setCasesOpen(false);
      setAboutOpen(false);
      setPhase("DVD_SELECTED");
    },
    [phase, selected, notebookState, playSound],
  );

  const ejectDVD = useCallback(() => {
    if (selected === null || !dvdIsInDrive(phase)) return;
    if (notebookIsActive(notebookState)) return;
    queuedDvdRef.current = null;
    ytControllerRef.current?.stopAndClear();
    setCrtState("COMPUTER_IDLE");
    setView("desk");
    playSound("driveEject");
    setPhase("DRIVE_EJECTING");
  }, [selected, phase, notebookState, playSound]);

  // Stage 1: Click closed notebook -> focus on closed cover
  const handleNotebookClick = useCallback(() => {
    if (dvdIsBusy(phase)) return;
    if (notebookState === "NOTEBOOK_CLOSED") {
      setCasesOpen(false);
      setAboutOpen(false);
      setNotebookPage(1);
      setTargetTurnPage(null);
      setNotebookState("NOTEBOOK_COVER_VIEW");
      setView("notebook");
    }
  }, [phase, notebookState]);

  // Stages 2 & 3: Scroll down/up controls cover opening and two-page spread flipping with cooldown lock
  const handleNotebookScroll = useCallback(
    (direction: 1 | -1) => {
      if (notebookLockRef.current || notebookIsAnimating(notebookState)) return;
      setNotebookPageScroll(0);

      if (notebookState === "NOTEBOOK_COVER_VIEW") {
        if (direction > 0) {
          // Stage 2: Open closed cover to first two-page spread (Pages 01-02)
          notebookLockRef.current = true;
          setTargetTurnPage(1);
          setNotebookState("NOTEBOOK_OPENING");
          playSound("notebookOpen");
          notebookTimerRef.current = window.setTimeout(() => {
            setNotebookPage(1);
            setTargetTurnPage(null);
            setNotebookState("NOTEBOOK_FIRST_PAGE");
            notebookLockRef.current = false;
          }, 860);
        }
        return;
      }

      if (notebookState === "NOTEBOOK_FIRST_PAGE" || notebookState === "NOTEBOOK_LAST_PAGE") {
        const maxSpreadLeft = notebookPages.length - 1; // 19 (Pages 19-20)
        if (direction > 0) {
          if (notebookPage >= maxSpreadLeft) return;
          const nextPage = Math.min(maxSpreadLeft, notebookPage + 2);
          notebookLockRef.current = true;
          setTargetTurnPage(nextPage);
          setNotebookState("NOTEBOOK_PAGE_TURNING_FORWARD");
          playSound("pageFlip");
          notebookTimerRef.current = window.setTimeout(() => {
            setNotebookPage(nextPage);
            setTargetTurnPage(null);
            setNotebookState(
              nextPage >= maxSpreadLeft ? "NOTEBOOK_LAST_PAGE" : "NOTEBOOK_FIRST_PAGE",
            );
            notebookLockRef.current = false;
          }, 860);
        } else {
          // Scroll up -> reverse previous spread turn, or at Spread 01 close cover back to NOTEBOOK_COVER_VIEW
          if (notebookPage <= 1) {
            notebookLockRef.current = true;
            setTargetTurnPage(null);
            setNotebookState("NOTEBOOK_CLOSING");
            playSound("notebookOpen");
            notebookTimerRef.current = window.setTimeout(() => {
              setNotebookState("NOTEBOOK_COVER_VIEW");
              notebookLockRef.current = false;
            }, 780);
          } else {
            const prevPage = Math.max(1, notebookPage - 2);
            notebookLockRef.current = true;
            setTargetTurnPage(prevPage);
            setNotebookState("NOTEBOOK_PAGE_TURNING_BACKWARD");
            playSound("pageFlip");
            notebookTimerRef.current = window.setTimeout(() => {
              setNotebookPage(prevPage);
              setTargetTurnPage(null);
              setNotebookState("NOTEBOOK_FIRST_PAGE");
              notebookLockRef.current = false;
            }, 860);
          }
        }
      }
    },
    [notebookState, notebookPage, playSound],
  );

  // Click any colored fore-edge paper tab -> jump smoothly to that category's two-page spread
  const handleSelectCategoryTab = useCallback(
    (rawTargetPage: number) => {
      if (dvdIsBusy(phase) || notebookLockRef.current || notebookIsAnimating(notebookState)) return;
      setNotebookPageScroll(0);
      const maxSpreadLeft = notebookPages.length - 1;
      const normalizedTarget = Math.max(
        1,
        Math.min(maxSpreadLeft, rawTargetPage % 2 === 1 ? rawTargetPage : rawTargetPage - 1),
      );

      setCasesOpen(false);
      setAboutOpen(false);
      setView("notebook");

      if (notebookState === "NOTEBOOK_CLOSED" || notebookState === "NOTEBOOK_COVER_VIEW") {
        notebookLockRef.current = true;
        setTargetTurnPage(normalizedTarget);
        setNotebookState("NOTEBOOK_OPENING");
        playSound("notebookOpen");
        notebookTimerRef.current = window.setTimeout(() => {
          setNotebookPage(normalizedTarget);
          setTargetTurnPage(null);
          setNotebookState(
            normalizedTarget >= maxSpreadLeft ? "NOTEBOOK_LAST_PAGE" : "NOTEBOOK_FIRST_PAGE",
          );
          notebookLockRef.current = false;
        }, 860);
        return;
      }

      if (normalizedTarget === notebookPage) return;
      const forward = normalizedTarget > notebookPage;
      notebookLockRef.current = true;
      setTargetTurnPage(normalizedTarget);
      setNotebookState(
        forward ? "NOTEBOOK_PAGE_TURNING_FORWARD" : "NOTEBOOK_PAGE_TURNING_BACKWARD",
      );
      playSound("pageFlip");
      notebookTimerRef.current = window.setTimeout(() => {
        setNotebookPage(normalizedTarget);
        setTargetTurnPage(null);
        setNotebookState(
          normalizedTarget >= maxSpreadLeft ? "NOTEBOOK_LAST_PAGE" : "NOTEBOOK_FIRST_PAGE",
        );
        notebookLockRef.current = false;
      }, 860);
    },
    [phase, notebookState, notebookPage, playSound],
  );

  const closeNotebook = useCallback(() => {
    if (notebookLockRef.current || notebookIsAnimating(notebookState)) return;
    clearNotebookTimer();
    setTargetTurnPage(null);
    setNotebookState("NOTEBOOK_CLOSED");
    setView("desk");
  }, [notebookState, clearNotebookTimer]);

  const handleClickStudentID = useCallback(() => {
    if (dvdIsBusy(phase) || notebookIsAnimating(notebookState)) return;
    if (notebookIsActive(notebookState)) {
      clearNotebookTimer();
      setNotebookState("NOTEBOOK_CLOSED");
    }
    setCasesOpen(false);
    setAboutOpen(false);
    setView((v) => (v === "studentId" ? "desk" : "studentId"));
  }, [phase, notebookState, clearNotebookTimer]);

  const closeStudentID = useCallback(() => {
    setView("desk");
  }, []);

  const togglePower = () => {
    if (dvdIsBusy(phase) || notebookIsAnimating(notebookState)) return;
    clearNotebookTimer();
    stopActive();
    queuedDvdRef.current = null;
    ytControllerRef.current?.stopAndClear();
    playSound("power");
    if (phase === "OFF") {
      setPhase("STARTUP");
      setCrtState("COMPUTER_IDLE");
    } else {
      setPhase("OFF");
      setSelected(null);
      setCrtState("COMPUTER_IDLE");
      setNotebookState("NOTEBOOK_CLOSED");
      setView("desk");
    }
  };

  useEffect(() => {
    if (!notebookIsActive(notebookState)) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 4) return;
      event.preventDefault();
      handleNotebookScroll(event.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [notebookState, handleNotebookScroll]);

  const adjustNotebookTextScale = useCallback((delta: number) => {
    setNotebookTextScale((prev) => {
      const next = Math.max(80, Math.min(130, prev + delta));
      if (next <= 100) {
        setNotebookPageScroll(0);
      }
      return next;
    });
  }, []);

  const adjustNotebookPageScroll = useCallback((delta: number) => {
    setNotebookPageScroll((prev) => Math.max(0, Math.min(1, Math.round((prev + delta) * 20) / 20)));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (notebookIsActive(notebookState)) {
        if (event.key === "Escape") closeNotebook();
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          handleNotebookScroll(1);
        }
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          handleNotebookScroll(-1);
        }
        return;
      }
      if (view === "studentId" && event.key === "Escape") {
        closeStudentID();
        return;
      }
      if (event.key.toLowerCase() === "i") {
        handleClickStudentID();
      }
      if (event.key.toLowerCase() === "z") {
        setView((v) => (v === "screen" ? "desk" : "screen"));
      }
      if (event.key.toLowerCase() === "w") {
        setView((v) => (v === "window" ? "desk" : "window"));
        setBlindsOpen(true);
      }
      if (event.key.toLowerCase() === "l") setLampOn((v) => !v);
      if (event.key.toLowerCase() === "b") setBlindsOpen((v) => !v);
      if (event.key.toLowerCase() === "e") ejectDVD();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    ejectDVD,
    view,
    notebookState,
    closeNotebook,
    closeStudentID,
    handleClickStudentID,
    handleNotebookScroll,
  ]);

  const currentStepDuration = DVD_TIMELINE[phase]?.duration ?? 0;
  const inNotebook = notebookIsActive(notebookState);
  const inStudentId = view === "studentId";
  const notebookCoverStage =
    notebookState === "NOTEBOOK_COVER_VIEW" || notebookState === "NOTEBOOK_CLOSING";
  const activeProject = selected !== null ? projects[selected] : undefined;
  const activeCategoryId = notebookPages[Math.max(0, notebookPage - 1)]?.categoryId ?? "profile";
  const activeCategory =
    notebookCategories.find((c) => c.id === activeCategoryId) ?? notebookCategories[0];

  return (
    <main
      className={`app theme-${theme} phase-${phase.toLowerCase()} ${inNotebook ? "notebook-active" : ""}`}
      data-theme={theme}
      data-view={view}
      data-dvd-state={phase}
      data-crt-state={crtState}
      data-selected-dvd={activeProject?.id ?? ""}
      data-notebook-state={notebookState}
      data-notebook-page={notebookPage}
    >
      <Scene
        view={view}
        theme={theme}
        phase={phase}
        crtState={crtState}
        phaseDurationMs={currentStepDuration}
        lampOn={lampOn}
        blindsOpen={blindsOpen}
        selected={selected}
        notebookState={notebookState}
        notebookPage={notebookPage}
        targetTurnPage={targetTurnPage}
        notebookTextScale={notebookTextScale}
        notebookPageScroll={notebookPageScroll}
        qualityTier={qualityTier}
        onSceneReady={handleSceneReady}
        crtPortalRef={crtPortalRef}
        onSelect={selectDVD}
        onPlay={startSystem}
        onToggleVideoPause={() => ytControllerRef.current?.togglePlayPause()}
        onClickNotebook={handleNotebookClick}
        onScrollNotebook={handleNotebookScroll}
        onSelectCategoryTab={handleSelectCategoryTab}
        onClickStudentID={handleClickStudentID}
        onToggleLamp={() => setLampOn((v) => !v)}
        onToggleWindowView={() => {
          setView((v) => (v === "window" ? "desk" : "window"));
          setBlindsOpen(true);
        }}
        onToggleBlinds={() => setBlindsOpen((v) => !v)}
        onToggleScreenZoom={() => setView((v) => (v === "screen" ? "desk" : "screen"))}
        onTogglePower={togglePower}
        onHoverChange={handleHoverChange}
      />
      <YouTubeCRT
        portalRef={crtPortalRef}
        view={view}
        phase={phase}
        crtState={crtState}
        project={activeProject}
        onCRTStateChange={setCrtState}
        onPlayerReadyAdvancePhase={handlePlayerReadyAdvancePhase}
        onEject={ejectDVD}
        onToggleZoom={() => setView((v) => (v === "screen" ? "desk" : "screen"))}
        controllerRef={ytControllerRef}
      />
      <div className="grain" />
      <header>
        <button
          className="wordmark"
          onClick={() => {
            if (inNotebook) closeNotebook();
            else if (inStudentId) closeStudentID();
            else setView("desk");
          }}
        >
          MY VIRTUAL DESK
        </button>
        <div className="nav-actions">
          <button
            className="theme-toggle-btn"
            onClick={() => setTheme((t) => (t === "night" ? "day" : "night"))}
          >
            {theme === "night" ? "☀ DAY MODE" : "☾ NIGHT MODE"}
          </button>
          <button
            className={inStudentId ? "active" : ""}
            disabled={dvdIsBusy(phase) || notebookIsAnimating(notebookState)}
            onClick={handleClickStudentID}
          >
            STUDENT ID
          </button>
          <button
            className={casesOpen ? "active" : ""}
            disabled={inNotebook || dvdIsBusy(phase)}
            onClick={() => {
              setCasesOpen(!casesOpen);
              setAboutOpen(false);
            }}
          >
            CASES
          </button>
          <button
            className={aboutOpen ? "active" : ""}
            onClick={() => {
              setAboutOpen(!aboutOpen);
              setCasesOpen(false);
            }}
          >
            ABOUT
          </button>
        </div>
      </header>

      <div className={`cases-panel ${casesOpen ? "open" : ""}`}>
        <p>
          GREAT BOOKS DISC LIBRARY / 07{" "}
          {dvdIsBusy(phase) ? " — DISC MECHANISM IN MOTION" : " — SELECT A VOLUME"}
        </p>
        {projects.map((project, index) => (
          <button key={project.id} disabled={dvdIsBusy(phase)} onClick={() => selectDVD(index)}>
            <span>{project.short}</span>
            <b>{project.title}</b>
            <em>{selected === index ? "LOADED" : project.category}</em>
          </button>
        ))}
      </div>

      <aside className={`about-panel ${aboutOpen ? "open" : ""}`}>
        <div className="about-panel-top">
          <span className="about-eyebrow">
            <svg
              className="about-doodle-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
              <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
            </svg>
            GREAT BOOKS (GEC-GB-NRt)
          </span>
          <button className="close" onClick={() => setAboutOpen(false)}>
            CLOSE ×
          </button>
        </div>

        <div className="about-header-block">
          <h2>MY VIRTUAL DESK</h2>
          <p className="about-subtitle">A Literary Journey Through Seven Great Books</p>
        </div>

        <div className="about-scroll-body">
          <section className="about-section">
            <p className="about-greeting">Welcome to my virtual desk!</p>
            <p>
              This interactive space is my creative way of presenting my learning journey in{" "}
              <strong>Great Books (GEC-GB-NRt)</strong>. Instead of using a traditional digital
              portfolio, I designed a virtual study desk where visitors can explore my literary
              notes, reflections, and analyses through interactive objects.
            </p>
            <p>
              Inspired by the feeling of studying late at night, this desk brings together my
              interest in literature, digital art, and 3D interactive web design.
            </p>
          </section>

          <section className="about-section">
            <h3 className="about-section-heading">
              <svg
                className="about-doodle-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
              </svg>
              WHAT&apos;S INSIDE
            </h3>
            <p>This project features seven literary works explored in our Great Books course:</p>
            <ol className="about-book-list">
              <li>
                <span>01</span> The Tale of Genji
              </li>
              <li>
                <span>02</span> Pride and Prejudice
              </li>
              <li>
                <span>03</span> Les Misérables
              </li>
              <li>
                <span>04</span> To Kill a Mockingbird
              </li>
              <li>
                <span>05</span> Voice Out of the Whirlwind
              </li>
              <li>
                <span>06</span> The Iliad
              </li>
              <li>
                <span>07</span> The Odyssey
              </li>
            </ol>
            <p>
              Each DVD case represents one literary work and provides access to its corresponding
              video presentation.
            </p>
            <p>
              The notebook contains my literary journey, including summaries, literary analyses,
              personal reflections, and learning experiences throughout the subject.
            </p>
          </section>

          <section className="about-section">
            <h3 className="about-section-heading">
              <svg
                className="about-doodle-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              ABOUT THE PROJECT
            </h3>
            <p>
              This virtual desk is also my experimental project for exploring 3D interactive website
              development.
            </p>
            <p>
              I wanted to combine my interest in creative design and technology with my academic
              activities, turning an ordinary literary portfolio into an interactive experience.
            </p>
            <p className="about-closing-note">I hope you enjoy exploring my virtual desk!</p>
          </section>
        </div>

        <div className="about-social-links">
          <a
            href="https://github.com/aikathoughs"
            target="_blank"
            rel="noopener noreferrer"
            className="about-social-btn"
          >
            <svg
              className="about-social-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            <span>GITHUB</span>
          </a>
          <a
            href="https://www.linkedin.com/in/angelaica-mae-harochoc-988b23309/"
            target="_blank"
            rel="noopener noreferrer"
            className="about-social-btn"
          >
            <svg
              className="about-social-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
            </svg>
            <span>LINKEDIN</span>
          </a>
        </div>
      </aside>

      {/* Hover Interaction Label Pill */}
      {hoverInfo && (
        <div className="hover-label-pill" data-hover-id={hoverInfo.id}>
          <span className="hover-dot" />
          <span>{hoverInfo.label}</span>
        </div>
      )}

      {/* User Interaction Guide Panel */}
      {!inNotebook && !inStudentId && (
        <aside className={`desk-guide-panel ${guideOpen ? "open" : "collapsed"}`}>
          <div className="desk-guide-header">
            <span>INTERACTIVE DESK</span>
            <button type="button" onClick={() => setGuideOpen((o) => !o)}>
              {guideOpen ? "−" : "+"}
            </button>
          </div>
          {guideOpen && (
            <ul className="desk-guide-list">
              <li onClick={handleNotebookClick}>
                <b>Notebook</b> — Open my literary journal.
              </li>
              <li onClick={handleClickStudentID}>
                <b>Student ID</b> — View my university identification.
              </li>
              <li
                onClick={() => {
                  setCasesOpen(true);
                  setAboutOpen(false);
                }}
              >
                <b>DVD Cases</b> — Explore my seven literary case studies.
              </li>
              <li onClick={() => setView((v) => (v === "screen" ? "desk" : "screen"))}>
                <b>Computer</b> — View selected case study.
              </li>
              <li onClick={() => setLampOn((v) => !v)}>
                <b>Lamp</b> — Toggle desk lighting.
              </li>
              <li
                onClick={() => {
                  setView((v) => (v === "window" ? "desk" : "window"));
                  setBlindsOpen(true);
                }}
              >
                <b>Window</b> — Explore the city view.
              </li>
              <li onClick={() => setBlindsOpen((v) => !v)}>
                <b>Blinds</b> — Open or close the window blinds.
              </li>
            </ul>
          )}
        </aside>
      )}

      {/* Student ID Close-Up Inspection Controls */}
      {inStudentId && (
        <div className="student-id-controls">
          <span className="student-id-indicator">
            STUDENT ID // {studentIdentity.university} — {studentIdentity.lastName},{" "}
            {studentIdentity.firstName} ({studentIdentity.studentNumber})
          </span>
          <button type="button" onClick={closeStudentID}>
            CLOSE ID ×
          </button>
        </div>
      )}

      {inNotebook && (
        <div
          className="notebook-controls"
          onWheel={(event) => {
            event.stopPropagation();
            handleNotebookScroll(event.deltaY > 0 ? 1 : -1);
          }}
        >
          <div className="notebook-dock-top">
            <div className="notebook-status-group">
              <span className="notebook-page-indicator">
                {notebookCoverStage
                  ? "COVER // GREAT BOOKS"
                  : `PAGE ${String(notebookPage).padStart(2, "0")} / ${String(notebookPages.length).padStart(2, "0")}`}
              </span>
              <small className="notebook-section-subtitle">
                {notebookCoverStage
                  ? "SCROLL DOWN OR CLICK OPEN COVER TO BEGIN"
                  : `${activeCategory.fullTitle.toUpperCase()} • SPREAD PAGES ${String(notebookPage).padStart(2, "0")}–${String(Math.min(notebookPages.length, notebookPage + 1)).padStart(2, "0")}`}
              </small>
            </div>
            <div className="notebook-nav-btns">
              {/* Physical-Notebook-Styled Text Size & Page Scroll Controls */}
              <div className="notebook-text-size-group" aria-label="Notebook text size controls">
                <span className="notebook-text-size-label">TEXT</span>
                <button
                  type="button"
                  className="notebook-size-btn"
                  aria-label="Decrease text size"
                  title="Decrease notebook text size"
                  disabled={notebookTextScale <= 80}
                  onClick={() => adjustNotebookTextScale(-10)}
                >
                  −
                </button>
                <span className="notebook-text-size-value" data-testid="notebook-text-scale">
                  {notebookTextScale}%
                </span>
                <button
                  type="button"
                  className="notebook-size-btn"
                  aria-label="Increase text size"
                  title="Increase notebook text size"
                  disabled={notebookTextScale >= 130}
                  onClick={() => adjustNotebookTextScale(10)}
                >
                  +
                </button>
                {!notebookCoverStage && notebookTextScale > 100 && (
                  <div className="notebook-page-scroll-btns">
                    <button
                      type="button"
                      className="notebook-size-btn scroll-btn"
                      aria-label="Scroll page text up"
                      title="Scroll page text up"
                      disabled={notebookPageScroll <= 0}
                      onClick={() => adjustNotebookPageScroll(-0.25)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="notebook-size-btn scroll-btn"
                      aria-label="Scroll page text down"
                      title="Scroll page text down"
                      disabled={notebookPageScroll >= 1}
                      onClick={() => adjustNotebookPageScroll(0.25)}
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="notebook-step-btn"
                disabled={notebookCoverStage || notebookIsAnimating(notebookState)}
                onClick={() => handleNotebookScroll(-1)}
              >
                ← PREV
              </button>
              <button
                type="button"
                className="notebook-step-btn primary"
                disabled={
                  (!notebookCoverStage && notebookPage >= notebookPages.length - 1) ||
                  notebookIsAnimating(notebookState)
                }
                onClick={() => handleNotebookScroll(1)}
              >
                {notebookCoverStage ? "OPEN COVER →" : "NEXT →"}
              </button>
              <button type="button" className="notebook-close-btn" onClick={closeNotebook}>
                CLOSE ×
              </button>
            </div>
          </div>
          <div className="notebook-tab-strip">
            {notebookCategories.map((tab) => {
              const isActive = !notebookCoverStage && activeCategoryId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  title={tab.fullTitle}
                  className={`notebook-tab-btn ${isActive ? "active" : ""}`}
                  style={{
                    borderColor: isActive ? tab.color : undefined,
                  }}
                  onClick={() => handleSelectCategoryTab(tab.targetPage)}
                >
                  <i className="notebook-tab-dot" style={{ background: tab.color }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!inNotebook && !inStudentId && (
        <div className="screen-actions">
          <button onClick={() => setView(view === "screen" ? "desk" : "screen")}>
            {view === "screen" ? "− DESK VIEW" : "+ ZOOM SCREEN"}
          </button>
          {selected !== null && dvdIsInDrive(phase) && (
            <>
              <button onClick={() => ytControllerRef.current?.togglePlayPause()}>
                {crtState === "VIDEO_PLAYING" ? "❚❚ PAUSE" : "▶ PLAY"}
              </button>
              <button onClick={() => ytControllerRef.current?.replay()}>↺ REPLAY</button>
              <button onClick={ejectDVD}>⏏ EJECT DISC</button>
            </>
          )}
        </div>
      )}

      <footer>
        <div className="hint-list">
          <button onClick={() => setView(view === "screen" ? "desk" : "screen")}>
            <kbd>Z</kbd>
            <span>ZOOM</span>
          </button>
          <button onClick={handleClickStudentID}>
            <kbd>I</kbd>
            <span>ID CARD</span>
          </button>
          <button onClick={ejectDVD}>
            <kbd>E</kbd>
            <span>EJECT</span>
          </button>
          <button
            onClick={() => {
              setView(view === "window" ? "desk" : "window");
              setBlindsOpen(true);
            }}
          >
            <kbd>W</kbd>
            <span>WINDOW</span>
          </button>
          <button onClick={() => setLampOn(!lampOn)}>
            <kbd>L</kbd>
            <span>LAMP</span>
          </button>
          <button onClick={() => setBlindsOpen(!blindsOpen)}>
            <kbd>B</kbd>
            <span>BLINDS</span>
          </button>
          <button onClick={togglePower}>
            <i className={`power-dot ${phase !== "OFF" ? "on" : ""}`} />
            <span>POWER</span>
          </button>
        </div>
        <button className="sound" onClick={toggleSound}>
          SOUND {soundOn ? "ON" : "OFF"}
          <i className={soundOn ? "active" : ""} />
        </button>
      </footer>
      <div className="mobile-note">Tap the notebook or DVD cases to explore.</div>

      {/* Subtle Branded Initial Loading Screen */}
      <div className={`initial-loader ${sceneReady ? "loaded" : ""}`} aria-hidden={sceneReady}>
        <div className="initial-loader-card">
          <span className="initial-loader-eyebrow">
            GREAT BOOKS (GEC-GB-NRt) // DIGITAL PORTFOLIO
          </span>
          <h1 className="initial-loader-title">MY VIRTUAL DESK</h1>
          <p className="initial-loader-sub">A Literary Journey Through Seven Great Books</p>
          <div className="initial-loader-bar">
            <i />
          </div>
          <span className="initial-loader-status">
            {sceneReady ? "READY" : "PREPARING 3D STUDY DESK..."}
          </span>
        </div>
      </div>

      {/* Mobile Portrait Orientation Recommendation Overlay */}
      <div
        className={`orientation-overlay ${isMobilePortrait && !portraitDismissed ? "visible" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Rotate device to landscape"
      >
        <div className="orientation-card">
          <span className="orientation-brand">MY VIRTUAL DESK</span>
          <div className="orientation-icon-wrap" aria-hidden="true">
            <svg
              className="orientation-phone-svg"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="18" y="8" width="28" height="48" rx="4" />
              <line x1="29" y1="13" x2="35" y2="13" />
              <circle cx="32" cy="49" r="1.6" fill="currentColor" />
              <path d="M52 24a20 20 0 0 1 0 16" strokeDasharray="3 3" />
              <polyline points="49 38 52 41 55 38" />
            </svg>
          </div>
          <h2>PLEASE ROTATE YOUR DEVICE</h2>
          <p>
            For the best experience, turn your phone sideways to explore{" "}
            <strong>MY VIRTUAL DESK</strong>.
          </p>
          <p className="orientation-sub">Enjoy the full interactive desk in landscape mode.</p>
          <div className="orientation-actions">
            <button
              type="button"
              className="orientation-continue-btn"
              onClick={() => {
                const orientationApi = (
                  window.screen?.orientation as unknown as {
                    lock?: (mode: string) => Promise<void>;
                  }
                )?.lock;
                if (typeof orientationApi === "function") {
                  orientationApi.call(window.screen.orientation, "landscape").catch(() => {});
                }
                setPortraitDismissed(true);
              }}
            >
              CONTINUE IN PORTRAIT MODE
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
