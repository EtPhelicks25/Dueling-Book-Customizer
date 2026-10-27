# 🎴 DuelingBook Customizer

Extensión de navegador que te permite personalizar tu **avatar** y los **sleeves** (dorso de cartas) en [DuelingBook.com](https://www.duelingbook.com).

> **Nota:** Los cambios son solo visuales y locales — solo tú los ves en tu navegador. Tu oponente seguirá viendo tu avatar y sleeves originales.

## Funciones

- **Avatar personalizado**: sube cualquier imagen para reemplazar tu avatar.
- **Sleeves propios**: cambia el dorso de tus cartas.
- **Sleeves del oponente**: cambia el dorso de las cartas de tu rival.
- Cada opción se activa/desactiva independientemente con un toggle.
- Las imágenes se guardan localmente en el navegador.
- Soporte para drag & drop de imágenes.

## Instalación en Chrome (modo desarrollador)

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa **Modo de desarrollador** (esquina superior derecha).
3. Haz clic en **Cargar extensión sin empaquetar**.
4. Selecciona la carpeta `duelingbook-customizer`.
5. La extensión aparecerá con el ícono **DB** en la barra de herramientas.

## Instalación en Firefox (temporal)

1. Abre Firefox y ve a `about:debugging#/runtime/this-firefox`
2. Haz clic en **Cargar complemento temporal...**
3. Selecciona el archivo `manifest.json` dentro de la carpeta `duelingbook-customizer`.

> Para Firefox permanente necesitarías firmar la extensión o usar un `manifest.json` con `browser_specific_settings`.

## Uso

1. Abre DuelingBook en una pestaña.
2. Haz clic en el ícono **DB** en la barra de herramientas.
3. Sube imágenes y activa los toggles.
4. Recarga la página de DuelingBook si es necesario.

## Ajustar selectores

Los selectores CSS que detectan avatares y sleeves están en `content/content.js`. DuelingBook cambia su DOM con frecuencia, así que puede que necesites ajustarlos.

Para encontrar los selectores correctos:

1. Abre DuelingBook en una partida.
2. Pulsa **F12** → pestaña **Elements**.
3. Busca las imágenes de avatar y sleeves.
4. Actualiza las funciones `isAvatarElement()` y `sleeveOwner()` en `content.js`.

## Estructura

```
duelingbook-customizer/
├── manifest.json          # Manifiesto de la extensión (MV3)
├── icons/                 # Íconos de la extensión
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                 # Interfaz del popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/               # Scripts inyectados en DuelingBook
│   ├── content.js
│   └── content.css
└── README.md
```

## Licencia

Uso personal. No afiliado a DuelingBook ni a Konami.
