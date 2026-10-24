// Extiende app.json con valores que dependen del entorno de compilación.
// - google-services.json (Firebase / FCM) NO está en el repositorio (.gitignore):
//   · EAS Build: súbelo como variable de tipo archivo `GOOGLE_SERVICES_JSON`
//       eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production
//   · GitHub Actions / local: déjalo en apps/mobile/google-services.json
// Si no existe, la app compila igualmente pero sin notificaciones push en Android.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
    const fromEnv = process.env.GOOGLE_SERVICES_JSON;
    const local = path.join(__dirname, 'google-services.json');
    const googleServicesFile = fromEnv || (fs.existsSync(local) ? './google-services.json' : undefined);

    if (!googleServicesFile && process.env.APP_ENV === 'prod') {
        console.warn('[app.config] ⚠ Falta google-services.json: las notificaciones push NO funcionarán en esta build de producción.');
    }

    return {
        ...config,
        android: {
            ...config.android,
            ...(googleServicesFile ? { googleServicesFile } : {}),
        },
    };
};
