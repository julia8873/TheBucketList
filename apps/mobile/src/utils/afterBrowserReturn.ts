import { AppState, InteractionManager } from 'react-native';

/**
 * Espera a que la app vuelva a estar en primer plano y a que Android termine de
 * re-maquetar la ventana tras cerrar el navegador (Custom Tab) del login con Google.
 * Si se muestra un diálogo justo en ese instante, la vista nueva puede medirse con
 * tamaño 0 y los botones aparecen arriba a la izquierda, sin caja ni fondo.
 */
export function afterBrowserReturn(delayMs = 350): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(resolve, delayMs);
      });
    };
    if (AppState.currentState === 'active') {
      finish();
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sub.remove();
        finish();
      }
    });
  });
}
