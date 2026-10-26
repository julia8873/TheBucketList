import { Platform } from 'react-native';

/**
 * Encuentra el contenedor con scroll horizontal más cercano a un elemento del DOM.
 */
function findHorizontalScrollContainer(startNode: HTMLElement | null): HTMLElement | null {
  let curr = startNode;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const overflowX = style.overflowX;
    const canScrollX =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      curr.scrollWidth > curr.clientWidth;
    if (canScrollX) {
      return curr;
    }
    curr = curr.parentElement;
  }
  return null;
}

/**
 * Determina si el contenedor horizontal debe interceptar el evento de rueda vertical.
 */
function getTargetHorizontalScrollContainer(
  startNode: HTMLElement | null,
  deltaY: number
): HTMLElement | null {
  let curr = startNode;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const overflowX = style.overflowX;
    const canScrollX =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      curr.scrollWidth > curr.clientWidth;

    if (canScrollX) {
      const overflowY = style.overflowY;
      const canScrollY =
        (overflowY === 'auto' || overflowY === 'scroll') &&
        curr.scrollHeight > curr.clientHeight;

      if (!canScrollY) {
        // Solo tiene scroll horizontal: comprobar si aún puede desplazarse en esta dirección
        const canScrollMore =
          deltaY > 0
            ? curr.scrollLeft + curr.clientWidth < curr.scrollWidth - 1
            : curr.scrollLeft > 0;
        if (canScrollMore) {
          return curr;
        }
      } else {
        // Tiene scroll en ambos ejes: solo actuar si el vertical llegó a su tope
        const atTop = curr.scrollTop <= 0 && deltaY < 0;
        const atBottom =
          curr.scrollTop + curr.clientHeight >= curr.scrollHeight - 1 && deltaY > 0;
        if (atTop || atBottom) {
          const canScrollMore =
            deltaY > 0
              ? curr.scrollLeft + curr.clientWidth < curr.scrollWidth - 1
              : curr.scrollLeft > 0;
          if (canScrollMore) {
            return curr;
          }
        }
      }
    }
    curr = curr.parentElement;
  }
  return null;
}

let isInitialized = false;

/**
 * Inicializa soporte global para scroll horizontal en modo Web:
 * 1. Conversión de rueda de ratón vertical (deltaY) a desplazamiento horizontal (scrollLeft).
 * 2. Arrastre con ratón (drag-to-scroll) para elementos con overflow horizontal.
 */
export function setupWebHorizontalScroll(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  if (isInitialized) return;
  isInitialized = true;

  // 1. Manejador de rueda de ratón (wheel)
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      // Si el usuario presiona Shift o el desplazamiento ya es horizontal nativo, no intervenir
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (!e.deltaY) return;

      const container = getTargetHorizontalScrollContainer(
        e.target as HTMLElement | null,
        e.deltaY
      );
      if (container) {
        const prev = container.scrollLeft;
        container.scrollLeft += e.deltaY;
        if (container.scrollLeft !== prev) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );

  // 2. Manejador de arrastre con ratón (Drag-to-scroll)
  let activeContainer: HTMLElement | null = null;
  let startX = 0;
  let startScrollLeft = 0;
  let isDragging = false;
  let isMouseDown = false;
  let dragEndedAt = 0;

  window.addEventListener(
    'mousedown',
    (e: MouseEvent) => {
      if (e.button !== 0) return; // Solo clic izquierdo principal

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // No interferir con inputs de texto o selectores
      const tag = target.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable
      ) {
        return;
      }

      const container = findHorizontalScrollContainer(target);
      if (!container) return;

      activeContainer = container;
      startX = e.clientX;
      startScrollLeft = container.scrollLeft;
      isDragging = false;
      isMouseDown = true;
    },
    { capture: true }
  );

  window.addEventListener(
    'mousemove',
    (e: MouseEvent) => {
      if (!isMouseDown || !activeContainer) return;
      const deltaX = e.clientX - startX;

      if (!isDragging && Math.abs(deltaX) > 4) {
        isDragging = true;
        activeContainer.style.cursor = 'grabbing';
        activeContainer.style.userSelect = 'none';
        (activeContainer.style as any).WebkitUserSelect = 'none';
      }

      if (isDragging) {
        activeContainer.scrollLeft = startScrollLeft - deltaX;
        e.preventDefault();
      }
    },
    { capture: true }
  );

  const stopDrag = () => {
    if (activeContainer) {
      activeContainer.style.cursor = '';
      activeContainer.style.userSelect = '';
      (activeContainer.style as any).WebkitUserSelect = '';
    }
    if (isDragging) {
      dragEndedAt = Date.now();
      setTimeout(() => {
        isDragging = false;
      }, 80);
    }
    isMouseDown = false;
    activeContainer = null;
  };

  window.addEventListener('mouseup', stopDrag, { capture: true });

  // Si hubo arrastre, cancelar el click posterior para evitar seleccionar elementos accidentalmente
  window.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (isDragging || Date.now() - dragEndedAt < 80) {
        e.stopPropagation();
        e.preventDefault();
        isDragging = false;
      }
    },
    { capture: true }
  );
}
