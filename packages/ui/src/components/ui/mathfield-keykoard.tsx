"use client";

import * as React from "react";

// IMPORTANT: This side-effect import registers mhchem (\ce{} chemistry notation)
// into KaTeX's global macro table. It must also be imported in your app's entry
// point (e.g. layout.tsx or _app.tsx) so that Plate's equation element renderer
// also has access to \ce — otherwise chemistry formulas will render as errors in
// the editor even though the keyboard preview shows them correctly.
//
//   // In layout.tsx or _app.tsx:
//   import "katex/contrib/mhchem";
//
import "katex/contrib/mhchem";
import DOMPurify from "dompurify";
import katex from "katex";
import { useEquationInput } from "@platejs/math/react";
import {
  ClipboardCopyIcon,
  CornerDownLeftIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import { useReadOnly, useEditorRef } from "platejs/react";

import { cn } from "../../utils/cn";
import { PopoverContent } from "./popover";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeySpec {
  label: string;
  sub?: string;
  insert?: string;
  /** Explicit flag: this insert string is a template that expands placeholders.
   *  Do NOT infer this from string content — use this field instead. */
  isTemplate?: boolean;
  cursorBack?: number;
  action?: "backspace" | "clear" | "done" | "left" | "right";
  wide?: boolean;
  danger?: boolean;
}

type TabId = "123" | "abc" | "greek" | "sym";
type SymPage = "math" | "chem";
type EditorMode = "simple" | "advanced";

const VALID_MODES = new Set<EditorMode>(["simple", "advanced"]);

// ─── Placeholder Utilities ────────────────────────────────────────────────────

const PLACEHOLDER = "\\placeholder{}";

// Each slot holds an array of "tokens" — individual insertions. This allows
// multi-character slot content and proper per-slot backspace.
type SlotTokens = Record<number, string[]>;

function countPlaceholders(latex: string): number {
  return (latex.match(/\\placeholder\{\}/g) ?? []).length;
}

/**
 * Replace placeholder at `index` with `replacement`.
 */
function replacePlaceholderAt(
  latex: string,
  index: number,
  replacement: string,
): string {
  let count = 0;
  return latex.replace(/\\placeholder\{\}/g, (match) => {
    if (count++ === index) return replacement;
    return match;
  });
}

function mapClickToTemplateIndex(
  templateLatex: string,
  slotTokens: SlotTokens,
  clickIdx: number,
): number {
  let emptyCount = 0;
  const total = countPlaceholders(templateLatex);
  for (let idx = 0; idx < total; idx++) {
    const isEmpty = (slotTokens[idx] ?? []).length === 0;
    if (isEmpty) {
      if (emptyCount === clickIdx) {
        return idx;
      }
      emptyCount++;
    }
  }
  return 0;
}

const KATEX_MACROS = {
  "\\f": "#1f(#2)",
  "\\placeholder": "\\mathbin{\\square}",
  "\\ACTIVESLOT": "\\mathbin{\\blacksquare}",
};

/**
 * Returns all slot-content tokens joined into a LaTeX fragment.
 */
// function slotContent(tokens: SlotTokens, idx: number): string {
//   return (tokens[idx] ?? []).join("");
// }

/**
 * Rebuild the full LaTeX from the base template by filling each placeholder
 * with its accumulated slot tokens. If activeSlot is specified, highlight the
 * active slot with either \ACTIVESLOT{} (if empty) or a blue vertical cursor.
 */
function rebuildLatex(
  templateLatex: string,
  slotTokens: SlotTokens,
  activeSlot?: number,
): string {
  let count = 0;
  return templateLatex.replace(/\\placeholder\{\}/g, () => {
    const idx = count++;
    const tokens = slotTokens[idx] ?? [];

    if (activeSlot !== undefined && idx === activeSlot) {
      if (tokens.length === 0) {
        return "\\ACTIVESLOT{}";
      } else {
        return tokens.join("") + "{\\color{#3b82f6}|}";
      }
    }

    const content = tokens.join("");
    return content === "" ? "\\placeholder{}" : content;
  });
}

/**
 * Insert `key` into the active slot. Templates get {} → \placeholder{}.
 * Returns [newTokens, newActiveIndex].
 */
function insertIntoSlot(
  templateLatex: string,
  slotTokens: SlotTokens,
  activeIndex: number,
  key: KeySpec,
): { newTokens: SlotTokens; newActiveIndex: number; newTemplate: string } {
  if (!key.insert)
    return {
      newTokens: slotTokens,
      newActiveIndex: activeIndex,
      newTemplate: templateLatex,
    };

  const isTemplate = key.isTemplate === true;

  if (!isTemplate) {
    // Add token to the active slot
    const existingTokens = slotTokens[activeIndex] ?? [];
    const newTokens: SlotTokens = {
      ...slotTokens,
      [activeIndex]: [...existingTokens, key.insert],
    };

    // Move forward to next empty slot if there is one
    // let newActiveIndex = activeIndex;
    // const nextEmpty = findNextEmptySlot(templateLatex, newTokens, activeIndex);
    // if (nextEmpty !== null) newActiveIndex = nextEmpty;

    return {
      newTokens,
      newActiveIndex: activeIndex,
      newTemplate: templateLatex,
    };
  }

  // It is a template!
  const templateToInsert = key.insert;
  // if (templateToInsert.startsWith("^") || templateToInsert.startsWith("_")) {
  //   // Prepend an empty group as the base atom for KaTeX to attach the
  //   // superscript/subscript to. Using \BASEGROUP sentinel (replaced after
  //   // expansion) keeps it out of the \placeholder{} replacement pass, so it
  //   // never becomes a slot in the slot counter.
  //   templateToInsert = "\\BASEGROUP" + templateToInsert;
  // }
  const expandedInsert = templateToInsert
    .replace(/\{\}/g, "{\\placeholder{}}")
    .replace(/\\BASEGROUP/g, "{}");
  const insertedPlaceholdersCount = countPlaceholders(expandedInsert);

  let newTemplate = replacePlaceholderAt(
    templateLatex,
    activeIndex,
    expandedInsert,
  );

  // Ensure there is always a trailing placeholder at the end of the template
  if (!newTemplate.trim().endsWith("\\placeholder{}")) {
    newTemplate = newTemplate + "\\placeholder{}";
  }

  // Copy and shift existing tokens
  const newTokens: SlotTokens = {};
  Object.keys(slotTokens).forEach((keyStr) => {
    const i = parseInt(keyStr, 10);
    if (i < activeIndex) {
      newTokens[i] = slotTokens[i];
    } else if (i === activeIndex) {
      newTokens[activeIndex] = slotTokens[activeIndex];
    } else {
      newTokens[i + insertedPlaceholdersCount - 1] = slotTokens[i];
    }
  });

  // Set the active index to the first empty slot among the new slots
  let newActiveIndex = activeIndex;
  for (let offset = 0; offset < insertedPlaceholdersCount; offset++) {
    const idx = activeIndex + offset;
    if (!newTokens[idx] || newTokens[idx].length === 0) {
      newActiveIndex = idx;
      break;
    }
  }

  return { newTokens, newActiveIndex, newTemplate };
}

// function findNextEmptySlot(
//   templateLatex: string,
//   tokens: SlotTokens,
//   fromIndex: number,
// ): number | null {
//   const total = countPlaceholders(templateLatex);
//   for (let offset = 1; offset <= total; offset++) {
//     const idx = (fromIndex + offset) % total;
//     if ((tokens[idx] ?? []).length === 0) return idx;
//   }
//   return null;
// }

// ─── Simple Mode State — useReducer ──────────────────────────────────────────

type SimpleState = {
  template: string;
  tokens: SlotTokens;
  activeSlot: number;
  history: Array<{ template: string; tokens: SlotTokens; activeSlot: number }>;
};

type SimpleAction =
  | { type: "INSERT"; key: KeySpec }
  | { type: "BACKSPACE" }
  | { type: "NAVIGATE"; dir: "left" | "right" }
  | { type: "SET_SLOT"; slot: number }
  | { type: "CLEAR" }
  | { type: "ADD_SLOT" };

const MAX_HISTORY = 50;

const initialSimpleState: SimpleState = {
  template: "",
  tokens: {},
  activeSlot: 0,
  history: [],
};

function simpleReducer(state: SimpleState, action: SimpleAction): SimpleState {
  switch (action.type) {
    case "INSERT": {
      const effective = state.template === "" ? PLACEHOLDER : state.template;
      const { newTokens, newActiveIndex, newTemplate } = insertIntoSlot(
        effective,
        state.tokens,
        state.activeSlot,
        action.key,
      );
      const structureChanged = newTemplate !== state.template;
      return {
        template: newTemplate,
        tokens: newTokens,
        activeSlot: newActiveIndex,
        history: structureChanged
          ? [
              ...state.history.slice(-MAX_HISTORY),
              {
                template: state.template,
                tokens: state.tokens,
                activeSlot: state.activeSlot,
              },
            ]
          : state.history,
      };
    }
    case "BACKSPACE": {
      const tokens = state.tokens[state.activeSlot] ?? [];
      if (tokens.length > 0) {
        return {
          ...state,
          tokens: {
            ...state.tokens,
            [state.activeSlot]: tokens.slice(0, -1),
          },
        };
      }
      // Active slot empty — walk history backwards for structural undo
      let foundIdx = -1;
      for (let i = state.history.length - 1; i >= 0; i--) {
        if (state.history[i].template !== state.template) {
          foundIdx = i;
          break;
        }
      }
      if (foundIdx !== -1) {
        const restored = state.history[foundIdx];
        return {
          ...restored,
          history: state.history.slice(0, foundIdx),
        };
      }
      return initialSimpleState;
    }
    case "NAVIGATE": {
      const effective = state.template === "" ? PLACEHOLDER : state.template;
      const total = countPlaceholders(effective);
      if (total === 0) return state;
      const next =
        action.dir === "left"
          ? (state.activeSlot - 1 + total) % total
          : (state.activeSlot + 1) % total;
      return { ...state, activeSlot: next };
    }
    case "CLEAR":
      return initialSimpleState;
    case "SET_SLOT":
      return { ...state, activeSlot: action.slot };
    case "ADD_SLOT": {
      const effective = state.template === "" ? PLACEHOLDER : state.template;
      let count = 0;
      const newTemplate = effective.replace(/\\placeholder\{\}/g, (match) => {
        if (count++ === state.activeSlot) {
          return "\\placeholder{}\\placeholder{}";
        }
        return match;
      });

      const newTokens: SlotTokens = {};
      Object.keys(state.tokens).forEach((keyStr) => {
        const i = parseInt(keyStr, 10);
        if (i <= state.activeSlot) {
          newTokens[i] = state.tokens[i];
        } else {
          newTokens[i + 1] = state.tokens[i];
        }
      });
      newTokens[state.activeSlot + 1] = [];

      return {
        template: newTemplate,
        tokens: newTokens,
        activeSlot: state.activeSlot + 1,
        history: [
          ...state.history.slice(-MAX_HISTORY),
          {
            template: state.template,
            tokens: state.tokens,
            activeSlot: state.activeSlot,
          },
        ],
      };
    }
    default:
      return state;
  }
}

// ─── Keyboard Data ────────────────────────────────────────────────────────────

const NUMERIC_ROWS: KeySpec[][] = [
  [
    {
      label: "a/b",
      sub: "\\frac",
      insert: "\\frac{}{}",
      isTemplate: true,
      cursorBack: 3,
    },
    { label: "xⁿ", sub: "^{}", insert: "^{}", isTemplate: true, cursorBack: 2 },
    { label: "xₙ", sub: "_{}", insert: "_{}", isTemplate: true, cursorBack: 2 },
    { label: "7", insert: "7" },
    { label: "8", insert: "8" },
    { label: "9", insert: "9" },
    { label: "÷", sub: "\\div", insert: "\\div " },
    { label: "⌫", action: "backspace", danger: true },
  ],
  [
    {
      label: "√x",
      sub: "\\sqrt",
      insert: "\\sqrt{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "ⁿ√x",
      sub: "\\sqrt[n]",
      insert: "\\sqrt[{}]{}",
      isTemplate: true,
      cursorBack: 2,
    },
    { label: "∞", sub: "\\infty", insert: "\\infty " },
    { label: "4", insert: "4" },
    { label: "5", insert: "5" },
    { label: "6", insert: "6" },
    { label: "×", sub: "\\times", insert: "\\times " },
    { label: "π", sub: "\\pi", insert: "\\pi " },
  ],
  [
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
    { label: "[", insert: "[" },
    { label: "1", insert: "1" },
    { label: "2", insert: "2" },
    { label: "3", insert: "3" },
    { label: "−", insert: "-" },
    { label: "±", sub: "\\pm", insert: "\\pm " },
  ],
  [
    { label: "∂", sub: "\\partial", insert: "\\partial " },
    { label: "∇", sub: "\\nabla", insert: "\\nabla " },
    { label: "·", sub: "\\cdot", insert: "\\cdot " },
    { label: "0", insert: "0" },
    { label: ".", insert: "." },
    { label: "=", insert: "=" },
    { label: "+", insert: "+" },
    { label: "i", insert: "i" },
  ],
  [
    { label: "≤", sub: "\\leq", insert: "\\leq " },
    { label: "≥", sub: "\\geq", insert: "\\geq " },
    { label: "≠", sub: "\\neq", insert: "\\neq " },
    { label: "≈", sub: "\\approx", insert: "\\approx " },
    { label: "◀", action: "left" },
    { label: "▶", action: "right" },
    { label: "∫", sub: "\\int", insert: "\\int " },
    { label: "↵", action: "done", wide: true },
  ],
];

const ALPHA_FUNCS1: KeySpec[] = [
  { label: "sin", sub: "\\sin", insert: "\\sin({}) ", isTemplate: true },
  { label: "cos", sub: "\\cos", insert: "\\cos({}) ", isTemplate: true },
  { label: "tan", sub: "\\tan", insert: "\\tan({}) ", isTemplate: true },
  { label: "log", sub: "\\log", insert: "\\log " },
  { label: "ln", sub: "\\ln", insert: "\\ln({}) ", isTemplate: true },
  { label: "exp", sub: "\\exp", insert: "\\exp " },
  {
    label: "lim",
    sub: "\\lim",
    insert: "\\lim_{} ",
    isTemplate: true,
    cursorBack: 2,
  },
  { label: "min", sub: "\\min", insert: "\\min " },
  { label: "max", sub: "\\max", insert: "\\max " },
];

const ALPHA_FUNCS2: KeySpec[] = [
  {
    label: "arcsin",
    sub: "\\arcsin",
    insert: "\\arcsin({}) ",
    isTemplate: true,
  },
  {
    label: "arccos",
    sub: "\\arccos",
    insert: "\\arccos({}) ",
    isTemplate: true,
  },
  {
    label: "arctan",
    sub: "\\arctan",
    insert: "\\arctan({}) ",
    isTemplate: true,
  },
  { label: "det", sub: "\\det", insert: "\\det " },
  { label: "gcd", sub: "\\gcd", insert: "\\gcd " },
  { label: "inf", sub: "\\inf", insert: "\\inf " },
  { label: "sup", sub: "\\sup", insert: "\\sup " },
  { label: "deg", sub: "\\deg", insert: "\\deg " },
  {
    label: "text",
    sub: "\\text",
    insert: "\\text{}",
    isTemplate: true,
    cursorBack: 1,
  },
];

const makeAlpha = (chars: string): KeySpec[] =>
  chars.split("").map((c) => ({ label: c, insert: c }));

const QWERTY_ROW1 = makeAlpha("qwertyuiop");
const QWERTY_ROW2 = makeAlpha("asdfghjkl");
const QWERTY_ROW3 = makeAlpha("zxcvbnm");
const QWERTY_ROW1_U = makeAlpha("QWERTYUIOP");
const QWERTY_ROW2_U = makeAlpha("ASDFGHJKL");
const QWERTY_ROW3_U = makeAlpha("ZXCVBNM");

const GREEK_LOWER: KeySpec[] = [
  { label: "α", sub: "\\alpha", insert: "\\alpha " },
  { label: "β", sub: "\\beta", insert: "\\beta " },
  { label: "γ", sub: "\\gamma", insert: "\\gamma " },
  { label: "δ", sub: "\\delta", insert: "\\delta " },
  { label: "ε", sub: "\\epsilon", insert: "\\epsilon " },
  { label: "ε̃", sub: "\\varepsilon", insert: "\\varepsilon " },
  { label: "ζ", sub: "\\zeta", insert: "\\zeta " },
  { label: "η", sub: "\\eta", insert: "\\eta " },
  { label: "θ", sub: "\\theta", insert: "\\theta " },
  { label: "ϑ", sub: "\\vartheta", insert: "\\vartheta " },
  { label: "ι", sub: "\\iota", insert: "\\iota " },
  { label: "κ", sub: "\\kappa", insert: "\\kappa " },
  { label: "λ", sub: "\\lambda", insert: "\\lambda " },
  { label: "μ", sub: "\\mu", insert: "\\mu " },
  { label: "ν", sub: "\\nu", insert: "\\nu " },
  { label: "ξ", sub: "\\xi", insert: "\\xi " },
  { label: "π", sub: "\\pi", insert: "\\pi " },
  { label: "ρ", sub: "\\rho", insert: "\\rho " },
  { label: "σ", sub: "\\sigma", insert: "\\sigma " },
  { label: "ς", sub: "\\varsigma", insert: "\\varsigma " },
  { label: "τ", sub: "\\tau", insert: "\\tau " },
  { label: "υ", sub: "\\upsilon", insert: "\\upsilon " },
  { label: "φ", sub: "\\phi", insert: "\\phi " },
  { label: "φ̃", sub: "\\varphi", insert: "\\varphi " },
  { label: "χ", sub: "\\chi", insert: "\\chi " },
  { label: "ψ", sub: "\\psi", insert: "\\psi " },
  { label: "ω", sub: "\\omega", insert: "\\omega " },
];

const GREEK_UPPER: KeySpec[] = [
  { label: "Γ", sub: "\\Gamma", insert: "\\Gamma " },
  { label: "Δ", sub: "\\Delta", insert: "\\Delta " },
  { label: "Θ", sub: "\\Theta", insert: "\\Theta " },
  { label: "Λ", sub: "\\Lambda", insert: "\\Lambda " },
  { label: "Ξ", sub: "\\Xi", insert: "\\Xi " },
  { label: "Π", sub: "\\Pi", insert: "\\Pi " },
  { label: "Σ", sub: "\\Sigma", insert: "\\Sigma " },
  { label: "Υ", sub: "\\Upsilon", insert: "\\Upsilon " },
  { label: "Φ", sub: "\\Phi", insert: "\\Phi " },
  { label: "Ψ", sub: "\\Psi", insert: "\\Psi " },
  { label: "Ω", sub: "\\Omega", insert: "\\Omega " },
];

const SYM_MATH_ROWS: KeySpec[][] = [
  [
    { label: "∪", sub: "\\cup", insert: "\\cup " },
    { label: "∩", sub: "\\cap", insert: "\\cap " },
    { label: "⊂", sub: "\\subset", insert: "\\subset " },
    { label: "⊆", sub: "\\subseteq", insert: "\\subseteq " },
    { label: "∈", sub: "\\in", insert: "\\in " },
    { label: "∉", sub: "\\notin", insert: "\\notin " },
    { label: "∅", sub: "\\varnothing", insert: "\\varnothing " },
    { label: "∖", sub: "\\setminus", insert: "\\setminus " },
  ],
  [
    { label: "∀", sub: "\\forall", insert: "\\forall " },
    { label: "∃", sub: "\\exists", insert: "\\exists " },
    { label: "¬", sub: "\\neg", insert: "\\neg " },
    { label: "∨", sub: "\\vee", insert: "\\vee " },
    { label: "∧", sub: "\\wedge", insert: "\\wedge " },
    { label: "⊢", sub: "\\vdash", insert: "\\vdash " },
    { label: "⊨", sub: "\\models", insert: "\\models " },
    { label: "ℵ", sub: "\\aleph", insert: "\\aleph " },
  ],
  [
    { label: "→", sub: "\\to", insert: "\\to " },
    { label: "←", sub: "\\leftarrow", insert: "\\leftarrow " },
    { label: "↔", sub: "\\leftrightarrow", insert: "\\leftrightarrow " },
    { label: "⇒", sub: "\\Rightarrow", insert: "\\Rightarrow " },
    { label: "⇐", sub: "\\Leftarrow", insert: "\\Leftarrow " },
    { label: "⇔", sub: "\\Leftrightarrow", insert: "\\Leftrightarrow " },
    { label: "↦", sub: "\\mapsto", insert: "\\mapsto " },
    { label: "⇝", sub: "\\leadsto", insert: "\\leadsto " },
  ],
  [
    { label: "↑", sub: "\\uparrow", insert: "\\uparrow " },
    { label: "↓", sub: "\\downarrow", insert: "\\downarrow " },
    { label: "↕", sub: "\\updownarrow", insert: "\\updownarrow " },
    { label: "⊥", sub: "\\perp", insert: "\\perp " },
    { label: "∥", sub: "\\parallel", insert: "\\parallel " },
    { label: "∣", sub: "\\mid", insert: "\\mid " },
    { label: "∼", sub: "\\sim", insert: "\\sim " },
    { label: "≃", sub: "\\simeq", insert: "\\simeq " },
  ],
  [
    { label: "≅", sub: "\\cong", insert: "\\cong " },
    { label: "≡", sub: "\\equiv", insert: "\\equiv " },
    { label: "≺", sub: "\\prec", insert: "\\prec " },
    { label: "≻", sub: "\\succ", insert: "\\succ " },
    { label: "∝", sub: "\\propto", insert: "\\propto " },
    { label: "⊕", sub: "\\oplus", insert: "\\oplus " },
    { label: "⊗", sub: "\\otimes", insert: "\\otimes " },
    { label: "∘", sub: "\\circ", insert: "\\circ " },
  ],
  [
    { label: "ℝ", sub: "\\mathbb{R}", insert: "\\mathbb{R}" },
    { label: "ℤ", sub: "\\mathbb{Z}", insert: "\\mathbb{Z}" },
    { label: "ℚ", sub: "\\mathbb{Q}", insert: "\\mathbb{Q}" },
    { label: "ℕ", sub: "\\mathbb{N}", insert: "\\mathbb{N}" },
    { label: "ℂ", sub: "\\mathbb{C}", insert: "\\mathbb{C}" },
    { label: "∑", sub: "\\sum", insert: "\\sum " },
    { label: "∏", sub: "\\prod", insert: "\\prod " },
    { label: "∫", sub: "\\int", insert: "\\int " },
  ],
  [
    { label: "∬", sub: "\\iint", insert: "\\iint " },
    { label: "∭", sub: "\\iiint", insert: "\\iiint " },
    { label: "∮", sub: "\\oint", insert: "\\oint " },
    { label: "⋃", sub: "\\bigcup", insert: "\\bigcup " },
    { label: "⋂", sub: "\\bigcap", insert: "\\bigcap " },
    {
      label: "⟨⟩",
      sub: "\\langle\\rangle",
      insert: "\\langle \\rangle",
      cursorBack: 7,
    },
    {
      label: "⌊⌋",
      sub: "\\lfloor\\rfloor",
      insert: "\\lfloor \\rfloor",
      cursorBack: 7,
    },
    {
      label: "⌈⌉",
      sub: "\\lceil\\rceil",
      insert: "\\lceil \\rceil",
      cursorBack: 6,
    },
  ],
  [
    {
      label: "x̂",
      sub: "\\hat",
      insert: "\\hat{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "x̃",
      sub: "\\tilde",
      insert: "\\tilde{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "x̄",
      sub: "\\bar",
      insert: "\\bar{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "x⃗",
      sub: "\\vec",
      insert: "\\vec{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "ẋ",
      sub: "\\dot",
      insert: "\\dot{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "ẍ",
      sub: "\\ddot",
      insert: "\\ddot{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "‾",
      sub: "\\overline",
      insert: "\\overline{}",
      isTemplate: true,
      cursorBack: 1,
    },
    {
      label: "⏜",
      sub: "\\widehat",
      insert: "\\widehat{}",
      isTemplate: true,
      cursorBack: 1,
    },
  ],
  [
    { label: "…", sub: "\\ldots", insert: "\\ldots " },
    { label: "⋯", sub: "\\cdots", insert: "\\cdots " },
    { label: "ℏ", sub: "\\hbar", insert: "\\hbar " },
    { label: "ℓ", sub: "\\ell", insert: "\\ell " },
    { label: "∠", sub: "\\angle", insert: "\\angle " },
    { label: "✓", sub: "\\checkmark", insert: "\\checkmark " },
    {
      label: "mat",
      sub: "\\begin{pmatrix}",
      insert: "\\begin{pmatrix}\n & \\\\\n & \n\\end{pmatrix}",
      isTemplate: true,
      cursorBack: 22,
    },
    {
      label: "cases",
      sub: "\\begin{cases}",
      insert:
        "\\begin{cases}\n & \\text{if }\\\\\n & \\text{otherwise}\n\\end{cases}",
      isTemplate: true,
      cursorBack: 40,
    },
  ],
];

const SYM_CHEM_ROWS: KeySpec[][] = [
  [
    {
      label: "\\ce{}",
      sub: "chemistry",
      insert: "\\ce{}",
      isTemplate: true,
      cursorBack: 1,
      wide: true,
    },
    { label: "H₂O", sub: "\\ce{H2O}", insert: "\\ce{H2O}" },
    { label: "CO₂", sub: "\\ce{CO2}", insert: "\\ce{CO2}" },
    { label: "NaCl", sub: "\\ce{NaCl}", insert: "\\ce{NaCl}" },
    { label: "H₂SO₄", sub: "\\ce{H2SO4}", insert: "\\ce{H2SO4}" },
    { label: "NH₃", sub: "\\ce{NH3}", insert: "\\ce{NH3}" },
  ],
  [
    { label: "+", sub: "charge +", insert: "^+" },
    { label: "−", sub: "charge −", insert: "^-" },
    { label: "2+", sub: "charge 2+", insert: "^{2+}" },
    { label: "2−", sub: "charge 2−", insert: "^{2-}" },
    { label: "Iᴵᴵ", sub: "ox. state", insert: "^{II}" },
    { label: "Iᴵᴵᴵ", sub: "ox. state", insert: "^{III}" },
    { label: "•", sub: "radical .-", insert: "^{.-}" },
    { label: "(2•)", sub: "radical (2.)", insert: "^{(2.)-}" },
  ],
  [
    { label: "→", sub: "\\to", insert: "\\to " },
    { label: "←", sub: "\\leftarrow", insert: "\\leftarrow " },
    { label: "↔", sub: "\\leftrightarrow", insert: "\\leftrightarrow " },
    { label: "⇌", sub: "\\rightleftharpoons", insert: "\\rightleftharpoons " },
    { label: "⇋", sub: "\\leftrightharpoons", insert: "\\leftrightharpoons " },
    { label: "↽⇀", sub: "\\leftrightarrows", insert: "\\leftrightarrows " },
    { label: "⇄", sub: "\\rightleftarrows", insert: "\\rightleftarrows " },
    { label: "⇒", sub: "\\Rightarrow", insert: "\\Rightarrow " },
  ],
  [
    { label: "(aq)", insert: "_(_a_q_)" },
    { label: "(s)", insert: "_(_s_)" },
    { label: "(l)", insert: "_(_l_)" },
    { label: "(g)", insert: "_(_g_)" },
    { label: "↓ppt", sub: "v", insert: " v" },
    { label: "↑gas", sub: "^", insert: " ^ " },
    { label: "·", sub: "* hydrate", insert: " * " },
    { label: "∞", sub: "$\\infty$", insert: ",$\\infty$)" },
  ],
  [
    { label: "–", sub: "single bond", insert: "-" },
    { label: "=", sub: "double bond", insert: "=" },
    { label: "≡", sub: "triple bond", insert: "#" },
    { label: "~", sub: "\\bond{~}", insert: "\\bond{~}" },
    { label: "~–", sub: "\\bond{~-}", insert: "\\bond{~-}" },
    { label: "^{A}_{Z}", sub: "isotope", insert: "^{A}_{Z}", cursorBack: 6 },
    { label: "α", sub: "\\alpha", insert: "\\alpha " },
    { label: "β", sub: "\\beta", insert: "\\beta " },
  ],
  [
    { label: "+", insert: " + " },
    { label: "−", insert: " - " },
    { label: "=", insert: " = " },
    { label: "±", sub: "\\pm", insert: " \\pm " },
    { label: "Δ", sub: "[\\Delta]", insert: "[\\Delta]" },
    { label: "hν", sub: "photon", insert: "[h\\nu]" },
    { label: "1/2", insert: "1/2 " },
    { label: "n", sub: "variable", insert: "$n$" },
  ],
];

// ─── Key Button ───────────────────────────────────────────────────────────────

const KeyButton = React.memo(function KeyButton({
  spec,
  onPress,
  mode,
}: {
  spec: KeySpec;
  onPress: (spec: KeySpec) => void;
  mode: EditorMode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-9.5 min-w-8.5 flex-1 flex-col items-center justify-center gap-px rounded-md border px-1 py-1.5",
        "border-[#1e3a52] bg-[#112234] text-[#c8dff0] transition-all active:scale-95 hover:bg-[#1a3050] hover:border-[#2a5580]",
        "text-xs font-mono select-none shadow-sm",
        spec.wide && "flex-2",
        spec.danger &&
          "border-[#7f1d1d]/40 bg-[#450a0a]/60 text-[#fca5a5] hover:bg-[#7f1d1d]/30",
        spec.action === "done" &&
          "bg-[#d97706] text-white hover:bg-[#b45309] border-[#d97706]/60 font-sans shadow-[0_0_10px_rgba(217,119,6,0.35)]",
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress(spec);
      }}
      title={spec.sub}
    >
      <span className="leading-none">{spec.label}</span>
      {mode === "advanced" && spec.sub && spec.action == null && (
        <span className="text-[8px] leading-none text-[#4a7fa0]/80 truncate max-w-full px-0.5">
          {spec.sub.length > 10 ? spec.sub.slice(0, 9) + "…" : spec.sub}
        </span>
      )}
    </button>
  );
});

