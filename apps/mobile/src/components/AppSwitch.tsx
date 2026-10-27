import React from 'react';
import { Platform, Switch, type SwitchProps } from 'react-native';

/**
 * Switch con el mismo aspecto en nativo y en web.
 *
 * react-native-web pinta el pulgar activo con un verde por defecto (#009688)
 * porque ignora `thumbColor` cuando el switch está activado: para eso usa la
 * prop propia `activeThumbColor`. Aquí la rellenamos en web para que coincida
 * con el pulgar que se ve en la app (Android/iOS).
 */
export type AppSwitchProps = SwitchProps & {
  /** Color del pulgar cuando está activado (por defecto, el de `thumbColor`). */
  activeThumbColor?: string;
};

export function AppSwitch({ activeThumbColor, thumbColor, ...rest }: AppSwitchProps) {
  const webProps: Record<string, unknown> =
    Platform.OS === 'web'
      ? {
          activeThumbColor: activeThumbColor ?? (rest.value ? thumbColor : undefined),
          // Quita el borde/halo azul del navegador al enfocar.
          style: [{ outlineStyle: 'none' }, rest.style],
        }
      : {};

  return <Switch {...rest} thumbColor={thumbColor} {...(webProps as object)} />;
}

export default AppSwitch;
