const root = document.documentElement;
const toggleButton = document.getElementById("theme-toggle");
const storedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const bgLayer = document.querySelector(".page-bg");
const progressBar = document.getElementById("scroll-progress");
const backToTopButton = document.getElementById("back-to-top");
const sections = document.querySelectorAll("main section[id]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const sectionNavLinks = navLinks.filter((link) => {
  const href = link.getAttribute("href") || "";
  return href.startsWith("#") && !!document.getElementById(href.slice(1));
});

const normalizePath = (path) => {
  const clean = (path || "").replace(/\\/g, "/");
  const lastSegment = clean.slice(clean.lastIndexOf("/") + 1);
  return lastSegment || "index.html";
};

const currentPath = normalizePath(window.location.pathname);

const setActivePageLink = () => {
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#")) {
      return;
    }
    const [pathPart, hashPart] = href.split("#");
    const isCurrentPage = normalizePath(pathPart) === currentPath && !hashPart;
    link.classList.toggle("active", isCurrentPage);
  });

  if (!navLinks.some((link) => link.classList.contains("active"))) {
    const homeLink = navLinks.find((link) => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#")) {
        return false;
      }
      const [pathPart, hashPart] = href.split("#");
      return normalizePath(pathPart) === "index.html" && !hashPart;
    });
    if (homeLink) {
      homeLink.classList.add("active");
    }
  }
};

const applyTheme = (theme) => {
  root.setAttribute("data-theme", theme);
  if (toggleButton) {
    toggleButton.textContent = theme === "dark" ? "Light" : "Dark";
    toggleButton.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  }
};

applyTheme(storedTheme || (systemPrefersDark ? "dark" : "light"));

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  });
}

if (bgLayer && !prefersReducedMotion) {
  window.addEventListener("mousemove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 14;
    const y = (event.clientY / window.innerHeight - 0.5) * 14;
    root.style.setProperty("--bg-shift-x", `${x}px`);
    root.style.setProperty("--bg-shift-y", `${y}px`);
  });
}

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

const revealItems = document.querySelectorAll(".reveal");

if (prefersReducedMotion) {
  revealItems.forEach((item) => item.classList.add("show"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${index * 90}ms`;
    observer.observe(item);
  });
}

const updateScrollUi = () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const scrollY = Math.max(window.scrollY, 0);
  const progress = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
  if (progressBar) {
    root.style.setProperty("--scroll-progress", `${Math.min(progress, 100)}%`);
  }
  if (backToTopButton) {
    backToTopButton.classList.toggle("show", scrollY > 360);
  }
};

updateScrollUi();
window.addEventListener("scroll", updateScrollUi, { passive: true });

if (backToTopButton) {
  backToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
}

setActivePageLink();

if (sections.length && sectionNavLinks.length) {
  const setActiveLink = (sectionId) => {
    sectionNavLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${sectionId}`);
    });
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        .slice(0, 1)
        .forEach((entry) => setActiveLink(entry.target.id));
    },
    { threshold: [0.35, 0.6], rootMargin: "-15% 0px -35% 0px" }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const contactForm = document.querySelector(".contact-form");
const contactFormStatus = document.querySelector(".contact-form-status");

if (contactForm && contactFormStatus) {
  const submitButton = contactForm.querySelector("button[type='submit']");
  const defaultButtonText = submitButton ? submitButton.textContent : "";
  let isSubmitting = false;

  const setContactStatus = (message, statusClass = "") => {
    contactFormStatus.className = "contact-form-status";
    if (statusClass) {
      contactFormStatus.classList.add(statusClass);
    }
    contactFormStatus.textContent = message;
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setContactStatus("Sending message...", "is-loading");

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        contactForm.reset();
        setContactStatus("Message sent successfully. Thank you.", "is-success");
      } else {
        let errorMessage = "Message could not be sent right now. Please try again.";
        try {
          const payload = await response.json();
          if (Array.isArray(payload?.errors) && payload.errors[0]?.message) {
            errorMessage = payload.errors[0].message;
          }
        } catch (parseError) {
          // Keep generic message when API error details are unavailable.
        }
        setContactStatus(errorMessage, "is-error");
      }
    } catch (error) {
      setContactStatus("Network error. Please check your connection and retry.", "is-error");
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
}
