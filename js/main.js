(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  /* Lenis smooth momentum scrolling. Desktop pointers only: phones keep their
     native touch scroll (which already has momentum), and anyone who asked for
     reduced motion is left alone. */
  let lenis = null;
  if (!reduceMotion && !isTouch && typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    /* In-page anchor links glide instead of jumping, offset for the fixed nav. */
    const navH =
      parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || 72;
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length <= 1) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -(navH + 8) });
      });
    });
  }

  /* Background videos: play whenever on screen, pause when off (saves battery
     and data). Muted + playsinline lets this autoplay on most mobile browsers. */
  const videos = [...document.querySelectorAll("video[data-bg], #hero-video, #quote-video")];
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  };
  const tryPlay = (v) => {
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  };
  videos.forEach((v) => {
    new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? tryPlay(v) : v.pause()),
      { threshold: 0.1 }
    ).observe(v);
  });

  /* Some phones block autoplay and freeze CSS loops (iOS Low Power Mode, or the
     Reduce Motion setting). The first time the visitor touches, clicks, scrolls
     or types, turn everything on. */
  const kickstart = () => {
    document.documentElement.classList.add("motion-on");
    videos.forEach((v) => {
      if (inView(v)) tryPlay(v);
    });
  };
  ["pointerdown", "touchstart", "click", "keydown", "scroll"].forEach((evt) =>
    window.addEventListener(evt, kickstart, { once: true, passive: true })
  );

  /* Nav background once the hero top is out of view */
  const nav = document.querySelector(".site-nav");
  const sentinel = document.getElementById("top-sentinel");
  if (nav && sentinel) {
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle("scrolled", !entry.isIntersecting);
    }).observe(sentinel);
  }

  /* Mobile menu */
  const menuBtn = document.querySelector(".menu-btn");
  if (menuBtn) {
    const setOpen = (open) => {
      document.body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    menuBtn.addEventListener("click", () =>
      setOpen(!document.body.classList.contains("menu-open"))
    );
    document.querySelectorAll(".mobile-menu a").forEach((link) =>
      link.addEventListener("click", () => setOpen(false))
    );
  }

  /* ----------------------------------------------------------------
     Reusable scroll-reveal utility
     ----------------------------------------------------------------
     - Add class "reveal" to any element: it fades + slides up as it
       enters the viewport (see the .reveal rules in styles.css).
     - Add attribute "data-stagger" to a PARENT: its direct children
       cascade in one after another instead of all at once.
     - Honors prefers-reduced-motion (content shown instantly, no motion).
     ---------------------------------------------------------------- */
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    [...group.children].forEach((child, i) =>
      child.style.setProperty("--d", `${i * 90}ms`)
    );
  });

  /* Membership selector: clicking a plan moves the red highlight to it.
     Purely visual, a radio group, no navigation. */
  const planCards = [...document.querySelectorAll(".plan-card")];
  if (planCards.length) {
    const select = (card, focus) => {
      planCards.forEach((c) => {
        const on = c === card;
        c.classList.toggle("selected", on);
        c.setAttribute("aria-checked", String(on));
        c.tabIndex = on ? 0 : -1;
      });
      if (focus) card.focus();
    };
    planCards.forEach((card, i) => {
      card.addEventListener("click", () => select(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(card);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          select(planCards[(i + 1) % planCards.length], true);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          select(planCards[(i - 1 + planCards.length) % planCards.length], true);
        }
      });
    });
    // roving tabindex: only the selected card is tab-reachable
    planCards.forEach((c) => {
      if (!c.classList.contains("selected")) c.tabIndex = -1;
    });
  }

  /* Scroll reveals: fire once, a little before the element is fully in view
     (the -12% bottom margin waits until it is ~12% into the viewport so it
     feels intentional rather than triggering right at the edge). */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* Reviews marquee: repeat the source cards until the row is comfortably wider
     than the viewport, then duplicate the whole run so the -50% loop is seamless. */
  const reviewsTrack = document.getElementById("reviews-track");
  if (reviewsTrack && reviewsTrack.children.length) {
    const sources = [...reviewsTrack.children].map((el) => el.cloneNode(true));
    const cardWidth =
      reviewsTrack.children[0].getBoundingClientRect().width + 16 || 396;
    const runWidth = cardWidth * sources.length;
    const repeats = Math.max(2, Math.ceil((window.innerWidth * 1.6) / runWidth));

    const run = document.createDocumentFragment();
    for (let i = 0; i < repeats; i++) {
      sources.forEach((el) => run.appendChild(el.cloneNode(true)));
    }
    const copy = run.cloneNode(true);
    [...copy.children].forEach((el) => el.setAttribute("aria-hidden", "true"));

    reviewsTrack.innerHTML = "";
    reviewsTrack.appendChild(run);
    reviewsTrack.appendChild(copy);
  }

  /* Footer year */
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