const KeyRow = React.memo(function KeyRow({
  keys,
  onPress,
  mode,
}: {
  keys: KeySpec[];
  onPress: (k: KeySpec) => void;
  mode: EditorMode;
}) {
  return (
    <div className="flex gap-1">
      {keys.map((k) => (
        <KeyButton
          mode={mode}
          key={`${k.label}-${k.insert ?? k.action ?? ""}`}
          spec={k}
          onPress={onPress}
        />
      ))}
    </div>
  );
});

// ─── Tab: Numeric ─────────────────────────────────────────────────────────────

function NumericTab({
  onPress,
  mode,
}: {
  onPress: (k: KeySpec) => void;
  mode: EditorMode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {NUMERIC_ROWS.map((row, i) => (
        <KeyRow mode={mode} key={i} keys={row} onPress={onPress} />
      ))}
    </div>
  );
}

// ─── Tab: Alphabetic ──────────────────────────────────────────────────────────

function AlphaTab({
  onPress,
  mode,
}: {
  onPress: (k: KeySpec) => void;
  mode: EditorMode;
}) {
  const [shifted, setShifted] = React.useState(false);
  const row1 = shifted ? QWERTY_ROW1_U : QWERTY_ROW1;
  const row2 = shifted ? QWERTY_ROW2_U : QWERTY_ROW2;
  const row3 = shifted ? QWERTY_ROW3_U : QWERTY_ROW3;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold tracking-widest uppercase px-0.5 mb-0.5 text-[#d97706]">
        Lowercase
      </p>
      <div className="flex gap-1 flex-wrap">
        {ALPHA_FUNCS1.map((k, i) => (
          <KeyButton mode={mode} key={i} spec={k} onPress={onPress} />
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {ALPHA_FUNCS2.map((k, i) => (
          <KeyButton mode={mode} key={i} spec={k} onPress={onPress} />
        ))}
      </div>
      <div className="flex gap-1">
        {row1.map((k, i) => (
          <KeyButton mode={mode} key={i} spec={k} onPress={onPress} />
        ))}
      </div>
      <div className="flex gap-1 justify-center">
        {row2.map((k, i) => (
          <KeyButton mode={mode} key={i} spec={k} onPress={onPress} />
        ))}
      </div>
      <div className="flex gap-1 items-center">
        <button
          type="button"
          className={cn(
            "flex min-h-9.5 min-w-10.5 items-center justify-center rounded-md border px-2",
            "text-xs font-mono select-none transition-all active:scale-95 shadow-sm",
            shifted
              ? "bg-[#d97706] text-white border-[#d97706]/60 shadow-[0_0_8px_rgba(217,119,6,0.3)]"
              : "bg-[#112234] border-[#1e3a52] text-[#c8dff0] hover:bg-[#1a3050]",
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            setShifted((s) => !s);
          }}
        >
          ⇧
        </button>
        <div className="flex gap-1 flex-1">
          {row3.map((k, i) => (
            <KeyButton mode={mode} key={i} spec={k} onPress={onPress} />
          ))}
        </div>
        <KeyButton
          mode={mode}
          spec={{ label: "⌫", action: "backspace", danger: true }}
          onPress={onPress}
        />
      </div>
    </div>
  );
}

// ─── Tab: Greek ───────────────────────────────────────────────────────────────

function GreekTab({
  onPress,
  mode,
}: {
  onPress: (k: KeySpec) => void;
  mode: EditorMode;
}) {
  const chunkSize = 9;
  const lowerRows: KeySpec[][] = [];
  for (let i = 0; i < GREEK_LOWER.length; i += chunkSize) {
    lowerRows.push(GREEK_LOWER.slice(i, i + chunkSize));
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold tracking-widest uppercase px-0.5 mb-0.5 text-[#a78bfa]">
        Lowercase
      </p>
      {lowerRows.map((row, i) => (
        <KeyRow mode={mode} key={i} keys={row} onPress={onPress} />
      ))}
      <div className="my-1 border-t border-[#1e3a52]" />
      <p className="text-[10px] font-semibold tracking-widest uppercase px-0.5 mb-0.5 text-[#a78bfa]">
        Uppercase
      </p>
      <KeyRow mode={mode} keys={GREEK_UPPER} onPress={onPress} />
    </div>
  );
}

// ─── Tab: Symbols ─────────────────────────────────────────────────────────────

// Math symbol rows grouped by category for labeled sections
const SYM_MATH_SECTIONS: { label: string; rows: KeySpec[][] }[] = [
  {
    label: "Relations",
    rows: [
      [
        { label: "∈", sub: "\\in", insert: "\\in " },
        { label: "∉", sub: "\\notin", insert: "\\notin " },
        { label: "⊂", sub: "\\subset", insert: "\\subset " },
        { label: "⊆", sub: "\\subseteq", insert: "\\subseteq " },
        { label: "⊃", sub: "\\supset", insert: "\\supset " },
        { label: "⊇", sub: "\\supseteq", insert: "\\supseteq " },
        { label: "∄", sub: "\\nexists", insert: "\\nexists " },
        { label: "⊄", sub: "\\nsubseteq", insert: "\\nsubseteq " },
      ],
    ],
  },
  {
    label: "Logic",
    rows: [
      [
        { label: "¬", sub: "\\neg", insert: "\\neg " },
        { label: "∧", sub: "\\wedge", insert: "\\wedge " },
        { label: "∨", sub: "\\vee", insert: "\\vee " },
        { label: "⇒", sub: "\\Rightarrow", insert: "\\Rightarrow " },
        { label: "⇔", sub: "\\Leftrightarrow", insert: "\\Leftrightarrow " },
        { label: "∀", sub: "\\forall", insert: "\\forall " },
        { label: "∃", sub: "\\exists", insert: "\\exists " },
        { label: "∄", sub: "\\nexists", insert: "\\nexists " },
      ],
    ],
  },
  {
    label: "Operators",
    rows: [
      [
        { label: "∑", sub: "\\sum", insert: "\\sum " },
        { label: "∏", sub: "\\prod", insert: "\\prod " },
        { label: "⊔", sub: "\\sqcup", insert: "\\sqcup " },
        { label: "∩", sub: "\\cap", insert: "\\cap " },
        { label: "∪", sub: "\\cup", insert: "\\cup " },
        { label: "⊕", sub: "\\oplus", insert: "\\oplus " },
        { label: "⊗", sub: "\\otimes", insert: "\\otimes " },
        { label: "∘", sub: "\\circ", insert: "\\circ " },
      ],
    ],
  },
  {
    label: "Miscellaneous",
    rows: [
      [
        { label: "…", sub: "\\ldots", insert: "\\ldots " },
        { label: "⋮", sub: "\\vdots", insert: "\\vdots " },
        { label: "⋯", sub: "\\cdots", insert: "\\cdots " },
        { label: "°", sub: "\\degree", insert: "^\\circ " },
        { label: "′", sub: "\\prime", insert: "\\prime " },
        { label: "″", sub: "\\prime\\prime", insert: "''  " },
        { label: "ℏ", sub: "\\hbar", insert: "\\hbar " },
        { label: "ℜ", sub: "\\Re", insert: "\\Re " },
        { label: "ℑ", sub: "\\Im", insert: "\\Im " },
      ],
    ],
  },
];

function SymbolsTab({
  onPress,
  mode,
}: {
  onPress: (k: KeySpec) => void;
  mode: EditorMode;
}) {
  const [page, setPage] = React.useState<SymPage>("math");

  return (
    <div className="flex flex-col gap-1">
      {/* Math / Chemistry pill toggle */}
      <div className="flex gap-1 mb-1 rounded-lg overflow-hidden border border-[#1e3a52] bg-[#0b1929]">
        <button
          type="button"
          className={cn(
            "flex-1 py-1.5 text-xs font-sans font-semibold transition-all rounded-md",
            page === "math"
              ? "bg-[#1d4ed8] text-white shadow-sm"
              : "text-[#6b9fc2] hover:text-[#c8dff0]",
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            setPage("math");
          }}
        >
          Math
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 py-1.5 text-xs font-sans font-semibold transition-all rounded-md",
            page === "chem"
              ? "bg-[#d97706] text-white shadow-sm"
              : "text-[#6b9fc2] hover:text-[#c8dff0]",
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            setPage("chem");
          }}
        >
          Chemistry
        </button>
      </div>

      {page === "math" ? (
        // Math page: categorized sections with labels
        <div className="flex flex-col gap-2">
          {SYM_MATH_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold tracking-widest uppercase px-0.5 mb-1 text-[#d97706]">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {section.rows.map((row, i) => (
                  <KeyRow mode={mode} key={i} keys={row} onPress={onPress} />
                ))}
              </div>
            </div>
          ))}
          {/* Extra math rows (arrows, sets, etc.) */}
          <div className="flex flex-col gap-1">
            {SYM_MATH_ROWS.map((row, i) => (
              <KeyRow mode={mode} key={i} keys={row} onPress={onPress} />
            ))}
          </div>
        </div>
      ) : (
        // Chemistry page: rows with Common label
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-widest uppercase px-0.5 mb-0.5 text-[#d97706]">
            Common
          </p>
          {SYM_CHEM_ROWS.map((row, i) => (
            <KeyRow mode={mode} key={i} keys={row} onPress={onPress} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Simple Mode Field ────────────────────────────────────────────────────────

interface SimpleModeFieldProps {
  /** The final LaTeX template string (may contain \placeholder{}) */
  templateLatex: string;
  /** Per-slot token accumulator */
  slotTokens: SlotTokens;
  onSubmit: () => void;
  onClose: () => void;
  placeholder?: string;
  activeSlot: number;
  /** Accepts a plain slot index or a functional updater (prev => next) */
  setActiveSlot: (updater: number | ((prev: number) => number)) => void;
  hiddenInputRef: React.RefObject<HTMLInputElement | null>;
  onKeyPress: (key: KeySpec) => void;
  onAddSlot?: () => void;
}

function SimpleModeField({
  templateLatex,
  slotTokens,
  onSubmit,
  onClose,
  placeholder,
  activeSlot,
  setActiveSlot,
  hiddenInputRef,
  onKeyPress,
  onAddSlot,
}: SimpleModeFieldProps) {
  const previewRef = React.useRef<HTMLDivElement>(null);

  // The effective template: if empty, show a single placeholder
  const effectiveTemplate =
    templateLatex === "" || templateLatex === PLACEHOLDER
      ? PLACEHOLDER
      : templateLatex;

  // Rebuild the renderable LaTeX by filling slots with their tokens, showing cursor for the activeSlot
  const renderLatex = rebuildLatex(effectiveTemplate, slotTokens, activeSlot);

  // Rebuild clean LaTeX (no cursor) for the status bar
  const cleanLatex = rebuildLatex(effectiveTemplate, slotTokens);

  // Render KaTeX with the active slot highlighted
  React.useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    // Clear any prior KaTeX render before writing new content.
    // This prevents the DOM walker from operating on stale/detached nodes.
    container.innerHTML = "";

    try {
      katex.render(renderLatex, container, {
        displayMode: true,
        throwOnError: false,
        errorColor: "#cc0000",
        output: "htmlAndMathml",
        macros: { ...KATEX_MACROS },
      });
    } catch {
      container.textContent = renderLatex;
      return;
    }

    // Walk text nodes and wrap □/■ with clickable spans.
    // placeholderIdx counts only empty slots (□/■ characters) in DOM order,
    // which matches the visual ordering of glyphs KaTeX emits.
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    let placeholderIdx = 0;
    for (const textNode of textNodes) {
      const text = textNode.textContent ?? "";
      if (!text.includes("□") && !text.includes("■")) continue;
      const parent = textNode.parentElement;
      if (!parent) continue;
      const parts = text.split(/([□■])/);
      if (parts.length <= 1) continue;
      const fragment = document.createDocumentFragment();
      for (const part of parts) {
        if (part === "□" || part === "■") {
          const span = document.createElement("span");
          span.dataset.placeholderIndex = String(placeholderIdx++);
          span.className =
            "math-placeholder" +
            (part === "■" ? " math-placeholder-active" : "");
          span.textContent = part;
          fragment.appendChild(span);
        } else if (part) {
          fragment.appendChild(document.createTextNode(part));
        }
      }
      parent.replaceChild(fragment, textNode);
    }

    return () => {
      container.innerHTML = "";
    };
  }, [renderLatex]);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest(
        "[data-placeholder-index]",
      );

      console.log("target: ", target);
      if (target) {
        const clickIdx = parseInt(
          target.getAttribute("data-placeholder-index") ?? "0",
          10,
        );
        const templateIdx = mapClickToTemplateIndex(
          effectiveTemplate,
          slotTokens,
          clickIdx,
        );
        setActiveSlot(templateIdx);
      }
      hiddenInputRef.current?.focus();
    },
    [effectiveTemplate, slotTokens, setActiveSlot, hiddenInputRef],
  );

  const totalSlots = countPlaceholders(effectiveTemplate);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        onKeyPress({ action: e.shiftKey ? "left" : "right", label: "tab" });
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onKeyPress({ action: "left", label: "left" });
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onKeyPress({ action: "right", label: "right" });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onKeyPress({ action: "left", label: "left" });
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onKeyPress({ action: "right", label: "right" });
        return;
      }
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Enter") {
        onSubmit();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        onKeyPress({ action: "backspace", label: "backspace" });
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        let keySpec: KeySpec = { label: e.key, insert: e.key };
        if (e.key === "^") {
          keySpec = {
            label: "xⁿ",
            sub: "^{}",
            insert: "^{}",
            isTemplate: true,
            cursorBack: 1,
          };
        } else if (e.key === "_") {
          keySpec = {
            label: "xₙ",
            sub: "_{}",
            insert: "_{}",
            isTemplate: true,
            cursorBack: 1,
          };
        } else if (e.key === "/") {
          keySpec = {
            label: "a/b",
            sub: "\\frac",
            insert: "\\frac{}{}",
            isTemplate: true,
            cursorBack: 3,
          };
        } else if (e.key === "{") {
          keySpec = {
            label: "{",
            insert: "\\{",
          };
        } else if (e.key === "}") {
          keySpec = {
            label: "}",
            insert: "\\}",
          };
        } else if (e.key === " ") {
          keySpec = {
            label: "space",
            insert: "\\ ",
          };
        }
        onKeyPress(keySpec);
      }
    },
    [onKeyPress, onClose, onSubmit],
  );

  // The raw LaTeX to show in status bar
  const displayLatex = cleanLatex === PLACEHOLDER ? "" : cleanLatex;

  return (
    <div className="px-2.5 py-2 border-b border-[#1e3a52] bg-[#0b1929]">
      {/* Main preview area */}
      <div
        className={cn(
          "relative min-h-18 rounded-lg border border-[#1e3a52] bg-[#071525]",
          "flex items-center justify-center overflow-x-auto px-4",
          "cursor-text focus-within:border-[#d97706]/60 focus-within:ring-1 focus-within:ring-[#d97706]/30",
        )}
        onClick={handleClick}
      >
        <div
          ref={previewRef}
          className="[&_.katex-display]:my-0 select-none text-[#e8f4ff]"
        />
        <input
          ref={hiddenInputRef}
          type="text"
          value=""
          onChange={() => {}}
          className="sr-only"
          onKeyDown={handleKeyDown}
          autoFocus
          aria-label="Math field input"
        />
      </div>

      {/* Slot navigation hint + LaTeX preview — compact single row */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          {totalSlots > 1 && (
            <>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#1a3050] text-[#6b9fc2]"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPress({ action: "left", label: "left" });
                }}
              >
                <ChevronLeftIcon className="size-3" />
              </button>
              <span className="text-[10px] text-[#6b9fc2] tabular-nums">
                slot {activeSlot + 1}/{totalSlots}
              </span>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#1a3050] text-[#6b9fc2]"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onKeyPress({ action: "right", label: "right" });
                }}
              >
                <ChevronRightIcon className="size-3" />
              </button>
            </>
          )}
        </div>
        <span className="font-mono text-[10px] text-[#4a7fa0]/80 break-all line-clamp-1 flex-1 min-w-0">
          {displayLatex || (
            <span className="italic opacity-50 text-[#4a7fa0]">
              {placeholder ?? "empty — type or press a key"}
            </span>
          )}
        </span>
        <button
          type="button"
          title="Force new slot after active"
          className="flex self-end h-5 items-center gap-0.5 rounded hover:bg-[#1a3050] text-[#6b9fc2] px-1 text-[9px] font-sans border border-[#1e3a52] bg-[#0f1f33]"
          onPointerDown={(e) => {
            e.preventDefault();
            onAddSlot?.();
          }}
        >
          <PlusIcon className="size-2.5" />
          <span>Slot</span>
        </button>
      </div>
    </div>
  );
}

