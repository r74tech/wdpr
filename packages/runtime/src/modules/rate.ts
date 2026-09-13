import type { ModuleCleanup, RuntimeOptions, RatingRef, RatingAction, RatingState } from "../types";
import { isElement } from "../utils/dom";

/** Bind one displayed page's rating widgets. The host fixes the page in its callback. */
export function initRate(root: HTMLElement, options?: RuntimeOptions): ModuleCleanup {
  const pending = new Set<string>();
  let destroyed = false;
  const onRate = options?.onRate;

  function handleClick(event: Event): void {
    if (!isElement(event.target)) return;
    const button = event.target.closest<HTMLAnchorElement>("a[data-rating-action]");
    const widget = button?.closest<HTMLElement>(".page-rate-widget-box");
    if (!button || !widget || !root.contains(widget)) return;
    event.preventDefault();
    if (!onRate || button.getAttribute("aria-disabled") === "true") return;
    const ref = readRef(widget);
    const action = readAction(button.dataset.ratingAction);
    if (!ref || !action) return;
    const key = refKey(ref);
    if (pending.has(key)) return;
    const widgets = [...root.querySelectorAll<HTMLElement>(".page-rate-widget-box")].filter(
      (candidate) => {
        const candidateRef = readRef(candidate);
        return candidateRef && refKey(candidateRef) === key;
      },
    );
    const active = root.ownerDocument.activeElement;
    const focusedWidget = active ? widgets.find((item) => item.contains(active)) : undefined;
    const focus =
      focusedWidget && active && isElement(active)
        ? { widget: focusedWidget, action: active.getAttribute("data-rating-action") }
        : undefined;
    // The response replaces controls. Keep focus on the stable widget until then.
    if (focus && focus.action !== null) focus.widget.focus();
    pending.add(key);
    const disabled = new Map<HTMLAnchorElement, boolean>();
    for (const item of widgets) {
      item.setAttribute("aria-busy", "true");
      setStatus(item, "");
      for (const control of item.querySelectorAll<HTMLAnchorElement>("a[data-rating-action]")) {
        disabled.set(control, control.getAttribute("aria-disabled") === "true");
        setDisabled(control, true);
      }
    }
    void submit(ref, action, key, widgets, disabled, focus);
  }

  async function submit(
    ref: RatingRef,
    action: RatingAction,
    key: string,
    widgets: HTMLElement[],
    disabled: Map<HTMLAnchorElement, boolean>,
    focus: { widget: HTMLElement; action: string | null } | undefined,
  ): Promise<void> {
    try {
      const result = await onRate!(ref, action);
      if (destroyed) return;
      if (result && refKey(result.ref) !== key)
        throw new Error("Rating response reference mismatch");
      for (const widget of widgets) {
        if (!root.contains(widget)) continue;
        if (result === null) widget.remove();
        else updateWidget(widget, result);
      }
    } catch {
      if (!destroyed) {
        for (const widget of widgets) {
          if (root.contains(widget))
            setStatus(
              widget,
              widget.dataset.ratingErrorLabel ?? "Unable to save your vote. Try again.",
            );
        }
      }
    } finally {
      pending.delete(key);
      if (!destroyed) {
        for (const [button, wasDisabled] of disabled) setDisabled(button, wasDisabled);
        for (const widget of widgets) widget.removeAttribute("aria-busy");
        if (focus?.action && root.ownerDocument.activeElement === focus.widget) {
          const next = [
            ...focus.widget.querySelectorAll<HTMLAnchorElement>("a[data-rating-action]"),
          ].find(
            (button) =>
              button.dataset.ratingAction === focus.action &&
              button.getAttribute("aria-disabled") !== "true",
          );
          next?.focus();
        }
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== " " || !isElement(event.target)) return;
    const control = event.target.closest<HTMLAnchorElement>("a[data-rating-action]");
    if (!control?.closest(".page-rate-widget-box") || !root.contains(control)) return;
    event.preventDefault();
    if (!event.repeat) control.click();
  }

  root.addEventListener("click", handleClick);
  root.addEventListener("keydown", handleKeyDown);
  return {
    destroy() {
      destroyed = true;
      root.removeEventListener("click", handleClick);
      root.removeEventListener("keydown", handleKeyDown);
    },
  };
}

function readRef(widget: HTMLElement): RatingRef | null {
  if (widget.dataset.ratingKind === "main") return { kind: "main" };
  const axisKey = widget.dataset.ratingAxis;
  return widget.dataset.ratingKind === "custom" && axisKey !== undefined && axisKey !== ""
    ? { kind: "custom", axisKey }
    : null;
}

function refKey(ref: RatingRef): string {
  return ref.kind === "main" ? "main" : `custom:${ref.axisKey}`;
}

function readAction(value: string | undefined): RatingAction | null {
  if (value === "cancel") return { type: "cancel" };
  if (value === "1" || value === "0" || value === "-1")
    return { type: "vote", value: value === "1" ? 1 : value === "0" ? 0 : -1 };
  return null;
}

function setStatus(widget: HTMLElement, message: string): void {
  const status = widget.querySelector<HTMLElement>(".rate-status");
  if (status) status.textContent = message;
}

function setDisabled(control: HTMLAnchorElement, disabled: boolean): void {
  control.setAttribute("aria-disabled", String(disabled));
  control.tabIndex = disabled ? -1 : 0;
}

function updateWidget(widget: HTMLElement, state: RatingState): void {
  const document = widget.ownerDocument;
  const summary = widget.querySelector(".rate-points");
  if (summary) {
    summary.replaceChildren(state.label);
    if (state.aggregate) {
      const { points } = state.aggregate;
      const number = document.createElement("span");
      number.className = "number prw54353";
      number.textContent = `${points > 0 ? "+" : ""}${points}`;
      summary.append(":\u00a0", number);
    }
  }
  for (const control of widget.querySelectorAll(":scope > span > a[data-rating-action]")) {
    control.parentElement!.remove();
  }
  const actions = document.createDocumentFragment();
  for (const value of [1, 0, -1, "cancel"] as const) {
    if (value === "cancel" ? !state.canCancel : !state.allowedVotes.includes(value)) continue;
    const wrapper = document.createElement("span");
    const button = document.createElement("a");
    const [className, glyph, title] =
      value === 1
        ? ["rateup", "+", widget.dataset.ratingUpLabel]
        : value === 0
          ? ["rateup rateneutral", "Ø", widget.dataset.ratingNeutralLabel]
          : value === -1
            ? ["ratedown", "–", widget.dataset.ratingDownLabel]
            : ["cancel", "×", widget.dataset.ratingCancelLabel];
    wrapper.className = `${className} btn btn-default`;
    button.href = "#";
    button.setAttribute("role", "button");
    button.textContent = value === "cancel" ? glyph : (state.voteLabels?.[value] ?? glyph);
    button.dataset.ratingAction = String(value);
    button.title = title ?? glyph;
    button.setAttribute("aria-label", title ?? glyph);
    setDisabled(button, value === "cancel" ? state.currentVote === null : !state.canVote);
    if (value !== "cancel")
      button.setAttribute("aria-pressed", String(state.currentVote === value));
    wrapper.append(button);
    actions.append(wrapper);
  }
  widget.insertBefore(actions, widget.querySelector(".rate-status"));
}