// ─── MathFieldKeyboardPopover ─────────────────────────────────────────────────

interface MathFieldKeyboardPopoverProps {
  isInline: boolean;
  open: boolean;
  onClose: () => void;
  className?: string;
  placeholder?: string;
  element?: any;
}

export function MathFieldKeyboardPopover(props: MathFieldKeyboardPopoverProps) {
  const readOnly = useReadOnly();
  if (readOnly) return null;
  return <MathFieldKeyboardInner {...props} />;
}

function MathFieldKeyboardInner({
  isInline,
  open,
  onClose,
  className,
  placeholder,
  element,
}: MathFieldKeyboardPopoverProps) {
  const editor = useEditorRef();
  const {
    props: taProps,
    ref: taRef,
    onSubmit,
  } = useEquationInput({ isInline, open, onClose });

  const [activeTab, setActiveTab] = React.useState<TabId>("123");
  const [mode, setMode] = React.useState<EditorMode>(() => {
    try {
      const stored = localStorage.getItem("mathfield-mode");
      // Guard against stale/tampered values before casting
      return stored && VALID_MODES.has(stored as EditorMode)
        ? (stored as EditorMode)
        : "simple";
    } catch {
      return "simple";
    }
  });

  // Simple mode: all interconnected state lives in one atomic reducer to
  // eliminate stale-closure bugs from multiple useState calls updating together.
  const [simpleState, dispatchSimple] = React.useReducer(
    simpleReducer,
    initialSimpleState,
    (initial) => {
      if (
        element?.equationTemplate !== undefined &&
        element?.equationTokens !== undefined
      ) {
        return {
          template: element.equationTemplate,
          tokens: element.equationTokens,
          activeSlot: element.equationActiveSlot ?? 0,
          history: [],
        };
      }
      const initialTex = taProps?.value ?? "";
      if (initialTex) {
        return {
          template: PLACEHOLDER,
          tokens: { 0: [initialTex] },
          activeSlot: 0,
          history: [],
        };
      }
      return initial;
    },
  );

  const hiddenInputRef = React.useRef<HTMLInputElement>(null);
  const cursorAfterRef = React.useRef<number | null>(null);

  // Keep a ref to the latest simpleState so we can save it on close/submit without causing keypress lag
  const latestSimpleStateRef = React.useRef(simpleState);
  React.useEffect(() => {
    latestSimpleStateRef.current = simpleState;
  }, [simpleState]);

  const saveToSlateNode = React.useCallback(() => {
    if (!element) return;
    const { template, tokens, activeSlot } = latestSimpleStateRef.current;
    const currentTemplate = element.equationTemplate;
    const currentTokens = element.equationTokens;
    const currentActiveSlot = element.equationActiveSlot;

    const tokensChanged =
      JSON.stringify(currentTokens) !== JSON.stringify(tokens);

    if (
      currentTemplate !== template ||
      tokensChanged ||
      currentActiveSlot !== activeSlot
    ) {
      editor.tf.setNodes(
        {
          equationTemplate: template,
          equationTokens: tokens,
          equationActiveSlot: activeSlot,
        },
        { at: element },
      );
    }
  }, [element, editor]);

  // Save to slate on unmount (popover close)
  React.useEffect(() => {
    return () => {
      saveToSlateNode();
    };
  }, [saveToSlateNode]);

  // Save to slate when open state changes to false
  React.useEffect(() => {
    if (!open) {
      saveToSlateNode();
    }
  }, [open, saveToSlateNode]);

  const handleSubmit = React.useCallback(() => {
    saveToSlateNode();
    onSubmit();
  }, [saveToSlateNode, onSubmit]);

  // Keep a ref to the latest taProps.onChange so the sync effect below can
  // always call the current version without listing it as a dep (which would
  // create an infinite loop: onChange call → Plate re-render → new onChange
  // ref → effect fires again → …).
  const onChangeRef = React.useRef(taProps.onChange);
  React.useEffect(() => {
    onChangeRef.current = taProps.onChange;
  });

  // Sync simple mode state → Plate equation value.
  React.useEffect(() => {
    const template = simpleState.template;
    const tokens = simpleState.tokens;

    const built = rebuildLatex(
      template === "" || template === PLACEHOLDER ? PLACEHOLDER : template,
      tokens,
    );

    // Strip the lone PLACEHOLDER sentinel → empty string for Plate
    let val = built === PLACEHOLDER ? "" : built;

    // Strip any unfilled \placeholder{} remnants that Plate cannot render.
    // These appear for slots the user has not typed into yet.
    val = val.replace(/\\placeholder\{\}/g, "").trim();

    onChangeRef.current({
      target: { value: val },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  }, [simpleState.template, simpleState.tokens]);

  // Apply pending cursor for advanced textarea — scoped to value changes only,
  // not every render, to avoid unnecessary DOM writes.
  React.useLayoutEffect(() => {
    if (
      mode !== "advanced" ||
      cursorAfterRef.current === null ||
      !taRef.current
    )
      return;
    const pos = cursorAfterRef.current;
    taRef.current.selectionStart = pos;
    taRef.current.selectionEnd = pos;
    cursorAfterRef.current = null;
  }, [mode, taProps.value]);

  const switchMode = (newMode: EditorMode) => {
    setMode(newMode);
    try {
      localStorage.setItem("mathfield-mode", newMode);
    } catch {}
    if (newMode === "advanced") {
      requestAnimationFrame(() => taRef.current?.focus());
    } else {
      requestAnimationFrame(() => hiddenInputRef.current?.focus());
    }
  };

  // ── Advanced mode helpers ──

  const fireChange = React.useCallback(
    (val: string) => {
      taProps.onChange({
        target: { value: val },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    },
    [taProps],
  );

  const handleAdvancedInsert = React.useCallback(
    (text: string, cursorBack = 0) => {
      const ta = taRef.current;
      const val = taProps.value;
      const start = ta?.selectionStart ?? val.length;
      const end = ta?.selectionEnd ?? start;
      const newVal = val.slice(0, start) + text + val.slice(end);
      cursorAfterRef.current = start + text.length - cursorBack;
      fireChange(newVal);
      requestAnimationFrame(() => taRef.current?.focus());
    },
    [fireChange, taProps.value, taRef],
  );

  const handleAdvancedBackspace = React.useCallback(() => {
    const ta = taRef.current;
    const val = taProps.value;
    const start = ta?.selectionStart ?? val.length;
    const end = ta?.selectionEnd ?? start;
    let newVal: string;
    let newPos: number;
    if (start !== end) {
      newVal = val.slice(0, start) + val.slice(end);
      newPos = start;
    } else if (start > 0) {
      newVal = val.slice(0, start - 1) + val.slice(start);
      newPos = start - 1;
    } else return;
    cursorAfterRef.current = newPos;
    fireChange(newVal);
    requestAnimationFrame(() => taRef.current?.focus());
  }, [fireChange, taProps.value, taRef]);

  const handleAdvancedNav = React.useCallback(
    (dir: "left" | "right") => {
      const ta = taRef.current;
      if (!ta) return;
      cursorAfterRef.current =
        dir === "left"
          ? Math.max(0, ta.selectionStart - 1)
          : Math.min(taProps?.value?.length || 0, ta.selectionEnd + 1);
      requestAnimationFrame(() => taRef.current?.focus());
    },
    [taProps.value, taRef],
  );

  const handleAdvancedKeyPress = React.useCallback(
    (key: KeySpec) => {
      if (key.action === "backspace") {
        handleAdvancedBackspace();
        return;
      }
      if (key.action === "clear") {
        fireChange("");
        cursorAfterRef.current = 0;
        requestAnimationFrame(() => taRef.current?.focus());
        return;
      }
      if (key.action === "done") {
        handleSubmit();
        return;
      }
      if (key.action === "left") {
        handleAdvancedNav("left");
        return;
      }
      if (key.action === "right") {
        handleAdvancedNav("right");
        return;
      }
      if (key.insert != null)
        handleAdvancedInsert(key.insert, key.cursorBack ?? 0);
    },
    [
      fireChange,
      handleAdvancedBackspace,
      handleAdvancedInsert,
      handleAdvancedNav,
      handleSubmit,
      taRef,
    ],
  );

  // ── Simple mode key press — dispatches to pure reducer, no stale closures ──

  const handleSimpleKeyPress = React.useCallback(
    (key: KeySpec) => {
      if (key.action === "done") {
        handleSubmit();
        return;
      }
      if (key.action === "clear") {
        dispatchSimple({ type: "CLEAR" });
        requestAnimationFrame(() => hiddenInputRef.current?.focus());
        return;
      }
      if (key.action === "backspace") {
        dispatchSimple({ type: "BACKSPACE" });
        requestAnimationFrame(() => hiddenInputRef.current?.focus());
        return;
      }
      if (key.action === "left" || key.action === "right") {
        dispatchSimple({ type: "NAVIGATE", dir: key.action });
        requestAnimationFrame(() => hiddenInputRef.current?.focus());
        return;
      }
      if (!key.insert) return;
      dispatchSimple({ type: "INSERT", key });
      requestAnimationFrame(() => hiddenInputRef.current?.focus());
    },
    [handleSubmit],
  );

  const handleKeyPress =
    mode === "simple" ? handleSimpleKeyPress : handleAdvancedKeyPress;

  // ── Advanced preview — sanitized to prevent XSS from user LaTeX input ──
  const previewHtml = React.useMemo(() => {
    if (!taProps.value) return "";
    try {
      const raw = katex.renderToString(taProps.value, {
        displayMode: true,
        throwOnError: false,
        errorColor: "#cc0000",
        output: "htmlAndMathml",
        macros: { ...KATEX_MACROS },
      });
      return DOMPurify.sanitize(raw, {
        ADD_TAGS: [
          "math",
          "semantics",
          "mrow",
          "mi",
          "mo",
          "mn",
          "msup",
          "msub",
          "mfrac",
          "annotation",
        ],
        ADD_ATTR: ["encoding"],
      });
    } catch {
      return "";
    }
  }, [taProps.value]);

  const copyToClipboard = () =>
    void navigator.clipboard.writeText(taProps.value);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "123", label: "123", icon: "#" },
    { id: "abc", label: "abc", icon: "A" },
    { id: "greek", label: "αβγ", icon: "A" },
    { id: "sym", label: "sym", icon: "☆" },
  ];

  return (
    <PopoverContent
      className={cn(
        "w-125 max-w-[95vw] p-0 gap-0 overflow-hidden border-[#1e3a52]",
        "bg-[#0b1929] text-[#c8dff0]",
        className,
      )}
      onEscapeKeyDown={(e) => e.preventDefault()}
      contentEditable={false}
    >
      {/* ── Compact header: mode toggle + action buttons in one row ── */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[#1e3a52] bg-[#071525]">
        {/* Mode toggle */}
        <div className="flex items-center gap-0 rounded-md border border-[#1e3a52] bg-[#0b1929] p-0.5">
          {(["simple", "advanced"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={cn(
                "rounded px-2.5 py-0.5 text-[11px] font-sans capitalize transition-all",
                mode === m
                  ? "bg-[#112234] text-[#e8f4ff] shadow-sm"
                  : "text-[#4a7fa0] hover:text-[#c8dff0]",
              )}
              onPointerDown={(e) => {
                e.preventDefault();
                switchMode(m);
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          type="button"
          title="Clear"
          className="flex h-7 items-center gap-1 rounded-md border border-[#7f1d1d]/40 bg-[#450a0a]/40 px-2 text-[11px] text-[#fca5a5] hover:bg-[#7f1d1d]/30 transition-colors"
          onPointerDown={(e) => {
            e.preventDefault();
            if (mode === "simple") {
              dispatchSimple({ type: "CLEAR" });
              requestAnimationFrame(() => hiddenInputRef.current?.focus());
            } else {
              fireChange("");
              cursorAfterRef.current = 0;
              requestAnimationFrame(() => taRef.current?.focus());
            }
          }}
        >
          <Trash2Icon className="size-3" />
          <span className="hidden sm:inline">Clear</span>
        </button>
        <button
          type="button"
          title="Copy LaTeX"
          className="flex h-7 items-center gap-1 rounded-md border border-[#1e3a52] bg-[#112234] px-2 text-[11px] text-[#c8dff0] hover:bg-[#1a3050] transition-colors"
          onPointerDown={(e) => {
            e.preventDefault();
            copyToClipboard();
          }}
        >
          <ClipboardCopyIcon className="size-3" />
          <span className="hidden sm:inline">Copy</span>
        </button>
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-md bg-[#d97706] px-2.5 text-[11px] text-white hover:bg-[#b45309] transition-colors font-sans shadow-[0_0_10px_rgba(217,119,6,0.3)]"
          onPointerDown={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          Done <CornerDownLeftIcon className="size-3" />
        </button>
      </div>

      {/* ── Simple mode preview + slot status ── */}
      {mode === "simple" && (
        <SimpleModeField
          templateLatex={simpleState.template}
          slotTokens={simpleState.tokens}
          onSubmit={handleSubmit}
          onClose={onClose}
          placeholder={placeholder}
          activeSlot={simpleState.activeSlot}
          setActiveSlot={(updater) => {
            // SimpleModeField uses a dispatch-compatible setter for click-to-slot;
            // we resolve the functional updater form here and dispatch NAVIGATE
            // is not flexible enough, so we dispatch a SET_SLOT action instead.
            const next =
              typeof updater === "function"
                ? updater(simpleState.activeSlot)
                : updater;
            dispatchSimple({ type: "SET_SLOT", slot: next });
          }}
          hiddenInputRef={hiddenInputRef}
          onKeyPress={handleKeyPress}
          onAddSlot={() => {
            dispatchSimple({ type: "ADD_SLOT" });
            requestAnimationFrame(() => hiddenInputRef.current?.focus());
          }}
        />
      )}

      {/* ── Advanced mode preview + textarea ── */}
      {mode === "advanced" && (
        <div className="border-b border-[#1e3a52] bg-[#0b1929]">
          {/* Rendered preview */}
          <div className="min-h-15 bg-[#071525] flex items-center justify-center px-3 py-2 border-b border-[#1e3a52] overflow-x-auto">
            {taProps.value ? (
              <span
                className="[&_.katex-display]:my-0 text-[#e8f4ff]"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <span className="text-[#4a7fa0] text-sm italic">
                {placeholder ?? "Enter a LaTeX expression…"}
              </span>
            )}
          </div>
          {/* Textarea */}
          <div className="px-2.5 py-2 flex gap-2 items-start">
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <textarea
                ref={taRef}
                value={taProps.value}
                onChange={taProps.onChange}
                onKeyDown={taProps.onKeyDown}
                placeholder={placeholder ?? "Type LaTeX here…"}
                rows={2}
                autoFocus
                className="w-full resize-none rounded-md border border-[#1e3a52] bg-[#071525] px-2 py-1.5 text-sm font-mono text-[#c8dff0] placeholder:text-[#4a7fa0] focus:outline-none focus:ring-1 focus:ring-[#d97706]/50 focus:border-[#d97706]/50 min-h-[48px] max-h-[80px]"
              />
              <span className="font-mono text-[10px] text-[#4a7fa0]/70 break-all line-clamp-1">
                {taProps.value || <span className="italic">empty</span>}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex border-b border-[#1e3a52] bg-[#071525]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isGreek = tab.id === "greek";
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "flex-1 py-2 text-[11px] font-mono transition-colors border-b-2 flex items-center justify-center gap-1",
                isActive && isGreek
                  ? "text-[#a78bfa] border-[#a78bfa] bg-[#0f1929] font-semibold"
                  : isActive
                    ? "text-[#d97706] border-[#d97706] bg-[#0f1929] font-semibold"
                    : "text-[#4a7fa0] border-transparent hover:bg-[#0f1929]/60 hover:text-[#c8dff0]",
              )}
              onPointerDown={(e) => {
                e.preventDefault();
                setActiveTab(tab.id);
              }}
            >
              <span
                className={cn(
                  "text-[9px] px-0.5 py-px rounded border font-sans leading-none",
                  isActive && isGreek
                    ? "border-[#a78bfa]/60 text-[#a78bfa]"
                    : isActive
                      ? "border-[#d97706]/60 text-[#d97706]"
                      : "border-[#1e3a52] text-[#4a7fa0]",
                )}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Keyboard grid ── */}
      <div className="p-2 bg-[#0b1929] max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-[#071525] scrollbar-thumb-[#1e3a52]">
        {activeTab === "123" && (
          <NumericTab mode={mode} onPress={handleKeyPress} />
        )}
        {activeTab === "abc" && (
          <AlphaTab mode={mode} onPress={handleKeyPress} />
        )}
        {activeTab === "greek" && (
          <GreekTab mode={mode} onPress={handleKeyPress} />
        )}
        {activeTab === "sym" && (
          <SymbolsTab mode={mode} onPress={handleKeyPress} />
        )}
      </div>
    </PopoverContent>
  );
}
